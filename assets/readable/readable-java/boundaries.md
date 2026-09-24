# 边界：入参校验、数据访问与编排

## 入参校验

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

## 数据访问与事务

- ORM/Mapper 只在领域 repository 使用；其他代码通过领域 service 访问数据。
- 事务边界放在 service 的 public 方法上（`@Transactional`）；注意同类内部调用不经过代理，事务不生效。
- 跨领域流程由 service 组合各领域 service，同一流程只写一份，差异作为参数。
- 参数超过三四个且语义成组时，传一个查询对象，而不是持续追加位置参数。
