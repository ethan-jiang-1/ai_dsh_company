# Managed operations / maintenance · document map

> Layer: delivery mode · Load: on demand (T2). This file answers "which extra documents a managed-service motion needs, who writes them, and how they relate to the PRD".

## Document chain

```text
product-type chain (business-software / hardware-software)
  MRD → StRS → PRD
        │
        └─ delivery-mode chain (managed-service)
             SLA → service catalog → runbook/on-call → incidents → monthly report → renewal/exit
```

## Documents and owners

| Document | File | owner | When | Relation to PRD |
|---|---|---|---|---|
| SLA | `drafts/sla.md` | COO | after PRD stabilizes | turns PRD non-functional/availability requirements into compensable commitments |
| Service catalog | `drafts/service-catalog.md` | COO | after SLA | service items, hours, response/recovery tiers, price pointers |
| Runbook | `drafts/runbook.md` | COO + VP-Eng | before launch | monitoring, backup, upgrade, maintenance windows, on-call and escalation |
| Incident record | `drafts/incidents.md` | COO | ongoing | severity, communication, postmortem; data source for the monthly report |
| Monthly service report | `drafts/monthly-report.md` | COO | monthly | SLA actuals, incidents, changes, risks, next-month plan |
| Renewal / exit | `drafts/renewal.md` | VP-Sales + COO | before expiry | renewal, price, exit/handover; CFO reviews economics |

## Templates

- [templates/sla.md](templates/sla.md)
- [templates/service-catalog.md](templates/service-catalog.md)
- [templates/runbook.md](templates/runbook.md)
- [templates/incident.md](templates/incident.md)
- [templates/monthly-report.md](templates/monthly-report.md)
- [templates/renewal.md](templates/renewal.md)

## Machine-readable rules

[delivery-rules.json](delivery-rules.json) declares "which documents this mode needs, who owns them, which fields are required".
`/delivery check <slug>` checks `documents.file` and `requiredSections` per the rules; `/req check` still governs requirement numbering/traceability.
