# Post-mortem 0003: One remote, two mounters — a duplicated $mount bricked the whole Web UI

Status: resolved

## Executive summary

Minutes after the task board landed (90ce2f1), the entire web observation window stopped booting: every
load ended on the BootPage failure screen ("HARNESS / Failed to load plugins — dsh-company-pack —
client api: direct method agentTeams/createTask is already mounted"). The pack's client entry mounted
the generated Team Remote itself, on the theory that the shipped team UI module never loads. That
theory was wrong: the shipped module loads fine, mounts the same remote first (its row is inserted by
the pack's own `cordis.patch.yml`), and the pack's second `$mount` threw. Because a failed client entry
aborts app boot, the whole UI was gone — not just the board. The durable lesson: **loadability claims
need browser evidence, and a contribution that someone else already mounts is consumed through the
service, never re-mounted.**

## Timeline

1. 10:13 — 90ce2f1 ships the own task board plus `await ctx.remote.$mount(agentTeamsRemote)`, on the
   R1-era theory that the official `client-ui-agent-team` module "cannot mount in this build shape"
   (postmortem 0002). Verification checked the served bundle and `preset-smoke` (server-side RPC) —
   neither opens a browser.
2. ~10:2x — the user opens the observation window (port 3086): full-screen plugin-failure card, no app.
3. Diagnosis loop (headless Chromium against a fresh boot): reproduces RED on a fresh process, so the
   live server is not the variable. `window.__DSH_BOOT__` shows **both** entries present, the official
   one ahead of ours; only ours fails.
4. Mechanism from vendor sources: `packages/client/AGENTS.md` — `dsh.client.inject` is informational
   only (never gates loading); `packages/client/web/src/platform.ts` — `ui-primitives` is a
   shell-seeded baseline module. The 0002 theory is dead.
5. Fix: drop the duplicate `$mount`; our board keeps reading `remote.agentTeams` through the scoped
   service inject (fiber waits for the official mount; if it is ever absent, the contribution stays
   PENDING instead of crashing).
6. Verification: the same loop goes GREEN — full app renders; official Agent Team button **and** our
   任务板 **and** the brand slot all present; the official panel reads live data (members, task-1).

## Impact

- The whole web observation window was unusable (not just the board): sessions, composer, workspace —
  all replaced by the failure card.
- The pack's own client face was entirely lost too: `apply` throws before registering the brand slot
  or the board, so the skin shipped in 90ce2f1 never actually rendered anywhere.
- The wrong theory was actively spreading while the fix was in progress (absorbed into guide §3.9,
  postmortem 0002, and the preset-smoke closure WARN within the hour).

## Root cause

Two layers:

- **Direct**: mounting the same generated Team Remote contribution twice. The client api gateway
  rejects the second `agentTeams/createTask` mount ("already mounted"), the entry's `apply` throws,
  and the loader aborts app boot on the BootPage failure screen.
- **Underlying**: a misdiagnosed loadability theory (0002) treated `dsh.client.inject` as a
  load-gating closed world. In reality it is informational metadata; baseline modules answer those
  names implicitly. The theory was never tested against a browser, so "the official module never
  loads" stayed unchallenged while the workaround (self-mount) sat next to the thing it duplicated.

## Why every safety net missed it

- `preset-smoke` exercises the real web entry path — but only its RPC surface (roster, session
  creation). Nothing ever browser-loaded the page, so "client entry apply throws at boot" had no
  machine check. This is 0001's defect class a third time: the last check was a human with a browser.
- The closure guard added earlier the same day checks inject lists against entry ids — a check built
  on the same wrong model, so it warned about the wrong things and said nothing about this bug.
- The commit-time verification ("served bundle carries the board", "preset-smoke all pass") verified
  delivery and preset mounting, which is not client loading.

## Guardrails added

- `scripts/client-load-smoke.mjs`: boots the real web profile, loads the page in headless Chromium,
  and fails on any plugin-load failure (BootPage banner, console `failed to apply loader entry`) or a
  missing brand slot. This is the check that goes red on exactly this class; it reproduced the bug
  before the fix and passes after.
- Composition rule recorded (guide §3.9): consume an already-mounted contribution through the service
  inject; never `$mount` a descriptor another entry mounts.
- Truth corrections in the same change: guide §3.9 rewritten, postmortem 0002 appended with a
  correction section, the client-face note appended, `dsh.client.inject`-based WARN reframed as a
  package-name lint with the world widened to dynamic rows ∪ baseline.

## Lessons

- **Prove "unavailable" before working around it.** The self-built board itself was fine; the damage
  came from the unproven belief that the official module cannot load. A five-minute browser probe
  (button present? panel readable?) settles loadability; manifest diffs do not.
- **A workaround that duplicates an existing contribution is a latent conflict**, not just redundancy:
  here it converted a theory error into a total UI outage.
- **Silent-failure folklore is dangerous.** This class fails *loud* (BootPage + console); looking for
  silence sent the R1 diagnosis down the wrong path. Establish the failure mode before explaining it.
