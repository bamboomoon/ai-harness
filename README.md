# agent-harness

一个 agent skill：为代码仓库建立 AI coding 机制——规则路由、lint 护栏、测试分层与临时环境、测试可信度检查（防篡改、先红后绿、改动行变异测试）、Claude Code 与 Codex 共用的 hook、交付关卡与 CI。支持 Next.js/TypeScript、Node TypeScript、Go、Java。

- 入口：[SKILL.md](SKILL.md)（init 新项目 / adopt 已有项目 / correct 纠正回路）
- 风格指南基线：[readable/](readable/)（readable-code、readable-go、readable-typescript、readable-java），可单独安装，也是项目化的起点
- 参考实现（示例）见 [examples/README.md](examples/README.md)

## 安装

```sh
ln -s "$PWD" ~/.agents/skills/agent-harness          # Codex 等读取 ~/.agents/skills
ln -s ~/.agents/skills/agent-harness ~/.claude/skills/agent-harness   # Claude Code

# 可选：单独使用风格指南基线（项目内已有项目化版本时，项目级优先）
for s in readable/*/; do ln -s "$PWD/$s" ~/.agents/skills/; done
```
