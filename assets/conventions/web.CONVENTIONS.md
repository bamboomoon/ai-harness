# Web 约定

本模块的写法与正反例：每节先写通用规则，再写本仓库的函数、路径与流程。格式、类型感知 lint 与 tsc 由 `npm run check` 检查，不在此重复。

## 事件与异步

- 事件处理函数保持同步，不把 async 函数直接交给 JSX 属性（no-misused-promises）；异步工作放进 `useAsyncAction`（`src/hooks/use-async-action.ts`，负责防重入与 pending）的 `void run(...)`，失败在回调内 `try/catch` 转成界面状态。
- 定时器、订阅、监听器在创建它的 effect 清理中释放；「立即执行」的路径（清空、取消、卸载）先取消尚未触发的定时器。迟到的响应用 effect 内的 `active` 标记丢弃（见 `models-view.tsx` 的列表查询），不依赖请求顺序。
- 清理路径用 fake timers 测试：断言卸载或立即执行后旧任务不再触发——只测正常路径时，清理逻辑的变异会全部存活。
- 读取表单文本字段用 `formText(form, name)`（`src/lib/form-data.ts`）。

```tsx
// 简化自 model-provider-form.tsx 的 save
function save(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  void run(async () => {
    try {
      await createProvider(workspace.id, { name, baseUrl: formText(form, 'baseUrl') });
      onSaved();
    } catch (cause) {
      setError(cause);
    }
  });
}
```

## 外部数据与状态

- HTTP 响应、`history.state`、`JSON.parse`、动态 import 等外部数据先当 `unknown`，逐字段收窄后再用，不让 `any` 流入业务判断；`as` 只用于外部库类型不够精确、且依据写在注释里的场合。
- 请求走 `requestApi`，响应信封类型是 `ApiResponse<T>`（`src/lib/api/api.ts`）；页面组件只调 `src/lib/api/*` 的领域 API。
- 读取外部状态的正例：`settings-location.ts` 的 `readReturnUrl`（`openSettings` → `readReturnUrl` 也是 Stepdown 的例子）。
- 互斥的界面状态用可辨识联合，例：`models-view.tsx` 的 `ListState`；`switch` 覆盖所有分支，有意忽略时写 `default` 并注明原因。可由其他状态推导的值在渲染时计算，不另存一份。

## 样式

- 使用 `src/styles/globals.css` 的语义 token（Tailwind v4，无 `tailwind.config`），保留三态主题与字体设置；`@/lib/utils` 仅再导出 `cn`。

## 设计稿

界面实现以 [design/](../design/README.md) 为唯一视觉依据。

1. 动手前先读 `design/README.md`，再读目标画面对应的 `.dc.html` 与 [implementation-brief.md](../design/implementation-brief.md)。
2. 布局、层级、文案、状态与交互完全对齐设计稿，不自行增删或「优化」；颜色、尺寸一律换成令牌与 `src/ui` 现有尺寸，不照抄画板里的十六进制。
3. 冲突时的优先级：e2e 断言 > 设计系统（`design/system/`）> 单个画面。发现冲突先说明，不私自取舍。
4. 目标画面、状态（加载、空数据、报错、权限不足等）或交互在设计稿里找不到时，停下来询问用户，不自行设计或参照其他页面补一版。

## UI 组件

所有 UI 效果基于本仓库的 shadcn/ui 组件实现，优先复用现有组件及其原生能力；`ezent:page-builder` 不适用于本项目。

1. 先查 `src/ui/` 已有组件，优先复用；新增和更新统一使用 shadcn CLI，不 fork 控件源码。
2. 用 `npx shadcn@latest search @shadcn -q <关键词>` 查找、`npx shadcn@latest docs <组件>` 阅读文档，再用 `npx shadcn@latest add <组件>` 安装；禁止从 GitHub 手抓源码。
3. 更新前先用 `add <组件> --dry-run` 和 `add <组件> --diff <文件>` 检查差异，通过 CLI 更新；未经用户确认禁止 `--overwrite`。
4. 安装后检查子组件、导入路径、图标和语义 token；CLI 组件保持上游原样，不加注释、不改排版或实现，注释约定只适用于本项目自己编写的代码。保留 shadcn MIT 许可，不写逐组件移植记录。
5. 适配通过 `globals.css` 的 token / data-slot 规则或调用处组合表达；button-link、empty-state、page-header 是项目组合组件，仍遵守注释约定，不修改控件源码或手动合并上游。
6. shadcn 没有对应组件、必须引入新依赖或不能满足需求时，停下来告知用户，由用户确定，不要先手写一版。

## 测试

- 组件测试用 `createRoot` + `act`，所有 `act` 都写成 `await act(async () => ...)`；需要翻译时包 `NextIntlClientProvider`。
- 通过 `apiClient.defaults.adapter` 或 `vi.mock` 在边界替换外部依赖，断言用户可见结果与外发请求（参数、次数），不断言内部实现。
- 修 bug 先写在旧实现上失败的测试。
- 浏览器 E2E 走 `npm run test:e2e`；视觉意图写成 `toHaveCSS` 等明确断言，不做截图比对。
- 本地浏览器 MCP（claude-in-chrome、chrome-devtools）只用于排查和核对界面，结论以 E2E 断言为准。
