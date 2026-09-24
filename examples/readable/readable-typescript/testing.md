# 测试

- 组件测试用 `createRoot` + `act`，所有 `act` 都写成 `await act(async () => ...)`；需要翻译时包 `NextIntlClientProvider`。
- 通过 `apiClient.defaults.adapter` 或 `vi.mock` 控制外部依赖，断言用户可见结果与外发请求（参数、次数），不断言内部实现。
- 浏览器 E2E 走 `npm run test:e2e`（临时环境 + Linux 浏览器容器）；视觉意图写成明确断言，不做截图比对。
