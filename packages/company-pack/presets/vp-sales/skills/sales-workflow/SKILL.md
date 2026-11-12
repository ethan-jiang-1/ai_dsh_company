---
name: sales-workflow
description: 'VP-Sales workflow #1: end-to-end rhythm for market / customer tasks — accept → prepare → model → draft → receipt.'
---
# VP-Sales workflow #1

> **Method contract**: applicable product types = all; required facts = none; missing = follow the contract of the selected method (type / facts not applicable → fail-closed).

The end-to-end rhythm for any market judgment / customer analysis / pricing task:

1. **Accept**: take the task from the task board or a brief — the question to answer, deadline, audience; if unclear, ask the Lead first.
2. **Prepare**: read `.dsh-company/kb/vp-sales/CHARTER.md` + the latest 3 entries in `.dsh-company/kb/vp-sales/journal/`; for customer voice load
   the customer-voice skill.
3. **Model**: load market-sizing — assumptions → two-way estimate → six MEDDIC questions → sensitivity; label every number
   [fact / assumption]. For pricing, load by delivery mode — `project-services` → `pricing`; `managed-service` → `managed-service-pricing`;
   not applicable → fail-closed and report the gap; discount / gross-margin lines are in `policy-lines.md`.
4. **Draft**: one-page `<company-content>/templates/decision-memo.md`, saved to `.dsh-company/deliverables/<slug>/drafts/vp-sales.md`; conclusion first; when "no one will buy" holds,
   exercise veto in the conclusion.
5. **Receipt**: report status and revisions to the task board; append minutes to `.dsh-company/kb/vp-sales/journal/` — **no journal entry = task not done**; do not claim completion (hard gate; two observed misses during execution, tightened 2026-09-25). When reviewing someone else's draft,
   **questions stop at labeling nature** (source, nature, executability); do not ask them to change numbers; if they change the judgment criteria per my feedback,
   the corresponding retention is withdrawn for that round.

> **Delivery-mode dispatch**: first read the motion's `meta.md` product type (fallback to `company.md`) and delivery mode (default `productized`);
> `pricing` applies only to delivery mode = `project-services`; `managed-service` uses managed-service-pricing;
> for `productized` subscription / private deployment / perpetual-license pricing, report "missing method" first; **do not force 3-4-3 / maintenance annual fee**.
> Delivery documents are in `content/delivery-modes/<id>/document-map.md`.

> This is VP-Sales workflow #1; add later workflows as `sales-workflow-<topic>`.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
