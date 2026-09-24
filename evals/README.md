# 评估

用来回答两个问题：装上这个 skill，agent 是否真的按它的过程工作；修改 skill 之后，行为是变好还是变差。评估只供维护者使用，SKILL.md 不引用这里。

当前状态：已设计用例与判定方式，**尚未运行**。

## 构成

| 部分 | 内容 |
| --- | --- |
| 用例 | [evals.json](evals.json)：每条包含 `skills`、`query`（给 agent 的原话）、`fixture`（起始仓库）、`expected_behavior`（可逐条判定的期望） |
| 起始仓库 | 每个 `fixture` 对应一个可重复生成的仓库：一段生成脚本（如 `go mod init` / `create-next-app` / Spring Initializr 固定版本）或一个固定提交的副本；需要复现坏样例的，脚本里直接写入坏样例 |
| 判定 | 能脚本判断的写成检查（文件存在、CONVENTIONS 中没有模板措辞、hook 配置可解析、`check` 命令通过、故意的违规被拦下）；需要判断力的按 `expected_behavior` 人工或另一个模型逐条打分 |
| 对照 | 同一用例分别在「无 skill」与「有 skill」下运行，只比较差值；修改 skill 后与上一版结果比较 |

## 运行方式

1. 每次运行使用全新副本（独立 worktree 或临时目录），互不共享工作区——共享工作区会让提交和 hook 串到别的任务上。
2. 用能力较低的模型（例如 Sonnet / Haiku）运行，更容易暴露 skill 写得不清楚的地方；每条用例至少 2 次，记录每次的差异。
3. 需要用户回答的问题（agent 使用、纠正案例、工具确认），用每条用例里 `user_answers` 的固定回答，保证可复现；agent 没有提问就直接做决定，本身就是失败项。
4. 保存 diff、会话记录与判定结果；判定脚本和结果放在本目录下按日期分的子目录，不提交生成的仓库副本。
5. 对规则做删除测试：去掉 skill 中某段后行为不变，那一段是 no-op。

## 用例覆盖

| 模式 | 用例 | 主要检查 |
| --- | --- | --- |
| discover | `discover-stale-readme` | 命令以实际运行为准，发现 README 过时 |
| init | `init-go-service`、`init-nextjs-app` | 单一 check 入口、故意违规被拦、核心原则与 CONVENTIONS 由模板生成、AGENTS 结构 |
| adopt | `adopt-java-existing-lint`、`adopt-project-rules-in-skill` | 沿用已有工具、分阶段并由用户确认、项目规则移入 CONVENTIONS |
| correct | `correct-module-rule`、`correct-generic-style` | 按适用范围落点、修掉坏样例、用当初的错误验证 |
