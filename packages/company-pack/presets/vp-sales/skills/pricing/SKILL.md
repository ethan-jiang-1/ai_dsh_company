---
name: pricing
description: 'Pricing method (project-services): milestone billing 3-4-3, maintenance annual fee, discount / gross-margin dual sign-off; productized lacks a product pricing method → fail-closed.'
---
# Pricing (project / SI)

> **Method contract**: applicable product types = all; applicable delivery modes = project-services;
> required facts = kb/policy-lines.md (discount / gross margin / maintenance annual fee), kb/rates.md (person-week cost); missing = fail-closed (report "missing method / config gap"; do not force 3-4-3).
> Delivery document = `content/delivery-modes/project-services/document-map.md`.

## When to use

- customer-site delivery, systems integration, custom development, projects with implementation;
- `productized` motions (including SaaS / private deployment / perpetual license) **do not apply**: there is no method pack yet for subscription, ARR, CAC, retention, SLO pricing — report "missing method" first; do not force the project billing curve onto them.

## Method

1. **Billing curve**: split contract value by milestone (company convention 3-4-3); list the maintenance annual fee separately; terms in `.dsh-company/kb/policy-lines.md`.
2. **Cost baseline**: labor by person-week × line; rate card = `.dsh-company/kb/rates.md`; `<to fill>` = config gap; ask for rates first; if unavailable use a range / upper bound and mark [unproven]; never invent dollar figures.
3. **Lines**: discount / gross-margin lines in `.dsh-company/kb/policy-lines.md`; if crossed → CFO + CEO dual sign-off (`request_signoff`); ask CFO for the margin calculation.
4. **Cash flow**: advance funding beyond one month goes through CFO first; can the company carry a one-notch payment delay — if not, veto.
5. **Boundary**: pricing recommendation belongs to VP-Sales; cost basis belongs to CFO; do not sign for engineering / operations.

## Anti-patterns

- forcing SaaS subscription / perpetual license into 3-4-3;
- issuing dollar conclusions from unverified rates;
- treating the maintenance annual fee as discount consideration.
