---
name: readable-go
description: "Use for Go planning, implementation, refactoring, and review: Clean Code leading words applied to Go, plus topic guides for input validation and data access, errors, tests and concurrency."
---

# Readable Go

目标：读者在有限上下文里看懂每个函数做什么、失败从哪来。格式、依赖方向、复杂度等已由项目检查命令机械拦截的规则不在此重复；项目的具体约定以模块 AGENTS 与仓库现有代码为准。

## 核心原则

- **单一抽象层级**：编排函数（构造函数、`main`、组合多个领域 service 的方法）每步一行；某步需要自己的判断或错误分支时，抽成按意图命名的函数，调用方不关心里面怎么判断。
- **Stepdown**：主流程在上，未导出函数放在首个调用者之后。
- **SRP**：传输层只做绑定与响应；service 做业务判定与跨领域编排；存储层只做持久化。
- **DRY**：同一业务流程、同一格式规则只写一份；按知识与变化原因判断，而不是按代码形状相似。
- **YAGNI**：接口、工厂、配置只为真实存在的替换点或变化而设；接口在消费方定义。
- **迪米特**：跨领域协作调用对方领域的 service，不触碰对方的存储层或生成代码。
- **CQS**：查询不改变状态；命令的副作用在名字和签名上可见。
- **意图命名**：名称说明角色与差异，what 由命名和结构表达；注释只写 why（动机、约束、取舍）并附 issue 链接（`#123`）。

```go
// 单一抽象层级：每步一行，带判断的步骤藏在意图命名的函数里
func NewHandler(deps Deps) http.Handler {
	router := newRouter()
	registerPublicRoutes(router, deps)
	registerAdminRoutes(router, deps)
	return router
}
```

## 何时读

| 何时 | 读 |
| --- | --- |
| 改请求结构、入参校验、存储访问、事务或跨领域编排 | [boundaries.md](boundaries.md) |
| 定义、包装或处理错误 | [errors.md](errors.md) |
| 写或改测试 | [testing.md](testing.md) |
| 写 goroutine、channel、锁、context 传播或资源释放 | [concurrency.md](concurrency.md) |
