# 模板：参考实现与改造点

这些文件取自一个 web（Next.js）+ server（Go）+ daemon（Node TS）的多模块仓库，已在本地与 CI 实际运行。复制后按下表改造；模块名 `web`、`server`、`daemon` 出现的地方都要换成目标项目的模块。

| 文件 | 放到 | 必须改的地方 |
| --- | --- | --- |
| `scripts/test-env.sh`、`config/compose.test.yaml` | `scripts/`、仓库根 | 依赖服务与镜像版本；迁移与种子命令（参考实现用 `cmd/migrate`、`cmd/init` 和管理接口建普通账号）；导出的环境变量与凭据文件格式 |
| `scripts/verify-delivery.sh` | `scripts/` | `has <模块>` 与各模块的 L2/L3 命令；模块间依赖（后端改动也要跑浏览器 E2E） |
| `scripts/test-guard.mjs`（+ `test-guard.test.mjs`、`fixtures/`） | `scripts/` | 测试文件与基线路径的正则；新语言补充 skip/断言/测试名模式 |
| `scripts/red-green.mjs` | `scripts/` | `collectTargets` 中各模块的测试路径与运行命令（需要构建的模块先构建） |
| `scripts/mutation.mjs` | `scripts/` | 纳入/排除的源码路径；变异工具命令（gremlins / Stryker / PIT） |
| `scripts/check-doc-links.mjs` | `scripts/` | 归档目录路径 |
| `hooks/after-edit.mjs` | `.agents/hooks/` | `fix()` 中按模块与扩展名的格式化、修复命令 |
| `hooks/verify-changes.sh` | `.agents/hooks/` | 模块列表与每个模块的 `check && test` 命令 |
| `hooks/claude-settings.json`、`hooks/codex-hooks.json` | `.claude/settings.json`（或 `.agents/settings.json` + `.claude` 软链）、`.codex/hooks.json` | 脚本路径；Codex 还需在用户配置中信任项目 |
| `github/workflows/ci.yml`、`github/pull_request_template.md` | `.github/` | 每模块的 job 与命令、汇总表的 job 映射；浏览器镜像与 `@playwright/test` 版本一致 |
| `go/declorder/` | Go 模块内 `tools/declorder/` | 无需修改（模块路径随所在 `go.mod`） |
| `config/golangci.yml`、`config/go-Makefile` | Go 模块根 | depguard 中的领域目录与包路径；Makefile 的集成/E2E 命令 |
| `config/eslint.next.mjs`、`config/eslint.node.mjs` | TS 模块根 | 框架预设、`src` 路径与项目特有豁免 |
| `AGENTS.example.md` | 仓库根（参考结构） | 全部内容按项目重写，只保留结构：何时 \| 读、纠正回路、测试与验证、交付说明、约定 |

改造完成后，用 [../modes/adopt.md](../modes/adopt.md) 各阶段的完成标准逐项验证：故意的违规被拦下、验证工具在正反例上判定正确、hook 用模拟输入与真实会话各触发一次、CI 全绿且无警告。
