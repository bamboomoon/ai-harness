# Server 约定

本仓库在 [readable-go](../.agents/skills/readable-go/SKILL.md) 之上的具体约定：通用写法看 readable-go，本仓库的类型、函数与路径以这里为准。格式、依赖方向、sqlc 一致性与声明顺序由 `make check` 检查，不在此重复。

## 入参校验：binding 标签是唯一来源

- HTTP 入参（JSON、query、uri）的格式约束只写在 request 结构的 `binding` 标签上；handler 与 service 不写同义的 `if`。
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

- 可预期失败返回 `*apperror.Error`（Status、Code、MessageID），在各领域 `errors.go` 集中定义，文案在 `internal/locale`。
- 基础设施错误不转换成业务结论，例：`user.Service.VerifyCredentials` 中查询失败原样上抛，而不是变成「凭据错误」。

## 代码组织

- 编排函数每步一行，例：`httpapi/application.go` 的 `registerProviderRoutes`。
- 未导出函数放在首个调用者之后，`go run ./tools/declorder -w .` 自动调整。

## 测试

- 读写数据库的行为写 L2：`*_integration_test.go`、`integration` 构建标签、`internal/testdb`，用 `make integration` 运行；不手写 `QueryRow`/`Scan` 桩。
- 真实入口契约（HTTP、CLI、持久化副作用）由 `e2e/` 覆盖，用 `make e2e` 运行。
