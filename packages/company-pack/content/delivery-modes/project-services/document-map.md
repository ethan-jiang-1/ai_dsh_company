# Project services / systems integration · document map

> Layer: delivery mode · Load: on demand (T2). This file answers "which extra documents a project-services motion needs, who writes them, and how they relate to the PRD".

## Document chain

```text
product-type chain (business-software / hardware-software)
  MRD → StRS → PRD
        │
        └─ delivery-mode chain (project-services)
             SOW → milestones → RACI → UAT → acceptance/handover
```

## Documents and owners

| Document | File | owner | When | Relation to PRD |
|---|---|---|---|---|
| SOW | `drafts/sow.md` | COO | after the PRD draft | cites PRD REQ/AC; writes in/out of scope, dependencies, milestones, acceptance, change control |
| Milestone plan | `drafts/milestones.md` | COO | after SOW | exit criteria and payment points per milestone; does not replace PRD slices |
| RACI | `drafts/raci.md` | COO | after teaming | who executes/owns/consults/is informed; staffing cites `kb/roster.md` |
| UAT plan | `drafts/uat.md` | COO | after PRD AC stabilize | UAT cases cover REQ/AC; do not invent requirements |
| Acceptance/handover | `drafts/acceptance.md` | COO | after UAT | customer sign-off, open items, maintenance handover |

## Templates

- [templates/sow.md](templates/sow.md)
- [templates/milestones.md](templates/milestones.md)
- [templates/raci.md](templates/raci.md)
- [templates/uat.md](templates/uat.md)
- [templates/acceptance.md](templates/acceptance.md)

## Machine-readable rules

[delivery-rules.json](delivery-rules.json) declares "which documents this mode needs, who owns them, which fields are required".
`/delivery check <slug>` checks `documents.file` and `requiredSections` per the rules; `/req check` still governs requirement numbering/traceability.
