---
status: 已定性
opened: 2026-11-10
---

# 组织协同拓扑：CEO 五条汇报线、VP-Eng 研发负载与 workflow/subagent 的分工

> 问题：为什么 CEO 的 `delegation` 只有 `vp_eng` / `vp_sales` / `vp_cmo` 三条角色命名行，而 persona 说有五个直接汇报？VP-Eng 在 SA/SQA 退役后靠什么承担硬软一体研发？整个组织应如何用 workflow / subagent / team 协同，哪些是 vendor 边界、哪些是本仓没接上的？
> 消费者：用户 2026-11-10 研究请求（无卡）；[delegation 合同](../../../docs/contracts/delegation.md)、[presets 合同](../../../docs/contracts/presets.md)、[eng-teaming](../../../packages/company-pack/presets/vp-eng/skills/eng-teaming/SKILL.md)、[quality-loop](../../../packages/company-pack/presets/_shared/skills/quality-loop/SKILL.md)、[两件套 Note](../../../notes/archived/2026-11-06-ceo-two-artifact-team-rule.md)。
> 产出的卡：[产品类型语义](../../issues/2026-11-10-product-type-semantics.md)、[动议级产品类型](../../issues/2026-11-10-motion-product-type.md)、[SA/SQA 方法包](../../issues/2026-11-10-sa-sqa-method-packs.md)、[COO/CFO 通道](../../issues/2026-11-10-coo-cfo-delegation.md)（2026-11-10 立卡，均推敲中）。
> 结论：方向对、闭环没做完——CEO 命名图只覆盖 3/5 汇报线，COO/CFO 在 CEO 会话里只能以「继承 CEO 组合」的 teammate 出现（真 preset 需多人模式开根会话）；VP-Eng 的 SA/SQA 退役后只剩「方法外置」的质量环骨架，没有默认可用的系统架构/V&V 方法包；workflow 是 VP-Eng 的同身份扇出，不是跨角色编排。产品类型按动议声明（`hardware-software` / `business-software`；用户 2026-11-10 已定名 `business-software`，`software` 保留为未来上位命名空间），公司默认只做回落；建议先补 CEO 覆盖、团队方法注入、系统方法包三处，不恢复旧 SA/SQA preset。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-10-org-coordination-topology.md](2026-11-10-org-coordination-topology.md) | 主材料：机制事实、组织图 vs 运行时图、CEO 3/5 覆盖、SA/SQA 空洞、四通道分工、选项与建议 | 2026-11-10 |
| [2026-11-10-product-type-model.md](2026-11-10-product-type-model.md) | 产品类型：`b2b-saas` 太窄、`business-software`/`hardware-software` 的链与动议级路由 | 2026-11-10 |
| [2026-11-10-sa-sqa-method-packs.md](2026-11-10-sa-sqa-method-packs.md) | SA/SQA 方法包：系统架构 + V&V 的两侧方法、安装与升级 | 2026-11-10 |
