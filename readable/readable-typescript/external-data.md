# 外部数据：先当未知，再证明

- 进入代码的外部数据按「未经校验」处理：标注为 `unknown`，用项目已有的 schema 库（如 zod）或逐字段运行时判断收窄后再用；不让 `any` 流入业务判断。
- 请求走项目统一的 API 客户端与响应类型，不在各处手写 fetch/axios 调用与信封解析。
- 类型断言（`as`）只用于外部库类型不够精确、且判断依据写在注释里的场合。

```ts
// 正例：逐字段证明后再使用
function readReturnUrl(): unknown {
  const state: unknown = window.history.state;
  return typeof state === 'object' && state !== null && 'returnUrl' in state
    ? state.returnUrl
    : undefined;
}

// 反例：断言不改变数据，只是把风险推给后面的代码
const { returnUrl } = window.history.state as { returnUrl: string };
```
