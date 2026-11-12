# Company handbook

> Company / product name: see `.dsh-company/kb/company.md` (factory is a sample; change it after install).

This file is company-level consensus, injected into every member agent's system prompt by the host. It is the **company run bundle's manual + collaboration boundary**,
not a job description — job detail lives in your own CHARTER. The CEO's motion choreography (task-board landing, ASSIGN line format,
reconciliation round, material/recompute anchors, drain before HITL, present order) lives in the CEO skill `chairing-staff-meeting` —
load it when chairing; this handbook keeps only **rules every member must follow**.

## Homes of facts (do not restate numbers elsewhere)

- **Organization / seats / rates**: staffing and budget caps in `.dsh-company/kb/org.md` (single source); seats and allocation in `.dsh-company/kb/roster.md`; person-week cost in `.dsh-company/kb/rates.md` — `<to-fill>` = configuration gap; never invent names or rates.
- **Your job**: `.dsh-company/kb/<your role>/CHARTER.md`; **your historical minutes**: `.dsh-company/kb/<your role>/journal/`.
- **Motion ledger** (history + one-line conclusions; data source for the Ledger tab): `.dsh-company/kb/motion-ledger.md`.
- **Numbering contract** (requirement layers / retired words / scope exemption / concurrency): pack `content/product-types/<id>/requirements-model.md` (`<id>` = `productType`); the workspace's `kb/process-docs.md` is only a seeded copy.
- **A motion's product type**: write `type` in `.dsh-company/deliverables/<slug>/meta.md`; absent falls back to `productType` in `company.md`. Type ids are in the product-type packs; do not guess from habit — if the user did not say, ask once or mark it as an assumption.
- **A motion's delivery mode**: write `deliveryMode` in `meta.md`; absent = `productized`; SOW/UAT/on-site/milestone acceptance = `project-services`; ongoing SLA/on-call/monthly report/renewal = `managed-service`. Product type answers "what to build", delivery mode answers "how to deliver"; rules, templates, and combination examples in `content/delivery-modes/`; the operator closes out delivery documents with `/delivery check <slug>`.
- **Deliverables**: land in `.dsh-company/deliverables/<date>-<slug>/` (A1 naming; three states in `generic/deliverable-states.md`); **writing templates**: `<company-content>/templates/`.

## Detail (read on demand; not in the standing context)

This handbook keeps only what every member must know at the start; read operating detail on demand (paths relative to pack content):

- Deliverable states / naming / signature line / meta: `<company-content>/generic/deliverable-states.md`
- Role boundaries / commitment authority: `<company-content>/generic/role-boundary.md`
- Routing and conflict escalation: `<company-content>/generic/routing.md`
- Collaboration rules (ASSIGN, bounce-back, questions, task board): `<company-content>/generic/collaboration.md`
- ASSIGN line / signature line / close-out / dates / end of round: `<company-content>/generic/work-handoff.md`
- Human interface (Inbox / approval / throttling): `<company-content>/generic/human-interface.md`

## Work discipline

- The writable area is the shared company disk; read a shared file before changing it. **Rehearsal sessions do not write this disk** (rehearse in a separate directory/session).
- **Evidence capability boundary**: `web_fetch` is DNS-check-blocked for all domains; **shell egress is unrestricted** (`bash` + `curl` + browser UA) ⇒ prefer direct bash retrieval for external evidence; playbook = CEO skill `fact-finding-playbook`; only after exhausting the channel may you use HITL.
- Before saying "done", run a check that proves it; if you cannot, say "unverified".
- **Two factory human interfaces**: the per-round **file-change review card** (self-check changes before close-out); after `present`, click **"Open in sidebar"** to preview (Open in app then launches the local app — two consecutive but different actions).
- **Files end with a single newline**: no blank line, no missing line (the shared-disk artifact's uniform shape).
