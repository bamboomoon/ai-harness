# agent-harness

一个 agent skill：为代码仓库建立 AI coding 机制——规则路由、lint 护栏、测试分层与临时环境、测试可信度检查（防篡改、先红后绿、改动行变异测试）、Claude Code 与 Codex 共用的 hook、交付关卡与 CI。支持 Next.js/TypeScript、Node TypeScript、Go、Java。

- 入口：[SKILL.md](SKILL.md)（init 新项目 / adopt 已有项目 / correct 纠正回路）
- 风格指南基线：[assets/readable/](assets/readable/)（readable-code、readable-go、readable-typescript、readable-java），可单独安装；项目中原样复制，本仓库规则另写模块 CONVENTIONS.md
- 参考实现（示例）见 [assets/README.md](assets/README.md)
- 评估用例（维护 skill 时用）：[evals/README.md](evals/README.md)

## 结构

按 [Agent Skills](https://agentskills.io/specification) 约定组织；本 README 只给维护者看，agent 从 SKILL.md 进入。

| 路径 | 内容 |
| --- | --- |
| `SKILL.md` | 入口：选模式、共通概念、参考路由；所有 references 从这里一步可达 |
| `references/` | 各模式的步骤（discover、init、adopt、correct）与参考（docs、verification、style、stack-*） |
| `assets/` | 原样复制的风格指南基线（`readable/`）与参考实现 |
| `evals/` | 评估用例与运行方式，不被 SKILL.md 引用 |

## 安装

```sh
ln -s "$PWD" ~/.agents/skills/agent-harness          # Codex 等读取 ~/.agents/skills
ln -s ~/.agents/skills/agent-harness ~/.claude/skills/agent-harness   # Claude Code

# 可选：单独使用风格指南基线
for s in assets/readable/*/; do ln -s "$PWD/$s" ~/.agents/skills/; done
```
