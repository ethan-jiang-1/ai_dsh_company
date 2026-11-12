---
layer: SyRS
definition: headings
---

# SyRS (system requirements · what the system as a black box must satisfy, how each is verified)

> Lead = **<assigned>**; input = `drafts/prd.md` in the same directory; save to `drafts/syrs.md`.
> `shall` phrasing, single and verifiable, with verification method and traceability; **do not write design** (module split / code structure belong to the architecture draft).
> Definition point = `### REQ-###` heading (`definition: headings`); every item carries line-start `traces: [REQ-###]` (upstream PRD).

## One-minute summary

<Conclusion ≤3 points: how many system requirements, which is hardest to verify, next step>

### REQ-003 <one-line system requirement>

- kind: FR
- status: draft
- owner: <assigned>
- verifier: <assigned / third-party lab / customer site>
- traces: [REQ-002]
- Requirement (shall): the system shall…
- Verification method: test / analysis / demonstration / inspection (may combine)
- Verification criterion: <testable sentence; if not quantifiable, mark [assumption] + verification method>
- Rationale: …

## Coverage and gaps

- Every PRD REQ is fulfilled by at least one SyR; state the reason for any deliberate non-coverage.
