# 测试

- 纯逻辑与「存储前拒绝」的校验写单元测试（JUnit 5 + AssertJ），不启动 Spring 上下文。
- 读写数据库的行为写集成测试（Testcontainers 真实数据库），不 mock repository 去模拟 SQL 语义。
- 真实入口契约（HTTP、消息、持久化副作用）由端到端或切片测试（`@SpringBootTest` + 真实依赖）覆盖。
- 修 bug 先写在旧实现上失败的测试；断言可观察结果与精确错误码，Mockito `verify` 只用于外发副作用。
