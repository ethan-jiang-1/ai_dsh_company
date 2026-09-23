# DSH development-workflow survey: in-flight task tracking, todo tool, plan mode

Research question: what does DeepSeek Harness (DSH) itself do about surfacing in-progress task
tracking to a human during a work session, so our repo can follow its practice rather than invent
our own.

Source of record: read-only checkout at `vendor/dsh/` (pinned tag `dsh-v0.1.5-rc.2` =
`fb2c4b9e698e30edb738bca4cf0618587db7d203` per our `AGENTS.md` vendor bookkeeping). All paths below
are relative to `vendor/dsh/` unless absolute. Nothing under `vendor/` was modified.

Evidence classes used throughout (per task constraints):

- **[A] shipped affordance** — the mechanism exists in code/config.
- **[B] documented practice** — DSH docs/prompts instruct agents or users to do X.
- **[C] observed practice** — DSH's own notes/postmortems show the team actually did X.

---

## 1. How DSH's own repo organizes in-flight development work

### No tasks/todo file convention exists — absence is a finding

- **No `tasks.md`, `TASKS.md`, `TODO.md`, or `docs/tasks.md` anywhere at repo top level** (verified
  by direct `ls`; all four absent). The only `tasks.md` mentions in the tree are a historical rename
  ledger entry (`docs/subsystems/tasks.md` → `docs/subsystems/jobs.md`,
  `.agents/notes/archived/architecture/2026-08-11-repository-naming-contract-and-rename-ledger.md:129`)
  and unrelated subagent notes. **[A]**
- In-code TODO markers exist but are urgency-graded code comments, not a work-tracking file:
  `FIXME` (release blocker) / `TODO` (soon) / `XXX` (someday) — `docs/development.md:159-167`. **[B]**

### `.agents/` structure: notes (decision records) + skills (reusable workflows) — no per-task checklists

- `.agents/notes/README.md` (read fully) defines the **Agent Note** system: "An **Agent Note**
  records a decision or proposal that affects this codebase — the *why* and *what we gave up*, the
  parts code and docs can't carry" (`README.md:5`). Layout is `{lifecycle}/{class}/yyyy-mm-dd-topic-title.md`
  with lifecycle folders `proposed/` → `implemented/` → `rejected/`, plus a frozen `archived/` tree
  (`README.md:9-19`). **[A]**
- **When a note is written**: "Every non-trivial change MUST add or update at least one Agent Note
  in the same PR" — non-trivial = alters behavior, architecture, cross-file contracts, process,
  testing strategy, on-disk/wire/config formats (`README.md:46`). The root `AGENTS.md` Conventions
  section repeats it as a standing order. **[B]**
- Workflow: a proposal starts in `proposed/` (with `## Proposal`, `## Acceptance criteria`,
  `## Risks`); on shipping it moves to `implemented/` and is rewritten to present tense
  (`## Decision`, `## Alternatives considered`, `## Consequences`); the move is gate-enforced
  (`README.md:80-121`). Notes are kept current with shipped reality, never edited into a different
  decision (`implemented/AGENTS.md`). **[B]**
- Crucially, **Agent Notes are decision records, not task lists**: the docs tier taxonomy explicitly
  bans "Migration plans, acceptance-task checklists, fixture walkthroughs" from Agent Notes
  (`docs/AGENTS.md`, tier table row "Agent Notes"). So the durable artifact DSH keeps per change is
  *why/what-was-rejected*, not *what-still-needs-doing*. **[B]**

### `docs/development.md` (read fully) — daily workflow, no in-flight task surface

- Contributor loop: narrow local checks matched to the changed surface, CI owns exhaustive coverage
  (`docs/development.md:125-137`); hooks intentionally run no tests. Nothing about task lists,
  plan files, or progress dashboards for contributors. **[B]**
- `CONTRIBUTING.md` states external PRs are **not accepted** at this stage (`CONTRIBUTING.md:9`) —
  all PR practice below is the internal team's. **[B]**

### PR and issue conventions

- PR template (`.github/pull_request_template.md`): three sections — **Motivation** (one line +
  `Fixes #NN`), **Changes** (commands/config/API/protocol + observable behavior), **Testing** with
  collapsible `<details><summary>Proof</summary>` blocks for "test output, screenshots, screen
  recordings, logs, or other reviewable evidence." Nothing requires a checklist of subtasks. **[B]**
