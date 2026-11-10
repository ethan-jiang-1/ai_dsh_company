---
name: managed-service-economics
description: 运维托管/维护服务的持续经济性：经常性收入、值班/人力成本、SLA 赔付、续约/流失；一页纸（decision-memo）。
---
# 运维托管 / 维护服务经济性（一页纸）

> **方法契约**：适用产品类型 = all；适用交付模式 = managed-service；
> 需要事实 = kb/roster.md（席位 / 值班）、kb/rates.md（人·周成本）；缺 = fail-closed（报「缺方法 / 配置缺口」，不套 3-4-3、不编数）。
> 交付文档 = `content/delivery-modes/managed-service/document-map.md`。

## 什么时候用

- 持续 SLA / 值守 / 监控 / 月报 / 续费的动议；
- **不适用** `project-services`（一次性 SOW/UAT）或 `productized`（产品许可/订阅）——那两种缺各自的经济方法，先报缺。

## 方法

1. **收入侧**：月度/季度服务费 × 合同期；套餐/分级/超量；续约涨幅；**不是** 3-4-3 里程碑收款。
2. **成本侧**：服务 FTE / 值班 / 工具 / 备份 / 现场支持；按 `kb/roster.md` 的席位与 `kb/rates.md` 的人·周成本算；`<待填>` = 配置缺口，先要费率。
3. **毛利与赔付**：经常性毛利 = 服务费 − 持续成本；按 `policy-lines.md` 的毛利/折扣线；SLA 赔付按 `policy-lines.md` 的服务信用上限预留，不并入折扣。
4. **现金**：月付/季付/预付；续约与流失对现金流的影响；没有项目里程碑可依赖。
5. **风险**：churn、范围蔓延、24×7 值班成本、单一客户集中、第三方依赖；每条给兜底。
6. **输出**：`decision-memo.md` 一页纸，落 `drafts/cfo.md`；结论先行，数字可复现。

## 边界

- 只谈财务与持续经济性；SLA 可交付性归 COO、技术可运维性归 VP-Eng、续约商务归 VP-Sales。
- 不把一次性实施收入混进经常性收入；实施是 project-services，另开动议。
