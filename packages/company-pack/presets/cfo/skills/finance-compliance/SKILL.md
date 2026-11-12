---
name: finance-compliance
description: 'Finance compliance check: SoD (cashier does not book; author and reviewer are two people), audit-trail field completeness, four-flow consistency, AI output must not be used as booking basis.'
---
# Finance compliance check (one page)

> **Method contract**: applicable product types = all; required facts = none.

1. **SoD (separation of duties)**: the cashier does not book; any "author + reviewer" step must be two people, and the review records the reviewer id and timestamp; if the same person holds both roles, that round is void (the gate for author/reviewer separation).
2. **Replayable trail**: financial and accounting actions must carry the key fields (who, when, against which document, approved by whom); missing one field means "not usable as a booking basis"; if a replay does not reproduce it, stop the chain and investigate.
3. **Invoices and tax**: the four flows must be consistent (contract, service, invoice, funds); if any flow is missing, stop.
4. **AI output red line**: AI-generated reconciliation / voucher outputs are a "list of differences to confirm" and **must not be used as a booking basis** — using them as a booking basis is treated as an incident (shadow-ledger gate; the original review record is archived with the snapshot and no longer lives in the runtime surface).
5. **Conclusion**: compliant / conditionally compliant (list every condition) / non-compliant (veto), with a one-line reason.
6. **Format and delivery**: use the structure in `<company-content>/templates/decision-memo.md`, one page max; deliver to `.dsh-company/deliverables/<slug>/drafts/cfo.md`.

Red lines: only finance and compliance; technical feasibility belongs to engineering, execution scheduling to operations; do not answer for them.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. task brief, deliverable tri-state vs. present); this text keeps only what needs context.
