---
name: budget-check
description: 'Budget check: compare each spend line with the budget baseline in .dsh-company/kb/coo/CHARTER.md; convert labor to person-weeks as opportunity cost; stress-test the worst case; veto when over limit.'
---
# Budget check (one page)

> **Method contract**: applicable product types = all; required facts = kb/rates.md (person-week cost); missing = fail-closed (report "config gap"; do not invent numbers).

1. **Basis**: first ask "first month or steady-state month?" and "does it include labor?" — numbers are not comparable across bases.
2. **Compare each line with the baseline**: compare every spend line with the budget baseline in `.dsh-company/kb/policy-lines.md` (cloud infrastructure, AI pilot API hard cap, fixed-expense approval line — single source = `policy-lines.md`); label [within baseline] / [new] / [over limit].
3. **Labor is the big cost**: the real cost of development / service work is person-weeks — convert the plan into how many people for how many weeks; when it crowds out the parallel-project limit, book it as opportunity cost; rate card = `.dsh-company/kb/rates.md`; `<to fill>` = config gap; ask for rates first; never invent dollar figures.
4. **Worst-case stress test**: volume ×2, unit price ×2, calculate again — a plan that hits the line must carry a reduce-frequency / reduce-tier fallback; "we'll figure it out later" is not a plan.
5. **Conclusion**: affordable / conditionally affordable (list every condition) / unaffordable (veto), with a one-line reason.
6. **Format and delivery**: merge into the structure of `<company-content>/templates/ops-review-note.md`, one page max.

Red line: when unit prices are unverified, do not invent dollar figures — write "unproven" and express it with tiers and upper bounds (company discipline; the same basis applies to every deliverable).

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
