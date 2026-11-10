---
name: managed-service-pricing
description: 运维托管/维护服务的定价：套餐/分级、月费、超量、SLA 赔付、续约涨幅与双签；一页纸（decision-memo）。
---
# 运维托管 / 维护服务定价（一页纸）

> **方法契约**：适用产品类型 = all；适用交付模式 = managed-service；
> 需要事实 = kb/policy-lines.md（折扣 / 毛利 / 服务信用）、kb/rates.md（人·周成本）；缺 = fail-closed（报「缺方法 / 配置缺口」，不套 3-4-3）。
> 交付文档 = `content/delivery-modes/managed-service/document-map.md`。

## 什么时候用

- 持续 SLA / 值守 / 监控 / 月报 / 续费的动议；
- **不适用** `project-services`（项目 3-4-3）或 `productized`（产品订阅/许可）——先报缺，不硬套。

## 方法

1. **套餐/分级**：基础 / 标准 / 关键业务；服务时间、响应等级、包含量。
2. **月费/季费**：按服务成本 × 目标毛利；折扣/毛利线见 `policy-lines.md`；触线 → CFO + CEO 双签。
3. **超量/临时支持**：单价或档位；不把超量当默认收入。
4. **SLA 赔付**：服务信用上限见 `policy-lines.md`；不并入折扣、不冲减维护收入。
5. **续约**：涨幅、续约折扣、多年承诺；churn 风险与退出条款。
6. **输出**：`decision-memo.md` 一页纸，落 `drafts/vp-sales.md`；结论先行，数字标【事实/假设】。

## 边界

- 只谈定价与商务；持续成本归 CFO、SLA 可交付性归 COO、技术边界归 VP-Eng。
- 不编费率；`kb/rates.md` 的 `<待填>` = 配置缺口，先要费率或只用区间/上界并标【未证明成立】。
