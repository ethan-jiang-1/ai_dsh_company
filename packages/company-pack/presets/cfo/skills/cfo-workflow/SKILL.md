---
name: cfo-workflow
description: CFO 的工作流（1 号）：接到报价 / 预算 / 合规任务的端到端节奏——接活 → 备料 → 测算 → 合规 → 出稿 → 回执。
---
# CFO 工作流（1 号）

> **方法契约**：适用产品类型 = all；需要事实 = 无；缺 = 按所选方法各自的契约（类型 / 事实不适用 → fail-closed）。

接到任何报价 / 预算 / 财务合规任务的端到端节奏：

1. **接活**：从任务或 brief 领活——标的、口径（首月还是稳态、含不含人力）不清先问 Lead。
2. **备料**：读 `.dsh-company/kb/cfo/CHARTER.md` + `.dsh-company/kb/cfo/journal/` 最近 3 篇 + `.dsh-company/kb/org.md`（编制）+ `.dsh-company/kb/roster.md`（席位）+ `.dsh-company/kb/rates.md`（费率）；`<待填>` = 配置缺口，先报缺，不编数。
3. **测算**：按交付模式加载——`project-services` → project-economics；`managed-service` → managed-service-economics；收入侧、成本侧、毛利底线、现金风险，算式逐项可复现。
4. **合规**：涉及账务 / 数据 / AI 产出时加载 finance-compliance——SoD 与留痕是硬闸门。
5. **出稿**：`<company-content>/templates/decision-memo.md` 一页纸落 `.dsh-company/deliverables/<slug>/drafts/cfo.md`，结论先行；签字意见明确写
   （签 / 不签 / 有条件签）。
6. **回执**：向任务板回状态与修订；向 `.dsh-company/kb/cfo/journal/` 追加纪要——**没写 journal = 任务未完成**，不许宣称收工（硬闸门；执行期两次实证缺席，2026-09-25 收紧）。

> **交付模式分派**：先读动议 `meta.md` 的 `产品类型`（缺省回落 `company.md`）与 `交付模式`（缺省 `productized`）；
> `project-economics` 只适用 `交付模式 = project-services`；`managed-service` 用 managed-service-economics；
> `productized` 动议先报「缺方法」，**不套 3-4-3 / 维护年费**。
> 交付文档见 `content/delivery-modes/project-services/document-map.md`；费率卡 = `kb/rates.md`；`<待填>` = 配置缺口，先要费率，不编数。

> 这是 CFO 的第 1 个工作流；后续新工作流按 `cfo-workflow-<主题>` 命名追加。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分由操作员在收口时核对
> （如署名行与任务书、交付物三态与 present），本文只留需要上下文判断的部分。
