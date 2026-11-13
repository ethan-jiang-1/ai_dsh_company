# Product document chain and numbering contract (business-software)

> **The numbering contract's single home**: which layer is written by whom, how ids are ordered, how traceability works, how the machine judges red.
> Staffing / people / formats have their own homes (org / owners / templates); an ID carries identity only (kind + sequence).

## Three layers and owners

| # | Layer | Answers | owner | File | `definition` | Numbering |
|---|---|---|---|---|---|---|
| 1 | **MRD** market requirements | Should we do it, for whom, why we win | CMO | `drafts/mrd.md` | `json-ledger` | `MR-###` |
| 2 | **StRS** stakeholder requirements | Who cares, what they care about, who signs off at acceptance | CMO | `drafts/strs.md` | `headings` | `REQ-###` |
| 3 | **PRD** product requirements | What product we actually sell, how it is accepted, how it is sliced | VP-Eng | `drafts/prd.md` | `headings` | `REQ-###` / `AC-###-#` |

**No SyRS / IRS / V&V**. Interfaces, system boundaries, and deployment shape are written as PRD technical constraints/risks; if the motion needs a separate system layer,
switch to `hardware-software`.

## Numbering rules

- Id shapes `MR-###` / `REQ-###` / `AC-<REQ id>-<n>`; all four are append-only and globally unique within a motion.
- `REQ` is **any layer's** id: StRS/PRD share one sequence; the owner takes `max+1` when registering the item.
- Layer belongs to the document header; status belongs to the item; old prefixes (`STR/SYR/IFR/VR/VP/V`) are retired; their appearance is red.
- Traceability: StRS → `traces: [MR-###]`; PRD → `source: [MR-###]` + `traces: [REQ-###]` (StRS).
  Missing upstream = orphan red; pointing at a nonexistent id = dangling red.
- Counts derive from the index; do not write "N items" range assertions; do not accept an `NFR` token, use the `kind: NFR` field.
- `/prd check` / `/req check` are operator commands; roles cite the result and do not declare pass themselves.

## Boundary with hardware-software

- This type declares no SyRS/IRS/V&V; `check-rules.json` layers are only MRD/StRS/PRD.
- Once a motion has on-site hardware, firmware, electrical/mechanical parts, certification, or an independent verification plan, the product type should change to
  `hardware-software`; do not append a system layer to this type.
