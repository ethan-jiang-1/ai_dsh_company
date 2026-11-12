---
name: project-economics
description: 'Project economics: quoted gross-margin floor (sign-off line in `.dsh-company/kb/policy-lines.md`), labor cost allocated by person-week, milestone billing curve and advance funding; one page (<company-content>/templates/decision-memo.md).'
---
# Project economics (one page)

> **Method contract**: applicable product types = all; applicable delivery modes = project-services;
> required facts = kb/roster.md (seats / labor), kb/rates.md (person-week cost); missing = fail-closed (report "missing method / config gap"; do not force 3-4-3 and do not invent numbers).
> Delivery document = `content/delivery-modes/project-services/document-map.md`.

The standard play for any quote / budget / project initiation:

1. **Revenue side**: split the contract value into a milestone billing curve (company convention 3-4-3); list the maintenance annual fee separately; terms in `.dsh-company/kb/policy-lines.md`.
2. **Cost side**: allocate labor by "person-week" × line (org chart in `.dsh-company/kb/org.md`; seats in `.dsh-company/kb/roster.md`; rate card = `.dsh-company/kb/rates.md` — `<to fill>` = config gap; ask for rates first; if unavailable use a range / upper bound and mark [unproven]; do not invent dollar figures);
   cloud and outsourcing follow the budget baseline; for missing items use the worst case — "underquote first, add later" is not a basis. **Cross-functional numbers (engineering days, delivery days, etc.) must be recalculated using the owner's basis; do not substitute your own** — your estimate is for comparison only and must be labeled [my estimate]; if the two bases do not converge, report them side by side to the CEO for a decision.
3. **Gross-margin floor and dual sign-off**: gross-margin/discount lines are in `.dsh-company/kb/policy-lines.md` → if crossed, veto or recommend a price increase / scope reduction; below the floor, the CFO does not sign.
   **Crossing the line requires approval** — if the conclusion involves an external position on "gross margin/discount line" (continue the deal, special price, dual-sign exception), first call the `request_signoff` tool (line = which line was crossed, summary = numbers), and only after human approval finalize the conclusion; if rejected, rewrite per the rejection or exercise veto; if no one responds (fail-closed), put the matter in open items and do not issue an external conclusion.
4. **Cash risk**: advance-funding months = the time cost precedes collection; a contract with more than one month of advance funding goes through the CFO first; can the company carry a one-notch payment delay — if not, veto.
5. **Format and delivery**: use the structure in `<company-content>/templates/decision-memo.md`, one page max; deliver to `.dsh-company/deliverables/<slug>/drafts/cfo.md`.

**Delivery-mode boundary**: this method applies only to `delivery mode = project-services`. A `productized` motion (including SaaS / private deployment / perpetual license) lacks product pricing / economic methods → report "missing method" first; do not force 3-4-3 / maintenance annual fee.

Red lines: numbers must be reproducible (formula + multipliers listed item by item); **threshold formulas get a boundary-value self-check** — name where each multiplier is applied, substitute the critical value back into the original formula to verify direction (wrong multiplier placement is systematic, up to 2×);
mark unverified unit prices "unproven" and do not issue a dollar conclusion.
Only finance; technical feasibility belongs to engineering, execution scheduling to operations, market judgment to sales; do not answer for them.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
