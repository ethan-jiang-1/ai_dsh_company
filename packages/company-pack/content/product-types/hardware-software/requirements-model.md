# Product document chain and numbering contract (hardware-software)

> **The numbering contract's single home**: layer owner, id order, traceability, machine red. Staffing/people/formats have their own homes; an ID carries identity only.

## Five layers and owners

| # | Layer | Answers | owner | File | `definition` | Numbering |
|---|---|---|---|---|---|---|
| 1 | **MRD** market | Should we, for whom, why we win | CMO | `drafts/mrd.md` | `json-ledger` | `MR-###` |
| 2 | **StRS** stakeholder | Who cares, what, who signs acceptance | CMO | `drafts/strs.md` | `headings` | `REQ-###` |
| 3 | **PRD** product | What product we sell | VP-Eng | `drafts/prd.md` | `headings` | `REQ-###` / `AC-###-#` |
| 4 | **SyRS** system | What the black box must satisfy, how verified | <assigned> | `drafts/syrs.md` | `headings` | `REQ-###` |
| 5 | **IRS** interface | What a cross-boundary interface looks like | <assigned> | `drafts/irs.md` | `headings` | `IF-###` |
| — | Allocation | Requirements → subsystems / purchased parts | <assigned> | IRS appendix `allocation.md` | `none` | no ids |
| **V&V** | Verification plan | How verified, who executes | <assigned> | `drafts/vv-plan.md` | `table-rows` | `TC-###` |

**Default chain**: MRD → StRS → PRD. SyRS/IRS/V&V are optional, only with a CEO-assigned owner; downstream never decides for upstream.
`final.md`, review drafts, and briefs declare no `layer`; they define no ids.

## Numbering rules (R1–R10)

| # | Rule | Shape |
|---|---|---|
| R1 | **Identity** | `<KIND>-<NNN>`, `KIND ∈ {MR, REQ, IF, TC}`; four append-only sequences, globally unique within a motion; allocated only when the owner registers (`max+1`); proposers do not pre-allocate |
| R2 | **Subordination** | `AC-<REQ id>-<n>`; parent must exist |
| R3 | **Layer** | Not in the ID; one document, one layer; header declares `layer` and `definition` |
| R4 | **Definition** | Only in the declared shape (`json-ledger` / `headings` / `table-rows` / `none`); prose appearance = reference; one id, one definition point |
| R5 | **Status** | Not in the ID; definition point carries draft / effective / retired; "proposed" = draft, id unchanged; retired ids kept, never reused |
| R6 | **Reference** | Bare ID in-document; cross-motion `<motion-key>:<ID>` unsupported in v1: mark "unsupported", do not parse or judge |
| R7 | **Traceability** | Downstream writes line-start `traces:` / `covers:`; indexes derive from `/req check`; missing upstream or layer = red |
| R8 | **Counts** | Derived from the index; no hard-coded "N items"; no range assertion |
| R9 | **Vocabulary** | Single authority; retired words in "Retired words", appearance red; `NFR` is a `kind: NFR` field, not a token |
| R10 | **Enforcement** | `/req check <deliverables dir>` is an operator command; roles may not self-check and self-certify |

## Document header

```yaml
---
layer: SyRS
definition: headings
---
```

- `layer` ∈ `MRD / StRS / PRD / SyRS / IRS`; V&V plan uses `V&V`.
- V&V header carries `covers` (`REQ-###` / `IF-###`).
- The machine trusts the header: if a summary table and headings coexist, the declared shape defines; the other references.
- Missing/altered header: report "missing layer declaration"; no guessing.

## Item shapes

- `json-ledger`: the JSON element `id` defines; body headings are references.
- `headings`: `### REQ-041` / `#### IF-014` define; field lines follow (`kind:` / `status:` / `owner:` / `verifier:` / `traces:` / `covers:`; PRD adds `userStory:` / `acceptance:` / `source:` / `slice:` / `type:` / `priority:` / `verification:` / `dependsOn:` / `openQuestions:` / `changeLog:`).
- `table-rows`: first cell `<ID>` defines; a summary table references.
- Fields use line-start labels (`- traces:` / `traces:`); prose "traceability" is not a field.
- **PRD migration (2026-11-13)**: new PRDs are `headings` — one `### REQ-###` section per requirement, no JSON ledger. Documents that still declare `definition: json-ledger` stay readable (`/prd check` keeps the legacy schema) but are exempt from new authoring.

## Traceability

- StRS → `traces: [MR-###]`; PRD → `source: [MR-###]` + `traces: [REQ-###]` (StRS); SyRS → `traces: [REQ-###]` (PRD); IRS → `traces: [REQ-###]` (SyRS); TC → `covers: [REQ-### / IF-###]`.
- Missing edge = **orphan** (red); nonexistent target = **dangling** (red).
- Derive matrices from the index; never hand-write or aggregate from prose (mention graphs create wrong edges).

## Status

- Item status: **draft / effective / retired**; not in the ID.
- PRD mapping: `draft`→draft; `ready` / `in-dev` / `accepted`→effective; `deferred`→draft; `withdrawn`→retired.
- Drafts do not count as effective; retired ids are kept.

## Scope and exemption

- A new motion enters numbering only with `numbering: identity` in `meta.md`; optional `layers:` declares this round's layers; missing layers are red.
- An old motion without `numbering:` = **read-only exemption**: no retroactive red; checker records `skipped`.
- Exemption must be explicit and reviewable; no silent pass.

## Concurrency

- Owner takes `max + 1` when registering; Lead allocates serially, single writer.
- Concurrent sessions can collide — **collision = red**; v1 has no lock; record "possible collision" in open items.

## Checks

- `/prd check <dir>`: MRD/PRD structure (boundary, AC, changeLog).
- `/req check <dir>`: ids/layers/traces/retired words/counts; pass or fail + counts + derived index.
- Both are operator commands; roles cite results, never self-declare pass.

## Retired words

- `STR-###` / `SYR-###` / `IFR-###` → layer in header; items use `REQ-###` / `IF-###`.
- `VP-###` → `TC-###` + `covers:`; SA references only, allocates no ids.
- `V-###` / `VR-###` → `TC-###`; old motions read-only per scope.
- `VP-Eng` is a role name, not a numbering word.
