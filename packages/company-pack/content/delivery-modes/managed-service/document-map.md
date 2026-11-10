# 运维托管 / 维护服务 · 文档映射

> 层：交付模式 · 加载：按需（T2）。本文件回答“managed-service 动议多哪些文档、谁写、和 PRD 什么关系”。

## 文档链

```text
产品类型链（business-software / hardware-software）
  MRD → StRS → PRD
        │
        └─ 交付模式链（managed-service）
             SLA → 服务目录 → Runbook/值班 → 事件 → 月报 → 续约/退出
```

## 文档与 owner

| 文档 | 文件 | owner | 什么时候写 | 与 PRD 的关系 |
|---|---|---|---|---|
| SLA | `drafts/sla.md` | COO | PRD 稳定后 | 把 PRD 的非功能/可用性要求落成可赔付承诺 |
| 服务目录 | `drafts/service-catalog.md` | COO | SLA 后 | 服务项、服务时间、响应/恢复等级、价格指针 |
| Runbook | `drafts/runbook.md` | COO + VP-Eng | 上线前 | 监控、备份、升级、维护窗口、值班与升级路径 |
| 事件记录 | `drafts/incidents.md` | COO | 持续 | 严重级别、沟通、复盘；月报的数据源 |
| 月度服务报告 | `drafts/monthly-report.md` | COO | 每月 | SLA 实际值、事件、变更、风险、下月计划 |
| 续约 / 退出 | `drafts/renewal.md` | VP-Sales + COO | 到期前 | 续费、价格、退出/移交；CFO 看经济性 |

## 模板

- [templates/sla.md](templates/sla.md)
- [templates/service-catalog.md](templates/service-catalog.md)
- [templates/runbook.md](templates/runbook.md)
- [templates/incident.md](templates/incident.md)
- [templates/monthly-report.md](templates/monthly-report.md)
- [templates/renewal.md](templates/renewal.md)

## 机器可读规则

[delivery-rules.json](delivery-rules.json) 声明“本模式需要哪些文档、谁 owner、哪些字段必填”。
`/delivery check <slug>` 按 rules 检查 `documents.file` 与 `requiredSections`；`/req check` 仍管需求编号/追溯。
