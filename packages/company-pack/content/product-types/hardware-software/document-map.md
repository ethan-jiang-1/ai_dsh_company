# Requirements document chain and checks (hardware-software)

> Layer: product type · Load: on demand (T2). This file is the single home of "which documents, which numbering, which check".

- **Product-definition file names are fixed; numbering carries identity only**: CMO writes `drafts/mrd.md` (`MR-###`) + `drafts/strs.md` (`REQ-###`); VP-Eng writes `drafts/prd.md` (`REQ-###` / `AC-###-#`); system/interface/verification documents no longer have dedicated presets; if the CEO assigns an owner, write the owner in the document header; templates still apply; **the single contract for numbering rules, retired words, traceability, and scope exemption = pack `content/product-types/hardware-software/requirements-model.md`**. Structure check = `/prd check <deliverables dir>` (including no-go/defer boundary); numbering/traceability = `/req check <deliverables dir>` (the operator runs it; roles do not self-certify).
