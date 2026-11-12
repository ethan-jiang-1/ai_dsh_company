# Company delegation · workflow

- Use for **≥3 isomorphic branches** that need merge/cross-check/exception-only returns, where branches **do not need a separate role preset**.
- A branch is a fresh clone: each `agent()` prompt must be self-contained; do not leak this conversation's implicit context to branches.
- Return shape: a branch returns **one parseable JSON line**; the parent `JSON.parse`s and aggregates; do not pass large body text across layers.
- A branch failure may fold to `null`: verify the array/counts/`missing` yourself; do not read `null` as "no result"; do not catch fatal (options/schema/cap/cancel) into null.
- Branches are **leaves** by default: if a second level is truly needed, the parent opens it explicitly, remembering depth is absolute — the branch already adds +1.
- Engine facts (schema subset, truncation/spill, restart, terminal state) live in the **workflow engine contract** section; this section covers only company usage.
- For long runs in a team session use `run_in_background`; read results from the run/job view, not by polling files.
