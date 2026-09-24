# 资源

两类文件：

- `readable/`：风格指南基线，**原样复制**到项目 `.agents/skills/`（见 [../references/style.md](../references/style.md)）。
- 其余文件：参考实现。来自一个 Next.js（web）+ Go（server）+ Node TypeScript（daemon）的多模块仓库，在该仓库的本地与 CI 中实际运行过，用来说明各机制**怎么实现**，不是可以直接复制的模板：模块名、命令、路径、依赖服务、种子数据、错误码约定都属于那个仓库。

使用方式：先读 [../references/verification.md](../references/verification.md) 理解机制的目标，再对照示例看一种实现，最后按 discover 得到的本项目模块、命令与平台重写。示例中与原仓库绑定的部分：

| 文件 | 示例展示的机制 | 与原仓库绑定、需按项目重写的部分 |
| --- | --- | --- |
| `scripts/test-env.sh`、`config/compose.test.yaml` | 一次性测试环境 | 依赖服务、迁移与种子命令、导出的变量 |
| `scripts/verify-delivery.sh` | 交付关卡与改动指纹 | 模块判断与各模块的 L2/L3 命令 |
| `scripts/test-guard.mjs`（含自测与 fixtures） | 防篡改检查 | 测试与快照文件的路径模式、语言写法模式 |
| `scripts/red-green.mjs` | 先红后绿 | 各模块测试路径与运行方式 |
| `scripts/mutation.mjs` | 改动行变异测试 | 源码范围与变异工具 |
| `scripts/check-doc-links.mjs` | 文档链接检查 | 归档目录 |
| `hooks/after-edit.mjs`、`hooks/verify-changes.sh` | 编辑后与回合结束 hook | 各模块的格式化、修复与检查命令 |
| `hooks/before-edit.mjs`（含自测）、`hooks/edited-files.mjs` | 编辑前核对已读模块 CONVENTIONS | 基本通用（按「模块/CONVENTIONS.md」约定） |
| `hooks/claude-settings.json`、`hooks/codex-hooks.json` | hook 注册 | 脚本路径 |
| `github/workflows/ci.yml`、`github/pull_request_template.md` | CI 分层与汇总、PR 结构 | job 与命令 |
| `go/declorder/` | 声明顺序检查与自动归位（go/ast） | 基本通用 |
| `config/golangci.yml`、`config/go-Makefile`、`config/eslint.*.mjs` | lint 与护栏配置 | 分层规则中的目录与包路径、框架预设 |
| `conventions/*.CONVENTIONS.md` | 模块项目约定（基线之上的本仓库规则与正反例） | 全部内容 |
| `AGENTS.example.md` | 根 AGENTS 的结构（何时读、工具表、纠正回路） | 全部内容 |

重写完成后，按 [../references/adopt.md](../references/adopt.md) 各阶段的完成标准验证。
