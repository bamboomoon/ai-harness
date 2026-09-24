# init：为新项目铺好机制

新项目没有存量，一次铺好，之后每条纠正走 [correct](correct.md)。先完成 [discover](discover.md)（新项目主要是确认技术栈、运行方式、使用的 agent 与风格偏好）。

1. **静态检查**：为每个模块选定格式、lint（含依赖方向与 Clean Code 护栏）、类型检查，并提供单一 `check` 入口；工具选择见 [stack-go.md](stack-go.md)、[stack-typescript.md](stack-typescript.md)、[stack-java.md](stack-java.md)。
   完成标准：空项目上 `check` 通过，故意的违规被拦下。
2. **测试骨架**：按项目实际需要的层放最小示例——L1 单元；有外部依赖时 L2 集成（可复现的测试环境）；有用户入口时 L3 端到端。没有的层不建。
   完成标准：各层示例一条命令通过。
3. **验证工具、hook、交付关卡、CI**：按 [verification.md](verification.md) 的目标实现，可参考 [../assets/README.md](../assets/README.md)，命令与路径以本项目为准。
   完成标准：hook 用模拟输入验证一次；CI 首次运行全绿。
4. **规则与风格**：写根 AGENTS（必读 CONVENTIONS 提示、何时 | 读、用户确认过的工具表、纠正回路及其落点表、测试规则）与模块 AGENTS（核心原则、何时 | 读、验证入口），以 [../assets/style/](../assets/style/) 模板为起点写模块核心原则并为每个模块建 `CONVENTIONS.md`（见 [style.md](style.md)，先用偏好清单填充），加 PR 模板。
   完成标准：链接检查通过，CONVENTIONS 每条规则都有正例。
