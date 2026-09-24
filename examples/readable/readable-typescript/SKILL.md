---
name: readable-typescript
description: "Use for TypeScript planning, implementation, refactoring, and review in this repository (web and daemon): Clean Code principles with in-repo examples, plus topic guides for external data, event handlers and async lifecycles, state types and tests."
---

# Readable TypeScript（本仓库）

目标：类型说明契约，运行时代码守住类型说不清的边界。`npm run check` 已机械检查的规则（格式、类型感知 lint、tsc）不在此重复。

## 核心原则

- **单一抽象层级**：组件或模块的主流程每步一行；带判断的步骤抽成按意图命名的函数。
- **Stepdown**：主流程在上，辅助函数放在首个调用者之后（例：`settings-location.ts` 的 `openSettings` → `readReturnUrl`）。
- **SRP**：页面组件只调领域 API（`src/lib/api/*`）并呈现状态；请求、信封校验与错误分类不在组件里重复实现。
- **DRY**：同一段逻辑出现第二次时抽出（例：`formText` 取代各处 `String(form.get(...))`）；形状相似但语义不同的代码不合并。
- **YAGNI**：抽象、hook、配置只为真实存在的复用或变化而设。
- **意图命名**：名称说明角色与差异，what 由命名和结构表达；注释只写 why（动机、约束、取舍）并附 issue 链接（`#123`），不写复述代码的 what 注释——它最先过时，常在为短期 hack 找补。

## 何时读

| 何时 | 读 |
| --- | --- |
| 处理 HTTP 响应、history.state、JSON、动态 import 等外部数据 | [external-data.md](external-data.md) |
| 写事件处理、异步请求、定时器、订阅或 effect | [events-async.md](events-async.md) |
| 设计组件或模块的状态类型 | [state.md](state.md) |
| 写或改测试 | [testing.md](testing.md) |
