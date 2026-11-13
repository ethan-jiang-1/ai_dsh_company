---
layer: PRD
definition: headings
---

# PRD (product requirements · one page + requirement sections)

> Lead = **VP-Eng**; input = `drafts/mrd.md` (CMO's market opportunities) + `drafts/strs.md` (CMO's stakeholder requirements) in the same directory; save to `drafts/prd.md`.
> **It is not an essay**: engineering consumes it slice by slice, **one REQ per task**; every REQ must point back to an MR id.
> **Each `### REQ-###` section is the only definition point** (`definition: headings`): summaries and tables reference ids, they never define them. There is no JSON ledger — the document itself is the requirement set.
> `source` names the MR source; `traces` names upstream StRS items (cross-layer traceability is written as edges through these two fields, not by prose proximity).
> Mechanical check = `/prd check <deliverables dir>`; numbering/traceability = `/req check <deliverables dir>`. Run `/prd check` before presenting the motion — a failing PRD blocks delivery.
> Technical solution ≠ this file (that is `review-note.md`); pricing ≠ this file (VP-Sales / CFO own it).

## One-minute summary (plain language)

<Conclusion ≤3 business-language points / next step (who · when) / what the CEO or user must decide>

## Scope and non-scope

| In this version | Explicitly out of this version |
|---|---|
| | |

## Constraints

- Time / staffing / budget: <cite `.dsh-company/kb/org.md`; label [fact]/[assumption]>
- Technical prerequisites: <cite `.dsh-company/kb/vp-eng/CHARTER.md`>
- Compliance / certification / security: <per product type, cite CFO / COO>

## Dependencies and risks

| Dependency (outside our control) | Provided by | Needed by | Fallback if missing |
|---|---|---|---|
| | | | |

- **The one thing most likely to fail**: …　**Fallback**: …

## Slices

| slice | Goal | Requirements (explicit ids) | Exit condition |
|---|---|---|---|
| S1 | Minimum end-to-end: <smallest demoable/acceptable loop> | REQ-002 | |

## Requirements (definition point)

### REQ-002 <one-line requirement>

- userStory: As <who>, I want <what>, so that <what I get>
- acceptance:
  - AC-002-1
    - given: <precondition>
    - when: <action>
    - then: <observable result>
- source: [MR-001]
- traces: [REQ-001]
- slice: S1
- type: functional
- priority: P0
- status: draft
- verification: test
- dependsOn: []
- openQuestions: []
- changeLog: []

**Field values** — `type` ∈ `functional | non-functional | constraint`; `priority` ∈ `P0 | P1 | P2`;
`status` ∈ `draft | ready | in-dev | accepted | deferred | withdrawn`; `verification` ∈ `test | demonstration | analysis | inspection`.
`source` / `traces` / `dependsOn` are bracketed comma lists (`[]` = none); every REQ needs at least one AC with `given` / `when` / `then`.
`changeLog` entries are one line each: `<YYYY-MM-DD> · <who> · <change>`; a REQ leaving `draft` must carry at least one.
Slices list **explicit ids** (no ranges); every REQ's `slice:` must match one row and that row must list the REQ.

## Open items (do not use as conclusions)

- …

## Next step (one REQ per task)

| Task | REQ | Depends on | Acceptance |
|---|---|---|---|
| | REQ-002 | | AC-002-1 |
