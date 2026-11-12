---
name: chairing-staff-meeting
description: 'CEO motion rhythm: clarify → DAG decomposition and dispatch → track progress → VP cross-review → close-out → bookkeeping (the roster and channels are decided first by assembling-the-team; this skill does not decide them again).'
---
# Chairing a motion

Six steps from entry to exit (assembly is done — who is in the room and which channel, see assembling-the-team):

1. **Clarify**: restate the motion in your own words; make three things explicit — goal, constraints (time/budget/people), acceptance criteria.
   If you cannot write them down, do not start.
2. **Decompose and dispatch (DAG)**: split into "single owner + acceptable" tasks; create them on the team task board, and **write the acceptance criteria into the task**.
   **Run the capability probe first** (one `web_search` + one `bash curl`) before splitting — if a task's factual premise needs an external web page,
   confirm the channel opens first (playbook = fact-finding-playbook; "not found" usually means "did not change posture").
   **Task-board placement**: one task per deliverable; put the path prefix to write in `writeScopes`; when two tasks overlap, the task view carries
   `writeScopeWarnings`; coordinate locally (coordination relies on warnings, not locks — task ownership is not a lock; fake mutual exclusion is more dangerous than an explicit warning);
   **keep one DSH process writing the shared disk** (the guard handles freshness, not cross-process exclusivity; multiple instances stepping on each other is a recorded case).
   **Dependencies land in two beats** (2026-10-13, recorded: guessing ids while creating tasks in parallel ⇒ `blocker task "3" not found`,
   dependency edges silently missing): the board assigns ids (`task-N`, which exists only after create succeeds) ⇒ ① create the tasks
   (multiple can be created in parallel; create's `blocked_by` may only reference **existing** ids), ② then use
   `team_task_update(action='set_dependencies', blocked_by=[…])` to add the dependencies (who waits for whose draft).
   **Several tasks created at the same time do not have ids yet; do not guess**; `T1/T2` in the brief are **paper numbers** — before landing on the board, use create's
   return or `team_task_list` to replace them with `task-N`. Who is in the room and which channel were already decided by assembling-the-team —
   this skill does not decide the roster; the brief is complete: goal, constraints, acceptance, due date.
   **A multi-person brief must carry machine-readable ASSIGN lines** (format owner = this section; the member-side one-liner is in the handbook):
   one line per task `ASSIGN｜T1｜<role>｜<one-liner>｜deps: <T# or none>｜status: todo` (one line per cell, copy the format verbatim;
   status enum = todo/drafted/done/cancelled/pending-sources; an unproven causal guess gets the optional tail `｜assumption: <to-verify/content>` —
   instruction and assumption separated). Write it as soon as the brief is done; do not make members guess; **keep status aligned with the board** — mark drafted as `drafted`, cancelled as `cancelled`,
   before merge as `done` (recorded: after quote-z closed out, three status lines still said `todo`; the scan reported them as overdue live work).
3. **Track progress**: `wait_agent` for drafts; nudge through task-board comments or reopen; **do not grab the work and do not ghost-write**.
   **A single wait ≤ 3 minutes** (`timeout_ms` ≤ 180000): on timeout, read the task board + member status first, then decide "keep waiting / nudge /
   do other work yourself"; **do not wait 20 minutes in one go** — the UI stays in a waiting state for a long time, and to a human it looks "stuck"
   (2026-11-06: lead sent 5 × `timeout_ms: 1200000`, members were still running, and the user judged the session stuck).
   **Drain before HITL**: before asking a human (`ask_user_question` / waiting for authorization), **dispatch every task that does not depend on the answer and whose dependencies are satisfied**,
   then wait — while the lead blocks, the whole team stalls (V4 counterfactual: the team froze for 11 hours); completion reports received while waiting
   are handled first when you resume.
4. **VP cross-review**: after each function produces a draft, assign a cross-review (e.g. VP-Sales reviews VP-Eng's cost and volume assumptions; COO reviews delivery feasibility
   and staffing; CFO reviews gross margin and compliance gates). **Cross-review is a heavy ceremony (2026-10-12 hard clause)**: every cross-review chain must state
   which concrete failure it prevents (e.g. "the two parties' numbers disagree and nobody reconciles"), otherwise do not set it — default to a single review or review it yourself.
   Send the review intent to the other party with `send_message` (cross-function communication goes through the mailbox; messages and receipts are in each session log);
   the owner revises per the feedback and receipts on the task board.
   For a draft revised more than once, the owner puts the **authoritative version** (v1/v2/v3…) at the top of the draft; review comments and receipts refer to the version.
5. **Close-out**: read the drafts yourself, merge them yourself. **The merge basis = the authoritative version's on-disk text** — receipts and messages are leads only;
   numbers you cite must be checked against the draft. Preserve each function's conclusions and reservations; **do not flatten disagreement**; ask the owner to change.
   **When the two parties' numbers/readings disagree, open a reconciliation round before deciding**: each party gives one sentence → you restate the other's view → each gives one response;
   only if still misaligned do you decide or record both, and `final` must note "why reconciliation did not happen" (V4 counterexample on record).
   **Fact close-out rule**: the conclusion layer of `final` **must not rest on facts you have not read** — when closing with `pending-sources`, either downgrade to
   **"contingency version (pending-sources recompute)"** and list the conclusions invalidated with it, or do not close; create a recompute follow-up with schedule
   (the follow-up returns to this session at due time and checks `sources/` to recompute); **the title must contain `pending-sources·<slug>·<T#>`** (audit anchor;
   one master anchor may cover several missing-material tasks — but **the title or prompt must name** the downstream `T<N>` it unblocks; unnamed ones are still judged
   "no anchor"); follow-ups have two types — execution (report / fact lookup / reading) runs at due time; decision (spending / external commitment / cutting scope / signing)
   only enters the todo panel; **a verbal "reminder created" with no task as evidence = action hallucination** (schedule.json is auditable). Send a **source-request card** to
   the driver: what is needed / URL / lands in `.dsh-company/deliverables/<slug>/drafts/sources/` (one card per matter is not nagging); material on disk counts as
   received; the owner produces the next version and changes the status back to `todo`.
   **Before finalizing, inventory reservations**: how many each role still holds, zero or explicit; write the result into the minutes.
   **Also inventory journal presence before finalizing** (2026-09-26; **switch the executor** — absentees will not report themselves): for every role that worked this motion,
   check `.dsh-company/kb/<role>/journal/` for a current-round entry; **send the absent ones back to write it; do not merge until complete**
   (an off-work trail is a hard gate: no entry = that role has not finished).
   Write the final to `.dsh-company/deliverables/<kickoff date>-<slug>/final.md` (**use the injected real date when creating the directory**, and write the `meta.md` dossier at the same time — **copy the shape of `<company-content>/templates/meta.md` verbatim**: the core fields are flat `field: value` lines, and type/result use enumerated values from the template; a markdown bold list does not match the machine-readable shape, the catalog tab marks "meta shape error", and the operator checks it at close-out), and declare delivery with `present`.
   ⚠ **The order is hard: first `present`, then** change the `result` field in `meta.md` to the terminal word — **no present means no "done"**.
   Writing `final.md` is not closing: that incident (all-in-ai-2026) wrote final and marked done but never called `present`
   ⇒ the catalog tab shows "present unverified"; the operator checks it at close-out and names the slug.
   **First screen in human language (2026-10-10 user ruling)**: the first paragraph after the final's signature line = the "one-minute summary" — conclusion (≤3 business-language points),
   next step (who/when), decisions the user must make (if any); **no internal jargon** (gates/T#/anchors/grades in the report body);
   **blocking choices** must use `ask_user_question`, with option labels as executable actions and descriptions as key consequences; **non-blocking gaps** state the default assumption and continue, list them at the end of the round as to-confirm;
   when multiple options need weighing on common dimensions use a short GFM table; simple binary choices or narrow screens use a short list; provide file line anchors only for key conclusions/reviewed numbers, not for every repeated/background number;
   drafts, briefs, and member messages keep their internal collaboration density; do not shallow them for the human-facing exit; **`present`'s description carries the same summary** — the delivery card is shown directly to the user; a senior reader understands it without opening it.
6. **Bookkeeping (hard gate)**: append the day's minutes to `.dsh-company/kb/ceo/journal/` (motion / decisions / disagreements / leftovers) — **no entry = the meeting is not closed**. **Date basis** (rule single source = handbook "date basis"; the date channel went live 2026-09-30): **write the real date from the current time injected into the session** (filename and body agree); **still do not guess from memory and do not take "next day" from an existing journal date**. If injection is missing (mechanism failure), fail-closed: use the `date-pending` placeholder (`.dsh-company/kb/ceo/journal/date-pending-<slug>.md`) and name "date to be filled" in the close-out receipt.

New member joins: default fresh + brief (the current round's brief is not in the fork seed); to bring the Lead's **completed-round** meeting context, explicitly set `context: 'fork'`; do not make it ask from zero.

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. brief, deliverable tri-state vs. present); this text keeps only what needs context.
