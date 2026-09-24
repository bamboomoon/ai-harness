---
name: agent-harness
description: "Use when setting up or improving how AI agents code in a repository: bootstrapping a new project (init), adopting the harness on an existing project (adopt), or turning a correction of the agent into a durable fix (correct). Covers AGENTS.md routing, lint guards, test layers L0–L4, throwaway test environments, tamper/red-green/mutation checks, Claude Code and Codex hooks, delivery gate, CI and readable style guides for Next.js/TypeScript, Node TypeScript, Go and Java."
---

# Agent Harness

让 agent 每次走同一套过程：写代码时有具体规则可循，写完有机器验证，交付前有证据。机制以**模块**（一个技术栈、一套检查入口）为单位；单栈仓库是一个模块，多模块仓库再加一层很薄的根规则。

## 选模式

| 情况 | 读 |
| --- | --- |
| 空仓库或刚初始化的项目 | [modes/init.md](modes/init.md) |
| 已有代码的项目，引入或补齐机制 | [modes/adopt.md](modes/adopt.md) |
| 用户纠正了 agent 的代码或做法 | [modes/correct.md](modes/correct.md) |

## 共通概念

- **纠正回路**：每条纠正落在能承载它的最高一层——1 代码本身 → 2 静态检查（lint/类型/测试/CI）→ 3 规则（AGENTS.md）→ 4 skill → 5 风格指南（readable）。规则被 lint 接管后从文档删除。
- **测试层级**：L0 静态、L1 单元、L2 集成（临时真实依赖）、L3 E2E、L4 真实外部（按需手动）。行为变更在能观察到它的最低一层补测试。
- **验证独立于作者**：写代码与写测试的是同一个 agent，所以用机器检查测试本身——防篡改检查、先红后绿、改动行变异测试；结论由人审 agent 的说明，而不是读原始清单。
- **交付关卡**：hook 管每个回合（格式、lint、单元测试、测试可信度）；交付前运行关卡脚本（受影响模块的 L2/L3 与变异测试），标记与改动指纹绑定；CI 全量复核。

## 参考

| 何时 | 读 |
| --- | --- |
| 写或重排 AGENTS.md、模块文档、归档 | [reference/docs.md](reference/docs.md) |
| 搭测试分层、临时环境、验证工具、hook、交付关卡、CI | [reference/verification.md](reference/verification.md) |
| 为某个技术栈选 lint、检查入口与测试工具 | [reference/stacks/go.md](reference/stacks/go.md)、[typescript.md](reference/stacks/typescript.md)、[java.md](reference/stacks/java.md) |
| 写项目级 readable 风格指南 | [reference/style.md](reference/style.md) |
| 复制脚本、hook、CI、PR 模板 | [templates/README.md](templates/README.md) |
