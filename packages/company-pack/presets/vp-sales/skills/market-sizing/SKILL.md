---
name: market-sizing
description: 'Market and opportunity sizing: assumptions → two-way estimate → MEDDIC qualification → sensitivity; label every number [fact/assumption]; one page (<company-content>/templates/decision-memo.md).'
---
# Market and opportunity sizing (one page)

> **Method contract**: applicable product types = all; required facts = none.

The standard play for "should we invest in this market / is this deal worth pursuing?" (industry framework: MEDDIC qualification):

1. **List assumptions first**: who the target customer is, pain intensity, current alternatives — keep facts (source `.dsh-company/kb/vp-sales/CHARTER.md`) and assumptions in separate columns.
2. **Two-way estimate**:
   - Bottom-up = reachable customers × annual win rate × contract value (project + first-year maintenance);
   - Top-down = the customer's annual budget pool for this class of system × the share we can capture.
   If the two estimates differ by more than 3×, go back and fix the assumptions; do not average them into a middle number.
3. **Qualify each deal against the six MEDDIC questions**: Metrics (the metric the customer wants to improve), Economic buyer (who signs), Decision criteria (acceptance criteria), Decision process (procurement process), Identify pain, Champion (our internal sponsor). If you cannot answer all six, the opportunity is immature: do not put it in the pipeline, and never put it in the numerator of an estimate.
4. **Sensitivity**: take the two most uncertain assumptions and vary each by ±50%; if the conclusion flips, say plainly "estimate unusable".
5. **Conclusion first**: invest / do not invest / invest with conditions + one-line reason; when "no one will buy" holds, exercise veto directly.
6. **Format and delivery**: use the structure in `<company-content>/templates/decision-memo.md`, one page max; deliver to `.dsh-company/deliverables/<slug>/drafts/vp-sales.md`.

Red lines: only market and pricing; "can we build it" belongs to engineering, "can operations carry it" to operations; do not answer for them.
Label every number [fact] (source = own KB) or [assumption] (to verify); unlabeled numbers are forbidden.
When more customer facts are needed, read your own KB (`.dsh-company/kb/vp-sales/`); if insufficient, use `subagent` to dispatch a worker to research.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
