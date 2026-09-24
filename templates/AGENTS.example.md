# 开发指引

仓库由 web（Next.js 页面与交互）、server（Go 业务后端）、daemon（Pi 执行进程）组成。进入模块目录工作时，该模块的 AGENTS.md 会自动加载；这里只放跨模块的规则。

## 何时读

| 何时 | 读 |
| --- | --- |
| 命名业务概念，写 issue、规格或测试描述 | [CONTEXT.md](CONTEXT.md) |
| 改动触及已记录的设计取舍 | [docs/adr/](docs/adr/) |
| 处理 issue、规格或分诊 | [issue tracker](docs/agents/issue-tracker.md)、[分诊标签](docs/agents/triage-labels.md) |
| 一次改动跨多个模块 | 每个受影响模块的 AGENTS.md |
| 新增或修改 E2E 场景 | [server E2E 编写指南](server/e2e/WRITING.md)、[web E2E 编写指南](web/tests/e2e/WRITING.md) |

## 纠正回路

收到对代码或做法的纠正时，选能承载它的最高一层落地，并说明落在哪一层：

1. **代码本身**：修正或删除会被模仿的样例，让正确写法成为最显眼的写法。
2. **静态检查**：lint、类型、测试或 CI 规则。
3. **规则**：本文件或模块 AGENTS——每次都必须知道、且无法从代码推断的约定。
4. **skill**：特定任务的流程。
5. **风格指南**：readable-go / readable-typescript 的具体做法与正反例。

规则被 lint 或测试接管后，从文档中删除。

## 测试与验证

- 层级：L0 静态、L1 单元、L2 集成（临时 PostgreSQL/Redis）、L3 E2E、L4 真实外部（模型、E2B，按需手动）。
- 行为变更在能观察到它的最低一层补测试；修 bug 先写在旧实现上失败的测试；读写存储的行为交给 L2。
- hook 自动执行：编辑后格式化并修复该文件；回合结束对改动模块运行 check 与单元测试、测试防篡改与先红后绿检查，失败或出现新的待审项会退回。
- 交付前：在仓库根目录运行 `scripts/verify-delivery.sh`（受影响模块的 L2/L3 与改动行变异测试）；对 diff 做一次独立审查（Claude Code 用 `code-review`，Codex 用 `/review`，标准为 readable 核心原则与模块 AGENTS）。阶段性汇报或提问的回合写明「未交付」。
- 结论以本次实际执行为准，按层分别报告通过、失败、跳过与未运行；环境阻塞不算完成。
- 保留工作区已有的他人改动，只清理本次创建的测试资源。

## 交付说明

按 [PR 模板](.github/pull_request_template.md) 的结构汇报：改动说明、影响评估、验证结果（按层）、测试改动说明、剩余风险；另列本次使用的 skill（未使用写「未使用」）。

## 约定

- 先用框架和已安装依赖的惯用能力；自定义代码只承载业务规则。
- 注释只写 why（动机、约束、取舍、踩过的坑），关联需求时附 issue 链接（如 `#123`）；代码做什么由命名与结构表达，不写 what 注释——agent 写的 what 注释多半在为短期 hack 找补，最先过时。修改到的函数上已有的 what 注释顺手删除或改写为 why。注释用中文。
