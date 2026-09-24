# Go：候选工具与选择依据

优先沿用项目已有的工具与入口（Makefile、Taskfile、脚本）；下面是缺失时的候选，以及选择时要判断的事。

| 目标 | 候选 | 判断 |
| --- | --- | --- |
| 统一入口 | 项目已有的任务运行器；没有时 Makefile | 与 CI 使用同一条命令 |
| 工具版本锁定 | `go.mod` 的 `tool` 指令；独立 `tools.mod` + `go tool -modfile=` | 工具依赖多或会影响生产依赖版本时用独立 modfile |
| lint 与格式 | golangci-lint（v2 配置）；gofmt/goimports | 从 `default: standard` 起步，逐项加入能拦截真实问题的 linter，先看存量再开启 |
| 依赖方向 | golangci 的 depguard（可按文件 glob 设规则） | 规则来自项目实际分层：哪些文件可接触传输层、持久化生成代码只在哪一层 |
| Clean Code 护栏 | gocognit、funlen、dupl | 只约束生产代码，阈值作上限 |
| 声明顺序（Stepdown） | 基于 go/ast 的小工具（检查未导出函数位于首个调用者之后，带自动归位），见 examples | 用户在意阅读顺序时加入 |
| 生成代码一致性 | 生成器自带的 diff/check（如 `sqlc diff`），或生成后 `git diff --exit-code` | 项目有代码生成时必须加，否则 agent 可能手写生成代码 |
| L2 测试 | build tag 隔离的集成测试 + 一个只在该标签下编译的测试辅助包；或 Testcontainers-go | 沿用项目已有方式 |
| L3 测试 | 运行编译后的生产二进制；Ginkgo/Gomega 或标准 testing | 沿用项目已有框架 |
| 变异测试 | gremlins（打开 `--invert-logical`、放宽 `--timeout-coefficient`） | 按包运行，再按改动行过滤 |

## 已知问题

格式：症状｜原因｜处理｜验证于。

- 【macOS】`go tool` 构建 golangci-lint / sqlc 时 clang 报 `tapi error: unknown architecture arm64e.x1`｜Command Line Tools 的链接器早于 SDK｜工具用 `CGO_ENABLED=0` 构建；或更新 Command Line Tools｜macOS 27 + clang 17，2026-09
- gremlins `--diff` 没有任何结果｜Go 模块位于仓库子目录时路径匹配不到｜按包运行后自行按改动行过滤（模板 `mutation.mjs` 已处理）｜gremlins 0.6.0，2026-09
- gremlins 几乎全部 TIMED OUT｜默认超时系数不足以覆盖每个变异的重新编译｜`--timeout-coefficient 20`｜gremlins 0.6.0，2026-09
- agent 手写 sqlc 生成代码且与真实生成结果不同｜找不到或装不上 sqlc，编译与测试仍通过｜`make generate` 入口 + check 中 `sqlc diff`｜sqlc 1.31.1，2026-09
