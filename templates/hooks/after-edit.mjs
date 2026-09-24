// PostToolUse：编辑后立即格式化并自动修复该文件，把无法自动修复的 lint 问题交回 agent 当场处理。
// 兼容 Claude Code（Edit/Write/MultiEdit 的 tool_input.file_path）与 Codex（apply_patch 补丁中的文件头）。
// 只做单文件的快速处理；完整的静态检查与测试由 Stop hook 和 CI 负责。
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative } from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const base = input.cwd || process.cwd();

// 按被编辑文件所在的仓库处理，编辑其他 worktree 的文件时也在正确的仓库里格式化。
const problems = editedFiles(input.tool_input ?? {})
  .map((file) => (isAbsolute(file) ? file : join(base, file)))
  .filter((file) => existsSync(file))
  .flatMap((file) => {
    const root = gitRoot(dirname(file));
    return root ? fix(root, relative(root, file)) : [];
  });

if (problems.length) {
  // decision=block 在 PostToolUse 中不会撤销编辑，只把原因交给 agent 立即修复。
  console.log(
    JSON.stringify({ decision: 'block', reason: `编辑后的检查发现需要处理的问题：\n${problems.join('\n')}` }),
  );
}

/** 从两种工具输入中提取被编辑的文件路径。 */
function editedFiles(toolInput) {
  const direct = [toolInput.file_path, toolInput.path].filter((value) => typeof value === 'string');
  const patch = JSON.stringify(toolInput);
  const patched = [...patch.matchAll(/\*\*\* (?:Add|Update) File: (.+?)(?=\\n|")/g)].map((match) => match[1]);
  return [...new Set([...direct, ...patched])];
}

/** 按模块与文件类型格式化、自动修复，返回仍需 agent 处理的问题。 */
function fix(root, file) {
  const [module] = file.split('/');
  const local = relative(module, file);
  if ((module === 'web' || module === 'daemon') && /\.(tsx?|mts|cts|jsx?|mjs|cjs|json|css|md)$/.test(file)) {
    run(join(root, module), 'npx', ['prettier', '--write', '--log-level', 'warn', local]);
    if (/\.(tsx?|mts|cts|jsx?|mjs|cjs)$/.test(file)) {
      const lint = run(join(root, module), 'npx', ['eslint', '--fix', '--max-warnings=0', local]);
      if (!lint.ok) return [`- ${file}（eslint）：\n${lint.output.trim()}`];
    }
  }
  if (module === 'server' && file.endsWith('.go')) {
    run(join(root, module), 'gofmt', ['-w', local]);
    run(join(root, module), 'go', ['run', './tools/declorder', '-w', dirname(local)]);
  }
  return [];
}

/** 执行命令，返回是否成功及输出。 */
function run(cwd, command, args) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/** 返回目录所属 git 仓库根目录；不在仓库中时返回空。 */
function gitRoot(cwd) {
  try {
    return execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}
