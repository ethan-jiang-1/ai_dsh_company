---
status: 已定性
opened: 2026-11-08
---

# workflow + subagent 探索测试：只有 W / 只有 S / 混合一次 / 混合多次

> 问题：在 VP-Eng 根 / CEO 命名 child / VP-Eng teammate 三个入口下，workflow 与 subagent 的四类用法
> （只 workflow / 只 subagent / 混合一次 / 混合多次）是否都能看见、选对、跑通、合对？并发与 depth 边界如何？
> 消费者：[探索性测试 bug-hunt 问题卡](../../issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)、
> [eng-teaming](../../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md)、
> [delegation 合同](../../../docs/delegation.md)、[workflow 通道 Note](../../../notes/implemented/2026-11-08-vpeng-workflow-channel.md)、
> 常驻 probe [vp-eng-workflow-probe](../../../probes/team/vp-eng-workflow-probe.mjs)。
> 产出的卡：[探索性测试 bug-hunt 问题卡](../../issues/2026-11-08-workflow-subagent-exploratory-bug-hunt.md)；具体缺陷按证据另行分诊。
> 结论：（第一轮探索已跑：能力面与主要失败模式已定性——3 张 P2 缺陷卡 + 2 条当场修；剩余方向 = 长期采纳率、部署面、更多 natural 变体，未覆盖项见材料 §16.3）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-08-exploration-plan.md](2026-11-08-exploration-plan.md) | 探索测试计划：背景/已证事实/场景矩阵/两遍法/fixtures/判据/预算/处置/Review 清单/交接 | 2026-11-08 |
