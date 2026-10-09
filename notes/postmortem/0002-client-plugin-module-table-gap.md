# Post-mortem 0002: A client plugin that mounted nowhere — the browser module table never enumerated it

Status: resolved

## Executive summary

The Web UI showed no team entry point at all, while the host side was demonstrably healthy: the
gateway RPC returned the roster and the shared task board. The shipped team UI module was being
served to the browser, but its `dsh.client.inject` list named
`@deepseek-ai/dsh-client-ui-primitives` — a plain component library with no `dsh.client` field. The
browser module table only enumerates packages that declare `dsh.client`, so that dependency could
never resolve and the module **failed silently**: no error, no console message we could read, no UI.
Three shipped modules are affected by the same gap. The durable lesson: a client plugin's
dependencies are part of a closed world (the module table), and that closure is checkable **before**
asking anyone to look at a browser.

## Summary

R1 delivered a working company: the CEO clarified, created a board task, spawned `vp-eng`, and the VP
produced a deliverable. The user could see the behaviour but asked, repeatedly, where the task board
was. It was nowhere — neither the shipped Team panel nor any task list.

Host-side verification said everything was fine:

```
agentTeams/view { agentId: session-3da83ec9-… }
  members: lead(running), vp-eng(running)
  tasks:   task-1 [in_progress] … @vp-eng
```

The browser side told a different story once we parsed the boot manifest out of the served page: of
55 client modules, the team module's inject list contained one id that no entry provides:

```
@deepseek-ai/dsh-experimental-client-ui-agent-team
  inject: [ …, "@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-primitives" ]
missing:   "@deepseek-ai/dsh-client-ui-primitives"
```

## Impact

- The user could not observe task start/finish in the UI — the exact affordance needed to trust and
  debug the company — and had to ask for it three times.
- The gap is **systemic, not incidental**: `dsh-client-ui-subagent`, `dsh-client-ui-jobs` and the
  experimental team UI all depend on the same unavailable package, so three shipped panels cannot
  mount in this build shape.
- Our own client face had to be written to serve the need directly.

## Timeline

1. Team UI row (`ui-agent-team`) added to the pack bundle; the composition showed the row, and the
   page's plugin list contained the module's `client.js`. We concluded "it is being served" and told
   the user to refresh and look for the Team button.
2. The user reported no such button; the panel was nowhere.
3. Wrong-layer hypotheses first: stale service worker, origin/token, wrong slot. Then we asked what
   the module needs at runtime and compared the manifest's `inject` lists against its `id` set — one
   diff, one answer.
4. Host gate check: `vendor/dsh/scripts/verify-cordis-config.ts` contains
   `validateClientHalvesDeclared()`, whose diagnostic for this class is verbatim *"exports `./client`
   but declares no dsh.client, so its browser half is never served"* — but it globs
   `packages/client/*/package.json` only, so an out-of-tree pack is outside its reach.
5. Resolution: the pack ships its own read-only task board (no `ui-primitives` dependency) and mounts
   the generated Team remote itself, since the shipped module that used to do that never loads.

## Root cause

`packages/client/modules/src/index.ts` enumerates the browser module table from the host Loader's
entries: a package becomes an entry only when it declares `dsh.client` with `platform: 'web'`. A
library without that field is never enumerated. When a client plugin lists such a library in
`dsh.client.inject`, the client bundler treats it as *requested from the table* and leaves it as a
`require()` — a require the table cannot answer. The module throws during load, and because nothing
reports a failed module to the UI, the result is indistinguishable from "this feature does not
exist".

## Why every safety net missed it (the real failure)

- The composition row existed and resolved; `--dump-config` and the plugin URL list both looked
  right. **Being served is not being loadable.**
- Our keyless tests never inspect the browser module graph; nothing asserted dependency closure.
- The host's client-half gate does exist and would have flagged a package in `packages/client/*`, but
  our pack is not in that group, so the rule never applied to us.
- We again told the human to look at the UI before machine-verifying that the module could mount —
  the same defect as [0001](0001-preset-required-config-mount-failure.md), in a different layer.

## Guardrails added

- `scripts/preset-smoke.mjs` now parses `window.__DSH_BOOT__` and asserts dependency closure: our own
  modules with a missing dependency **fail** the gate; foreign gaps are reported as `WARN` so an
  upstream inconsistency does not keep our gate red forever. Its first run found all three affected
  shipped modules.
- `scripts/verify.mjs` check 8 mirrors `validateClientHalvesDeclared()` for our own packages
  (exporting `./client` ⟺ declaring `dsh.client`), because the host gate's glob cannot see us.
  Proven red by removing the pack's `./client` export.
- The pack's client face is built so its dependency list contains only ids that exist in the module
  table, and `tsdown` force-inlines the Team remote descriptor that is not a table entry.
- `docs/guides/dev-loop.md` §2 layer 3.9 — "host healthy, UI empty" is diagnosed by diffing the
  boot manifest's `inject` lists against its `id` set.

## Lessons

- **A closed world must be checked as a closed world.** For the browser, the module table is the
  world; a dependency outside it fails at load, silently.
- **"Served" is not "loadable", just as "dump" is not "mount".** Both are intent-level evidence.
- Upstream gates have **scope**, and out-of-tree packs fall outside it. Mirror the rule locally
  instead of assuming coverage.
- The recurring defect across 0001 and 0002 is not missing knowledge: it is that the *last* check
  was performed by the human, in a browser. See
  [`notes/implemented/2026-09-22-agent-workflow-community-practice.md`](../archived/2026-09-22-agent-workflow-community-practice.md)
  and the host's own
  [post-mortem 0003](../../vendor/dsh/docs/postmortem/0003-web-agent-gui-feedback-loop.md).

## Correction (2026-09-22, later the same day): the root-cause theory was wrong

The loadability theory above is disproven; [0003](0003-duplicate-remote-mount.md) records the incident
that resulted from acting on it.

- `dsh.client.inject` is **informational only** (vendor `packages/client/AGENTS.md`): it neither
  sequences activation nor gates loading, so an inject entry absent from `entries[].id` proves
  nothing about loadability. Diffing those sets (the diagnostic this report canonized, later taught
  as guide §3.9) answers a different question.
- `@deepseek-ai/dsh-client-ui-primitives` is a shell-seeded **baseline module**
  (`packages/client/web/src/platform.ts`, `PLATFORM_MODULES`), implicitly available to every dynamic
  bundle; listing it in `inject` is normal, and the three "affected shipped modules" all load.
- Empirically (headless Chromium, this tree): the shipped team module loads, mounts the generated
  Team remote, and renders a working panel (Agent Team button → Members / Shared tasks, live data).

What remains true from this report: the R1 symptom (no team entry point visible) was real, and its
actual cause was **never established** — the module-table explanation was a misdiagnosis reached
without browser evidence. If the symptom recurs, re-diagnose with `scripts/client-load-smoke.mjs`.
The "failed silently" framing also missed the loud failure mode this class actually has: a client
entry whose `apply` throws bricks the whole UI on the BootPage failure screen, with a banner and a
console error. The closure guard kept its lint value (catching unknown package names) with the world
widened to dynamic rows ∪ baseline.
