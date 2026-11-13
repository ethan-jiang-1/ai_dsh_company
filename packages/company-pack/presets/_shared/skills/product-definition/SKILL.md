---
name: product-definition
description: 'Product-definition spine (shared by CMO and VP-Eng): turn a market opportunity into a traceable, acceptance-ready, decomposable requirements ledger; choose the playbook by product type; produce MRD+StRS (CMO) and PRD (VP-Eng).'
---
# Product definition (shared capability)

Use this for any new product, new feature, or new market opportunity. It has one spine; **the product type chooses the playbook**,
and MRD / PRD are two artifacts of that spine, not two separate templates.

## When to use

- CMO: explore a market opportunity, decide "should we do it / what / for whom", write MRD + StRS.
- VP-Eng: take the MRD and write a buildable, acceptance-ready PRD.
- CEO: assemble and close a new-product motion (default: CMO + VP-Eng; see CEO's `assembling-the-team`).

## The spine (seven steps, shared by both artifact types)

1. **Problem/opportunity**: who is underserved, in what scenario, because of what constraint? Label evidence [fact/assumption].
2. **Users and scenarios**: economic buyer, user, decision chain; how they cope today (the cost of not doing it).
3. **Value**: why us, why we win; alternatives and competitors.
4. **Success criteria**: observable business outcomes (not a feature list).
5. **Scope and non-scope**: what this version does, and explicitly what it does not.
6. **Requirements and acceptance**: each requirement gets an id and a set of true/false acceptance criteria.
7. **Risks and open items**: the one thing most likely to fail + fallback; list open items separately; never use them as conclusions.

## Product type × delivery mode (two axes)

First decide **what we are building** and **how it is delivered**, then read the matching content pack. **The type comes from the motion's meta**:
`productType` in `.dsh-company/deliverables/<slug>/meta.md` wins; only when absent fall back to `company.md`'s `productType`;
if the user's spoken declaration differs from the default, the user's declaration wins and is written into meta (do not leave it only in the conversation).

**Axis 1: product type (what we build)**

| Type | playbook | Typical questions |
|---|---|---|
| Hardware-software product | `references/hardware-software.md` | BOM/supply chain, certification, firmware-software interaction, pilot production and after-sales |
| Software / enterprise software | `references/business-software.md` | Delivery mode (SaaS/private/perpetual), upgrade/rollback, activation/retention/SLO, data boundary |
| New type | Not yet → add `content/product-types/<id>/` with the same structure (**ships with the pack**; workspace override not supported yet); **do not** stuff a new type into an old playbook | First write one page: "which fields/risks does this type add?" |

**Capability prerequisite**: before `hardware-software` enters PRD / quoting, pass `content/product-types/hardware-software/capabilities.md`;
if seats are missing (hardware/firmware/electrical/mechanical/certification/supply chain/pilot production/field), report the gap and do not enter quoting or external commitments.

**The only source of allowed values**: the type packs under `content/product-types/<id>/`; the table above maps one-to-one to them.

**Axis 2: delivery mode (how it is delivered)** — write it in `meta.md` as `deliveryMode`; absent = `productized`.
**It is not a product type; do not write it into `productType`.** Rules, document mapping, and templates = `content/delivery-modes/<id>/`:

| Delivery mode | Trigger | Additional documents |
|---|---|---|
| `productized` | Standard product sale; no SOW/UAT/SLA | none |
| `project-services` | SOW / UAT / on-site / milestone acceptance | SOW / UAT / RACI / milestones |
| `managed-service` | Ongoing SLA / on-call / monthly report / renewal | SLA / service catalog / runbook / incidents / monthly report / renewal |

Example combination: `productType: business-software` + `deliveryMode: project-services` — the requirements chain still runs
business-software's MRD→StRS→PRD, plus SOW/UAT/RACI/milestones; the requirements layer does not change.

**Growth path**: the playbooks in the pack ship with the version; a role's own play (industry language, evaluation scales) is adopted through cultivation into
`<DSH_HOME>/company/methods/<role>/`; do not change the shared playbook's public fields.

## Numbering and layers (contract = pack `content/product-types/<id>/requirements-model.md`, `<id>` = `productType`)

- Numbers carry identity only: `MR-###` (market opportunity) / `REQ-###` (requirement, **any layer**) / `IF-###` (interface) / `TC-###` (verification);
  `AC-<REQ>-<n>` is a child of its parent REQ. Each kind has its own append-only sequence, globally unique within the motion; the owner takes `max+1` when registering.
- Layer belongs to the document header: each requirements document writes `layer` (MRD/StRS/PRD/SyRS/IRS) + `definition`
  (`json-ledger` / `headings` / `table-rows` / `none`); layers are not part of the number; one document has one layer.
  `business-software` stops at PRD and does not write SyRS/IRS/V&V; `hardware-software` may extend the system layers as needed.
- Status belongs to the item: draft / effective / withdrawn; "proposed addition" = draft, same ID; withdrawal keeps the number and does not reuse it.
- Traceability: downstream rows write `traces:` at the start of the line (PRD also writes `source:` pointing to MR); the matrix is derived by `/req check`, not written by hand;
  missing upstream = orphan red; pointing to a nonexistent number = dangling red.
- Counts are derived from the index; do not write "N items" range assertions. Old layer prefixes (`STR/SYR/IFR`) and old verification prefixes (`VP/V/VR`) are retired; their appearance is red.
- Every REQ must carry: source, slice, priority, status, true/false AC, dependencies, verification method.
- Slice: give the **smallest end-to-end** first (S1); a REQ belongs to exactly one slice.
- State machine: `draft → ready → in-dev → accepted` (bypass: `deferred / withdrawn`).
  Before `ready`, pass DoR: fields complete, AC decidable, source traceable, dependencies declared; before `accepted`, pass DoD: all AC verified.
- **One REQ, one task**: when entering the engineering task board, the title carries `REQ-###`, `blockedBy` follows REQ dependencies; acceptance checks AC ids.
- Quality gate: `/prd check <slug>` covers MRD/PRD structure; `/req check <slug>` covers numbering/layers/traceability/retired words/counts
  (operator commands; the role does not self-certify). They do not replace judgment; they only block structural errors.
  `present` also runs the PRD check on deliverables that declare `numbering: identity` and denies the call while the PRD is red.

## The three artifacts

- **MRD (CMO lead)**: opportunity id, segment and economic buyer, current alternatives, competitors, buying points, size [fact/assumption],
  success criteria, go/no-go recommendation. Save to `deliverables/<slug>/drafts/mrd.md` (`layer: MRD`, `definition: json-ledger`).
- **StRS (CMO lead)**: stakeholder requirements — who cares, what they care about, who signs off at acceptance; each `REQ-###` carries
  `traces: [MR-###]`. Save to `deliverables/<slug>/drafts/strs.md` (`layer: StRS`, `definition: headings`).
- **PRD (VP-Eng lead)**: product-layer requirement sections, acceptance, technical constraints, feasibility, slices; save to
  `deliverables/<slug>/drafts/prd.md` (`layer: PRD`, `definition: headings`); each `### REQ-###` section is the sole definition point, uses
  `source` to point back to MR and `traces` to point back to the StRS REQ. Old motions may still carry `json-ledger`; new PRDs do not. If downstream system/interface/verification documents are assigned by the CEO to someone else, do not author them beyond authority.

## Boundaries and anti-patterns

- Do not pass off a "feature list" as requirements; do not write adjectives that cannot be accepted; do not write requirements without a source; do not silently change scope after `ready`.
- CMO does not decide the technical solution for engineering; VP-Eng does not judge "will anyone buy" for the market; pricing belongs to VP-Sales, delivery to COO,
  budget/gross margin to CFO.
- Preserve disagreement: when the MRD's market assumptions conflict with the PRD's feasibility, write both conclusions and evidence and send them to the CEO for a decision.
