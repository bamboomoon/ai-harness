# 事件处理与异步生命周期

- 传给事件属性（`onClick`/`onSubmit` 等）或回调接口的函数保持同步；异步工作放进一个显式启动的任务，失败在任务内转成界面状态或上报，不留无人处理的拒绝。
- 防重入与 pending 状态由一处 helper（项目已有时复用）负责，不在每个组件里各写一遍。

```tsx
// 正例
function save(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  void run(async () => {
    try {
      await createItem(readForm(event.currentTarget));
      onSaved();
    } catch (cause) {
      setError(cause);
    }
  });
}

// 反例：async 函数直接交给 JSX 属性，拒绝无人处理（no-misused-promises）
<form onSubmit={async (event) => { await createItem(...) }}>
```

## 资源生命周期

- 定时器、订阅、监听器在创建它的 effect 或作用域的清理函数里释放；「立即执行」的路径（清空、取消、卸载）先取消尚未触发的定时器。
- 迟到的响应用 `AbortController` 或 effect 内的 `active` 标记丢弃，不依赖请求顺序。
- 清理路径用测试覆盖：fake timers 推进时间，断言卸载或立即执行后旧任务不再触发。只测正常路径时，清理逻辑的变异往往全部存活。
