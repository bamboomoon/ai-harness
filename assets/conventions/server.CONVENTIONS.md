# Server 约定

本模块的写法与正反例：每节先写通用规则，再写本仓库的类型、函数与路径。格式、依赖方向、sqlc 一致性与声明顺序由 `make check` 检查，不在此重复。

## 入参校验：binding 标签是唯一来源

- 格式约束在信任边界只写一处：HTTP 入参（JSON、query、uri）只写在 request 结构的 `binding` 标签上；handler 与 service 不写同义的 `if`。
- 领域格式规则在所属领域包定义一次（如 `user.IsValidPassword`），注册为自定义标签（注册与适配在 `user/handler.go`）；CLI 等非 HTTP 入口直接调用同一个函数。
- 校验失败由统一错误层返回 HTTP 400、`code=40002`、指明字段的本地化 `msg`（文案在 `internal/locale`）；`data` 只承载成功数据，失败时为 `null`。缺失字段、类型不符与 JSON 无法解码为 `40001`。
- 业务判定（重名、权限、状态、存在性）留在 service，返回领域错误。

```go
// admin/model.go 的 createUserRequest：领域规则以自定义标签引用
type createUserRequest struct {
	Account string `json:"account" binding:"account"`

	Password string `json:"password" binding:"password"`
}

// modelconfig/model.go 的 listQuery：分页与筛选约束同样只写在标签上
type listQuery struct {
	httpjson.Pagination
	Keyword     string "form:\"keyword\" binding:\"excludesrune=\x00\""
	EnabledOnly bool   `form:"enabledOnly"`
}

// 反例：标签已能表达的规则，service 又手写一遍（auth/service.go 的 login 曾经如此）
if !user.IsValidAccount(request.Account) {
	return loginResponse{}, errInvalidAccount
}
```

## 数据访问、事务与跨领域编排

- sqlc 生成代码只在领域 `repo.go` 中使用；其他代码（包括 `cmd/` 下的 CLI）通过领域 service 访问数据。
- 修改 `pkg/db/queries/` 后运行 `make generate`。
- 事务用 `pgx.BeginFunc`，回调内用 `service.WithTx(tx)` 得到事务内的领域 service。
- 跨领域流程由 service 组合各领域 service，同一流程只写一份，差异（账号类型、操作人、名称）作为参数。
- 参数超过三四个且语义成组时（分页 + 筛选），传一个条件结构，而不是持续追加位置参数。

```go
// admin/service.go 的 createUser：一个事务内组合用户与工作空间两个领域
err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
	users, workspaces := s.users.WithTx(tx), s.workspaces.WithTx(tx)

	created, err := users.CreateUser(ctx, actorID, newUser)
	if err != nil {
		return err
	}
	// ……创建空间、设为所有者、绑定默认空间，任一步失败整体回滚
})
```

## 错误

- 可预期失败返回 `*apperror.Error`（Status、Code、MessageID），在各领域 `errors.go` 集中定义，文案在 `internal/locale`；调用方用 `errors.Is`/`errors.As` 判断，不比较字符串。
- 基础设施错误用 `fmt.Errorf("cannot ...: %w", err)` 包装后上抛，不转换成业务结论，例：`user.Service.VerifyCredentials` 中查询失败原样上抛，而不是变成「凭据错误」。
- 只在具备恢复、转换或隔离能力的边界处理错误；中间层原样返回，日志由统一错误层记录一次。
- 可预期失败与程序不变量破坏分开：前者返回错误，后者在启动或初始化时直接失败。

## 代码组织

- 编排函数每步一行，例：`httpapi/application.go` 的 `registerProviderRoutes`。
- 未导出函数放在首个调用者之后，`go run ./tools/declorder -w .` 自动调整。

## 测试

- 纯逻辑与「存储前拒绝」的校验写 L1；服务未注入的依赖保持零值，误触存储即失败。
- 读写数据库的行为写 L2：`*_integration_test.go`、`integration` 构建标签、`internal/testdb`，用 `make integration` 运行；不手写 `QueryRow`/`Scan` 桩。
- 真实入口契约（HTTP、CLI、持久化副作用）由 `e2e/` 覆盖，用 `make e2e` 运行。
- 修 bug 先写在旧实现上失败的测试；断言可观察结果与精确错误码，而不是内部调用。表驱动只用于共享同一断言结构的用例。

## 并发与资源

- goroutine 有明确的启动方、停止条件和完成观察；context 取消表达停止意图，等待完成（WaitGroup、errgroup、done channel）是另一件事。
- 锁保护共享不变量，channel 表达通信与背压；资源的获取、使用与释放在同一作用域，`defer` 的清理范围与资源寿命一致。
