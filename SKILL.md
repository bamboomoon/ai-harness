---
name: agent-harness
description: "Use when setting up or improving how AI agents code in a repository: bootstrapping a new project (init), adopting the harness on an existing project (adopt), or turning a correction of the agent into a durable fix (correct). Guides discovery of the project's real commands, modules and tooling, then decisions on rules, lint guards, test layers, throwaway test environments, test-trust checks, agent hooks, delivery gate and CI."
---

# Agent Harness

让 agent 每次走同一套过程：写代码时有具体规则可循，写完有机器验证，交付前有证据。

本 skill 描述**每个机制要达到的目标、判断依据与完成标准**；项目的模块、命令、工具与平台一律从项目中探索并实际运行确认（见 [modes/discover.md](modes/discover.md)），不照搬任何示例。文中「例」均来自一个 Next.js + Go + Node 的多模块仓库，只用于说明机制。

## 选模式

| 情况 | 读 |
| --- | --- |
| 开始任何模式之前 | [modes/discover.md](modes/discover.md) |
| 空仓库或刚初始化的项目 | [modes/init.md](modes/init.md) |
| 已有代码的项目，引入或补齐机制 | [modes/adopt.md](modes/adopt.md) |
| 用户纠正了 agent 的代码或做法 | [modes/correct.md](modes/correct.md) |

## 共通概念

- **模块**：一个技术栈、一套独立的检查与测试入口。单栈仓库是一个模块；多模块仓库再加一层很薄的根规则。
- **纠正回路**：每条纠正落在能承载它的最高一层——1 代码本身 → 2 静态检查（lint/类型/测试/CI）→ 3 规则（AGENTS.md）→ 4 skill → 5 风格指南。规则被检查接管后从文档删除。
- **测试层级**：L0 静态、L1 单元、L2 集成（真实依赖）、L3 端到端、L4 真实外部服务（按需手动）。行为变更在能观察到它的最低一层补测试。
- **验证独立于作者**：写代码与写测试的是同一个 agent，用机器检查测试本身（防篡改、先红后绿、改动行变异测试）；agent 先处理信号，人审 agent 的说明。
- **按需取用**：每个机制都有「何时不需要」；项目条件不具备时（例如无法使用容器、没有 UI、测试尚少），选择替代方案或暂缓，并记录理由。

## 参考

| 何时 | 读 |
| --- | --- |
| 写或重排 AGENTS.md、模块文档、归档 | [reference/docs.md](reference/docs.md) |
| 设计测试分层、测试环境、验证工具、hook、交付关卡、CI | [reference/verification.md](reference/verification.md) |
| 为某个技术栈挑选工具 | [reference/stacks/go.md](reference/stacks/go.md)、[typescript.md](reference/stacks/typescript.md)、[java.md](reference/stacks/java.md) |
| 写项目级风格指南 | [reference/style.md](reference/style.md) |
| 需要一个参考实现来理解某个机制 | [examples/README.md](examples/README.md) |
