# Java 写法模板

生成模块 AGENTS 与 CONVENTIONS 的起点（见 [../../references/style.md](../../references/style.md)），不是可安装的 skill：
- 「语言要点」并入模块 AGENTS 的「核心原则」（压成一两行）；
- 其余各节并入模块 CONVENTIONS 的对应主题：通用规则在前，改写成项目实际的类型、函数与路径，补本仓库正例；项目没有的主题删掉。

## 语言要点

- public 方法在上，private 方法放在首个调用它的方法之后，而不是集中堆在类末尾。
- 值对象用 `record` 或 final 字段；集合对外返回不可变视图。
- 注释与 Javadoc 只写 why 与契约（前置条件、异常、取舍）。

## 边界：入参校验、数据访问与编排

### 入参校验

- 格式约束在信任边界只写一处：DTO 上的 Bean Validation 注解（`@NotBlank`、`@Size`、`@Pattern`），入口用 `@Valid`/`@Validated` 触发；controller 与 service 不写同义的 `if`。
- 领域格式规则定义一次，做成自定义约束注解供 HTTP 使用；非 HTTP 入口调用同一个校验器。
- 校验失败由统一异常处理（如 `@RestControllerAdvice`）转成响应，不在每个 controller 里 catch。
- 业务判定（重名、权限、状态、存在性）不是格式校验，留在 service，抛领域异常。

```java
// 正例：约束写在 DTO 上
public record CreateUserRequest(
    @NotBlank @Account String account,
    @Email String email) {}

// 反例：注解已能表达的规则，service 又手写一遍
if (request.account() == null || request.account().isBlank()) {
    throw new BadRequestException("account required");
}
```

### 数据访问与事务

- ORM/Mapper 只在领域 repository 使用；其他代码通过领域 service 访问数据。
- 事务边界放在 service 的 public 方法上（`@Transactional`）；注意同类内部调用不经过代理，事务不生效。
- 跨领域流程由 service 组合各领域 service，同一流程只写一份，差异作为参数。
- 参数超过三四个且语义成组时，传一个查询对象，而不是持续追加位置参数。

## 异常

- 可预期失败（业务拒绝）用项目统一的领域异常表达，携带错误码；在统一异常处理中转成响应并记录一次日志。
- 基础设施异常包装时保留 cause（`new XxxException("cannot ...", e)`）；它不能被转换成业务结论。
- 只在具备恢复、转换或隔离能力的边界 catch；中间层不 catch-log-rethrow，不吞异常，不 catch `Exception` 后返回默认值。
- `Optional` 用于表达「可能没有」的返回值，不用于字段和参数；缺失属于错误时直接抛领域异常。

## 测试

- 纯逻辑与「存储前拒绝」的校验写单元测试（JUnit 5 + AssertJ），不启动 Spring 上下文。
- 读写数据库的行为写集成测试（Testcontainers 真实数据库），不 mock repository 去模拟 SQL 语义。
- 真实入口契约（HTTP、消息、持久化副作用）由端到端或切片测试（`@SpringBootTest` + 真实依赖）覆盖。
- 修 bug 先写在旧实现上失败的测试；断言可观察结果与精确错误码，Mockito `verify` 只用于外发副作用。

## 资源与并发

- 需要关闭的资源用 try-with-resources，获取、使用与释放在同一作用域。
- 线程与异步任务由受管的执行器拥有（项目的线程池或虚拟线程执行器），不随手 `new Thread`；任务有明确的停止条件与失败观察。
- 捕获 `InterruptedException` 后恢复中断标志或向上抛出，不吞掉。
- 锁保护共享不变量；优先不可变对象与并发集合，减少需要加锁的共享可变状态。
