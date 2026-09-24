# 外部数据：先当未知，再证明

- HTTP 响应、`history.state`、`JSON.parse`、动态 import 等进入代码时按「未经校验」处理：标注为 `unknown` 或最小的
  `Partial<...>`，逐字段做运行时判断后再使用；不让 `any` 流入业务判断（src 中 `no-unsafe-*` 会报错）。
- 统一的响应信封类型是 `ApiResponse<T>`（`src/lib/api/api.ts`），请求走 `requestApi`，不要各处手写 axios 调用。
- 类型断言（`as`）只用于「外部库类型不够精确、且判断依据写在注释里」的场合。

```ts
// 正例：settings-location.ts 读取 history.state
function readReturnUrl(): unknown {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && 'settingsReturnUrl' in state
    ? state.settingsReturnUrl
    : undefined;
}
```
