---
name: managed-service-pricing
description: 'Pricing for managed operations / maintenance services: packages/tiers, monthly fee, overage, SLA credits, renewal uplift and dual sign-off; one page (decision-memo).'
---
# Managed operations / maintenance service pricing (one page)

> **Method contract**: applicable product types = all; applicable delivery modes = managed-service;
> required facts = kb/policy-lines.md (discount / gross margin / service credits), kb/rates.md (person-week cost); missing = fail-closed (report "missing method / config gap"; do not force 3-4-3).
> Delivery document = `content/delivery-modes/managed-service/document-map.md`.

## When to use

- motions with ongoing SLA / on-call / monitoring / monthly report / renewal;
- **does not apply** to `project-services` (project 3-4-3) or `productized` (product subscription/license) — report the missing method first; do not force it.

## Method

1. **Packages/tiers**: basic / standard / business-critical; service hours, response level, included volume.
2. **Monthly/quarterly fee**: service cost × target gross margin; discount/margin lines in `policy-lines.md`; if crossed → CFO + CEO dual sign-off.
3. **Overage/ad-hoc support**: unit price or tier; do not treat overage as default revenue.
4. **SLA credits**: service credit cap in `policy-lines.md`; do not fold it into discount or offset maintenance revenue.
5. **Renewal**: uplift, renewal discount, multi-year commitment; churn risk and exit terms.
6. **Output**: one-page `decision-memo.md`, saved to `drafts/vp-sales.md`; conclusion first; label numbers [fact/assumption].

## Boundary

- Only pricing and commercial terms; ongoing cost belongs to CFO, SLA deliverability to COO, technical boundary to VP-Eng.
- Do not invent rates; `<to fill>` in `kb/rates.md` = config gap; ask for rates or use only a range/upper bound and mark [unproven].
