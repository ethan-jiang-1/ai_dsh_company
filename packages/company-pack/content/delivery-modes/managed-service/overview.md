# Managed operations / maintenance · delivery mode

> Layer: delivery mode · Load: on demand (T2). This is **continuous service**, not a one-off project, and not a product license/subscription.
> The product type answers "what to build"; the delivery mode answers "how to keep delivering". A motion can combine:
> `business-software × managed-service` (hosted app), `hardware-software × managed-service` (device operations).

## When to use

- The customer buys **ongoing SLA**: availability, response/recovery windows, on-call, monitoring, backup, maintenance windows;
- There is a maintenance contract, managed operations, monthly service review, renewal/exit;
- Delivery has no "project end"; only service periods and renewals.

**Do not use**:
- One-off implementation/launch → `project-services`;
- License/subscription only, no operations SLA → `productized`;
- One motion with "implementation project + long-term maintenance": split into two motions (implementation = project-services, maintenance = managed-service),
  or state that this motion covers only one; **one motion, one delivery mode**.

## Two-axis combination

| Product type | Delivery mode | Requirements chain | Additional deliverables |
|---|---|---|---|
| business-software | managed-service | MRD → StRS → PRD | SLA / service catalog / runbook / incidents / monthly report / renewal |
| hardware-software | managed-service | same as above (optional SyRS/IRS/V&V) | same + spares/on-site response |
| business-software | project-services | MRD → StRS → PRD | SOW / UAT / RACI / milestones |
| business-software | productized | MRD → StRS → PRD | no SOW/UAT/SLA |

**The requirements chain still follows the product type; managed-service only adds continuous-service documents and SLA wording.**

## Motion record

```yaml
productType: business-software
deliveryMode: managed-service
```

No delivery mode = `productized`. With ongoing SLA / on-call / monthly report / renewal, write `managed-service`.

## Who owns what

| Deliverable | owner | Note |
|---|---|---|
| SLA / service catalog | COO | Availability, response/recovery, service hours, compensation |
| Runbook / on-call / incidents | COO (technical content with VP-Eng) | Monitoring, escalation, backup, maintenance windows |
| Monthly service report | COO | SLA actuals, incidents, changes, risks, next month |
| Renewal / exit | VP-Sales (commercial) + COO (delivery) | Renewal, price, exit/handover |
| Continuous economics | CFO | Recurring revenue, staffing/on-call cost, gross margin, SLA credits, renewal/churn |
| Technical boundary | VP-Eng | Operability, monitoring, backup, upgrade path |

## Boundary

- Not a project: no "project-end acceptance sheet", only service periods, monthly reports, renewals;
- Not a product subscription: SLA, on-call, incident response are human services; do not write only "the system is available";
- One motion, one delivery mode; implementation + maintenance are split, or the record states only one this round;
- Do not write managed-service without SLA / on-call / monthly report; if written, documents must exist, otherwise COO/CFO report the gap.

## Related

- Document map = [document-map.md](document-map.md)
- Machine-readable rules = [delivery-rules.json](delivery-rules.json)
- Templates = [templates/](templates/)
- Terms = [glossary.md](glossary.md)
