---
name: managed-service-economics
description: 'Ongoing economics of managed operations / maintenance services: recurring revenue, on-call/labor cost, SLA credits, renewal/churn; one page (decision-memo).'
---
# Managed operations / maintenance service economics (one page)

> **Method contract**: applicable product types = all; applicable delivery modes = managed-service;
> required facts = kb/roster.md (seats / on-call), kb/rates.md (person-week cost); missing = fail-closed (report "missing method / config gap"; do not force 3-4-3 and do not invent numbers).
> Delivery document = `content/delivery-modes/managed-service/document-map.md`.

## When to use

- motions with ongoing SLA / on-call / monitoring / monthly report / renewal;
- **does not apply** to `project-services` (one-off SOW/UAT) or `productized` (product license/subscription) — those need their own economic methods; report the gap first.

## Method

1. **Revenue side**: monthly/quarterly service fee × contract term; packages/tiers/overage; renewal uplift; **not** 3-4-3 milestone billing.
2. **Cost side**: service FTE / on-call / tools / backup / on-site support; calculate from the seats in `kb/roster.md` and the person-week cost in `kb/rates.md`; `<to fill>` = config gap; ask for rates first.
3. **Gross margin and credits**: recurring gross margin = service fee − ongoing cost; use the gross-margin/discount lines in `policy-lines.md`; reserve SLA credits against the service-credit cap in `policy-lines.md`; do not fold them into discount.
4. **Cash**: monthly/quarterly/prepaid; the cash-flow impact of renewal and churn; there is no project milestone to rely on.
5. **Risk**: churn, scope creep, 24×7 on-call cost, single-customer concentration, third-party dependency; give a fallback for each.
6. **Output**: one-page `decision-memo.md`, saved to `drafts/cfo.md`; conclusion first; numbers reproducible.

## Boundary

- Only finance and ongoing economics; SLA deliverability belongs to COO, technical operability to VP-Eng, renewal commercial terms to VP-Sales.
- Do not mix one-off implementation revenue into recurring revenue; implementation is project-services and gets its own motion.
