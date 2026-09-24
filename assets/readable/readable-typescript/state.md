# 状态用类型表达

- 互斥状态用可辨识联合，而不是多个可选字段拼凑。

```ts
type ListState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; items: Item[] };
```

- `switch` 覆盖联合的所有分支；有意忽略其余分支时写 `default` 并注明原因（`switch-exhaustiveness-check`）。
- 可由其他状态推导的值在渲染或读取时计算，不另存一份需要同步的状态。
