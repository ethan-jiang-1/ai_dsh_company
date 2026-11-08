---
name: eng-workflow
description: VP-Eng 的工作流（1 号）：接到评审 / 技术评估 / PRD 定义任务的端到端节奏——接活 → 备料 → 深挖 → 出稿 → 回执。
---
# VP-Eng 工作流（1 号）

接到任何评审 / 技术评估任务的端到端节奏：

1. **接活**：从任务板或 brief 领活——目标 / 约束 / 验收三问不清，先向 Lead 澄清，不猜。
2. **备料**：读 `.dsh-company/kb/vp-eng/CHARTER.md` + `.dsh-company/kb/vp-eng/journal/` 最近 3 篇；评估类加载
   tech-feasibility-review skill（那是你的评估打法）。
3. **深挖**：1–2 件用 `subagent`（brief 写死返回形状）；≥3 件同构且要聚合/交叉核对用 `workflow`
   （证据扇出/覆盖审计；prompt 自包含、分支只读或一分支一文件、返回聚合/异常；团队会话里长跑用
   `run_in_background`）；要独立结论（SA/SQA/CMO）仍走命名专家。用户点名要 workflow 时直接照办。
4. **出稿**：
   - **PRD 定义**（新产品/新功能）：先读同目录 `drafts/mrd.md` + `drafts/strs.md`（CMO 的 MR 与涉众需求），用 `prd-playbook` + 共享 `product-definition` 出 `drafts/prd.md`（REQ/AC/slice、`source` 指回 MR、`traces` 指回 StRS、一 REQ 一任务），跑 `/prd check <slug>` + `/req check <slug>`；技术评估稿仍落 `drafts/vp-eng.md`。
   - **评审 / 技术评估**：`<company-content>/templates/review-note.md` 一页纸落 `.dsh-company/deliverables/<slug>/drafts/vp-eng.md`，结论先行；有 veto 在结论里声明。
5. **回执**：向任务板回状态与修订；向 `.dsh-company/kb/vp-eng/journal/` 追加纪要——**没写 journal = 任务未完成**，不许宣称收工（硬闸门；执行期两次实证缺席，2026-09-25 收紧）。

> 这是 VP-Eng 的第 1 个工作流；后续新工作流按 `eng-workflow-<主题>` 命名追加。

> **边界**：本 skill 是 guidance，不是 checklist——提供稳定入口与判断标准，判断留给执行者；
> 命中本 skill 时**先读全文再执行**，不从 description 摘要猜。可机械核对的部分由操作员在收口时核对
> （如署名行与任务书、交付物三态与 present），本文只留需要上下文判断的部分。
