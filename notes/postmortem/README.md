# 事故复盘（Post-mortems）

**什么时候写**（照 DSH `vendor/dsh/docs/postmortem/README.md` 的标准）：一个 bug 到了它不该到的地方
（真人用户、已合并的 PR、发布），而且值得记的不是那一行修复，而是**为什么我们的流程放过了它**。
三个条件同时成立才写：

- **微妙**：机制不直观，一个认真的工程师也得重推一遍；
- **系统性**：它逃掉的原因是测试/工具/约定上的缺口，不是一次性笔误；
- **重查代价高**：已经花了真实调试时间，将来还会再花。

**不是** Agent Note（那记的是有意决策与备选方案）；复盘是**向后看**的失败记录：什么坏了、机制、
为什么所有安全网都没拦住、**加了什么具体护栏**让同类失败下次响起来。护栏要链接到本复盘。

**格式**（同 DSH）：开头一段 **Executive summary**（30 秒能读完：坏了什么、根因、为何逃掉、
可复用的教训），之后是 Summary / Timeline / Root cause / Guardrails added / Lessons。
Timeline 必须给**证据坐标**（会话 id、事件序列、RPC 报错原文），不从后来的报告反推意图。

| # | 标题 | 一句话 |
|---|---|---|
| [0001](0001-preset-required-config-mount-failure.md) | preset 挂载失败：工具行缺必填 config | 扫描/roster/dump 全绿，因为没人**挂载**过；用户在 UI 里发现 |
| [0002](0002-client-plugin-module-table-gap.md) | client 插件挂到虚空：浏览器模块表没枚举它 | host 侧正常、模块也在伺服，但依赖不在模块表 → 静默不挂载 |

两篇的共同缺陷（也是本目录存在的原因）：**最后一次检查由人在浏览器里做**。对应的纪律与门禁见
`AGENTS.md` 纪律表与 `docs/guides/60-dev-loop.md` §2；外部证据见
[`notes/research/2026-09-22-agent-workflow-community-practice.md`](../research/2026-09-22-agent-workflow-community-practice.md)。
