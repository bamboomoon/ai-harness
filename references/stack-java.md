# Java：候选工具与选择依据

> 本节尚未在实际项目中按此机制落地验证；首次 adopt 时补充「已知问题」。

优先沿用项目已有的构建工具（Maven/Gradle）、格式化与检查配置；下面是缺失时的候选。

| 目标 | 候选 | 判断 |
| --- | --- | --- |
| 统一入口 | 构建工具的 verify/check 任务，多模块按模块 + 依赖构建 | 与 CI 同一命令 |
| 格式与格式门禁 | Spotless（生成格式）+ CheckStyle（最终门禁） | 已有 formatter 配置时沿用 |
| 依赖方向 | ArchUnit 测试 | 规则来自项目实际分层与 DTO/VO/BO 等对象的使用边界 |
| Clean Code 护栏 | CheckStyle 复杂度与方法长度、PMD CPD 重复代码 | 只约束生产代码 |
| 声明顺序（Stepdown） | 基于 JavaParser 的小检查（与 Go 示例同逻辑，带自动归位） | agent 常把 private 方法统一放在文件末尾，适合用检查而不是规则解决 |
| L2 测试 | Testcontainers（真实数据库、缓存、消息） | 替代 Mock 仓库层 |
| 变异测试 | PIT（按改动类运行，再按改动行过滤） | 单元测试有一定规模后再加 |
| 代码扫描 | Sonar 等 | 作补充，不替代本地门禁 |
