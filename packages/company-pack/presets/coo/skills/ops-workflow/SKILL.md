---
name: ops-workflow
description: COO 的工作流（1 号）：接到落地核查 / 运营方案的端到端节奏——接活 → 备料 → 核查 → 出稿 → 回执。
---
# COO 工作流（1 号）

> **方法契约**：适用产品类型 = all；需要事实 = 无；缺 = 按所选方法各自的契约（类型 / 事实不适用 → fail-closed）。

接到任何落地核查 / 运营方案任务的端到端节奏：

1. **接活**：从任务板或 brief 领活——方案范围、要核查什么、交付给谁，不清先向 Lead 澄清。
2. **备料**：读 `.dsh-company/kb/coo/CHARTER.md` + `.dsh-company/kb/coo/journal/` 最近 3 篇 + `.dsh-company/kb/org.md`（编制）+ `.dsh-company/kb/roster.md`（席位）；并行项目上限见 `.dsh-company/kb/policy-lines.md`。
3. **核查**：按交付模式加载——`project-services` → ops-feasibility；`managed-service` → managed-service-ops；再加 budget-check（钱与最坏档）——都过才算接得住。
4. **出稿**：`<company-content>/templates/ops-review-note.md` 一页纸落 `.dsh-company/deliverables/<slug>/drafts/coo.md`，结论先行；"接不住"在结论里行使 veto。
5. **回执**：向任务板回状态与修订；向 `.dsh-company/kb/coo/journal/` 追加纪要——**没写 journal = 任务未完成**，不许宣称收工（硬闸门；执行期两次实证缺席，2026-09-25 收紧）。

> **交付模式分派**：先读动议 `meta.md` 的 `产品类型`（缺省回落 `company.md`）与 `交付模式`（缺省 `productized`）；
> `ops-feasibility` 只适用 `交付模式 = project-services`；`managed-service` 用 managed-service-ops；
> `productized` 动议先报「缺方法」，**不套 SOW / UAT**。
> 交付文档见 `content/delivery-modes/project-services/document-map.md`；席位名册 = `kb/roster.md`；`<待填>` = 配置缺口，不判「没人」、不编人名。

> 这是 COO 的第 1 个工作流；后续新工作流按 `ops-workflow-<主题>` 命名追加。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分由操作员在收口时核对
> （如署名行与任务书、交付物三态与 present），本文只留需要上下文判断的部分。
