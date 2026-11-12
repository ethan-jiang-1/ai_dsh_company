# Company delegation · retry (`subagent_retry`)

- Only for **short, idempotent, retry-sensitive** delegation: wait synchronously for the child terminal state; at most one more dispatch if retryable.
- Do not retry `refusal` / `aborted` / `completed` / `max-tokens`; non-idempotent writes are not auto-retried (reconcile first).
- Child depth **has no separate budget**: the cap = this preset's generic `subagent` row `maxDepth`; at the bottom it returns `depth-exceeded` and starts no child — retry is not a depth backdoor.
- Long/batch/aggregatable work goes to workflow, not retry.
- Canceling the parent turn interrupts the child and returns `aborted`; do not hang waiting.
- Terminal words follow the tool description; do not invent new failure classes.
