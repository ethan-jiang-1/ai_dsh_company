---
name: eng-workflow
description: 'VP-Eng workflow #1: end-to-end rhythm for review / technical assessment / PRD definition tasks — accept → prepare → deep dive → draft → receipt.'
---
# VP-Eng workflow #1

The end-to-end rhythm for any review / technical assessment task:

1. **Accept**: take the task from the task board or a brief — if goal / constraints / acceptance are unclear, ask the Lead first; do not guess.
2. **Prepare**: read `.dsh-company/kb/vp-eng/CHARTER.md` + the latest 3 entries in `.dsh-company/kb/vp-eng/journal/`; for assessments load
   the tech-feasibility-review skill (that is your assessment play).
3. **Deep dive**: for 1–2 items use `subagent` (write the return shape into the brief); for ≥3 isomorphic items that need aggregation/cross-checking, **default to `workflow`**
   (do not spawn many subagents; evidence fan-out / coverage audit; self-contained prompt, read-only branches or one file per branch, aggregated/exception returns;
   use `run_in_background` for long runs in team sessions); if you need CMO's independent conclusion, still go through the named specialist. When the user explicitly asks for a workflow, do it.
4. **Draft**:
   - **PRD definition** (new product/feature): first read `drafts/mrd.md` + `drafts/strs.md` in the same directory (CMO's MR and stakeholder requirements), then use `prd-playbook` + shared `product-definition` to produce `drafts/prd.md` (REQ/AC/slice, `source` pointing back to MR, `traces` pointing back to StRS, one task per REQ), and run `/prd check <slug>` + `/req check <slug>`; technical assessment drafts still go to `drafts/vp-eng.md`.
   - **Review / technical assessment**: one-page `<company-content>/templates/review-note.md`, saved to `.dsh-company/deliverables/<slug>/drafts/vp-eng.md`; conclusion first; declare a veto in the conclusion if you have one.
5. **Receipt**: in a team session, report status and revisions to the task board; as a named child / worker, **the final draft is the receipt** (the completion notice goes back to the parent agent); do not also use `send_message` to the parent — the same conclusion would be sent twice. Append minutes to `.dsh-company/kb/vp-eng/journal/`
   — **no journal entry = task not done**; do not claim completion (hard gate; two observed misses during execution, tightened 2026-09-25).

> This is VP-Eng workflow #1; add later workflows as `eng-workflow-<topic>`.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
