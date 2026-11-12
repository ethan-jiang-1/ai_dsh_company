# Workflow engine contract (updated with the DSH pin)

> This is the workflow **engine facts** (capability-scoped; only injected into presets with workflow). Company delegation policy is the delegation-policy skill; role method skills keep only domain play.

## Schema (input contract)

- Schema accepts only a subset: `enum` / `const` must also carry a single `type`; `type` does not accept arrays; `oneOf` cannot sit beside `type`; the root must be `object`.
- Violation = the whole round fails with `UNSUPPORTED_SCHEMA` fatal, not a branch failure; do not swallow it.
- Branches **do not pass schema**: have each branch return one parseable JSON line and let the parent `JSON.parse`; schema is only for a single `agent()`, and the prompt must explicitly call `structured_output`.
- When a schema branch cannot get structured output, the engine discards the child's text and gives only `null`; this is known engine semantics — do not read `null` as "no result".

## Results (output channel)

- Truncation happens at `maxResultChars`, before spill; the spill file may be a truncated copy.
- For large results, make the branch write a file and return only path/line count/summary to the parent; do not pass long inline text across layers.
- `completed` does not guarantee every branch succeeded; a failed branch may fold to `null` — read the array/counts, not the branch's self-report.
- A child's self-reported "truncated/length" is not trustworthy; the parent verifies with read/tail.

## Failures and retry

- `null` may be refusal / error / aborted / missing structured output; the reason is not kept; first judge whether the task is idempotent and retryable.
- `AGENT_START` / `AGENT_RESULT` / cancellation are fatal; do not catch and disguise as null or a safe retry.
- For the same idempotent task, dispatch at most once more (different attempt label); if it still fails, record `missing` / `exhausted`; do not start a third.
- Non-idempotent writes are not auto-retried; work that must be retryable/aggregatable goes to workflow, not subagent.

## Lifecycle

- A host restart interrupts in-flight children; the child is recorded as interrupted and the parent receives no terminal notice.
- After restart, reconcile with `list_subagents` (child terminal state) or `workflow_runs` (four run states + children); `lost` = the original result is unrecoverable.
- Do not treat "the job started" as "the result is recoverable"; for current facts, cold-restore or re-dispatch.

## Nesting

- A branch is a child of `startActivation(parent)`: depth = parent+1; no `agentPreset`, inherits the parent composition.
- Branches are leaves by default; if two levels are truly needed, the parent opens it explicitly, under **row-level maxDepth**/budget.
- The workflow engine has no separate depth gate, but a branch is an activation child and counts as parent+1; nested runs add up and the parent owns the budget.