- Issue templates: `bug.md`, `feature.md`, and `task.md`; `task.md` = **Summary + Deliverables**
  (`.github/ISSUE_TEMPLATE/task.md`). **[A]**
- **The durable per-task tracker is GitHub Issues + a GitHub Project**, not any repo file: the
  `DSH Issue Management` Project (org `deepseek-harness`, project #1) owns statuses
  `Inbox / Backlog / Ready / In progress / In review / Done / No action` plus planning fields
  (`Priority`, `Severity`, `Cost`, `Start Date`, `Target Date`) — `.github/issue-management/config.json`;
  `.agents/notes/implemented/process/2026-09-02-project-local-issue-planning-fields.md:15`. Status
  transitions are **event-directed from PR webhooks** (review requested → `In review`;
  changes-requested → `In progress`) —
  `.agents/notes/implemented/process/2026-08-10-event-directed-pr-review-status.md:13-21`. **[A][C]**

**Q1 summary**: DSH's repo organizes in-flight work as (i) GitHub Issues/Project for durable
per-task state, (ii) Agent Notes for durable per-decision rationale (same PR as the change), and
(iii) evidence-bearing PR descriptions. There is **no** in-repo task/checklist file convention at
any level, and checklists are explicitly banned from the note tier. In-session task tracking is not
a repo-file concern at all — it is a *product* concern, handled by the todo tool (Q2) and plan mode
(Q3).

---

## 2. How DSH describes the intended use of the todo tool to agents

### The exact model-facing guidance (tool description)

Defined in `packages/todo/tool-todo/src/index.ts:45-66`, composed by `describe(allowParallel)`
(line 74-78). Verbatim:

- **Head** (always): "Record and update a structured task list for the current work. Send the
  ENTIRE list every call — it REPLACES the previous list (there are no partial updates, no
  per-item edits). Use it to plan multi-step work and show progress: add one todo per concrete step
  before you start."
- **Active-status clause**, selected by the required `allowParallelInProgress` config:
  - parallel (`true`): "Mark every todo being actively worked on `in_progress` — several at once
    when work genuinely runs in parallel (e.g. concurrent subagents or background commands), one
    for sequential work; while work remains, at least one task should be `in_progress`."
  - single (`false`): "Keep AT MOST ONE todo `in_progress` at a time; while work remains, exactly
    one active task should be `in_progress`."
- **Tail** (always): "Mark a todo `completed` the moment it is done (do not batch completions), and
  allow no `in_progress` item only once all work is complete. **Skip the list for trivial
  single-step tasks.** Statuses: `pending` (not started), `in_progress` (being worked on now),
  `completed` (finished)." **[A]**

So the documented WHEN: multi-step work only (skip trivial single-step), one todo per concrete step
created *before starting*, keep exactly/at-least-one `in_progress` while work remains, complete
items immediately (no batching). The dual purpose is stated in the design note: "it steers the
model to plan multi-step work and keep the active work unambiguous, and it gives an interactive
host a live progress checklist" — the two purposes are "co-equal"
(`.agents/notes/archived/feature/2026-06-29-todo-write-tool.md:10`). **[B]**

### Semantics that matter for a progress surface

- **Whole-list replace, event-sourced**: each call appends a `todo/write` snapshot
  `{ todos: TodoItem[] }` to the calling agent's session log; replay is last-write-wins; item is
  minimal `{ content, status }` — "No id, priority, or `activeForm`" (`docs/subsystems/todo.md:22-27`;
  `src/index.ts:203-210`). Durability/replay/resume come from the log, not a service. **[A]**
- **Single owner**: the list belongs to the one agent session that created it; subagents keep their
  own lists; non-agent calls are rejected (`src/index.ts:205-209`; package README "Single owner"). **[A]**
- **Turn-scoped standing plan**: the `todos` projection folds to the latest `todo/write` and is
  **cleared by the next `turn/start`** (comment: "cleared by the next turn/start (turn/end keeps
  the finished checklist visible)", `src/index.ts:130-144`). Rationale (observed): "Readers treat
  the strip as 'what this turn is doing,' so a stale list across the turn boundary is the wrong
  product lifetime" — `.agents/notes/archived/feature/2026-07-28-todo-plan-clears-on-next-turn.md:10-14`.
  **[A][C]**
- **Not model-surface**: `todo/write` is excluded from the LLM message surface — "durable,
  replayable *UI* state that travels alongside the conversation without being part of it"
  (design note `2026-06-29-todo-write-tool.md:24-26`). The model sees its own tool call + counts
  result (`"Updated todo list: N pending, M in progress, K completed."`, `src/index.ts:198-201`). **[A]**

### Shipped in every preset, parallel mode on

`tool-todo` is composed with `allowParallelInProgress: true` in the base bundle
(`packages/bundle/base/cordis.patch.yml:401-404`) and in all three shipped agent presets
(`packages/preset/agent-presets/presets/{standard,cordis,ptc}/agent.cordis.yml`, e.g. standard at
lines 241-244). The web-app bundle disables the *global* row only because preset ownership moves
the tool per-agent (`packages/bundle/web-app/cordis.patch.yml:467-468` with the host-plane comment
at 406-408). **[A]**

### Web UI rendering — yes, two surfaces

- **TodoPanel / TodoDock** — an always-on strip above the composer, registered into the
  `conversation.input.dock` slot at `order: 0`, hidden while empty, collapsible to a
  title + per-status-counts header ("To-dos · 1 completed · 2 in progress · 1 pending"), reading
  the host-computed `todos` projection via `useProjection('todos')` —
  `packages/client/ui-conversation/src/client/skeleton/TodoPanel.tsx:88-138`; locales at
  `packages/client/ui-conversation/src/client/locales.ts:249-254`. **[A]**
- **TodoRow** — a per-call conversation row for each `todo_write` invocation with a one-line
  plan summary ("N/M done · first active item") —
  `packages/client/ui-tool/src/client/tool/toolviews/todo-row.tsx` and
  `toolviews/plan-summary.ts`. **[A]**
- Both surfaces and their lifetime rules were designed in
  `.agents/notes/archived/feature/2026-07-23-web-todo-display.md` (side-effect channel, dock slot
  choice, alternatives considered). The group README summarizes: "Interactive hosts show the
  standing plan from the list, while the group itself ships no UI" (`packages/todo/README.md:12`). **[C]**

---

## 3. Plan mode as "logged state"

Sources: `packages/plan/plan-mode/src/index.ts` (read fully), `packages/plan/plan-mode/README.md`,
`docs/subsystems/plan.md`, and the design note
`.agents/notes/implemented/simplification/2026-07-22-plan-specific-collaboration-state.md`.

### Where the plan lives — in the session log only

- The **durable state** is one boolean event: `'plan/mode': { active: boolean }`, "log-only,
  non-surface, whole-value replace. The last `plan/mode` wins; a log with none folds to inactive"
  (`src/index.ts:39-48`; fold at `planProjectionDefinition.apply`, lines 131-163). **[A]**
- The **plan document itself** is the `exit_plan_mode` tool-call argument — "the tool argument
  already records the reviewable plan" (design note line 54, "Alternatives considered"). There is
  deliberately **no plan file**: "**Put flips in surface messages or store plans in files.**
  Rejected because the stance is a log-only fact and the tool argument already records the
  reviewable plan. Surface duplication spends model context, while a plan directory creates a
  second durable home." (design note `2026-07-22-plan-specific-collaboration-state.md:54`). **[A][B]**
- The exit tool's model-facing description (`src/index.ts:77-81`): "Use only in plan mode. Present
  your plan for the user's review and, on approval, leave plan mode. Send the COMPLETE plan as
  markdown, starting with a # heading that names it. The user may approve (carry out the plan from
  your next step) or keep planning — their feedback comes back in the tool result; revise and
  present again." **[A]**

