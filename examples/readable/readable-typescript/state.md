# 状态用类型表达

- 互斥状态用可辨识联合，而不是多个可选字段拼凑。

```ts
// 正例：models-view.tsx
type ListState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; providers: ModelProvider[]; models: ModelPage };
```

- `switch` 覆盖联合的所有分支；有意忽略其余分支时写 `default` 并注明原因（`switch-exhaustiveness-check`）。
