# TypeScript 模块（Next.js / Node）

- **检查入口**：`npm run check` = `prettier --check` + `eslint --max-warnings=0` + `tsc --noEmit`（Next.js 先 `next typegen`）；`test:unit`（vitest 或 node:test）；Web 的 `test:e2e` 走临时环境 + 浏览器容器，保留 `test:e2e:raw` 连接已有环境。
- **eslint**：在框架预设之上加 `typescript-eslint` 的 `recommendedTypeCheckedOnly`（Next）或 `recommendedTypeChecked`（Node），`parserOptions.projectService: true`；`switch-exhaustiveness-check`（`considerDefaultExhaustiveForUnions: true`）；`prefer-promise-reject-errors` 允许 unknown；关闭误报多的 `require-await`；测试目录关闭 `no-unsafe-*` 与 `unbound-method`；`eslint-plugin-sonarjs` 只启用 `cognitive-complexity`(20) 并只约束 `src`。依赖直接声明，不借传递依赖。
- **常见存量与修法**：`await act(同步回调)` → `await act(async () => ...)`（用 TypeScript 编译器 API 批量改）；把 async 函数直接交给 JSX 事件属性 → 同步处理函数内 `void run(async () => ...)`；HTTP 响应等外部数据以 `unknown`/`Partial<信封>` 接收再逐字段判断；`String(form.get())` → 显式判断 `typeof value === 'string'`。
- **测试**：组件测试 `createRoot` + `await act(async ...)`；通过 axios adapter 或 `vi.mock` 控制外部依赖；定时器与订阅的清理路径必须有 fake timers 测试（变异测试最常在这里发现漏洞）。E2E 见 verification.md 的浏览器容器与截图基线。
- **变异**：Stryker（`@stryker-mutator/core` + `vitest-runner`），`--mutate 文件:起止行`。
- **声明顺序**：辅助函数放在首个调用者之后（目前靠 readable 与审查）。

## 已知问题

格式：症状｜原因｜处理｜验证于。

- Next.js 构建报 `Symlink [project]/node_modules is invalid`｜Turbopack 拒绝指向项目外的 `node_modules` 软链接｜需要构建 Next 的 worktree 真实安装依赖；只跑 vitest 时可软链接｜Next.js 16，2026-09
- node:test 项目无法做变异测试｜Stryker 没有 node:test runner，command runner 每个变异跑整套测试过慢｜暂不纳入，或迁移到 vitest 后再接入｜Stryker 10，2026-09
- 布局类断言（溢出、滚动位置）在本机与 CI 结果不同｜不同系统字体宽度不同｜浏览器统一在 Playwright 官方 Linux 镜像中运行｜Playwright 1.63，2026-09
