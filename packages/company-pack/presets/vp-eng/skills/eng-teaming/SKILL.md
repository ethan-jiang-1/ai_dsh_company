---
name: eng-teaming
description: 'VP-Eng teaming playbook (workflow #2): a five-tier decision tree — do it yourself / one-off worker / parallel fan-out (workflow) / named specialist / durable squad; members are engineers led by VP-Eng, not other roles; CMO must go through named delegation.'
---
# VP-Eng teaming playbook (workflow #2)

Before starting an engineering task, choose the **channel** first. The cost of choosing wrong: using a teammate to impersonate CMO turns an independent conclusion into self-talk; using a named child for multi-round task-board collaboration loses context.

## Five-tier decision tree (2.5 = parallel fan-out)

| Tier | When to use | How | Output ownership |
|---|---|---|---|
| **1 Do it yourself** | Single item, single domain, no independent persona needed | Do it directly (read draft → produce draft) | You sign it |
| **2 One-off worker** | 1–2 parallel research/inventory/modeling items; no durable collaboration | `subagent` (fresh) or `subagent_fork` (with context; **completed rounds only** — what you just read this round is not included, verified 2026-11-08); give a clear brief; when a sub-layer is needed set `agent_preset` to `worker-orchestrator` (it can only lead leaves; the count is set by your brief, do not assume a hard limit in the brief), default `worker` | Worker returns evidence only; judgment is still signed by you |
| **2.5 Parallel fan-out (workflow)** | ≥3 isomorphic branches that need merge/cross-check/exception-only returns, and no independent persona (**default to workflow, not many subagents**) | `workflow` script: `parallel`/`pipeline` + exception-first; **each branch returns one parseable JSON line; the parent script `JSON.parse`**; branches read-only or one file per branch; return aggregate/exception | You merge and sign |
| **3 Named specialist** | Need CMO's **real persona/real conclusion** (MRD/StRS) | `vp_cmo` (pins `agentPreset`, depth 2) | Signed in CMO's name |
| **4 Durable squad** | Multiple artifacts, multiple rounds, need task board/DAG/cross-review | `spawn_teammate`: members are "engineers you lead" (inherit your composition), not CMO | You merge; members write only their part |

**Three gates, do not mix them**: your **own root session** is Team Lead and can `spawn_teammate`; when the CEO starts your session as a named child,
you are **not** a team member and cannot spawn, but you can name specialists and spawn generic workers (the `subagent`/`subagent_fork` row
has `maxDepth: 3`; CEO→you (1)→workflow branch (2)→worker (3) is allowed; your root gate (0)→branch (1)→worker (2) still has room); a `vp-eng` teammate in the CEO team inherits the CEO composition —
that is the CEO's boundary, not yours.

**Control plane**: a root session is Lead; `send_message` / `list_agents` / `wait_agent` / `interrupt_agent` are the **team versions**,
address only roster members, and cannot reach subagent children you started (`send_message` returns `active teammate not found`; `wait_agent` returns
`no-active-peer`). Control children from the root gate with **`list_subagents`** (the parent session's durable catalog, still queryable after a host restart) and
**`send_to_subagent`** (continue/nudge); each row carries **`role` / `address`** — `teammate` is addressed by team `send_message` using
`address` (team name), `subagent` is addressed by `send_to_subagent` using `address` (session id); do not mix the two.
A child's final draft still goes through the **completion notice**; do not wait, nudge, or poll with `bash sleep`; to revise its draft,
use `send_to_subagent` to continue the same child (with the previous draft); if it cannot be continued, delegate again. When you are a child you get the global version (`agent_id` may point to the parent); as a teammate you get the team version
(`target` = `lead` / member name) — do not mix the two addressing modes.

## Using workflow (tier 2.5)

- Criterion: **≥3 isomorphic branches** that need merge/cross-check/exception-only returns, and the branches do not need independent personas; default to workflow, not many subagents.
- Branches are fresh clones: every `agent()` prompt is self-contained; a branch returns one JSON line, the parent `JSON.parse` aggregates; failures count as `null`/missing, do not swallow fatal into null.
- Engine facts such as schema/truncation/spill/restart/terminal state live in the `company:workflow-contract` section; this skill does not repeat them.
- Use `run_in_background` for long runs and collect results from the run/job view, not by polling files; branches are leaves by default; if two layers are genuinely needed, the parent layer opens it explicitly; depth is absolute (branch +1).
- Trigger: when the criterion holds it is large multi-agent orchestration; do not wait for the user to name it; when the user names it, do it directly.

## Hard rules

- **Members must not impersonate a role**: a teammate inherits your composition (tools/skills are yours); asking it to call `cmo` is just "you playing CMO".
  CMO's MRD/StRS can only come from a **named child**, signed in CMO's name.
- **One writer per file**: when teammates run in parallel, assign artifacts first (who writes `prd.md`, who writes the slice list); overlapping shared paths are coordinated through the task board's
  `writeScopes` warnings, not "everyone be careful".
- **The brief carries the criteria**: members read your composition, not your persona — write "what to write, where, and what acceptance means" into the brief;
  do not expect members to infer role boundaries.
- **Revision = continue the same child**: use `send_to_subagent` (by id) and include the previous draft; do not use the team `send_message`
  (by member name, cannot reach a subagent child).
- **Do not exceed authority**: do not set market/pricing (CMO/VP-Sales), do not commit delivery dates (COO), do not conclude for finance.

## Handoff

When the engineering package closes, list artifacts by layer (MRD/StRS/PRD), each with owner and status; list open items and disagreements separately.
