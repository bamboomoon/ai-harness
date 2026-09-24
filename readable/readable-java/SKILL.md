---
name: readable-java
description: "Use for Java planning, implementation, refactoring, and review: Clean Code leading words applied to Java, plus topic guides for input validation and data access, exceptions, tests and resources/concurrency."
---

# Readable Java

目标：读者在有限上下文里看懂每个方法做什么、失败从哪来。格式、依赖方向、复杂度等已由项目检查命令机械拦截的规则不在此重复；项目的具体约定以模块 AGENTS 与仓库现有代码为准。

## 核心原则

- **单一抽象层级**：编排方法每步一行；某步需要自己的判断或异常分支时，抽成按意图命名的 private 方法。
- **Stepdown**：public 方法在上，private 方法放在首个调用它的方法之后，而不是集中堆在类末尾。
- **SRP**：controller 只做绑定与响应；service 做业务判定与跨领域编排；repository 只做持久化。
- **DRY**：同一业务流程、同一格式规则只写一份；按知识与变化原因判断，而不是按代码形状相似。
- **YAGNI**：接口、工厂、配置只为真实存在的替换点或变化而设；一个实现的接口不为「将来」而建。
- **迪米特**：跨领域协作调用对方领域的 service，不触碰对方的 repository 或实体内部。
- **CQS**：查询不改变状态；命令的副作用在名字和签名上可见。
- **封装、不可变性**：值对象用 `record` 或 final 字段；集合对外返回不可变视图；可变状态的所有者明确。
- **意图命名**：名称说明角色与差异，what 由命名和结构表达；注释与 Javadoc 只写 why 与契约（前置条件、异常、取舍），附 issue 链接（`#123`）。

## 何时读

| 何时 | 读 |
| --- | --- |
| 改请求 DTO、入参校验、repository、事务或跨领域编排 | [boundaries.md](boundaries.md) |
| 定义、包装或处理异常 | [exceptions.md](exceptions.md) |
| 写或改测试 | [testing.md](testing.md) |
| 写线程、异步任务、锁或需要关闭的资源 | [concurrency.md](concurrency.md) |
