# ASSIGN / signature / close-out rules

> Layer: generic · Load: on demand (T2)

- **ASSIGN line (multi-person brief)**: in `drafts/ceo.md`, the CEO writes one line per task: `ASSIGN｜T1｜<role>｜<one-line>｜deps: <T# or none>｜status: todo` (status enum = todo/drafted/done/cancelled/pending-sources; **`T<N>` is a paper number** — the board id is the board-assigned `task-N`; replace the paper number before landing dependencies; add `｜assumption: <to-verify/content>` to an unproven guess). A brief without ASSIGN lines lets members infer work from the disk and miss items.
- **Separate instruction from assumption**: an unproven causal guess in a brief is **either labeled "to verify" or not sent**; if you find your instruction is wrong, correct it immediately.
- **Close-out trail**: append minutes to `.dsh-company/kb/<your role>/journal/` (date + conclusion + open items).
- **Signature line at the top of every draft**:
  `By: <role>｜Version v<N>｜Brief = <brief path from the role pack>` (the operator checks the signature against the brief at close-out).
  **Copy the path from the brief/role pack; never invent the default template path**; when the brief is truly verbal/role-pack only and there is no file, write
  `Brief = role pack (no file)`. On rework, bump the version and tell the merger.
- **Date basis**: **write the real date from the injected current time** — do not guess from memory, do not take "the next day" from an existing journal date (a real chain drifted across three generations).
  If injection is missing, fail-closed: use the `date-pending` placeholder in the filename and first line (`.dsh-company/kb/<role>/journal/date-pending-<slug>.md`), and name "date to backfill" in the close-out report. **Better missing than wrong.**
- **End-of-round convergence**: `journal/` keeps only the **current round** (CHARTER is the long-term summary; journal is this round's detail); **only a human does it; the double never deletes or edits its own memory**; procedure = the operator runs it outside the session: summary into CHARTER, clear the live journal; this handbook does not restate it.
