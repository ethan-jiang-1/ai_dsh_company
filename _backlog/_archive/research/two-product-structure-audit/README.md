---
status: 已定性
opened: 2026-11-11
---

# 两产品结构审计：产品类型 / 组织 / 角色 / 流程的一致性

> 问题：同一套六角色与流程，能否同时承载 hardware-software 与 business-software；切换产品类型时，允许值、默认值、播种、能力与方法是否一处一致。
> 消费者：用户 2026-11-11 直接授权（“当 bug，一个一个提出来；用实验证明”）；已出 BUG-061..070（全部已修），E0–E39 已跑完；两轴交付模式 v1 已落地。
> 产出的卡：[BUG-061](../../fixed_bugs/BUG-061-product-type-allowed-values-drift.md)（已修） · [BUG-062](../../fixed_bugs/BUG-062-default-product-type-contradicts-business.md)（已修） · [BUG-063](../../fixed_bugs/BUG-063-bootstrap-process-docs-always-hardware.md)（已修） · [BUG-064](../../fixed_bugs/BUG-064-methods-not-product-type-aware.md)（已修） · [BUG-065](../../fixed_bugs/BUG-065-cfo-rate-card-missing.md)（已修） · [BUG-066](../../fixed_bugs/BUG-066-coo-person-level-staffing-without-roster.md)（已修） · [BUG-067](../../fixed_bugs/BUG-067-process-docs-dead-pointers.md)（已修） · [BUG-068](../../fixed_bugs/BUG-068-base-clean-deployment-case-language.md)（已修） · [BUG-069](../../fixed_bugs/BUG-069-tier-policy-gate-coverage.md)（已修） · [BUG-070](../../fixed_bugs/BUG-070-delegation-maxdepth-example-wrong.md)（已修）
> 结论：产品类型切换曾只贯穿文档链；E0–E39 证实 10 个 bug 并已修，另把交付模式做成第二轴（project-services + managed-service，含两轴测试矩阵）；剩 2 个决策项（硬软能力前置、默认交付模式）。
> 归档：2026-11-11

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-11-experiment-plan.md](2026-11-11-experiment-plan.md) | 研究计划：E0–E15（+ E16–E39 后续审计/两轴实施） | 2026-11-11 |
| [2026-11-11-evidence-ledger.md](2026-11-11-evidence-ledger.md) | E0–E39 的假设、命令、原始输出、结论与两轴测试矩阵 | 2026-11-11 |
| [experiments/](experiments/) | 可复跑脚本（E1–E39）与 `raw/` 原始输出 | 2026-11-11 |
