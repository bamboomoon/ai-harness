// 用临时 git 仓库验证防篡改检查能标记各类削弱验证的改动，且不误报正常新增。
// 被检查的测试源码放在 fixtures/test-guard/*.before|after 中，避免本文件自身的字符串被当成 skip/only 标记。
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const guard = new URL('./test-guard.mjs', import.meta.url).pathname;
const fixture = (name) => new URL(`./fixtures/test-guard/${name}`, import.meta.url).pathname;

test('标记删除用例、新增 skip/only、断言减少、基线变更与删除测试文件，正常新增不报', () => {
  const repo = mkdtempSync(join(tmpdir(), 'test-guard-'));
  const run = (cmd, ...args) => execFileSync(cmd, args, { cwd: repo, encoding: 'utf8' });
  try {
    run('git', 'init', '-q');
    mkdirSync(join(repo, 'e2e/a.spec.ts-snapshots'), { recursive: true });
    copyFileSync(fixture('user_test.go.before'), join(repo, 'user_test.go'));
    copyFileSync(fixture('ui.test.ts.before'), join(repo, 'ui.test.ts'));
    writeFileSync(join(repo, 'old.test.mjs'), "test('old', () => {});\n");
    writeFileSync(join(repo, 'e2e/a.spec.ts-snapshots/home.png'), 'v1');
    run('git', 'add', '.');
    run('git', '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');

    copyFileSync(fixture('user_test.go.after'), join(repo, 'user_test.go'));
    copyFileSync(fixture('ui.test.ts.after'), join(repo, 'ui.test.ts'));
    rmSync(join(repo, 'old.test.mjs'));
    writeFileSync(join(repo, 'e2e/a.spec.ts-snapshots/home.png'), 'v2');
    writeFileSync(join(repo, 'new.test.ts'), "it('fresh', () => { expect(1); });\n");

    const output = run('node', guard);
    assert.match(output, /user_test\.go`：删除或改名了测试：TestGone/);
    assert.match(output, /user_test\.go`：新增跳过或聚焦标记（0 → 1）/);
    assert.match(output, /user_test\.go`：断言数量减少（2 → 1）/);
    assert.match(output, /ui\.test\.ts`：新增跳过或聚焦标记（0 → 1）/);
    assert.match(output, /old\.test\.mjs`：删除了测试文件/);
    assert.match(output, /home\.png`：截图基线或 golden 文件被修改或新增/);
    assert.doesNotMatch(output, /new\.test\.ts/);
    // 加 .only 只算聚焦标记，不算删除用例。
    assert.doesNotMatch(output, /ui\.test\.ts`：删除或改名/);
    assert.doesNotMatch(output, /ui\.test\.ts`：断言数量减少/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});
