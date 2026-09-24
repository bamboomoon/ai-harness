# 事件处理与异步生命周期

- 传给 `onClick`/`onSubmit`/`onChange` 的函数是同步函数；异步工作放进 `void run(async () => { ... })`
  （`src/hooks/use-async-action.ts` 负责防重入和 pending），失败在回调内 `try/catch` 转成界面状态。
- 读取表单文本字段用 `formText(form, name)`（`src/lib/form-data.ts`），不要 `String(form.get(name))`。

```tsx
// 正例（简化自 model-provider-form.tsx 的 save）
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

// 反例：把 async 函数直接交给 JSX 属性，拒绝无人处理（no-misused-promises）
<form onSubmit={async (event) => { await login(...) }}>
```

## 异步与资源生命周期

- 定时器、订阅、监听器在创建它的 effect 的清理函数里释放；「立即执行」的路径（清空、Esc、卸载）要先取消尚未触发的定时器。
- 迟到的响应用 effect 内的 `active` 标记丢弃（见 `models-view.tsx` 的列表查询），不要依赖请求顺序。
- 这些清理路径必须有测试覆盖：用 fake timers 推进时间，断言卸载或立即执行后旧定时器不再触发请求。
  基线实验中只测「300ms 后发请求」的防抖实现，清理逻辑的变异全部存活。
