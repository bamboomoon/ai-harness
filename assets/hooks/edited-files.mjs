// 编辑前后两个 hook 必须对「改了哪些文件、属于哪个仓库」得出同一结论。
import { execFileSync } from 'node:child_process';
import { isAbsolute, join } from 'node:path';

/** Claude Code 给出 file_path，Codex 的 apply_patch 只在补丁文件头里带路径。 */
export function editedFiles(toolInput, base) {
  const direct = [toolInput.file_path, toolInput.path].filter((value) => typeof value === 'string');
  const patch = JSON.stringify(toolInput);
  const patched = [...patch.matchAll(/\*\*\* (?:Add|Update) File: (.+?)(?=\\n|")/g)].map((match) => match[1]);
  return [...new Set([...direct, ...patched])].map((file) => (isAbsolute(file) ? file : join(base, file)));
}

export function gitRoot(cwd) {
  try {
    return execFileSync('git', ['-C', cwd, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}
