# meta.md template (motion file — the CEO opens it; close-out/convergence fills it)

> Machine-readable shape: the core fields **must** be plain `field: value` lines — `type` ∈ decision / production / diagnostic / qa;
> `result` ∈ in-progress / accepted / rejected / deferred / obsolete / undecidable / completed; a value outside the vocabulary or a missing line = the catalog marks "meta shape error" and the operator checks at close-out. Replace angle-bracket placeholders verbatim; `result` may be empty at the start (the observation gate watches it), **it must be a terminal word at close-out**
> — present exists while result is not terminal = the operator judges "result not terminal". Put free-form notes (mode/thresholds/risk
> gates) **after** the core fields: non-field lines are ignored by parsing, do not enter the criteria, and stay for humans.
> `numbering` / `layers` are **numbering-scope markers** (contract = pack `content/product-types/<id>/requirements-model.md`, `<id>` = `productType`): only `identity` enters
> the `/req check` numbering check; an old motion without it = read-only exemption (`skipped`). `layers` declares the layers this round reaches; missing layers are judged red against the declaration.
>
> **Pre-archive check** (archived items have stalled at `participants: CEO (to-fill)` / `summary: (to-fill — see final)`): before this item moves from `.dsh-company/deliverables/` to
> `.dsh-company/deliverables-archive/`, four steps must pass — ① **G1 backfill**: the CEO fills `participants` / `summary` / `result` (terminal word) / `closed` (real date) **in the same close-out action**; ② **G2 pre-`present` self-check**:
> `grep -c "to-fill" .dsh-company/deliverables/<slug>/meta.md` ⇒ **must be `0`** (non-zero ⇒ **do not `present`**);
> ③ **G3 pre-archive re-check**: same command ⇒ **must be `0`** (non-zero ⇒ **do not archive**); ④ **G4 cross-person spot check**: the reviewer
> samples one item and checks `summary` ↔ the cited sentence in `final.md` (mismatch ⇒ report an anomaly, do not edit). **An empty value ≠ a valid value**:
> `closed` may be empty only for **not-yet-closed** items, `untracked` only for wallClock — `participants` / `summary` **have no legal empty state**.

slug: <lowercase-hyphen-english-slug>
kickoff: <YYYY-MM-DD — the real date injected into the session; do not guess>
type: <decision｜production｜diagnostic｜qa>
numbering: <identity (write it for every new motion)｜omit = old motion read-only exemption>
productType: <type id = directory name under content/product-types/ (user declaration wins; omit = fall back to productType in company.md)>
deliveryMode: <productized｜project-services｜managed-service (omit = productized; SOW/UAT/on-site/milestone acceptance = project-services; ongoing SLA/on-call/monthly report/renewal = managed-service; orthogonal to productType)>
layers: <MRD, StRS, PRD, SyRS, IRS (layers declared this round; omit = up to PRD)>
participants: <CEO+participating roles, e.g. CEO+CFO+COO> (the CEO fills this at close-out in the same action as `present`; must be **set-equal** to the 4th column of the matching row in `.dsh-company/kb/motion-ledger.md`; `(to-fill)` placeholders may not be archived)
result: <leave empty or "in-progress" at start; terminal: accepted｜rejected｜deferred｜obsolete｜undecidable｜completed>
closed: <YYYY-MM-DD close-out date; empty if not closed>
wallClock: <X minutes (measured; write "untracked" if not recorded)>
summary: <accurate business conclusion — the ledger row quotes it verbatim; no mechanical word limit, never truncate; mechanism names, gate numbers, and internal criteria are not the standing subject of the conclusion; if full [fact]/[assumption] labeling is needed, put it in `final.md` and keep only the necessary natural-language conditions in this line> (the CEO compresses the conclusion from this item's `final.md` at close-out, **no new judgment**; **no placeholder brackets/`to-fill` words**; placeholders may not be archived)
events: <who, when, did what (source path) — may repeat on multiple lines>