### Who approves; can the human see/edit it

- The **human** approves, via the user-questions channel: the review question carries the exact
  plan as `detail` with options `Approve` / `Keep planning` plus free-text feedback
  (`src/index.ts:300-316`). Only a single `Approve` with no custom text consents; anything else
  stays in plan mode and returns corrective feedback as the failed tool result
  (`src/index.ts:334-341`). **[A]**
- The human **sees** the plan verbatim (the review renders the submitted markdown; the Web UI has a
  specialized `plan-review` presentation — README "Known Limitations" line 187: "only the Web UI has
  a `plan-review` presentation"). The human **cannot hand-edit** the plan text — the only edit path
  is "Keep planning" + feedback, which the agent must incorporate and re-present. **[A]**
- Entry/exit: `/plan`, `/plan <message>`, `/plan off` (`src/index.ts:224-269`); plan mode "guides
  rather than restricts" — every tool stays available; enforcement lives in sandbox/approval
  policy (`packages/plan/README.md:12`). **[A]**

### Survival across session end

- "The durable stance is one log-only whole-value-replace event, never a live mirror, so resume,
  fork, and compaction recover it by folding the log" (`plan-mode/README.md:81`). The README
  summary: "The active state survives session resume and forks" (line 12). The plan *text* survives
  the same way — as logged tool-call arguments in the session log. **[A]**
- Known loss window: "Pending selections are process-local — a selection made after the turn's
  final accepted pre-step is lost if the process exits before another accepted in-turn pre-step"
  (`plan-mode/README.md:184`). **[A]**

### Division of labor between plan mode and todo — explicit in shipped guidance

The shipped plan-mode guidance text (base bundle and all three presets, e.g.
`packages/bundle/base/cordis.patch.yml:309` and
`packages/preset/agent-presets/presets/standard/agent.cordis.yml:107`) states:

> "Do not use todo_write to track this planning phase: it tracks implementation after an approved
> plan, while the plan itself belongs in exit_plan_mode."

So DSH's documented pipeline is: **plan → human approval → then todo_write tracks implementation**.
The same guidance demands the plan be "decision-complete … concise enough to review but detailed
enough that another engineer can implement it without making design decisions", and forbids ending
plan mode via prose or `ask_user_question`. **[B]**

---

## 4. Evidence of how DSH's own team actually ran agent sessions

1. **`docs/postmortem/0003-web-agent-gui-feedback-loop.md` — real GUI session, mid-flight human
   interjection, session log as evidence.** A Web-agent session ran inside the GUI at port 3081;
   the postmortem reconstructs the timeline from "the persisted event log for
   `session-3eb796c2-…`" citing exact sequence numbers (30939, 31865, 34309, …, lines 13-17). The
   human interjected mid-session (turn 5: "the user reported at sequence 34556 that 3081 already
   showed the new theme", line 30). Guardrails added include: "PR evidence preserves screenshots
   from the original 3081 session and a real-model before/after GUI run" (line 46), and the lesson
   "Acceptance names the exact origin and externally observes the requested change there" (line
   51). **[C]** This is the postmortem our own repo cites for "delegated acceptance to the user".

2. **`.agents/notes/archived/feature/2026-07-28-todo-plan-clears-on-next-turn.md` — progress-strip
   lifetime decided from how humans actually read it.** The team observed that after a turn
   finished, the rendered todo strip "stayed on screen into the next user turn — a completed or
   abandoned checklist from the previous task. Readers treat the strip as 'what this turn is
   doing'" (lines 9-10), and changed the product so the standing plan is per-turn:
   `turn/end` keeps the finished checklist visible while the user reads the answer; the next
   `turn/start` clears it (lines 12-14). Alternatives considered show the review depth:
   clear-on-`turn/end` rejected because it "hides the checklist while the user is still reading
   the just-finished answer" (line 26). **[C]**

3. **`.agents/notes/archived/feature/2026-08-21-headless-reasoning-progress.md` — live mid-flight
   visibility for one-shot runs.** For headless (non-interactive) runs the team added streaming
   provider reasoning to stderr because "a long reasoned response leaves the terminal silent"
   (line 10); rejected alternatives include "Print a spinner or periodic heartbeat. A timer reports
   process liveness rather than provider progress" (line 32). Final answer stayed stdout-only;
   progress is "a transient projection … The runner still derives final text and exit status from
   the flushed durable Session settlements rather than from progress-presentation state"
   (lines 17-18) — live progress and the durable record deliberately separated. **[C]**

4. **`.agents/skills/dsh-pre-push-checks/SKILL.md` and `dsh-code-review/SKILL.md` — agent session
   workflow as shipped tooling.** The repo carries its own agent skills for running sessions:
   pre-push checks ("run relevant local evidence once … Every behavior change needs the narrowest
   available test or purpose-built check that would fail for its regression") and PR review
   ("**This skill is guidance, not a complete checklist.**"). Together with root `AGENTS.md`'s "Run
   relevant checks locally … report only commands run", these encode the observed loop: agents run
   narrow evidence, report what they ran, and the human reviews the PR diff + proof blocks. **[B/C]**

5. (Supporting) **`.agents/notes/archived/feature/2026-07-30-compaction-progress-visibility.md`** —
   for between-turn work the team added a live-only progress cell ("Context being compacted
   <elapsed>") and explicitly refused to replay progress from the durable log: "Mount and
   transcript replay never scan history for an unmatched start; only a live … notification … can
   open it" (lines 12-20) — again separating transient progress from durable state. PR #669 is
   cited as the exploration that was rejected (lines 28-31), showing alternatives were worked in
   real PRs. **[C]**

---

## Synthesis for our decision

What "following DSH practice" implies for an in-round task surface for a human who wants to watch
progress and interject mid-session:

1. **Use the todo tool as the in-round progress surface — it is DSH's purpose-built answer to
   exactly this question.** DSH built `todo_write` with two co-equal purposes, one of which is
   "an interactive host a live progress checklist" (design note), rendered as an always-on strip
   next to the composer plus per-call rows. Its model guidance ("skip for trivial single-step
   tasks", "add one todo per concrete step before you start", "mark completed the moment it is
   done") is DSH's documented discipline for in-flight tracking. State lives on the session log
   (durable, replayable, survives reopen), the strip lifetime is per-turn, and it is explicitly
   *not* model conversation surface. Following DSH means: in-round tracking is session-scoped
   tool state, not a repo file.

2. **Do not create a durable per-task checklist file in the repo.** DSH has no tasks.md/plan-file
   convention anywhere, bans acceptance-task checklists from its decision-record tier, and its
   plan-mode design note explicitly rejected "store plans in files" because "a plan directory
   creates a second durable home". Durable per-task state in DSH-land lives in GitHub Issues +
   the Issue Management Project (event-driven status), and durable per-decision state in Agent
   Notes. If we want cross-session durable task tracking, the DSH-conformant home is our
   `notes/` decision records + issue tracker — mirroring what our repo already does — not a new
   checklist file format.

3. **If a human must approve scope before execution, that is plan mode's job, and DSH separates the
   two deliberately.** Shipped guidance: the plan belongs in `exit_plan_mode` (human
   approves/keeps-planning with feedback), and `todo_write` "tracks implementation after an
   approved plan". The plan document is also log state (tool-call argument), not a file.

4. **For "both": the DSH answer is both, but with strict role separation** — plan mode (or the
   approval-gated equivalent) before execution; the todo list during execution; Agent Notes/PR
   proof after execution. Mid-session human interjection happens through the ordinary conversation
   (steer/next message), the plan review, or ask-user-question — not by editing the todo list,
   which stays agent-owned (single owner; the human cannot write it).

5. **Live progress vs durable record is a distinction DSH enforces repeatedly** (todo strip is
   turn-scoped; headless reasoning progress is stderr-only transient; compaction progress cell is
   live-only). A reasonable reading for us: the in-round surface may be ephemeral and derived from
   the session log; anything the human needs after the session must come from the durable record
   (session log, Agent Notes, PR proof), not from the progress widget.

Uncertainty flags:

- DSH's repo has no direct evidence of *developers using todo_write while developing DSH itself* —
  the observed evidence (Q4) is about the product decisions and postmortems, not transcripts of
  their own coding sessions using the tool. The conclusion rests on [A]+[B] (the tool, its
  guidance, and its universal mounting in every shipped preset) plus [C] product-lifetime
  decisions.
- Postmortem 0003's session ran on a *user's* checkout (cwd
  `/Users/tn.shen/Documents/deepseek-harness-gui-master/test`), i.e. a real trial of the product by
  the team, which is the closest thing to "their own team ran agent sessions" in the tree.
- `todo/write`'s turn-scoped clearing means the standing plan does **not** persist across turns in
  the UI projection; the raw log keeps every write. If we want a cross-turn/cross-session visible
  plan, that is *beyond* what DSH's todo projection gives and would lean on the durable record
  instead.
