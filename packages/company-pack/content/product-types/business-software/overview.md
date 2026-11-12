# Enterprise software · product type overview

> Layer: product type · Load: on demand (T2); this file is a ≤2KB summary. Use for **pure software / enterprise software**: no on-site hardware, no firmware/electrical/mechanical deliverables,
> and not delivered under a project SOW. Product type = engineering discipline; SaaS / private deployment / perpetual license are **deployment/commercial shapes**,
> not product types, and not the second axis's delivery modes (delivery mode = `productized` / `project-services` / `managed-service`).

## When to use

- The deliverable is a software service, desktop/enterprise app, platform, or toolchain;
- There is no hardware that needs on-site installation, power, sampling, load-bearing, or certification;
- Revenue may be subscription, seats, usage, or perpetual license; delivery may be SaaS, private deployment, or on-prem.
- If the motion includes on-site hardware, firmware, electrical/mechanical parts, or certification, switch to `hardware-software`.
- If delivered by SOW/UAT/on-site, **the product type is still `business-software`**; write delivery mode as `project-services`;
  delivery documents and templates are in `content/delivery-modes/project-services/`; do not force a SOW into this type.
- If selling ongoing SLA / on-call / monthly report / renewal, write delivery mode as `managed-service`; documents in `content/delivery-modes/managed-service/`.

## Document chain

`MRD → StRS → PRD`, stopping at the product layer:

| Layer | Answers | owner | File |
|---|---|---|---|
| MRD | Should we do it, for whom, why we win | CMO | `drafts/mrd.md` |
| StRS | Who cares, what they care about, who signs off at acceptance | CMO | `drafts/strs.md` |
| PRD | What product we sell, how it is accepted, how it is sliced | VP-Eng | `drafts/prd.md` |

**No SyRS / IRS / V&V layer**; interfaces, system boundaries, and deployment shape are written as PRD technical constraints/risks, not as a separate requirements layer.
If the motion truly needs system-level requirements or an independent verification plan, switch to `hardware-software`; do not force it into this type.

## Deployment/commercial shape (written in the PRD; no separate type)

- **SaaS**: tenant, SLA, activation, retention, release train, feature flag; acceptance looks at usage data and SLOs.
- **Private deployment / on-prem**: installation, upgrade, compatibility matrix, data migration, rollback; acceptance looks at on-site upgrade and rollback drills.
- **Perpetual license**: version compatibility, maintenance window, license and upgrade path; acceptance looks at the version-support matrix.

Deployment/commercial shape affects acceptance and release, but does not change the MRD/StRS/PRD layers or numbering.

## Success criteria

- Every REQ has an AC that can be judged true/false;
- Release has canary/rollback or upgrade/rollback paths;
- Key usage metrics (activation, retention, SLO, tickets) have a baseline or collection method;
- Out-of-scope and open items are listed separately; "later" is not a substitute.

## Difference from hardware-software / project delivery

- No BOM, certification, trial production, on-site installation, firmware/hardware compatibility matrix;
- No mandatory SyRS/IRS/V&V layer; interfaces and deployment live in the PRD;
- Acceptance is usage/release/upgrade oriented, not an on-site acceptance sheet or UAT signature.

## Terms

See `glossary.md` (tenant / SLA / activation / retention / release train / feature flag / on-prem / perpetual).
