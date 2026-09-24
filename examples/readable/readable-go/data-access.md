# 数据访问、事务与跨领域编排

- sqlc 生成代码只在领域 `repo.go` 中使用；其他代码（包括 `cmd/` 下的 CLI）通过领域 service 访问数据。
- 修改 `pkg/db/queries/` 后运行 `make generate`，`make check` 会核对生成代码与 SQL 一致。
- 事务用 `pgx.BeginFunc`，回调内用 `service.WithTx(tx)` 得到事务内的领域 service；Begin/Commit/Rollback 交给 `BeginFunc`。
- 跨领域流程由 service 组合各领域 service，同一流程只写一份，差异（账号类型、操作人、名称）作为参数。
- 参数超过三四个且语义成组时（如分页 + 筛选），传一个条件结构，而不是持续追加位置参数。

```go
// 正例：admin/service.go 的 createUser —— 一个事务内组合用户与工作空间两个领域
err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
	users, workspaces := s.users.WithTx(tx), s.workspaces.WithTx(tx)

	created, err := users.CreateUser(ctx, actorID, newUser)
	if err != nil {
		return err
	}
	// ……创建空间、设为所有者、绑定默认空间，任一步失败整体回滚
})
```
