# 入参校验：binding 标签是唯一来源

- HTTP 入参（JSON、query、uri）的格式约束只写在 request 结构的 `binding` 标签上；handler 与 service 不写同义的 `if`。
- 领域格式规则（账号、密码、名称等）在所属领域包只定义一次（如 `user.IsValidPassword`），注册为自定义标签供 HTTP 使用；
  CLI 等非 HTTP 入口直接调用同一个函数。
- 校验失败由统一错误层根据标签生成：HTTP 400、`code=40002`、`msg` 为当前语言且指明字段的文案（复用 `internal/locale`）；
  `data` 只承载成功时的业务数据，失败时为 `null`。缺失字段、类型不符与 JSON 无法解码为 `40001`。
- 业务判定（重名、权限、状态、存在性）不是格式校验，留在 service，返回领域错误。

```go
// 正例：约束写在标签上，service 直接使用已校验的值
type listUsersRequest struct {
	httpjson.Pagination

	Status *user.Status `form:"status" binding:"omitnil,oneof=1 2"`

	Keyword *string `form:"keyword" binding:"omitnil,alpha,max=12"`
}

// 正例：领域规则注册为自定义标签，请求结构只引用标签名（注册与适配在 user/handler.go）
type loginRequest struct {
	Account string `json:"account" binding:"account"`

	Password string `json:"password" binding:"password"`
}

// 反例：标签已能表达的规则，service 又手写一遍（auth/service.go 的 login 曾经如此）
if !user.IsValidAccount(request.Account) {
	return loginResponse{}, errInvalidAccount
}
```
