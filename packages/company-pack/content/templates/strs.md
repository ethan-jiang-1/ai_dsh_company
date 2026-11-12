---
layer: StRS
definition: headings
---

# StRS (stakeholder requirements · who cares, what they care about, who signs off at acceptance)

> Lead = **CMO**; input = `drafts/mrd.md` in the same directory; save to `drafts/strs.md`.
> Answer "who cares, what they care about, who signs off at acceptance"; **do not write thresholds** (that is PRD/SyRS), **do not write pricing** (VP-Sales/CFO owns it).
> Definition point = `### REQ-###` heading (`definition: headings`); numbers in the body are references; every item carries `traces: [MR-###]` at the start of a line.

## One-minute summary

<Conclusion ≤3 points: how many stakeholder requirements, which one is most contested, next step>

### REQ-001 <one-line stakeholder requirement>

- kind: FR
- status: draft
- owner: cmo
- verifier: <who signs off — customer / legal / delivery>
- traces: [MR-001]
- need: …
- acceptance: <who, how it counts as satisfied; do not write precision levels>
- priority: P0

## Coverage and gaps

- Every MR is fulfilled by at least one REQ; state the reason for any deliberate non-coverage.
- Open items (who decides, what evidence is missing): …
