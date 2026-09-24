# 验证体系

## 测试层级

| 层 | 内容 | 依赖 | 触发 |
| --- | --- | --- | --- |
| L0 | 格式、lint、类型、生成代码一致性 | 无 | 编辑后 hook、Stop hook、CI |
| L1 | 纯逻辑、「存储前拒绝」的校验 | 无 IO | Stop hook、CI |
| L2 | 单模块 × 真实依赖（数据库、缓存；进程 stdin/stdout） | 临时环境 | 交付关卡、CI |
| L3 | 跨模块用户旅程（浏览器 × Web × 后端） | 临时环境 + 浏览器容器 | 交付关卡、CI |
| L4 | 真实外部服务（模型、云沙箱） | 凭据 | 显式标签，手动 |

规则：行为变更在能观察到它的最低一层补测试；修 bug 先写在旧实现上失败的测试；读写存储交给 L2，不手写数据库行桩。

## 临时测试环境

一个脚本：`compose` 以独立 project 启动依赖（tmpfs、随机端口）→ 迁移 → 通过真实入口创建种子账号 → 生成连接与凭据文件并导出环境变量 → 执行传入命令 → 销毁。本地与 CI 共用。
- `docker compose --progress quiet`；`up -d --wait` 依赖 healthcheck。
- 已导出的环境变量优先于项目 dotenv，确保测试连不到开发库。
- 浏览器容器用 Playwright 官方镜像跑 `playwright run-server`，测试进程在本机经 `PW_TEST_CONNECT_WS_ENDPOINT` 与 `PW_TEST_CONNECT_EXPOSE_NETWORK='<loopback>'` 连接，容器内浏览器可访问本机 127.0.0.1；本机与 CI 渲染一致，布局类断言结果稳定。镜像版本与 `@playwright/test` 一致。
- 不做截图比对：界面频繁变化的阶段它几乎只报基线过期，还需要人逐张确认、诱导 agent 直接更新基线；视觉意图写成 `toHaveCSS`、尺寸、无横向溢出等明确断言。失败时保留关闭截图的 trace（`trace: { mode: 'retain-on-failure', screenshots: false }`），CI 不保存截图。界面稳定、需要守护设计系统时再考虑组件级视觉测试。
- 临时环境里关闭 Playwright `reuseExistingServer`，避免复用连着开发库的进程。

## 测试可信度工具（均只出报告，由 agent 处理、人审说明）

- **防篡改检查**：对比基准，标记删除的测试文件/用例、新增 skip/only/fixme、断言数量减少、快照或 golden 文件变更。
- **先红后绿**：把改动的单元测试复制到基准版本的 worktree 中运行应失败、在当前版本运行应通过。Go 精确到函数体有变化的测试函数，JS 按文件；复用依赖目录（软链接），需要构建的模块先构建。「旧实现上也通过」标记待审（重构或补覆盖属正常），「当前实现失败」退出非零。
- **变异测试（仅改动行）**：由 git diff 求改动行，只统计落在其上的变异。Go 用 gremlins（按包运行后按改动行过滤、`--timeout-coefficient 20`、打开 `--invert-logical`）；TS 用 Stryker 的 `文件:起止行`；Java 用 PIT（`targetClasses` + 行过滤）。存活或未覆盖逐条处理：补测试，或说明为等价变异（Stryker 可用 `// Stryker disable next-line <mutator>: 理由`）。
- 分工：agent 先修（补测试、删意外 skip）或按组说明；人审说明，并独占是否接受删除测试、抽查等价变异。

## hook（Claude Code 与 Codex 共用脚本）

- **编辑后（PostToolUse）**：只处理被编辑的文件，仓库根取自文件所在目录——格式化、`--fix`、声明顺序自动归位；修不掉的 lint 以 `{"decision":"block","reason":...}` 交回 agent。文件路径来自 `tool_input.file_path`（Claude Code）或 `apply_patch` 补丁头 `*** Update File:`（Codex）。目标 1~4 秒，慢工具（整包 lint）留给 Stop。
- **回合结束（Stop）**：仓库根优先取 `CLAUDE_PROJECT_DIR`，其次 hook 输入的 `cwd`；改动模块跑 check 与单元测试，失败即退回；再跑防篡改与先红后绿，新待审项退回一次——按内容指纹去重，同一组不重复阻塞；`stop_hook_active` 为真时改为 systemMessage，避免死循环。
- **交付关卡**：脚本对受影响模块跑 L2/L3 与变异测试，通过后把改动指纹写入 `.git/agent-hooks/`；Stop hook 发现有模块代码改动而指纹不符时退回一次，要求运行关卡或声明「未交付」。

## CI

与本地同一套入口：每模块 L0+L1 job、L2/L3 job 复用临时环境脚本、验证工具 job（`fetch-depth: 0`，基准为与主分支的合并基点）、文档与工作流检查（链接检查、actionlint）、末尾汇总 job（`if: ${{ !cancelled() }}`，按层输出表格）。各测试步骤 `tee` 日志，由 `if: always()` 的步骤把关键数字写入 `$GITHUB_STEP_SUMMARY`；`defaults.run.shell: bash` 以启用 pipefail。固定运行器版本（如 `ubuntu-24.04`），使用当前大版本的官方 action，保持 annotations 为零。

## 已知问题

格式：症状｜原因｜处理｜验证于。工具升级后先按「验证于」复查，已不存在的条目删除。

- Codex 不执行项目级 hook｜Codex 只为已信任项目加载 `.codex/hooks.json`｜在 `~/.codex/config.toml` 为项目设 `trust_level = "trusted"`，首次运行确认 hook 信任；自动化用 `--dangerously-bypass-hook-trust`（仅限已审查的 hook）｜codex-cli 0.156.0，2026-09
- `codex exec` 无输出地挂起｜非终端下等待额外 stdin｜调用时加 `< /dev/null`｜codex-cli 0.156.0，2026-09
- Codex 沙箱中 hook 写不了仓库外的文件｜`workspace-write` 沙箱同样约束 hook 命令｜hook 只写仓库内（如 `.git/agent-hooks/`）｜codex-cli 0.156.0，2026-09
- 修改 hook 配置后 Claude Code 行为不变｜会话启动时读取 hook 配置｜新开会话或在 `/hooks` 中确认｜2026-09
- subagent 修改后未触发 Stop 检查｜Stop hook 只在主会话回合结束触发｜检验 hook 效果时用独立会话（`claude -p`、`codex exec`）；subagent 需自行运行交付关卡｜2026-09
- CI annotations 数量对不上｜GitHub 接口默认每页 30 条｜统计时翻页（`per_page`）｜2026-09
- 推送后上一轮 CI 的汇总 job 报失败｜`cancel-in-progress` 取消旧运行，`if: always()` 的汇总 job 把取消当失败｜汇总 job 用 `if: ${{ !cancelled() }}`｜2026-09
