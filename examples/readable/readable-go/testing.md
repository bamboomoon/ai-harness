# 测试

- 纯逻辑与「存储前拒绝」的校验写 L1 单元测试；服务未注入的依赖保持零值，误触存储即失败。
- 读写数据库的行为写 L2 集成测试：`*_integration_test.go`、`integration` 构建标签、`internal/testdb`，用 `make integration` 运行。
  用真实 PostgreSQL 验证，而不是手写 `QueryRow`/`Scan` 桩。
- 真实入口契约（HTTP、CLI、持久化副作用）由 `e2e/` 覆盖，用 `make e2e` 运行。
- 修 bug 先写在旧实现上失败的测试（`node scripts/red-green.mjs` 会核对）；断言可观察结果与精确错误码，而不是内部调用。
