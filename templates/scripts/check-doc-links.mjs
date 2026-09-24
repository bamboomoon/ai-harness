// 检查仓库内 Markdown 的相对链接是否指向存在的文件，防止代码或文档移动后引用失效。
// ponytail: 只校验文件路径，不校验 #锚点与外部链接；需要时再加 GitHub slug 规则。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '*.md'], {
  encoding: 'utf8',
})
  .split('\n')
  // 归档是历史快照，引用的旧文件可能已不存在。
  .filter((file) => file && !file.startsWith('docs/archive/'));

const broken = [];
for (const file of files) {
  // 围栏代码块与行内代码里的内容是示例，不是链接。
  const text = readFileSync(file, 'utf8')
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, '')
    .replace(/`[^`\n]*`/g, '');
  for (const [, target] of text.matchAll(/\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g)) {
    if (/^([a-z]+:|#)/i.test(target)) continue;
    if (target.startsWith('/')) {
      broken.push(`${file}: ${target}（本机绝对路径，换成仓库相对路径或纯文本）`);
      continue;
    }
    const path = decodeURI(target.split('#')[0].split('?')[0]);
    if (!existsSync(join(dirname(file), path))) broken.push(`${file}: ${target}`);
  }
}

if (broken.length) {
  console.error(`失效的相对链接（${broken.length}）：\n${broken.join('\n')}`);
  process.exit(1);
}
console.log(`文档链接检查通过（${files.length} 个 Markdown 文件）`);
