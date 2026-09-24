# 项目级风格指南（readable）

原则本身不改变模型的行为——模型早已熟悉 Clean Code。改变行为的是：经典术语作引导词、本仓库的正反例、lint 与独立审查。

## 结构

每种语言一个项目级 skill（如 `.agents/skills/readable-go/`）：
- `SKILL.md` 核心（≤ 约 60 行，每次都读）：目标一句话；Clean Code 引导词各一行并配本仓库例子；「何时读」表指向主题文件。
- 主题文件（≤ 约 80 行，仅相关分支加载）：如 validation、data-access、errors、testing、concurrency（Go）；external-data、events-async、state、testing（TS）。

## 引导词（跨语言）

单一抽象层级（编排函数每步一行，带判断的步骤抽成意图命名的函数）、Stepdown（主流程在上，辅助在首个调用者之后）、SRP、DRY（按知识与变化原因判断）、YAGNI、迪米特（经对方 service 协作）、CQS、意图命名（what 由命名与结构表达）。用经典术语而不是长句转述，才能调动模型已有的理解。

## 注释

注释只写 why（动机、约束、取舍、踩过的坑）并附 issue 链接；不写 what。agent 写的 what 注释烂得最快，十有八九是在给短期 hack 找补。
这条与存量代码通常冲突（每个函数一行复述式注释很常见）：规则立即生效，存量按「改到就清」处理，并由独立审查检查。

## 维护

- 每条规则配本仓库正例，注明来源（哪次纠正或实验）；能 lint 的写成 lint 后删除规则。
- 规则与现有代码冲突时，先改代码或暂不写规则——agent 跟随代码而不是规则。
- 必守项同时写进模块 AGENTS（agent 不一定加载 skill）。
- 交付前独立审查（Claude Code `code-review`、Codex `/review`）以核心原则与模块 AGENTS 为标准。
- 定期对规则做删除测试：去掉后行为不变的是 no-op，删除。
