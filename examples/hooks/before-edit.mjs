// PreToolUse：AGENTS 里的「先读 CONVENTIONS」只是提示，实验中约一半 agent 不按提示加载规则；
// 这里在编辑模块代码前核对本会话是否读过该模块的 CONVENTIONS.md，没读就拒绝这次编辑并说明原因。
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';

import { editedFiles, gitRoot } from './edited-files.mjs';

const CALL_TYPES = new Set(['tool_use', 'function_call', 'custom_tool_call', 'local_shell_call']);
// 写入工具的参数是新内容，里面出现 CONVENTIONS 路径不代表读过它。
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const base = input.cwd || process.cwd();

const required = [...new Set(editedFiles(input.tool_input ?? {}, base).flatMap(conventionsFor))];
const calls = required.length ? toolCallsInTranscripts() : null;
const unread = calls ? required.filter((conventions) => !mentions(calls, conventions)) : [];

if (unread.length) {
  // 退出码 2 + stderr 是 Claude Code 与 Codex 都支持的拒绝方式。
  process.stderr.write(
    `编辑前需先完整阅读 ${unread.join('、')}（本会话尚未读取）。按该路径读取后再重试这次编辑。\n`,
  );
  process.exit(2);
}

// 文档不受约束：CONVENTIONS 管的是模块代码，改 README 或 CONVENTIONS 本身不必先读。
function conventionsFor(file) {
  if (file.endsWith('.md')) return [];
  const dir = existingDir(dirname(file));
  const root = gitRoot(dir);
  if (!root) return [];
  const [module] = relative(root, join(dir, basename(file))).split(sep);
  const conventions = `${module}/CONVENTIONS.md`;
  return existsSync(join(root, conventions)) ? [conventions] : [];
}

// 新建文件时目录可能还不存在；git 返回的是真实路径，比较前先解析软链接（如 macOS 的 /tmp）。
function existingDir(dir) {
  while (!existsSync(dir)) dir = dirname(dir);
  return realpathSync(dir);
}

// 只看工具调用的参数：AGENTS 正文里提到 CONVENTIONS 路径不算读过。
// 拿不到会话记录时放行，不因 hook 环境差异卡住编辑。
// ponytail: 只认带模块前缀的路径，在模块目录里 `cat CONVENTIONS.md` 不计入；会话压缩后早先的读取仍计入。
function toolCallsInTranscripts() {
  const paths = [input.transcript_path, input.agent_transcript_path].filter((path) => path && existsSync(path));
  if (!paths.length) return null;
  const calls = [];
  for (const line of paths.flatMap((path) => readFileSync(path, 'utf8').split('\n'))) {
    try {
      collectCalls(JSON.parse(line), calls);
    } catch {
      // 会话记录写到一半的末行无法解析，跳过即可。
    }
  }
  return calls;
}

function collectCalls(node, calls) {
  if (!node || typeof node !== 'object') return;
  if (CALL_TYPES.has(node.type) && !WRITE_TOOLS.has(node.name)) calls.push(JSON.stringify(node.input ?? node.arguments ?? node.action ?? node));
  for (const value of Object.values(node)) collectCalls(value, calls);
}

function mentions(calls, conventions) {
  const pattern = new RegExp(`(^|[^\\w.-])${conventions.replace('.', '\\.')}`);
  return calls.some((call) => pattern.test(call));
}
