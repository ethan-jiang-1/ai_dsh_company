# Collaboration rules

> Layer: generic · Load: on demand (T2)

## Collaboration rules

- **A motion enters and exits through the CEO**: only the CEO; other members do not deliver externally past the CEO.
- **Composition inheritance (mechanism fact, two channels)**: a teammate from `spawn_teammate` **inherits the Lead's composition** — its tools and skills surface is
  the Lead preset's, **not your role preset's**; use your own CHARTER / KB for method; **do not assume role skills load**.
- **Team role pack (a brief convention, not a mechanism)**: when a spawn takes a functional role, the brief carries a **role pack** — role name / **brief path** /
  CHARTER / `<company-content>/../presets/<role>/skills/<skill>/SKILL.md` / KB / output / boundary; the member `read`s
  these files first; do not skip because `skill` cannot load role skills.
- **A named child has its own preset (mechanism fact)**: `vp_eng` / `vp_sales` / `vp_cmo` / `coo` / `cfo` get their composition from
  `agentPreset` — the child gets **that role's skills and tools** and can load its role skills; the root session is Team Lead,
  and can `spawn_teammate` a squad in its own gate.
- **Multi-person mode (enabled when a human declares "this is multi-person mode" at the start)**: another role's work is done by that person in their own session — the CEO **does not spawn members to do it**;
  instead put the **brief** at `.dsh-company/deliverables/<date>-<slug>/drafts/ceo.md` (the CEO's own draft, with machine-readable ASSIGN lines); each role's person **in their own root session** reads it and
  produces `drafts/<role>.md`; merging still belongs to the CEO; **without that declaration it is single-operator mode**. Details in this section; human-side ownership = `.dsh-company/kb/owners.md`.
- **Write guard (mechanism fact)**: read before write — **blind-writing an existing file is rejected**; writing after someone else changed it is also rejected (re-read and retry). The guard is per session and **resets on restart**; it governs freshness, **not exclusivity** — to claim a slot, at the start drop `drafts/<role>.md` with **first line exactly `claim=acknowledged, not a draft`** (machine-checkable); **after claiming, re-read the other files in the same group** before deciding to hold or yield; to yield, rewrite the first line as `yield=claim withdrawn, not a draft` (holding = claim ∧ ¬yield).
- **Motion task board**: in single-operator mode, land tasks on the board before writing — members **claim before writing** (claim failure = yield: do not write the task's owner-bound artifact, report to the lead, then move on); owner-bound artifacts may be overwritten only by the owner or an explicit reassignment; shared artifacts need explicit authorization; when done, **complete the task** and journal the receipt. **Keep one DSH process writing the shared disk** (multiple instances stepping on each other is a recorded case).
- **Fact-blocking discipline**: when a task's factual premise needs external material — **a block must surface**: exhaust the channel (play = CEO skill `fact-finding-playbook`) and if still unavailable, immediately tell the CEO where you are stuck; **silent blocking = violation**; the task's ASSIGN status is **`pending-sources`** (machine-checkable enum; **it and its dependency chain may not be marked "done"**). Put material at `.dsh-company/deliverables/<date>-<slug>/drafts/sources/`; landing on disk counts as received.
- **Two ways to ask a human**: a delegated member with a question uses `send_message` to escalate to the CEO (prefix `[NEEDS-CLARIFICATION]`); members **do not ask the user directly**;
  an **independent session** (the other person opens your session directly, no motion context) may use `ask_user_question`. ⚠ **In multi-person mode this reverses**:
  your gate is the root session ⇒ when hitting a line or needing material, **you raise it yourself** (`request_signoff` / `ask_user_question`), **do not "escalate to the CEO"**. The divide = whether the session has a `parent` (delegated ⇒ automatically rejected; your own gate ⇒ allowed).
- **In-domain check and bounce-back**: on receiving a dispatch, ask two things — is this in my domain (against the "does not touch" column and routing table)? did I get acceptance criteria?
  **Whole-task mismatch ⇒ bounce back**: `send_message` to the CEO (with `[NEEDS-CLARIFICATION]`) with three things — **why it is not mine + what is missing + who should take it**;
  release the claimed task at the same time. **Bounce-back is a correction contribution, not an insult; no blame** (the CEO must respond with one of three: reclaim and reassign / narrow scope / supply criteria).
  **A half-domain task is not bounced**: do the in-domain part, mark the out-of-domain part "to confirm", and name it in the report.
- **Single owner**: every task has one owner and an acceptable output; the owner produces the draft, the CEO only merges and does not ghost-write. **Keep disagreement**: conclusions and disagreements both go into the deliverable.
- **Star reporting + in-domain respect**: all member communication goes through the CEO; members do not go sideways (**by design**); if the two sides' numbers/readings disagree at close-out, the CEO **opens a reconciliation round before deciding** (procedure = chairing skill); final must note "why reconciliation did not happen". **In-domain judgment belongs to that domain's owner** — the CEO's decision authority is for cross-domain trade-offs and commitments; overriding an in-domain opinion must be justified in final; a role's work is done in that role's session, the CEO does not do it; do not over-preload conclusions when dispatching.
- **Review draft naming**: review drafts go to `.dsh-company/deliverables/<date>-<slug>/drafts/<role>-review.md` (one per role).
- **Review independence levels**: distinguish **mechanical full recompute** (independent) from **judgment review** (same model, different thread ⇒ limited independence); never say a blanket "different-person review"; mark **margin width** next to key causal conclusions (how many cells flip it).
