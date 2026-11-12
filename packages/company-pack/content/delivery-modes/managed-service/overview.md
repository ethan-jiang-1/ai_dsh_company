# 运维托管 / 维护服务 · 交付模式

> 层：交付模式 · 加载：按需（T2）。这是**持续服务**，不是一次性项目，也不是产品许可/订阅。
> 产品类型回答“造什么”，交付模式回答“怎么持续交付”。动议可以组合：
> `business-software × managed-service`（托管应用）、`hardware-software × managed-service`（设备运维）。

## 什么时候用

- 客户买的是**持续 SLA**：可用性、响应/恢复时限、值班、监控、备份、维护窗口；
- 有维护合同、托管运维、月度服务回顾、续费/退出；
- 交付没有“项目结束”那一天，只有服务周期与续约。

**不要用**：
- 一次性实施/上线 → `project-services`；
- 只卖许可/订阅、没有运维 SLA → `productized`；
- 一个动议同时有“实施项目 + 长期维护”：拆成两个动议（实施 = project-services，维护 = managed-service），
  或明确本次只做一个；**一个动议只写一个交付模式**。

## 两轴组合

| 产品类型 | 交付模式 | 需求链 | 追加交付物 |
|---|---|---|---|
| business-software | managed-service | MRD → StRS → PRD | SLA / 服务目录 / Runbook / 事件 / 月报 / 续约 |
| hardware-software | managed-service | 同上（可选 SyRS/IRS/V&V） | 同上 + 备件/现场响应 |
| business-software | project-services | MRD → StRS → PRD | SOW / UAT / RACI / 里程碑 |
| business-software | productized | MRD → StRS → PRD | 无 SOW/UAT/SLA |

**需求链仍由产品类型决定；managed-service 只追加持续服务文档与 SLA 口径。**

## 动议户口

```yaml
productType: business-software
deliveryMode: managed-service
```

不写 `交付模式` = `productized`。有持续 SLA / 值班 / 月报 / 续费，就写 `managed-service`。

## 谁负责什么

| 交付物 | owner | 说明 |
|---|---|---|
| SLA / 服务目录 | COO | 可用性、响应/恢复、服务时间、赔付口径 |
| Runbook / 值班 / 事件 | COO（技术内容与 VP-Eng） | 监控、升级、备份、维护窗口 |
| 月度服务报告 | COO | SLA 实际值、事件、变更、风险、下月计划 |
| 续约 / 退出 | VP-Sales（商务）+ COO（交付） | 续费、价格、退出/移交 |
| 持续经济性 | CFO | 经常性收入、人力/值班成本、毛利、SLA 赔付、续约/流失 |
| 技术边界 | VP-Eng | 可运维性、监控、备份、升级路径 |

## 边界

- 不是项目：没有“项目结束验收单”，只有服务周期、月报与续约；
- 不是产品订阅：SLA、值班、事件响应是人力服务，不能只写“系统可用”；
- 一个动议一个交付模式；实施 + 维护要拆，或在户口里明确本期只做一个；
- 没有 SLA / 值班 / 月报就不要写 managed-service；写了就要有对应文档，否则 COO/CFO 应报缺。

## 相关

- 文档映射 = [document-map.md](document-map.md)
- 机器可读规则 = [delivery-rules.json](delivery-rules.json)
- 模板 = [templates/](templates/)
- 术语 = [glossary.md](glossary.md)
