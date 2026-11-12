# Project services / systems integration · delivery mode

> Layer: delivery mode · Load: on demand (T2). This is a **delivery mode**, not a product type; the product type answers "what to build",
> the delivery mode answers "how to deliver". A motion can combine them: `business-software × project-services`.

## When to use

- Delivery happens at the customer site, or acceptance is by SOW / milestone / UAT;
- On-site work, implementation, training, cutover, or third-party system integration is needed;
- The contract collects by milestone, and the deliverable includes implementation and acceptance, not just a software license/subscription.

**Do not use**: pure product sales, SaaS subscription, or standard product delivery without SOW/UAT/on-site — use `deliveryMode: productized`.

## Two-axis combination

| Product type | Delivery mode | Requirements chain | Additional deliverables |
|---|---|---|---|
| business-software | productized | MRD → StRS → PRD | no SOW/UAT |
| business-software | project-services | MRD → StRS → PRD | SOW / UAT / RACI / milestones |
| hardware-software | productized | MRD → StRS → PRD (optional SyRS/IRS/V&V) | no SOW/UAT |
| hardware-software | project-services | same as above | SOW / UAT / RACI / milestones |

**The requirements chain is decided by the product type; project-services only adds delivery documents and acceptance basis, not requirement layers.**
`project-services` is not a third product type; do not write it into the product-type field.

## Motion record

```yaml
productType: business-software
deliveryMode: project-services
```

No delivery mode = `productized`. With SOW / UAT / on-site / milestone acceptance, write `project-services`.

## Who owns what

| Deliverable | owner | Note |
|---|---|---|
| SOW / scope boundary | COO | Align with VP-Eng's PRD; does not replace the PRD |
| UAT plan and acceptance | COO | Cases cover PRD REQ/AC; customer signs |
| RACI / milestones | COO | Staffing and schedule follow `kb/roster.md` |
| Project economics | CFO | 3-4-3, maintenance fee, funding; see `content/company/policy-lines.md` |
| Pricing recommendation | VP-Sales | Project pricing; see the `pricing` skill |
| Technical scope | VP-Eng | Interfaces, dependencies, feasibility |

## Boundary

- Delivery mode does not change the product type's numbering contract or requirement layers; SOW/UAT are delivery documents, not requirement layers.
- Do not write project-services without SOW/UAT/on-site; if written, the documents must exist, otherwise COO/CFO report the gap.
- Project methods (`project-economics` / `ops-feasibility` / `pricing`) apply only to this delivery mode;
  `productized` motions do not force 3-4-3 / SOW / maintenance fee.

## Related

- Document map = [document-map.md](document-map.md)
- Machine-readable rules = [delivery-rules.json](delivery-rules.json)
- Templates = [templates/](templates/)
- Terms = [glossary.md](glossary.md)
