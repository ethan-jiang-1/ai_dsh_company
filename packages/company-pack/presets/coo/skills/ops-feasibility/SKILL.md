---
name: ops-feasibility
description: 'Operations feasibility check: staffing / process / timeline, each checked item by item — who executes (RACI), which process (SOW/milestone acceptance), whether the timeline holds; any failure = veto.'
---
# Operations feasibility check (one page)

> **Method contract**: applicable product types = all; applicable delivery modes = project-services;
> required facts = kb/roster.md (seats / effort); missing = fail-closed (report "missing method / config gap"; do not judge "no one" and do not invent names).
> Delivery document = `content/delivery-modes/project-services/document-map.md`.

The standard play for any plan that must "land" (project, process, external commitment):

1. **Staffing**: first read the seat roster in `.dsh-company/kb/roster.md` — ① named and assigned = can take it; ② seat exists but roster is `<to fill>` = **config gap** (report "roster to fill", not "no one"); ③ no seat at all = truly "no one / cannot carry it". **Never invent names**; org facts are in `.dsh-company/kb/org.md`.
2. **Process**: `delivery mode = project-services` uses SOW + milestone acceptance (counts only after UAT passes); `productized` lacks a product delivery acceptance method → **fail-closed and report the gap**; do not force SOW. Make roles explicit with a RACI table — if you cannot write R (who executes) = no one is responsible; if the process has no existing carrier (template / recurring meeting / handbook), establish one first; "relying on good intentions" is not a process.
3. **Timeline**: list the dependencies and buffers of each critical-path segment separately; mark external dependencies (customer, supplier, counterpart team) separately — time outside our control is not our schedule. The parallel-project limit is in `.dsh-company/kb/policy-lines.md` (exceeding it = veto).
4. **Conclusion**: can carry it / can carry it with conditions (list every condition) / cannot carry it (veto), with a one-line reason.
5. **Format and delivery**: use the structure in `<company-content>/templates/ops-review-note.md`, one page max; deliver to `.dsh-company/deliverables/<slug>/drafts/coo.md`.

**Delivery-mode boundary**: `ops-feasibility` applies only to `delivery mode = project-services`; a `productized` motion lacks a product delivery acceptance method → fail-closed and report the gap; do not force SOW.

Red lines: only execution and compliance; technical feasibility belongs to engineering, market demand to sales; do not answer for them.
When more facts are needed, read your own KB (`.dsh-company/kb/coo/`) first; if insufficient, use `subagent` to dispatch a worker to inventory.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
