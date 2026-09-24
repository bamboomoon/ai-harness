# 项目级风格指南（readable）

原则本身不改变模型的行为——模型早已熟悉 Clean Code。改变行为的是：经典术语作引导词、本仓库的正反例、lint 与独立审查。

## 通用基线与项目约定分开

- **风格指南（通用）**：[../assets/readable/](../assets/readable/) 的基线——`readable-code`（跨语言，其他语言的兜底）、`readable-go`、`readable-typescript`、`readable-java`。原样复制到项目 `.agents/skills/`，不写本仓库路径；需要调整通用写法时回到 agent-harness 修改后再同步，项目间保持一致。
- **项目约定（本仓库）**：每个模块一份 `CONVENTIONS.md`，写基线之上本仓库特有的规则——具体类型、函数、路径、错误码、流程，每条配本仓库正例（`文件` 的 `函数`），反例注明来源（哪次纠正）。模块 AGENTS 的「何时读」首行指向它。

判断一条内容放哪：换一个同技术栈的项目仍然成立 → 基线；提到本仓库的名字或只在本仓库成立 → CONVENTIONS。

完成标准：`.agents/skills/readable-*` 与基线一致；CONVENTIONS 每条规则都能在仓库里找到正例。参考 [../assets/conventions/](../assets/conventions/)。

## 结构

- 基线 `SKILL.md` 核心（≤ 约 60 行，每次都读）：目标一句话；Clean Code 引导词各一行；「何时读」表指向主题文件。主题文件（≤ 约 80 行）按主题拆分，相关分支才加载。
- `CONVENTIONS.md` 按主题分节（与基线主题对应，另加项目特有主题如设计稿、UI 组件），总长超过约 150 行时按主题拆到模块 `docs/conventions/`，CONVENTIONS 保留索引。

## 引导词（跨语言）

单一抽象层级（编排函数每步一行，带判断的步骤抽成意图命名的函数）、Stepdown（主流程在上，辅助在首个调用者之后）、SRP、DRY（按知识与变化原因判断）、YAGNI、迪米特（经对方 service 协作）、CQS、意图命名（what 由命名与结构表达）。用经典术语而不是长句转述，才能调动模型已有的理解。

## 注释

注释只写 why（动机、约束、取舍、踩过的坑）并附 issue 链接；不写 what。agent 写的 what 注释烂得最快，十有八九是在给短期 hack 找补。
这条与存量代码通常冲突（每个函数一行复述式注释很常见）：规则立即生效，存量按「改到就清」处理，并由独立审查检查。

## 维护

- 每条规则配本仓库正例，注明来源（哪次纠正或实验）；能 lint 的写成 lint 后删除规则。
- 规则与现有代码冲突时，先改代码或暂不写规则——agent 跟随代码而不是规则。
- 必守项写进 CONVENTIONS 而不是只写进 skill（实验中约一半 agent 没有加载 skill）；AGENTS 指向它的那一行写清触发条件并标「必读」。
- 交付前独立审查（Claude Code `code-review`、Codex `/review`）以核心原则与模块 AGENTS 为标准。
- 定期对规则做删除测试：去掉后行为不变的是 no-op，删除。
