---
name: readable-go
description: "Use for Go planning, implementation, refactoring, and review in this repository: Clean Code principles with in-repo examples, plus topic guides for validation, data access, errors, tests and concurrency."
---

# Readable Go（本仓库）

目标：读者在有限上下文里看懂每个函数做什么、失败从哪来。`make check` 已机械检查的规则（格式、依赖方向、sqlc、声明顺序）不在此重复。

## 核心原则

- **单一抽象层级**：编排函数（`NewHandler`、`main`、组合多个领域 service 的方法）每步一行；某步需要自己的判断或错误分支时，
  抽成按意图命名的函数，调用方不关心里面怎么判断。例：`httpapi/application.go` 的 `registerProviderRoutes`。
- **Stepdown**：主流程在上，未导出函数放在首个调用者之后（declorder 检查，`go run ./tools/declorder -w .` 自动调整）。
- **SRP**：handler 只做绑定与响应；service 做业务判定与跨领域编排；repo 只做持久化。
- **DRY**：同一业务流程、同一格式规则只写一份；按知识与变化原因判断，而不是按代码形状相似。
- **YAGNI**：接口、工厂、配置只为真实存在的替换点或变化而设。
- **迪米特**：跨领域协作调用对方领域的 service，不触碰对方的 repo 或生成代码。
- **CQS**：查询不改变状态；命令的副作用在名字和签名上可见。
- **意图命名**：名称说明角色与差异，what 由命名和结构表达；注释只写 why（动机、约束、取舍）并附 issue 链接（`#123`），不写复述代码的 what 注释——它最先过时，常在为短期 hack 找补。

## 何时读

| 何时 | 读 |
| --- | --- |
| 改 request 结构、binding 标签、格式校验 | [validation.md](validation.md) |
| 改 repo、SQL、事务或跨领域编排 | [data-access.md](data-access.md) |
| 定义、包装或处理错误 | [errors.md](errors.md) |
| 写或改测试 | [testing.md](testing.md) |
| 写 goroutine、channel、锁或 context 传播 | [concurrency.md](concurrency.md) |
