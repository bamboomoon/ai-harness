// 先红后绿证明：改动过的单元测试必须在基准版本的实现上失败、在当前实现上通过，证明测试确实覆盖了本次改动。
// 用法：node scripts/red-green.mjs [--base <ref>] [--github]
//   --base   基准版本，默认 HEAD（检查未提交改动）；CI 中传与 main 的合并基点
//   --github 输出 GitHub 注释并写入运行总结
// 范围：server 单元测试（不含 e2e 与 integration）、web vitest、daemon node:test。
// 「旧实现上未失败」只标记待审（测试可能是重构或补覆盖）；「当前实现上失败」以非零退出。
import { execFileSync, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { base: { type: 'string', default: 'HEAD' }, github: { type: 'boolean' } },
});
const root = git(['rev-parse', '--show-toplevel']).trim();
process.chdir(root);

const targets = collectTargets(values.base);
if (!targets.length) {
  finish([], values.github);
} else {
  const baseTree = mkdtempSync(join(tmpdir(), 'red-green-'));
  try {
    git(['worktree', 'add', '--detach', '--quiet', baseTree, values.base]);
    prepareBaseTree(baseTree, targets);
    const results = targets.map((target) => ({
      ...target,
      red: !run(target, baseTree).ok,
      green: run(target, root),
    }));
    finish(results, values.github);
  } finally {
    git(['worktree', 'remove', '--force', baseTree]);
    rmSync(baseTree, { recursive: true, force: true });
  }
}

/** 把改动过的测试文件归类为可在单模块内快速运行的目标。 */
function collectTargets(base) {
  const targets = [];
  for (const path of changedTestFiles(base)) {
    if (
      /^server\/.*_test\.go$/.test(path) &&
      !path.startsWith('server/e2e/') &&
      !path.endsWith('_integration_test.go')
    ) {
      const names = changedGoTests(show(base, path), readFileSync(path, 'utf8'));
      if (names.length) targets.push({ kind: 'go', path, names, label: `${path}（${names.join('、')}）` });
    } else if (/^web\/tests\/.*\.test\.tsx?$/.test(path)) {
      targets.push({ kind: 'vitest', path, label: path });
    } else if (/^daemon\/tests\/.*\.test\.mjs$/.test(path)) {
      targets.push({ kind: 'node', path, label: path });
    }
  }
  return targets;
}

/** 列出相对基准新增或修改的测试文件；基准为 HEAD 时纳入未跟踪文件。 */
function changedTestFiles(base) {
  const tracked = git(['diff', '--name-only', '--diff-filter=AM', '--no-renames', base]).split('\n');
  const untracked = base === 'HEAD' ? git(['ls-files', '--others', '--exclude-standard']).split('\n') : [];
  return [...tracked, ...untracked].filter(Boolean);
}

/** 找出新增或函数体有变化的 Go 测试函数。 */
function changedGoTests(before, after) {
  const oldBodies = goTestBodies(before);
  return [...goTestBodies(after)]
    .filter(([name, body]) => oldBodies.get(name) !== body)
    .map(([name]) => name);
}

/** 按顶层 func Test 声明切分源码，得到测试名到函数文本的映射。 */
function goTestBodies(source) {
  const bodies = new Map();
  const parts = source.split(/^(?=func )/m);
  for (const part of parts) {
    const name = part.match(/^func (Test\w+)\(/)?.[1];
    if (name) bodies.set(name, part.trim());
  }
  return bodies;
}

/** 在基准工作树中放入新版测试，并复用当前依赖目录。 */
function prepareBaseTree(baseTree, targets) {
  for (const { path } of targets) {
    mkdirSync(dirname(join(baseTree, path)), { recursive: true });
    copyFileSync(path, join(baseTree, path));
  }
  for (const module of new Set(targets.filter((t) => t.kind !== 'go').map((t) => t.path.split('/')[0]))) {
    if (existsSync(join(module, 'node_modules')) && !existsSync(join(baseTree, module, 'node_modules'))) {
      symlinkSync(join(root, module, 'node_modules'), join(baseTree, module, 'node_modules'));
    }
  }
  if (targets.some((t) => t.kind === 'node'))
    runIn(join(baseTree, 'daemon'), 'npm', ['run', 'build', '--silent']);
}

/** 在指定工作树运行目标测试，返回是否通过。 */
function run(target, tree) {
  switch (target.kind) {
    case 'go': {
      const pkg = `./${relative('server', dirname(target.path))}`;
      return runIn(join(tree, 'server'), 'go', [
        'test',
        '-count=1',
        pkg,
        '-run',
        `^(${target.names.join('|')})$`,
      ]);
    }
    case 'vitest':
      return runIn(join(tree, 'web'), 'npx', ['vitest', 'run', relative('web', target.path)]);
    case 'node':
      if (tree === root) runIn(join(tree, 'daemon'), 'npm', ['run', 'build', '--silent']);
      return runIn(join(tree, 'daemon'), 'node', [
        '--import',
        'tsx',
        '--test',
        relative('daemon', target.path),
      ]);
  }
}

/** 执行命令并保留输出供失败时排查。 */
function runIn(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, CI: 'true' } });
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}` };
}

/** 读取基准版本的文件内容；新增文件返回空串。 */
function show(base, path) {
  try {
    return git(['show', `${base}:${path}`]);
  } catch {
    return '';
  }
}

/** 执行 git 并返回标准输出。 */
function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** 输出结论：当前实现上失败以非零退出，旧实现上未失败只标记待审。 */
function finish(results, github) {
  if (!results.length) {
    console.log('先红后绿证明：没有改动的单元测试，跳过');
    return;
  }
  const lines = results.map(({ label, red, green }) => {
    if (!green.ok) return `- ❌ ${label}：当前实现上失败`;
    return red
      ? `- ✅ ${label}：旧实现失败、当前实现通过`
      : `- ⚠️ ${label}：旧实现上也通过，测试未证明本次改动（重构或补覆盖时属正常，需说明）`;
  });
  console.log(`先红后绿证明（${results.length} 项）\n${lines.join('\n')}`);
  for (const { label, green } of results.filter((r) => !r.green.ok))
    console.log(`\n## ${label} 当前实现输出\n${green.output.slice(-3000)}`);

  if (github) {
    for (const { path, red, green } of results) {
      if (!green.ok) console.log(`::error file=${path},title=先红后绿::当前实现上失败`);
      else if (!red) console.log(`::warning file=${path},title=先红后绿::旧实现上也通过，测试未证明本次改动`);
    }
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 先红后绿证明\n${lines.join('\n')}\n`);
  }
  if (results.some((r) => !r.green.ok)) process.exitCode = 1;
}
