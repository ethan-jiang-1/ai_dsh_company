---
status: 已定性
opened: 2026-11-06
---

# SA/SQA 产物评审：两个新子人格的产出到底行不行

> 问题：VP-Eng 起的系统架构师（SA）与系统质量保证（SQA）产出的架构稿与 V&V 计划，技术判断站不站得住？
> 消费者：[SA/SQA 落地 Note](../../../../notes/archived/2026-11-06-sa-sqa-subpersonas.md)、
> [BUG-034](../../../_archive/fixed_bugs/BUG-034-no-absolute-time-source-for-signed-records.md)、
> [BUG-035](../../../_archive/fixed_bugs/BUG-035-short-circuit-withstand-undefined.md)
> 产出的卡：[BUG-034](../../../_archive/fixed_bugs/BUG-034-no-absolute-time-source-for-signed-records.md)、[BUG-035](../../../_archive/fixed_bugs/BUG-035-short-circuit-withstand-undefined.md)
> 结论：产物「能用但不能全信」——收口接线 3 轮 10/10、SQA 独立抓出 4 条互斥口径、SA 的量化主张逐条核算全对
> （I²R / 信号幅度 / SPI 带宽 / 功耗预算 / 耐压），工程判断站得住；但两个子人格**共同**漏掉同一类属性——「边界外
> 但物理在路径内・业务依赖却没人测」，落成 BUG-034（无绝对时间源，签名不可举证）与 BUG-035（无故障电流耐受），
> 两条均已于 2026-11-07 修复；且同一审计规则跨轮不稳定（v4 的 Q1/Q2 全过 vs v5 缺列 + 声称 21 条实有 23 条），
> 说明规则文本必须写成硬判据而非建议。判不了的是架构取舍与阈值合理性（需行业标准原文与真实客户场景）。
> SA/SQA 两个子人格已于 2026-11-09 退役、方法侧由 SA/SQA 方法包承接，本轮到此收口。
> 归档：2026-11-10（末张活卡已结）；归档后仍可被活跃卡引用，引用不等于让研究「复活」。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-06-artifact-review.md](2026-11-06-artifact-review.md) | 逐条核算的量化主张、SQA 抓到的真阻断、我找出的两条缺陷、产品漂移归因 | 2026-11-06 |
