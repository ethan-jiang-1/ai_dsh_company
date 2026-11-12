# Requirements document chain and checks (business-software)

> Layer: product type · Load: on demand (T2). This file is the single home of "which documents, which numbering, which check".

- **Product-definition file names are fixed; numbering carries identity only**: CMO writes `drafts/mrd.md` (`MR-###`) + `drafts/strs.md`
  (`REQ-###`); VP-Eng writes `drafts/prd.md` (`REQ-###` / `AC-###-#`).
- **The chain stops at the PRD**: no SyRS / IRS / V&V layer; system/interface/deployment are written as PRD technical constraints and risks.
  If the motion truly needs system-level requirements or an independent verification plan, switch to the `hardware-software` type.
- **The single contract for numbering rules, retired words, traceability, and scope exemption** = pack `content/product-types/business-software/requirements-model.md`.
- **Structure check** = `/prd check <deliverables dir>` (MRD/PRD structure, AC, changeLog);
  **numbering/traceability** = `/req check <deliverables dir>` (the operator runs it; roles do not self-certify).
- The layers in `check-rules.json` = `MRD / StRS / PRD`, default layers = the same three; `layers:` does not need to declare a system layer.
