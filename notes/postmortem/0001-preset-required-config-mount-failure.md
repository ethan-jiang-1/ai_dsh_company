# Post-mortem 0001: A preset mounted, then failed — the tool rows were missing their required config

Status: resolved

## Executive summary

Every role preset was present, correctly named, and free of broken rows, yet creating a session with
one **silently did nothing** in the Web UI. The Loader validates each row's config against the
plugin's schema **at mount time**, and two copied tool rows were missing schema-required fields
(`tool-fs-search.sampleOverCapGlobResults`, `tool-todo.allowParallelInProgress`), so the whole preset
failed to mount and session creation was rejected. Every gate we had passed, because none of them
mounted a preset: discovery parses YAML and resolves package names, `--dump-config` prints the
profile tree, and our keyless tests checked roster, dependencies and file content. The failure was
found by the user, in the browser. The durable lesson is not "read more carefully" — it is that the
**discovery权 must sit with the agent, closed by a check the agent can run itself**.

## Summary

The company pack ships four role presets. R1 gave the CEO and VP-Eng real tool rows so that a role
session could read files, load skills and write deliverables. The rows were copied from the shipped
`standard` preset by **name**; their `config:` blocks were not.

A session could therefore be *listed* and *chosen*, and `session/create` returned
`agent-preset/invalid` with:

```
agent-presets: preset "ceo" failed to mount: loader entries failed to apply
- failed to apply loader entry tool-fs-search (@deepseek-ai/dsh-tool-fs-search): invalid config:
    - $.sampleOverCapGlobResults missing required value (at sampleOverCapGlobResults)
- failed to apply loader entry tool-todo (@deepseek-ai/dsh-tool-todo): invalid config:
    - $.allowParallelInProgress missing required value (at allowParallelInProgress)
```

The Web UI did not surface this: the "new session" affordance did nothing at all, with no visible
error. The user reported "摁下去没反应", and the investigation initially went the wrong way —
stale service worker, port/origin, directory picker — before the error was obtained by calling the
gateway RPC directly (`session/create`), which is the same call the browser makes.

## Impact

- The user could not start a session with any company role, and could not tell why.
- Debugging time went into the wrong layer (caching, ports, native dialogs) because the browser
  swallowed a perfectly clear host error.
- Once found, the fix was two config values.

## Timeline

Evidence: the persisted session log of `session-dbcc6619-134d-45ba-b950-77e9022bdac9` (created over
RPC to isolate the failure) and the successful motion in
`session-8a5bb6d3-d6a9-4946-af69-488251481b91`.

1. Tool rows added to both presets with names only; `pnpm test` and `pnpm verify` stayed green.
2. User: adding a workspace worked, "新建会话" did nothing; an older session (created before the tool
   rows existed) still opened, which made it look like a UI/state problem.
3. Wrong-layer investigation: page HTTP 200, `agentPresets/list` RPC `ok:true` with four presets and
   zero broken, WebSocket upgrade fine, service-worker/stale-shell hypothesis, fresh origin on a new
   port.
4. Direct RPC `session/create` returned the mount error above — the real mechanism, in one call.
5. Fix: both rows got the shipped config values (`false` / `true`); `session/create` returned
   `{ok:true, sessionId, agentPreset:"ceo"}`; the motion then ran end to end.

## Root cause

`agent.cordis.yml` rows are Loader entries. The Loader validates each entry's config against the
plugin's own schema when the preset mounts — which happens **when a session is created**, not when
the roster is scanned. The shipped `standard` preset carries those required values; copying row
names without their config produced a preset that is discoverable, selectable and impossible to
mount.

## Why every safety net missed it (the real failure)

- `discoverPresets` parses the composition and resolves row package names. It reports `broken` for
  unresolvable rows, but it does not run plugin schema validation — so "zero broken" was true and
  useless.
- `pnpm dsh --profile web --dump-config` prints the composed profile tree. It shows the row and its
  config verbatim; it does not mount it. We treated dump output as evidence that the row works.
- `pnpm test` asserted roster ids, row dependencies, content and syntax. **No test mounted a preset.**
- The Web UI swallowed the error, which contradicts the host's own invariant that misconfiguration
  fails loud — a host-side gap we cannot fix from here.
- The definition of done for the change was "the composition looks right". The host's own
  `docs/testing.md` already prescribes the missing step: *test the real entry path*, boot a shipped
  profile, and *verify the world, not the self-report*.

## Guardrails added

- `scripts/preset-smoke.mjs` — boots the real web profile, asserts the roster, then calls
  `session/create` for **every** preset. This is the only check that exercises row config
  validation. Proven by regression injection: removing `sampleOverCapGlobResults` turns it red with
  the exact host error, while the other three presets stay green.
- `scripts/verify.mjs` check 8 — rows with known schema-required fields must carry them (fast, runs
  in `pnpm test`'s neighbourhood).
- 收尾清单第 6 条（时为 `docs/plans/roadmap.md`，D24 后随收尾程序住
  [guides/60 §12](../../docs/guides/60-dev-loop.md)）— every round ends with `verify` + `test` +
  `preset-smoke`.
- `docs/guides/60-dev-loop.md` §2 layer 3.8 and §7 — silent UI failures are diagnosed by calling the
  gateway RPC, and the two pre-flight defences are documented.

## Lessons

- **A mount is not a scan.** Any check that does not create the thing the user creates cannot see
  mount-time validation.
- **Dump is not mount.** Configuration output proves intent, never effect.
- **The discovery权 must be the agent's.** The research note
  [`notes/implemented/2026-09-22-agent-workflow-community-practice.md`](../implemented/2026-09-22-agent-workflow-community-practice.md)
  reaches the same conclusion from vendor guidance: iteration is normal, but it must be closed by a
  check the agent runs, never by the human noticing in the browser. The host tree's own
  [post-mortem 0003](../../vendor/dsh/docs/postmortem/0003-web-agent-gui-feedback-loop.md) records
  this exact failure mode ("delegated acceptance to the user").
- Reading more documents would **not** have prevented this one: the host documents that health
  checking never imports an entry (`vendor/dsh/packages/preset/agent-presets/README.md`, Known
  Limitations). Reading tells you *which check to run*; only running it tells you the truth.
