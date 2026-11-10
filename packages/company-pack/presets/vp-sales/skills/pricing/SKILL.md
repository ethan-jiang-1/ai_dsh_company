---
name: pricing
description: 定价方法（project-services）：里程碑收款 3-4-3、维护年费、折扣 / 毛利双签；productized 缺产品定价方法 → fail-closed。
---
# 定价（项目制 / SI）

> **方法契约**：适用产品类型 = all；适用交付模式 = project-services；
> 需要事实 = kb/policy-lines.md（折扣 / 毛利 / 维护年费）、kb/rates.md（人·周成本）；缺 = fail-closed（报「缺方法 / 配置缺口」，不套 3-4-3）。
> 交付文档 = `content/delivery-modes/project-services/document-map.md`。

## 什么时候用

- 客户现场交付、系统集成、定制开发、带实施的项目；
- `productized` 动议（含 SaaS / 私有化 / 永久授权）**不适用**：订阅、ARR、CAC、留存、SLO 的定价口径还没有方法包——先报「缺方法」，不要拿项目制收款曲线硬套。

## 方法

1. **收款曲线**：合同额按里程碑拆（公司惯例 3-4-3）；维护年费单列，口径见 `.dsh-company/kb/policy-lines.md`。
2. **成本基线**：人力按人·周 × 条线；费率卡 = `.dsh-company/kb/rates.md`；`<待填>` = 配置缺口，先要费率；拿不到用区间 / 上界并标【未证明成立】，不编美元数。
3. **线**：折扣 / 毛利线见 `.dsh-company/kb/policy-lines.md`；触线 → CFO + CEO 双签（`request_signoff`），毛利测算找 CFO。
4. **现金流**：垫资超一个月先过 CFO；收款滞后一档公司现金能不能撑——撑不住即 veto。
5. **边界**：定价建议归 VP-Sales；成本口径归 CFO；不替研发 / 运营签字。

## 反模式

- 把 SaaS 订阅 / 永久授权套成 3-4-3；
- 用未核实的费率出美元结论；
- 把维护年费当折扣对价。
