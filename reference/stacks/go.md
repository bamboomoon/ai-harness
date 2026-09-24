# Go 模块

- **检查入口**：`Makefile` 的 `check`（golangci-lint + 声明顺序 + 生成代码一致性）与 `test`；`integration`、`e2e` 调用临时环境脚本。
- **工具锁定**：独立的 `tools.mod`，`go get -modfile=tools.mod -tool <pkg>`，运行 `go tool -modfile=tools.mod <tool>`，不污染生产 `go.mod`；工具以 `CGO_ENABLED=0` 构建，不依赖本机 cgo 链接器。
- **golangci-lint v2**：`default: standard` + bodyclose、errorlint、exhaustive（default 视为穷尽）、nilerr、rowserrcheck、sqlclosecheck、unparam（测试文件除外）、depguard、gocognit(20)、funlen、dupl（后三者测试文件除外）；formatters gofmt + goimports；`exclusions.presets: [std-error-handling]`；lint 同时带 `--build-tags=e2e,integration`。
- **依赖方向（depguard）**：生成代码只在 `repo.go`；领域包除 handler/middleware/model 外不导入 HTTP 框架与传输层包；service/repo 不导入 `net/http`。拿一个故意的违规验证规则生效。
- **声明顺序**：go/ast 小工具——只约束调用者全在本文件的未导出函数，必须位于首个调用者之后，带 `-w` 自动归位（按调用链逐层移动）。编辑后 hook 调用 `-w`，check 调用检查模式。
- **代码生成**：sqlc 用 `sqlc diff` 纳入 check；规则写「改 SQL 后 make generate」。
- **测试**：L1 标准 `testing`，服务未注入依赖保持零值；L2 `*_integration_test.go` + `integration` 标签 + 一个只在该标签下编译的 `testdb` 包（从 `DATABASE_URL` 取连接、提供已关闭连接池用于故障路径、随机账号）；L3 Ginkgo/Gomega，运行编译后的生产二进制。
- **校验**：binding 标签为唯一来源，领域格式规则在领域包定义一次并由传输层注册为自定义标签；失败响应的 `data` 为 null，信息在本地化 `msg`。
- **变异**：gremlins（见 verification.md 的参数与坑）。

## 已知问题

格式：症状｜原因｜处理｜验证于。

- 【macOS】`go tool` 构建 golangci-lint / sqlc 时 clang 报 `tapi error: unknown architecture arm64e.x1`｜Command Line Tools 的链接器早于 SDK｜工具用 `CGO_ENABLED=0` 构建；或更新 Command Line Tools｜macOS 27 + clang 17，2026-09
- gremlins `--diff` 没有任何结果｜Go 模块位于仓库子目录时路径匹配不到｜按包运行后自行按改动行过滤（模板 `mutation.mjs` 已处理）｜gremlins 0.6.0，2026-09
- gremlins 几乎全部 TIMED OUT｜默认超时系数不足以覆盖每个变异的重新编译｜`--timeout-coefficient 20`｜gremlins 0.6.0，2026-09
- agent 手写 sqlc 生成代码且与真实生成结果不同｜找不到或装不上 sqlc，编译与测试仍通过｜`make generate` 入口 + check 中 `sqlc diff`｜sqlc 1.31.1，2026-09
