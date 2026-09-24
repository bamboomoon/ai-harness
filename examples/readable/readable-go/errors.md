# 错误

- 可预期失败返回 `*apperror.Error`（Status、Code、MessageID），在各领域 `errors.go` 集中定义，文案在 `internal/locale`。
- 基础设施错误用 `fmt.Errorf("cannot ...: %w", err)` 包装后原样上抛；它不能被转换成业务结论
  （例：查询失败不能变成「凭据错误」，见 `user.Service.VerifyCredentials`）。
- 只在具备恢复、转换或隔离能力的边界处理错误；中间层原样返回，日志由统一错误层记录一次。
- 可预期失败与程序不变量破坏分开：前者返回错误，后者在启动或初始化时直接失败。
