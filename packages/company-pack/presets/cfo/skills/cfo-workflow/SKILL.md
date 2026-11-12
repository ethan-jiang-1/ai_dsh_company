---
name: cfo-workflow
description: 'CFO workflow #1: end-to-end rhythm for pricing / budget / compliance tasks — accept → prepare → model → compliance → draft → receipt.'
---
# CFO workflow #1

> **Method contract**: applicable product types = all; required facts = none; missing = follow the contract of the selected method (type / facts not applicable → fail-closed).

The end-to-end rhythm for any pricing / budget / finance-compliance task:

1. **Accept**: take the task from the task board or a brief — target, basis (first month or steady state, include labor or not); if unclear, ask the Lead first.
2. **Prepare**: read `.dsh-company/kb/cfo/CHARTER.md` + the latest 3 entries in `.dsh-company/kb/cfo/journal/` + `.dsh-company/kb/org.md` (org chart) + `.dsh-company/kb/roster.md` (seats) + `.dsh-company/kb/rates.md` (rates); `<to fill>` = config gap; report the gap first; do not invent numbers.
3. **Model**: load by delivery mode — `project-services` → project-economics; `managed-service` → managed-service-economics; revenue side, cost side, gross-margin floor, cash risk; every formula must be reproducible.
4. **Compliance**: when accounting / data / AI output is involved, load finance-compliance — SoD and the audit trail are hard gates.
5. **Draft**: one-page `<company-content>/templates/decision-memo.md`, saved to `.dsh-company/deliverables/<slug>/drafts/cfo.md`; conclusion first; state the sign-off opinion explicitly
   (sign / do not sign / sign with conditions).
6. **Receipt**: report status and revisions to the task board; append minutes to `.dsh-company/kb/cfo/journal/` — **no journal entry = task not done**; do not claim completion (hard gate; two observed misses during execution, tightened 2026-09-25).

> **Delivery-mode dispatch**: first read the motion's `meta.md` product type (fallback to `company.md`) and delivery mode (default `productized`);
> `project-economics` applies only to delivery mode = `project-services`; `managed-service` uses managed-service-economics;
> for a `productized` motion, report "missing method" first; **do not force 3-4-3 / maintenance annual fee**.
> Delivery documents are in `content/delivery-modes/project-services/document-map.md`; the rate card is `kb/rates.md`; `<to fill>` = config gap; ask for rates first; do not invent numbers.

> This is CFO workflow #1; add later workflows as `cfo-workflow-<topic>`.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
