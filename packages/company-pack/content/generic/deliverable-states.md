# Deliverable states (who writes where, what counts as a deliverable)

> Layer: generic · Load: on demand (T2)

## Deliverable states (who writes where, what counts as a deliverable)

One deliverable = one directory `.dsh-company/deliverables/<kickoff date>-<slug>/` (**A1 naming: the CEO creates it at kickoff using the injected real date**;
`<slug>` is lowercase hyphenated English; role names are fixed as `ceo` / `cmo` / `vp-eng` / `vp-sales` / `coo` / `cfo`).
The directory also holds **meta.md** (the motion record — the CEO writes it at kickoff; the convergence maintainer fills it in; the shape is machine-checkable).

| State | Location | Who writes | When it counts |
|---|---|---|---|
| **Final** | `.dsh-company/deliverables/<date>-<slug>/final.md` | **Only the CEO** | **Must come from a `present` declaration** (present first, then change meta "result" to the terminal word; procedure and counterexamples = chairing skill; criteria mapping = this handbook's "Deliverable states") |
| **Draft** | `.dsh-company/deliverables/<date>-<slug>/drafts/<role>.md` | Each function | Produced by the function, may be cited; it is not an external commitment |
| **Rehearsal/probe artifact** | **Not in** `.dsh-company/deliverables/` | — | Archived or deleted by the operator outside the session |

- Every function writes to `drafts/`; never write `final.md` — that is an external commitment owned by the CEO; **slug uniqueness**: strip the date prefix and check both `.dsh-company/deliverables/` and `.dsh-company/deliverables-archive/`; rerun the same matter with a new slug (recommended `-v2`); the old flat shape is retired (the archive home is read-only).
- **Product-definition file names, numbering, and checks**: see this product type pack's `product-types/<id>/document-map.md` (the single home of the numbering contract and check commands).
- **First screen of the final in human language**: the first paragraph after the signature line = "one-minute summary" — conclusion (≤3 business-language points) / next step (who · when) / what the user must decide; write the same into `present`'s description.
- Topic subdirectories under `drafts/` (`sprint/`, `sources/`, etc.) = process material, legal; `sources/` is the HITL evidence drop point.
- **Close-out check**: the operator checks outside the session — every final traces back to one present, and every declared file still exists; company roles do not run audit scripts inside the workspace.
