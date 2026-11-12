---
layer: IRS
definition: headings
---

# IRS (interface requirements · what a cross-boundary interface looks like)

> Lead = **<assigned>**; input = `drafts/syrs.md` in the same directory; save to `drafts/irs.md`.
> Write **both interface parties** (owners at both ends), type, direction, format and field semantics, frequency and timing, exceptions and degradation; **do not write internal data structures or algorithms**.
> Definition point = `### IF-###` heading (`definition: headings`); every item carries line-start `traces: [REQ-###]` (upstream SyRS).
> Allocation (requirements to subsystems / purchased parts) is the `allocation.md` appendix — an appendix defines no ids.

## One-minute summary

<Conclusion ≤3 points: how many interfaces, which is most fragile, next step>

### IF-001 <interface name>

- status: draft
- owners: [firmware, electronics]
- traces: [REQ-003]
- Interface parties: <A side / B side>
- Type: data / physical / human-machine / protocol
- Direction: …
- Format and field semantics: …
- Frequency and timing: …
- Exceptions and degradation: …
- Verification method: …

## Coverage and gaps
