# Server 开发指引

Go（Gin、pgx + sqlc、PostgreSQL、Redis）业务后端。本文件写 server 的核心原则、阅读路由与验证入口，本仓库写法在 CONVENTIONS.md。

**写、改或审查本模块代码之前，先完整阅读 [CONVENTIONS.md](CONVENTIONS.md)。**

## 核心原则

- **单一抽象层级**：编排函数（构造函数、`main`、组合多个领域 service 的方法）每步一行；某步需要自己的判断或错误分支时，抽成按意图命名的函数。
- **Stepdown**：主流程在上，辅助函数放在首个调用者之后。
- **SRP**：handler 只做绑定与响应；service 做业务判定与跨领域编排；repo 只做持久化。
- **DRY**：同一知识只写一份；按知识与变化原因判断，而不是按代码形状相似。
- **YAGNI**：抽象、扩展点与配置只为真实存在的需求而设，第二个真实用例出现时再抽象。
- **迪米特**：只与直接协作者交互，跨边界经对方公开的接口协作。
- **CQS**：查询不改变状态；命令的副作用在名字和签名上可见。
- **意图命名**：名称说明角色与差异，what 由命名与结构表达。
- **Go 要点**：接口在使用方定义，只为真实存在的替换点而建；`context.Context` 作为第一个参数沿调用链传递，不存进结构体；零值与「未设置」语义不同时用指针或专门类型区分。
- **框架优先**：先用框架和已安装依赖的惯用能力；自定义代码只承载业务规则。
- **注释只写 why**：写动机、约束、取舍与踩过的坑，关联需求时附 issue 链接（如 `#123`）；不写复述代码的 what 注释——agent 写的 what 注释多半在为短期 hack 找补，最先过时。修改到的函数上已有的 what 注释顺手删除或改写为 why。注释用中文。
- **删除优于兼容**：内部重构直接删除旧实现并更新全部调用方，不留兼容层、deprecated 转发或双写；对外契约（HTTP API、数据库迁移）的兼容性单独评估，改动前说明影响并经用户确认。

## 参考文档

| 文件                                               | 作用                                               |
| -------------------------------------------------- | -------------------------------------------------- |
| [CONVENTIONS.md](CONVENTIONS.md)                   | 本模块的编码约定与正反例（写、改或审查代码前必读） |
| [README.md](README.md)                             | 模块概览与本地运行                                 |
| [docs/model-providers.md](docs/model-providers.md) | 模型提供方接口契约                                 |
| [docs/models.md](docs/models.md)                   | 模型管理接口契约                                   |
| [e2e/README.md](e2e/README.md)                     | E2E 怎么运行                                       |
| [e2e/WRITING.md](e2e/WRITING.md)                   | E2E 怎么写                                         |

## 验证

在 `server/` 执行，工具版本锁在 `tools.mod`，无需全局安装：

1. `make check`：L0 静态检查。
2. `make test`：L1 单元测试。
3. `make integration`：L2 集成测试，在 Docker 临时 PostgreSQL/Redis 中运行；改动读写存储时必跑。
4. `make e2e`：L3 E2E，在临时环境中运行生产进程；改动 HTTP 或 CLI 入口时必跑。
5. `make e2e LABEL=real-llm`：L4 真实模型，可能收费，经用户同意后手动运行。

1–2 由回合结束 hook 自动运行；3–4 由交付关卡 `scripts/verify-delivery.sh` 统一运行。
