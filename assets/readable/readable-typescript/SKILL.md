---
name: readable-typescript
description: "Use for TypeScript planning, implementation, refactoring, and review (frontend or Node): Clean Code leading words applied to TypeScript, plus topic guides for external data, event handlers and async lifecycles, state types and tests."
---

# Readable TypeScript

目标：类型说明契约，运行时代码守住类型说不清的边界。格式、类型感知 lint、tsc 已由项目检查命令机械拦截的规则不在此重复；项目的具体约定以模块 AGENTS 与仓库现有代码为准。

## 核心原则

- **单一抽象层级**：组件或模块的主流程每步一行；带判断的步骤抽成按意图命名的函数。
- **Stepdown**：主流程在上，辅助函数放在首个调用者之后。
- **SRP**：组件调用领域 API 并呈现状态；请求、响应信封校验与错误分类集中在 API 层，不在组件里重复实现。
- **DRY**：同一段逻辑出现第二次时抽出；形状相似但语义不同的代码不合并。
- **YAGNI**：抽象、hook、配置只为真实存在的复用或变化而设。
- **意图命名**：名称说明角色与差异，what 由命名和结构表达；注释只写 why（动机、约束、取舍）并附 issue 链接（`#123`）。

## 何时读

| 何时 | 读 |
| --- | --- |
| 处理 HTTP 响应、JSON、存储、URL/history 状态、动态 import 等外部数据 | [external-data.md](external-data.md) |
| 写事件处理、异步请求、定时器、订阅或 effect | [events-async.md](events-async.md) |
| 设计组件或模块的状态类型 | [state.md](state.md) |
| 写或改测试 | [testing.md](testing.md) |
