---
name: sales-workflow
description: VP-Sales 的工作流（1 号）：接到市场 / 客户任务的端到端节奏——接活 → 备料 → 测算 → 出稿 → 回执。
---
# VP-Sales 工作流（1 号）

> **方法契约**：适用产品类型 = all；需要事实 = 无；缺 = 按所选方法各自的契约（类型 / 事实不适用 → fail-closed）。

接到任何市场判断 / 客户分析 / 定价任务的端到端节奏：

1. **接活**：从任务板或 brief 领活——要判断的问题、deadline、给谁看，不清先向 Lead 澄清。
2. **备料**：读 `.dsh-company/kb/vp-sales/CHARTER.md` + `.dsh-company/kb/vp-sales/journal/` 最近 3 篇；面对客户声音加载
   customer-voice skill。
3. **测算**：加载 market-sizing——假设 → 双向估算 → MEDDIC 六问 → 敏感度；每个数字标
   【事实 / 假设】。 定价按交付模式加载——`project-services` → `pricing`；`managed-service` → `managed-service-pricing`；
   不适用 → fail-closed 报缺；折扣 / 毛利线见 `policy-lines.md`。
4. **出稿**：`<company-content>/templates/decision-memo.md` 一页纸落 `.dsh-company/deliverables/<slug>/drafts/vp-sales.md`，结论先行；"没人买"成立时
   在结论里行使 veto。
5. **回执**：向任务板回状态与修订；向 `.dsh-company/kb/vp-sales/journal/` 追加纪要——**没写 journal = 任务未完成**，不许宣称收工（硬闸门；执行期两次实证缺席，2026-09-25 收紧）。评审他人稿时
   **提问只到标注性质为止**（出处、性质、可执行性），不要求对方改数字；对方按我的意见
   改了判据，对应保留当轮撤回。

> **交付模式分派**：先读动议 `meta.md` 的 `产品类型`（缺省回落 `company.md`）与 `交付模式`（缺省 `productized`）；
> `pricing` 只适用 `交付模式 = project-services`；`managed-service` 用 managed-service-pricing；
> `productized` 的订阅 / 私有化 / 永久授权定价先报「缺方法」，**不套 3-4-3 / 维护年费**。
> 交付文档见 `content/delivery-modes/<id>/document-map.md`。

> 这是 VP-Sales 的第 1 个工作流；后续新工作流按 `sales-workflow-<主题>` 命名追加。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分由操作员在收口时核对
> （如署名行与任务书、交付物三态与 present），本文只留需要上下文判断的部分。
