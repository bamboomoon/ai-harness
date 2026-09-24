# TypeScript：候选工具与选择依据

优先沿用项目已有的工具与 scripts；下面是缺失时的候选，以及选择时要判断的事。

| 目标 | 候选 | 判断 |
| --- | --- | --- |
| 统一入口 | `package.json` 的 `check` = 格式检查 + lint + 类型检查 | 框架需要先生成类型时（如 Next.js 的 typegen）放进入口 |
| lint | ESLint + `typescript-eslint` 类型感知规则（`projectService`）；框架官方预设 | 类型感知规则能拦截漏处理的 Promise、异步回调误用、switch 漏分支；误报多的风格类规则可关闭；测试目录可放宽 `no-unsafe-*` |
| 格式 | Prettier 或项目已有的格式化工具 | 首次接入会产生一次纯格式改动，单独提交 |
| 依赖方向 | ESLint 边界规则（如 eslint-plugin-boundaries）、dependency-cruiser | 项目有明确分层时加入 |
| Clean Code 护栏 | `eslint-plugin-sonarjs` 的 `cognitive-complexity` | 只约束生产代码，阈值作上限 |
| 单元/组件测试 | 项目已有的 Vitest/Jest/node:test | React 组件测试的 `act` 用 async 回调；定时器与订阅的清理路径要有测试 |
| 端到端 | Playwright（浏览器可运行在固定容器中） | 视觉意图写成明确断言 |
| 变异测试 | Stryker（`--mutate 文件:起止行`，需对应测试运行器插件） | 测试运行器没有 Stryker 插件时暂缓 |

常见存量修法（采用类型感知规则后）：`await act(同步回调)` 改为 async 回调；把 async 函数直接交给事件属性改为同步处理函数内显式忽略返回的 Promise；外部数据以 `unknown` 接收再逐字段判断。批量修改可借助 TypeScript 编译器 API 精确定位。

## 已知问题

格式：症状｜原因｜处理｜验证于。

- Next.js 构建报 `Symlink [project]/node_modules is invalid`｜Turbopack 拒绝指向项目外的 `node_modules` 软链接｜需要构建 Next 的 worktree 真实安装依赖；只跑 vitest 时可软链接｜Next.js 16，2026-09
- node:test 项目无法做变异测试｜Stryker 没有 node:test runner，command runner 每个变异跑整套测试过慢｜暂不纳入，或迁移到 vitest 后再接入｜Stryker 10，2026-09
- 布局类断言（溢出、滚动位置）在本机与 CI 结果不同｜不同系统字体宽度不同｜浏览器统一在 Playwright 官方 Linux 镜像中运行｜Playwright 1.63，2026-09
