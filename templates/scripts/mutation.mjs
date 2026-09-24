// 变异测试（仅改动行）：改写本次改动的代码，检查测试能否发现；存活或未覆盖的变异说明测试没有真正约束这些改动。
// 用法：node scripts/mutation.mjs [--base <ref>] [--github]
// 在 scripts/test-env.sh 中运行时（存在 DATABASE_URL）server 同时计入 integration 测试。只出报告，始终以 0 退出：
// 部分变异与原代码等价、不可能被杀死，需要人判断。
// 范围：server 业务包（不含 cmd 入口、生成代码、测试与测试基础设施 internal/testdb）用 gremlins；web/src（不含 shadcn 原样组件）用 Stryker；
// daemon 使用 node:test，Stryker 暂无对应运行器，不纳入。
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { base: { type: 'string', default: 'HEAD' }, github: { type: 'boolean' } },
});
const root = git(['rev-parse', '--show-toplevel']).trim();
process.chdir(root);

const changed = changedLines(values.base);
const serverFiles = [...changed.keys()].filter(
  (path) =>
    /^server\/.*\.go$/.test(path) &&
    !path.endsWith('_test.go') &&
    !/^server\/(cmd|e2e|pkg\/db\/generated|internal\/testdb)\//.test(path),
);
const webFiles = [...changed.keys()].filter(
  (path) => /^web\/src\/.*\.tsx?$/.test(path) && !path.startsWith('web/src/ui/'),
);

const results = [...mutateServer(serverFiles), ...mutateWeb(webFiles)];
report(results, values.github);

/** 解析 diff 得到每个文件本次新增或修改的行号；基准为 HEAD 时未跟踪文件视为整体新增。 */
function changedLines(base) {
  const lines = new Map();
  let file;
  for (const line of git(['diff', '-U0', '--no-renames', base]).split('\n')) {
    if (line.startsWith('+++ ')) file = line.startsWith('+++ b/') ? line.slice(6) : undefined;
    const hunk = line.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
    if (file && hunk) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      const set = lines.get(file) ?? new Set();
      for (let n = start; n < start + count; n++) set.add(n);
      if (set.size) lines.set(file, set);
    }
  }
  if (base === 'HEAD') {
    for (const path of git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean)) {
      const count = readFileSync(path, 'utf8').split('\n').length;
      lines.set(path, new Set(Array.from({ length: count }, (_, i) => i + 1)));
    }
  }
  return lines;
}

/** 按包运行 gremlins，只保留落在改动行上的变异结果。 */
function mutateServer(files) {
  const results = [];
  const integration = process.env.DATABASE_URL ? ['--tags', 'integration'] : [];
  for (const pkg of new Set(files.map((path) => dirname(path)))) {
    const out = join(mkdtempSync(join(tmpdir(), 'gremlins-')), 'result.json');
    // 每个变异都要重新编译，覆盖率运行耗时乘以默认系数常不足以完成，放宽避免误判为超时；
    // 业务规则多为布尔条件，额外启用默认关闭的 && / || 互换变异。
    spawnSync(
      'go',
      [
        'tool',
        '-modfile=tools.mod',
        'gremlins',
        'unleash',
        '--silent',
        '--timeout-coefficient',
        '20',
        '--invert-logical',
        ...integration,
        '-o',
        out,
        `./${relative('server', pkg)}`,
      ],
      { cwd: 'server', env: { ...process.env, CGO_ENABLED: '0' }, stdio: 'inherit' },
    );
    const report = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : { files: [] };
    rmSync(dirname(out), { recursive: true, force: true });
    for (const path of files.filter((f) => dirname(f) === pkg)) {
      const mutations = report.files.find((f) => f.file_name === basename(path))?.mutations ?? [];
      results.push(
        summarize(
          path,
          mutations
            .filter((m) => changed.get(path).has(m.line))
            .map((m) => ({
              status:
                { KILLED: 'killed', LIVED: 'survived', 'NOT COVERED': 'uncovered', 'TIMED OUT': 'timeout' }[
                  m.status
                ] ?? 'other',
              line: m.line,
              mutator: m.type,
            })),
        ),
      );
    }
  }
  return results;
}

/** 用 Stryker 只变异改动行，读取其 JSON 报告。 */
function mutateWeb(files) {
  if (!files.length) return [];
  const ranges = files.flatMap((path) =>
    toRanges(changed.get(path)).map(([from, to]) => `${relative('web', path)}:${from}-${to}`),
  );
  spawnSync(
    'npx',
    [
      'stryker',
      'run',
      '--testRunner',
      'vitest',
      '--reporters',
      'json,clear-text',
      '--mutate',
      ranges.join(','),
    ],
    {
      cwd: 'web',
      stdio: 'inherit',
    },
  );
  const reportPath = 'web/reports/mutation/mutation.json';
  const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : { files: {} };
  return files.map((path) =>
    summarize(
      path,
      (report.files[relative('web', path)]?.mutants ?? []).map((m) => ({
        status:
          { Killed: 'killed', Survived: 'survived', NoCoverage: 'uncovered', Timeout: 'timeout' }[m.status] ??
          'other',
        line: m.location.start.line,
        mutator: m.mutatorName,
      })),
    ),
  );
}

/** 把连续行号合并为区间，减少 Stryker 参数长度。 */
function toRanges(lines) {
  const sorted = [...lines].sort((a, b) => a - b);
  const ranges = [];
  for (const n of sorted) {
    const last = ranges.at(-1);
    if (last && n === last[1] + 1) last[1] = n;
    else ranges.push([n, n]);
  }
  return ranges;
}

/** 统计单个文件改动行上的变异结果。 */
function summarize(path, mutants) {
  const count = (status) => mutants.filter((m) => m.status === status).length;
  return {
    path,
    killed: count('killed'),
    survived: count('survived'),
    uncovered: count('uncovered'),
    timeout: count('timeout'),
    weak: mutants.filter((m) => m.status === 'survived' || m.status === 'uncovered'),
  };
}

/** 执行 git 并返回标准输出。 */
function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** 输出改动行上的变异结论与需要补测试或说明的位置。 */
function report(results, github) {
  const scored = results.filter((r) => r.killed + r.survived + r.uncovered + r.timeout > 0);
  if (!scored.length) {
    console.log('变异测试：本次改动没有可变异的业务代码');
    return;
  }
  const lines = scored.flatMap((r) => [
    `- \`${r.path}\`：杀死 ${r.killed}、存活 ${r.survived}、未覆盖 ${r.uncovered}、超时 ${r.timeout}`,
    ...r.weak.map((m) => `  - ${m.status === 'survived' ? '存活' : '未覆盖'}：第 ${m.line} 行 ${m.mutator}`),
  ]);
  const killed = scored.reduce((sum, r) => sum + r.killed + r.timeout, 0);
  const total = scored.reduce((sum, r) => sum + r.killed + r.timeout + r.survived + r.uncovered, 0);
  const text = `变异测试（仅改动行）：${killed}/${total} 被测试发现（${Math.round((killed / total) * 100)}%）\n${lines.join('\n')}`;
  console.log(text);
  if (!github) return;
  for (const r of scored) {
    for (const m of r.weak) {
      console.log(
        `::warning file=${r.path},line=${m.line},title=变异${m.status === 'survived' ? '存活' : '未覆盖'}::${m.mutator}：测试没有发现这处改写，补测试或说明为等价变异`,
      );
    }
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${text}\n`);
}
