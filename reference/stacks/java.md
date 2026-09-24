# Java 模块（Maven 多模块）

> 本节尚未在实际项目中按此机制落地验证；首次 adopt 时补充「已知问题」。

- **检查入口**：根 POM 统一 `mvn -pl :<module> -am verify`；格式由 Spotless + 项目 formatter 生成，CheckStyle 作最终格式门禁；本地与 CI 同一命令。
- **依赖方向**：ArchUnit 测试表达分层（controller → service → repository，领域不依赖 web/持久化框架类型，DTO/VO/BO 的使用边界），放在各模块测试中随 `verify` 运行。
- **Clean Code 护栏**：CheckStyle 的 `CyclomaticComplexity`/`NPathComplexity`、`MethodLength`、PMD CPD（重复代码），阈值作上限、只约束生产代码；Sonar 作补充而非替代本地门禁。
- **声明顺序**：private 方法紧跟首个调用者（Stepdown）——CheckStyle 无内置规则，用 JavaParser 写一个小检查（与 Go 的声明顺序工具同逻辑，带自动归位），纳入 `verify`。这是 agent 最常被纠正的问题之一，应在 lint 层解决而不是写进规则。
- **测试**：L1 JUnit 5；L2 Testcontainers（PostgreSQL、ClickHouse、Redis、Kafka 等真实依赖），替代 Mock 仓库层；L3 独立的 e2e 工程，不进入业务打包。
- **变异**：PIT（`pitest-maven`），用 `targetClasses` 限定改动类，再按 diff 行过滤结果。
- **规则**：项目契约（VO/DTO/BO 含义、枚举序列化边界、错误码复用）写进模块 AGENTS 的必守规则；能由 ArchUnit 表达的优先写成测试。
