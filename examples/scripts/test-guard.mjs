// 测试防篡改检查：对比基准版本，标记可能削弱验证的测试改动，交给人审阅而不直接阻断。
// 用法：node scripts/test-guard.mjs [--base <ref>] [--github]
//   --base   对比基准，默认 HEAD（即检查未提交改动，含未跟踪文件）
//   --github 同时输出 GitHub 注释，并写入运行总结
import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const TEST_FILE = /(_test\.go|\.(test|spec)\.(ts|tsx|mts|mjs|js))$/;
const BASELINE_FILE = /(-snapshots\/|\/testdata\/.*\.golden$)/;

// 各语言中「跳过或聚焦」与「断言」的写法；数量变化即标记。
const SKIP_PATTERNS = {
  go: /\bt\.Skip(Now|f)?\(|\b(Skip|FIt|FDescribe|FContext|FEntry|PIt|PDescribe|PContext|XIt)\(/g,
  js: /\.(skip|only|fixme|todo)\(|\b(xit|xdescribe|xtest)\(/g,
};
const ASSERT_PATTERNS = {
  go: /\bt\.(Fatal|Fatalf|Error|Errorf)\(|\b(Expect|Eventually|Consistently|Ω)\(/g,
  js: /\bexpect(\.soft)?\(|\bassert(\.\w+)?\(/g,
};
const TEST_NAME_PATTERNS = {
  go: /^func (Test\w+)\(|\b(?:It|Describe|Context|Entry)\(\s*"([^"]+)"/gm,
  js: /\b(?:it|test|describe)(?:\.(?:skip|only|fixme|todo|concurrent|each\([^)]*\)))*\(\s*(['"`])((?:(?!\1).)+)\1/g,
};

const { values } = parseArgs({
  options: { base: { type: 'string', default: 'HEAD' }, github: { type: 'boolean' } },
});
const findings = collectFindings(values.base);
report(findings, values.github);

/** 汇总基准到工作区之间所有测试与基线文件的可疑改动。 */
function collectFindings(base) {
  const findings = [];
  for (const { status, path } of changedFiles(base)) {
    if (BASELINE_FILE.test(path)) {
      findings.push({
        path,
        message: `截图基线或 golden 文件${status === 'D' ? '被删除' : '被修改或新增'}，需确认是有意的界面/输出变更`,
      });
      continue;
    }
    if (!TEST_FILE.test(path)) continue;
    if (status === 'D') {
      findings.push({ path, message: '删除了测试文件' });
      continue;
    }

    const before = show(base, path);
    const after = existsSync(path) ? readFileSync(path, 'utf8') : '';
    const lang = path.endsWith('.go') ? 'go' : 'js';

    const removed = [...testNames(before, lang)].filter((name) => !testNames(after, lang).has(name));
    if (removed.length) findings.push({ path, message: `删除或改名了测试：${removed.join('、')}` });

    const skipsBefore = count(before, SKIP_PATTERNS[lang]);
    const skipsAfter = count(after, SKIP_PATTERNS[lang]);
    if (skipsAfter > skipsBefore)
      findings.push({ path, message: `新增跳过或聚焦标记（${skipsBefore} → ${skipsAfter}）` });

    const assertsBefore = count(before, ASSERT_PATTERNS[lang]);
    const assertsAfter = count(after, ASSERT_PATTERNS[lang]);
    if (assertsAfter < assertsBefore)
      findings.push({ path, message: `断言数量减少（${assertsBefore} → ${assertsAfter}）` });
  }
  return findings;
}

/** 列出相对基准的改动文件；基准为 HEAD 时一并纳入未跟踪文件。 */
function changedFiles(base) {
  const tracked = git(['diff', '--name-status', '--no-renames', base])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, path] = line.split('\t');
      return { status: status[0], path };
    });
  const untracked = git(['ls-files', '--others', '--exclude-standard'])
    .split('\n')
    .filter(Boolean)
    .map((path) => ({ status: 'A', path }));
  return base === 'HEAD' ? [...tracked, ...untracked] : tracked;
}

/** 读取基准版本的文件内容；新增文件返回空串。 */
function show(base, path) {
  try {
    return git(['show', `${base}:${path}`]);
  } catch {
    return '';
  }
}

/** 提取测试名称集合，用于识别删除或改名的用例。 */
function testNames(source, lang) {
  return new Set(
    [...source.matchAll(TEST_NAME_PATTERNS[lang])].map((match) =>
      lang === 'go' ? (match[1] ?? match[2]) : match[2],
    ),
  );
}

/** 统计模式出现次数。 */
function count(source, pattern) {
  return source.match(pattern)?.length ?? 0;
}

/** 执行 git 并返回标准输出。 */
function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** 输出待审清单；始终以 0 退出，由审阅者判断改动是否合理。 */
function report(findings, github) {
  if (!findings.length) {
    console.log('测试防篡改检查：未发现削弱验证的测试改动');
    return;
  }
  const lines = findings.map(({ path, message }) => `- \`${path}\`：${message}`);
  console.log(`测试防篡改检查：以下 ${findings.length} 处测试改动需要审阅并说明理由\n${lines.join('\n')}`);
  if (!github) return;
  for (const { path, message } of findings)
    console.log(`::warning file=${path},title=测试改动待审::${message}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### 测试改动待审（${findings.length}）\n${lines.join('\n')}\n`,
    );
  }
}
