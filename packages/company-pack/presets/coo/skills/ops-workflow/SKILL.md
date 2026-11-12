---
name: ops-workflow
description: 'COO workflow #1: end-to-end rhythm for delivery reviews / operations plans — accept → prepare → verify → draft → receipt.'
---
# COO workflow #1

> **Method contract**: applicable product types = all; required facts = none; missing = follow the contract of the selected method (type / facts not applicable → fail-closed).

The end-to-end rhythm for any delivery review / operations plan task:

1. **Accept**: take the task from the task board or a brief — scope, what to verify, who receives it; if unclear, ask the Lead first.
2. **Prepare**: read `.dsh-company/kb/coo/CHARTER.md` + the latest 3 entries in `.dsh-company/kb/coo/journal/` + `.dsh-company/kb/org.md` (org chart) + `.dsh-company/kb/roster.md` (seats); the parallel-project limit is in `.dsh-company/kb/policy-lines.md`.
3. **Verify**: load by delivery mode — `project-services` → ops-feasibility; `managed-service` → managed-service-ops; then budget-check (money and worst case) — only when all pass can operations carry it.
4. **Draft**: one-page `<company-content>/templates/ops-review-note.md`, saved to `.dsh-company/deliverables/<slug>/drafts/coo.md`; conclusion first; if "cannot carry it", exercise veto in the conclusion.
5. **Receipt**: report status and revisions to the task board; append minutes to `.dsh-company/kb/coo/journal/` — **no journal entry = task not done**; do not claim completion (hard gate; two observed misses during execution, tightened 2026-09-25).

> **Delivery-mode dispatch**: first read the motion's `meta.md` product type (fallback to `company.md`) and delivery mode (default `productized`);
> `ops-feasibility` applies only to delivery mode = `project-services`; `managed-service` uses managed-service-ops;
> for a `productized` motion, report "missing method" first; **do not force SOW / UAT**.
> Delivery documents are in `content/delivery-modes/project-services/document-map.md`; the seat roster is `kb/roster.md`; `<to fill>` = config gap; do not judge "no one" and do not invent names.

> This is COO workflow #1; add later workflows as `ops-workflow-<topic>`.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
