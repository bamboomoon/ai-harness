# Go 写法模板

生成模块 AGENTS 与 CONVENTIONS 的起点（见 [../../references/style.md](../../references/style.md)），不是可安装的 skill：
- 「语言要点」并入模块 AGENTS 的「核心原则」（压成一两行）；
- 其余各节并入模块 CONVENTIONS 的对应主题：通用规则在前，改写成项目实际的类型、函数与路径，补本仓库正例；项目没有的主题删掉。

## 语言要点

- 接口在消费方定义，只为真实存在的替换点而建；构造函数返回具体类型。
- `context.Context` 作为第一个参数沿调用链传递，不存进结构体。
- 零值可用时直接使用零值；零值、nil 与「未设置」语义不同时用指针或专门类型区分。

```go
// 单一抽象层级：每步一行，带判断的步骤藏在意图命名的函数里
func NewHandler(deps Deps) http.Handler {
	router := newRouter()
	registerPublicRoutes(router, deps)
	registerAdminRoutes(router, deps)
	return router
}
```

## 边界：入参校验、数据访问与编排

### 入参校验

- 格式约束在信任边界只写一处，用框架的声明式机制（请求结构上的校验标签、validator）表达；handler 与 service 不写同义的 `if`。
- 领域格式规则（账号、名称等）在所属领域包定义一次，注册为自定义校验供 HTTP 使用；CLI 等非 HTTP 入口直接调用同一个函数。
- 校验失败由统一错误层转成响应；成功数据与失败信息各走各的字段。
- 业务判定（重名、权限、状态、存在性）不是格式校验，留在 service，返回领域错误。

```go
// 正例：约束写在标签上，service 直接使用已校验的值
type createUserRequest struct {
	Account string `json:"account" binding:"account"`

	Email *string `json:"email" binding:"omitnil,email"`
}

// 反例：标签已能表达的规则，service 又手写一遍
if !user.IsValidAccount(req.Account) {
	return errInvalidAccount
}
```

### 数据访问与事务

- 生成的查询代码或 ORM 只在领域存储层使用；其他代码（包括 `cmd/` 下的工具）通过领域 service 访问数据。
- 事务用驱动或框架提供的回调式 helper（如 pgx 的 `BeginFunc`），回调内得到事务内的领域 service；不手写 Begin/Commit/Rollback 配对。
- 跨领域流程由 service 组合各领域 service，同一流程只写一份，差异作为参数。
- 参数超过三四个且语义成组时（分页 + 筛选），传一个条件结构，而不是持续追加位置参数。

## 错误

- 可预期失败（业务拒绝）用项目统一的错误类型表达，在各领域集中定义；调用方用 `errors.Is`/`errors.As` 判断，不比较字符串。
- 基础设施错误用 `fmt.Errorf("cannot ...: %w", err)` 包装后上抛；它不能被转换成业务结论（查询失败不能变成「凭据错误」）。
- 只在具备恢复、转换或隔离能力的边界处理错误；中间层原样返回，日志由统一错误层记录一次，不在每层都打。
- 可预期失败与程序不变量破坏分开：前者返回错误，后者在启动或初始化时直接失败。

## 测试

- 纯逻辑与「存储前拒绝」的校验写单元测试；服务未注入的依赖保持零值，误触存储即失败。
- 读写数据库的行为写集成测试（真实数据库，build tag 或 Testcontainers 隔离），不手写 `QueryRow`/`Scan` 桩。
- 真实入口契约（HTTP、CLI、持久化副作用）由端到端测试覆盖。
- 修 bug 先写在旧实现上失败的测试；断言可观察结果与精确错误码，而不是内部调用。
- 表驱动测试只在用例共享同一断言结构时使用；各用例断言不同时分开写。

## 资源与并发

- goroutine 有明确的启动方、停止条件和完成观察；context 取消表达停止意图，等待完成（WaitGroup、errgroup、done channel）是另一件事。
- 锁保护共享不变量，channel 表达通信与背压；阻塞、关闭与退出关系要能在有限上下文中推理。
- 资源的获取、使用与释放在同一作用域；`defer` 的清理范围与资源寿命一致，清理失败影响结果时显式处理。
- 零值、nil 与「未设置」语义不同时，用指针或专门类型表达。
