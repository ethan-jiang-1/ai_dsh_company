---
name: managed-service-ops
description: 'Deliverability of managed operations / maintenance services: SLA, service catalog, runbook/on-call, incidents, monthly report, renewal/exit; one page (ops-review-note).'
---
# Managed operations / maintenance service feasibility (one page)

> **Method contract**: applicable product types = all; applicable delivery modes = managed-service;
> required facts = kb/roster.md (seats / on-call); missing = fail-closed (report "missing method / config gap"; do not judge "no one" and do not invent names).
> Delivery document = `content/delivery-modes/managed-service/document-map.md`.

## When to use

- motions with ongoing SLA / on-call / monitoring / monthly report / renewal;
- **does not apply** to `project-services` (one-off SOW/UAT) or `productized` (no operations SLA) — those need their own delivery methods; report the gap first.

## Method

1. **SLA deliverability**: availability, response/recovery time, service hours, maintenance windows; if you cannot write a measurable definition, you cannot carry it.
2. **Service catalog**: which service items are sold, tiers, service hours, overage/ad-hoc support; pricing is a pointer only.
3. **Runbook / on-call**: monitoring, backup, upgrade/rollback, maintenance windows, L1/L2/escalation path; on-call staffing comes from the seats in `kb/roster.md`; `<to fill>` = config gap, not "no one".
4. **Incidents and monthly report**: P1/P2 levels, communication, postmortem; the monthly report cites the incident table and does not invent separate numbers.
5. **Renewal/exit**: value review before expiry, churn risk, exit/handover; split the work with VP-Sales.
6. **Output**: one-page `ops-review-note.md`, saved to `drafts/coo.md`; conclusion first; state the reason when exercising veto.

## Boundary

- Only ongoing delivery and SLA; ongoing economics belongs to CFO, renewal pricing to VP-Sales, technical operability to VP-Eng.
- 24×7 on-call must list cost and staffing separately; do not rely on "everyone will pitch in".
