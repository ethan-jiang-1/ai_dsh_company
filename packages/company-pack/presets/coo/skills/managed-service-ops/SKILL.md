---
name: managed-service-ops
description: 运维托管/维护服务的可交付性：SLA、服务目录、Runbook/值班、事件、月报、续约/退出；一页纸（ops-review-note）。
---
# 运维托管 / 维护服务可行性（一页纸）

> **方法契约**：适用产品类型 = all；适用交付模式 = managed-service；
> 需要事实 = kb/roster.md（席位 / 值班）；缺 = fail-closed（报「缺方法 / 配置缺口」，不判「没人」、不编人名）。
> 交付文档 = `content/delivery-modes/managed-service/document-map.md`。

## 什么时候用

- 持续 SLA / 值守 / 监控 / 月报 / 续费的动议；
- **不适用** `project-services`（一次性 SOW/UAT）或 `productized`（无运维 SLA）——那两种缺各自交付方法，先报缺。

## 方法

1. **SLA 可交付性**：可用性、响应/恢复时限、服务时间、维护窗口；写不出可计量口径 = 接不住。
2. **服务目录**：卖哪些服务项、分级、服务时间、超量/临时支持怎么计；价格只写指针。
3. **Runbook / 值班**：监控、备份、升级/回滚、维护窗口、一线/二线/升级路径；值班人力从 `kb/roster.md` 的席位来，`<待填>` = 配置缺口，不判「没人」。
4. **事件与月报**：P1/P2 分级、沟通、复盘；月报引用事件表，不另写数字。
5. **续约/退出**：到期前价值回顾、churn 风险、退出/移交；与 VP-Sales 分工。
6. **输出**：`ops-review-note.md` 一页纸，落 `drafts/coo.md`；结论先行，行使 veto 要写理由。

## 边界

- 只谈持续交付与 SLA；持续经济性归 CFO、续约定价归 VP-Sales、技术可运维性归 VP-Eng。
- 24×7 值班必须单列成本与人力，不靠“大家辛苦一下”。
