// 用临时仓库与伪造的会话记录验证：未读 CONVENTIONS 时拒绝编辑模块代码，读过、改文档或模块外文件时放行。
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const hook = new URL('./before-edit.mjs', import.meta.url).pathname;

test('按会话记录中的工具调用判断是否读过模块 CONVENTIONS', () => {
  const repo = mkdtempSync(join(tmpdir(), 'before-edit-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo });
    mkdirSync(join(repo, 'server/internal'), { recursive: true });
    writeFileSync(join(repo, 'server/CONVENTIONS.md'), '# 约定\n');
    mkdirSync(join(repo, 'scripts'));

    const transcript = join(repo, 'transcript.jsonl');
    const run = (toolInput, records) => {
      writeFileSync(transcript, records.map((record) => JSON.stringify(record)).join('\n'));
      return spawnSync('node', [hook], {
        input: JSON.stringify({ cwd: repo, transcript_path: transcript, tool_input: toolInput }),
        encoding: 'utf8',
      });
    };
    const mention = { type: 'user', message: { content: '先读 server/CONVENTIONS.md' } };
    const claudeRead = {
      message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: join(repo, 'server/CONVENTIONS.md') } }] },
    };
    const claudeWrite = {
      message: { content: [{ type: 'tool_use', name: 'Write', input: { content: 'server/CONVENTIONS.md' } }] },
    };
    const codexRead = {
      type: 'response_item',
      payload: { type: 'custom_tool_call', name: 'exec', input: 'tools.exec_command({cmd:"cat server/CONVENTIONS.md"})' },
    };
    const newGoFile = { file_path: join(repo, 'server/internal/new/a.go') };
    const codexPatch = { input: '*** Begin Patch\n*** Update File: server/internal/a.go\n@@\n' };

    assert.equal(run(newGoFile, [mention]).status, 2, '正文提到路径不算读过');
    assert.match(run(newGoFile, [mention]).stderr, /server\/CONVENTIONS\.md/);
    assert.equal(run(newGoFile, [claudeWrite]).status, 2, '写入内容里出现路径不算读过');
    assert.equal(run(codexPatch, []).status, 2, 'Codex 补丁同样拦截');
    assert.equal(run(newGoFile, [claudeRead]).status, 0);
    assert.equal(run(codexPatch, [codexRead]).status, 0);
    assert.equal(run({ file_path: join(repo, 'server/README.md') }, []).status, 0, '文档不受约束');
    assert.equal(run({ file_path: join(repo, 'scripts/a.mjs') }, []).status, 0, '没有 CONVENTIONS 的目录不受约束');

    const noTranscript = spawnSync('node', [hook], { input: JSON.stringify({ cwd: repo, tool_input: newGoFile }) });
    assert.equal(noTranscript.status, 0, '拿不到会话记录时放行');
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
