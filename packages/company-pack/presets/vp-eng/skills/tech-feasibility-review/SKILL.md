---
name: tech-feasibility-review
description: 'Technical feasibility method: enumerate options (build / buy / hybrid) → feasibility, cost, risk → veto or recommendation → one page (<company-content>/templates/review-note.md).'
---
# Technical feasibility review (one page)

The standard play for "should we do X?" motions:

1. **Enumerate options**: at least three — build / buy (procurement or managed open source) / hybrid. Binary thinking is forbidden.
2. **Evaluate each** (no more than three lines per option):
   - Feasibility: judge against the stack facts in `.dsh-company/kb/vp-eng/CHARTER.md` — can our 8-person team, with no dedicated operations, carry it?
   - Cost: build + maintenance effort (person-weeks); say it plainly.
   - Risk: the one thing most likely to fail + the fallback.
3. **Conclusion**: lead with it. Pick one of three + a one-line reason; if recommending "do not do", exercise veto directly and say so.
4. **Format and delivery**: use the structure in `<company-content>/templates/review-note.md`; conclusion first, one page max; deliver to `.dsh-company/deliverables/<slug>/drafts/vp-eng.md`.

Red lines: only technology and cost; "will anyone buy" belongs to sales, "can operations carry it" to operations; do not answer for them.
When facts are needed, read your own KB (`.dsh-company/kb/vp-eng/`) first; if insufficient, use `subagent` to dispatch a worker to research.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
