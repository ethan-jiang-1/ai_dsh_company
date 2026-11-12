---
layer: PRD
definition: json-ledger
---

# PRD (product requirements · requirements ledger + one page)

> Lead = **VP-Eng**; input = `drafts/mrd.md` (CMO's market opportunities) + `drafts/strs.md` (CMO's stakeholder requirements) in the same directory; save to `drafts/prd.md`.
> **It is not an essay**: engineering consumes it slice by slice, **one REQ per task**; every REQ must point back to an MR id.
> **The JSON ledger is the only definition point** (`definition: json-ledger`): section headings are references and may not start with a bare ID.
> `source` names the MR source; `traces` names upstream StRS items (cross-layer traceability is written as edges through these two fields, not by prose proximity).
> Mechanical check = `/prd check <deliverables dir>`; numbering/traceability = `/req check <deliverables dir>`; if a field cannot be written, write "undecided", not adjectives.
> Technical solution ≠ this file (that is `review-note.md`); pricing ≠ this file (VP-Sales / CFO own it).

```json
{
  "prd": {
    "version": "0.1",
    "status": "draft",
    "slices": [
      { "id": "S1", "goal": "Minimum end-to-end: <smallest demoable/acceptable loop>", "requirements": ["REQ-002"] }
    ],
    "requirements": [
      {
        "id": "REQ-002",
        "title": "<one-line requirement>",
        "type": "functional",
        "priority": "P0",
        "status": "draft",
        "source": ["MR-001"],
        "traces": ["REQ-001"],
        "slice": "S1",
        "userStory": "As <who>, I want <what>, so that <what I get>",
        "acceptance": [
          { "id": "AC-002-1", "given": "<precondition>", "when": "<action>", "then": "<observable result>" }
        ],
        "dependsOn": [],
        "verification": "test",
        "openQuestions": [],
        "changeLog": []
      }
    ]
  }
}
```

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

## Milestones and slices

| slice | Goal | Contains REQ | Exit condition |
|---|---|---|---|
| S1 | | | |

## Requirement detail (one section per REQ, referencing the JSON definition; this section defines no ids)

### Requirement: REQ-002 <title>

- Source: MR-001｜StRS: REQ-001｜slice: S1｜priority: P0｜status: draft｜verification: test
- User story: …
- Acceptance:
  - **AC-002-1** given … / when … / then …
- Depends on: REQ-… (write "none" if none)
- Open questions: …

## Open items (do not use as conclusions)

- …

## Next step (one REQ per task)

| Task | REQ | Depends on | Acceptance |
|---|---|---|---|
| | REQ-002 | | AC-002-1 |
