# TypeScript 写法模板

生成模块 AGENTS 与 CONVENTIONS 的起点（见 [../../references/style.md](../../references/style.md)），不是可安装的 skill：
- 「语言要点」并入模块 AGENTS 的「核心原则」（压成一两行）；
- 其余各节并入模块 CONVENTIONS 的对应主题：通用规则在前，改写成项目实际的类型、函数与路径，补本仓库正例；项目没有的主题删掉。

## 语言要点

- 类型表达有效状态：互斥状态用可辨识联合，而不是多个可选字段拼凑。
- 外部数据先当 `unknown`，经运行时判断收窄后再用；`as` 不改变数据。
- 局部让类型推导，公开边界（导出函数、模块接口）写显式类型。
- `readonly` 只是静态限制，共享引用的修改权限取决于实际所有权。

## 外部数据：先当未知，再证明

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

## 事件处理与异步生命周期

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

### 资源生命周期

- 定时器、订阅、监听器在创建它的 effect 或作用域的清理函数里释放；「立即执行」的路径（清空、取消、卸载）先取消尚未触发的定时器。
- 迟到的响应用 `AbortController` 或 effect 内的 `active` 标记丢弃，不依赖请求顺序。
- 清理路径用测试覆盖：fake timers 推进时间，断言卸载或立即执行后旧任务不再触发。只测正常路径时，清理逻辑的变异往往全部存活。

## 状态用类型表达

- 互斥状态用可辨识联合，而不是多个可选字段拼凑。

```ts
type ListState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; items: Item[] };
```

- `switch` 覆盖联合的所有分支；有意忽略其余分支时写 `default` 并注明原因（`switch-exhaustiveness-check`）。
- 可由其他状态推导的值在渲染或读取时计算，不另存一份需要同步的状态。

## 测试

- 组件测试断言用户可见结果与外发请求（参数、次数），不断言内部实现；异步更新全部等待完成再断言。
- 外部依赖在边界替换（HTTP 适配器、模块 mock），不替换被测模块内部的函数。
- 浏览器端到端测试把视觉意图写成明确断言（可见性、文本、样式属性），而不是截图比对。
- 修 bug 先写在旧实现上失败的测试。
