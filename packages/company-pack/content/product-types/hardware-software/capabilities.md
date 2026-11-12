# Hardware-software · capability prerequisite check

> Layer: product type · Load: on demand (T2). This is not `org.md`; it is the capability check **before a motion enters PRD/quoting**:
> hardware products are not "something engineering does on the side"; a missing seat must be reported, not guessed with defaults.

## Capabilities that must be checked

| Capability | Typical seats | What to look for in `kb/org.md` / `kb/roster.md` | If missing |
|---|---|---|---|
| Hardware / mechanical structure | Hardware engineer, mechanical engineer | Whether the seat and allocation exist | Report gap; do not enter quoting/commitment |
| Firmware / embedded | Firmware engineer | Whether the seat and allocation exist | Report gap; do not enter quoting/commitment |
| Electrical | Electrical engineer | Whether the seat and allocation exist | Report gap; do not enter quoting/commitment |
| Mechanical | Mechanical engineer | Whether the seat and allocation exist | Report gap; do not enter quoting/commitment |
| Certification / compliance | Certification / quality | Who owns CE/FCC/3C submission and remediation | Report gap; do not promise a launch date |
| Supply chain / BOM | Procurement / supply chain | Who owns key components, alternates, lead times | Report gap; do not give a BOM cost conclusion |
| Trial production / manufacturing | NPI / manufacturing | Who owns EVT/DVT/PVT, DFM, yield | Report gap; do not promise mass production |
| On-site / after-sales | Field service / spares | Who installs, repairs, stocks spares, owns SLA | Report gap; do not promise on-site response |

## Rules

- **Who checks**: VP-Eng (technical capability) + COO (delivery/on-site); CFO checks certification/trial-production/after-sales cost; the CEO decides to hire, outsource, or cut scope.
- **When**: before the PRD draft, quoting, or external commitment; not only before mass production.
- **What if missing**: write in final and the brief "capability gap: missing <seat>, affects <quote/lead time/commitment>",
  **do not enter quoting/external commitment**; if the user explicitly asks to continue, the CEO accepts the risk in writing.
- **No substitution**: "VP-Eng also covers it" or "the supplier will do it" does not replace an accountable party; there must be a seat or an explicit outsourcing contract.
- **Project delivery**: if also `delivery mode = project-services`, load
  `content/delivery-modes/project-services/` SOW/UAT/RACI; this table covers capability only, not delivery documents.

## Division with org.md

- `kb/org.md` = staffing facts (headcount/lines); `kb/roster.md` = seat → who / allocation;
- This file = motion-level checklist: **which capabilities are needed, who reports a gap, whether work can continue**;
- This file does not copy headcount; headcount follows `org.md`.
