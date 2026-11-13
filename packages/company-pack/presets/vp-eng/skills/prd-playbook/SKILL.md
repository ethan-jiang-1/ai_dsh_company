---
name: prd-playbook
description: 'VP-Eng PRD playbook: take CMO MRD+StRS and produce a traceable, acceptance-ready, decomposable product-layer requirements ledger (REQ/AC/slice, source→MR, traces→StRS); pass DoR/DoD and /prd check + /req check; read the shared product-definition spine and the product-type playbook first.'
---
# PRD playbook (VP-Eng)

Load `product-definition` first (spine + product-type playbook). The PRD is a **requirements ledger**, not an essay:
engineering consumes it slice by slice, and each REQ can enter the task board independently.

## Inputs

- `deliverables/<slug>/drafts/mrd.md` (CMO's market opportunity, numbered `MR-###`) and `drafts/strs.md` (CMO's stakeholder requirements, `REQ-###`).
- `.dsh-company/kb/vp-eng/CHARTER.md` (stack, staffing, cost basis) and company facts.
- Product-type playbook (project/systems integration or hardware-software) — determines which extra fields the PRD needs.

## Steps

1. **Align the opportunity**: read every MR and StRS item; each PRD REQ uses `source` to point back to at least one MR id and `traces` to point back to
   the StRS REQ. If an MR does not hold, return it to CMO; do not fill in the market conclusion inside the PRD.
2. **Cut the smallest end-to-end slice**: define S1 first (the smallest demonstrable/acceptable loop), then order later slices;
   a REQ belongs to exactly one slice.
3. **Split requirements**: each REQ is independently acceptable; write dependencies as REQ ids; do not put two requirements in one REQ.
4. **Write acceptance**: each REQ has at least one AC in given/when/then form that is true or false; delete anything that cannot be settled by facts.
5. **Add constraints**: non-functional (performance/security/compatibility/maintainability), technical prerequisites, external dependencies, milestones.
6. **Feasibility**: for items over 2 person-weeks, cross-system, or with an undecided dependency, mark "to verify" and write the verification method; do not write guesses as conclusions.
7. **Pass DoR/DoD**: before `draft → ready`, fields are complete, AC is decidable, source is traceable, dependencies are declared;
   before `accepted`, every AC is verified. Write state changes to the changeLog.
8. **Mechanical check**: `/prd check <slug>`; fix red, do not bypass it.

## PRD output

Write it with `<company-content>/templates/prd.md`, save to `deliverables/<slug>/drafts/prd.md` (`layer: PRD`, `definition: headings`).
- **Each `### REQ-###` section is the sole definition point**: field lines under the heading (`userStory` / `acceptance` / `source` / `traces` / `slice` /
  `type` / `priority` / `status` / `verification` / `dependsOn` / `openQuestions` / `changeLog`) define the requirement; the one-page summary and the
  Slices table only reference ids. There is no JSON ledger.
- Body: overview, scope and non-scope, constraints, dependencies and risks, a Slices table (explicit REQ ids, no ranges), then one section per REQ.
  `verification` ∈ `test | demonstration | analysis | inspection`; every REQ needs at least one AC with `given` / `when` / `then`.
- Numbering: REQ-###, AC-<REQ>-<n>; append-only, never renumber; withdraw through status (`withdrawn`), do not reorder or reuse.
- Mechanical check: `/prd check <slug>` (structure) + `/req check <slug>` (numbering/layer/traceability); fix red. `present` runs the same PRD check and
  **blocks the delivery** while it is red — fix the PRD, do not split the delivery to bypass the gate.

## Boundary

- Do not judge "will anyone buy" for CMO; do not price for VP-Sales; do not commit delivery dates for COO.
- **Product layer only**: if downstream system/interface/verification documents are assigned by the CEO to someone else, do not author or prefill them.
- Technical infeasibility / cost blow-up / unacceptable risk → veto + one-line reason; when MRD and PRD conflict, keep both conclusions and
  send them to the CEO for a decision.
- After the PRD passes, engineering enters the task board as "one REQ, one task"; acceptance checks AC ids, not "it feels done".
