# 边界：入参校验、数据访问与编排

## 入参校验

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

## 数据访问与事务

- 生成的查询代码或 ORM 只在领域存储层使用；其他代码（包括 `cmd/` 下的工具）通过领域 service 访问数据。
- 事务用驱动或框架提供的回调式 helper（如 pgx 的 `BeginFunc`），回调内得到事务内的领域 service；不手写 Begin/Commit/Rollback 配对。
- 跨领域流程由 service 组合各领域 service，同一流程只写一份，差异作为参数。
- 参数超过三四个且语义成组时（分页 + 筛选），传一个条件结构，而不是持续追加位置参数。
