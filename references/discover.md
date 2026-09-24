# discover：先弄清项目的真实情况

所有决策都基于这一步的结果。文档可能过时，**命令以实际运行为准**。

## 要找的内容与去哪里找

| 要确认 | 线索 |
| --- | --- |
| 模块与技术栈 | 各级 manifest（`package.json`、`go.mod`、`pom.xml`/`build.gradle`、`pyproject.toml`、`Cargo.toml`…）、monorepo 配置（workspaces、nx/turbo、Maven modules） |
| 构建、运行、测试、lint 命令 | manifest 中的 scripts、`Makefile`/`justfile`/`Taskfile`、构建工具任务、CI 配置、README、CONTRIBUTING |
| 测试依赖如何提供 | 现有 compose 文件、Testcontainers、devcontainer、测试配置中的连接串与环境变量、测试是否依赖共享环境或手工准备的数据 |
| 已有质量门禁 | lint/格式化/类型检查配置、预提交钩子、CI 中的检查、代码扫描（如 Sonar） |
| agent 相关文件 | `AGENTS.md`、`CLAUDE.md`、`.cursor`/`.github/copilot-instructions.md`、项目 skill、agent hook 配置 |
| 协作平台 | 代码托管与 CI 平台（GitHub Actions、GitLab CI…）、Issue 系统 |
| agent 可用的 skill、MCP 与 CLI | 项目 `.mcp.json`、`.agents/skills`/`.claude/skills`、用户级 agent 配置（如 `~/.codex/config.toml` 的 `mcp_servers`、Claude Code 的 MCP 与 skill 目录）、项目文档提到的 CLI（如组件库、代码托管 CLI）、索引目录（如 `.codegraph/`） |
| 本机条件 | 能否运行容器、语言工具链版本、是否有构建不了的原生依赖 |

## 步骤

1. 按上表收集，列出每个模块的候选命令。
   完成标准：每个模块都有构建、测试、lint（若有）的候选命令及其来源。
2. **逐条实际运行**候选命令，记录成功、失败或耗时；失败的查明原因（缺依赖、需要服务、文档过时）。
   完成标准：一张「模块 × 命令 × 实测结果」表，没有未验证的命令。
3. 问用户只有用户能回答的问题：使用哪些 agent（Claude Code、Codex…）；按 [docs.md](docs.md)「工具表」的入选标准先筛选第 1 步找到的 skill、MCP 与 CLI，只把通过的列成候选（何时用、哪个 agent 下叫什么、团队成员是否都有，附推荐），由用户逐项确认——agent 不自行决定；未通过的只列名称与一句排除理由，不要求用户逐个确认；最近对 agent 的 2~3 个真实纠正；代码风格偏好；约束（能否引入容器、CI 平台、可接受的门禁严格程度）。
   完成标准：纠正案例、偏好与约束清单；用户确认过的工具清单。
4. 汇总成现状报告交用户确认，作为 init / adopt 的输入。
