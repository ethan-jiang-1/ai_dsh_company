---
name: bug-fix
description: Take a reported defect in the DSH company-pack plugin from triage to a verified fix — classify the surface, build a red loop, confirm the cause, decide and authorize the fix, land it with one command red→green, and close with evidence or reclassify it as an issue.
whenToUse: A behavior is wrong in the plugin (host, client, presets/skills, content, composition, tooling, packaging) or in the DSH host it runs on, or a defect card is in 调查中/修复就绪/修复已落地. Not for behavior whose expected result is undecided (use an issue card), and not for exploratory discovery (the exploration card owns finding bugs).
---

# Diagnose and fix a defect

**Input:** a reported deviation, the expected behavior and its owner (`docs/`, a contract, a test, or a user statement), severity, and the surface where it appears. If the expected behavior is undecided or contested, stop: that is an issue, not a defect.

**Output:** one recorded outcome:

- `已修` — a system-surface change, one command observed red before the fix and green after it, and a commit that contains the change.
- `待修` — a confirmed defect not fixed now; the agent proposes it with a trigger, but only the user flips `待修` (charter).
- a track change — the claim is not a defect (expected behavior, test artifact, environment, or upstream); record the disproof and handle it under the issue rules.

A Note is not the output of this method. It is a trace decision at the change level — a batch of one is still a batch — when the fix carries a lasting decision or meets the materiality bar.

## Two tracks, one spine

Backlog has two tracks. The [issue track](../issues/README.md) ends in a decision and a typed destination (`rfc`/`note`/`none`); its Note is a knowledge artifact. The [defect track](../bugs/README.md) ends in a changed system and evidence; a Note is optional. Both use the same five gates (`研究 → 定性 → 落地 → 审 → 归档`), but the exit artifacts and authorization differ. Do not turn a defect into a Note-writing exercise, and do not close an issue by changing code without its own decision.

## 0. Triage before touching code

This repository is a DSH company-pack plugin: the same symptom can live on different surfaces, and the surface decides the loop and the proof. `src/` paths below are under `packages/company-pack/`; test/check/tool paths are repo-relative.

| Surface | Typical symptom | Start here | Real proof | What a green here does not prove |
|---|---|---|---|---|
| host (`src/host/`) | command, workspace, catalog, cultivation, lease, bundle behavior | `pnpm test tests/host` | `pnpm test tests/host` + `pnpm test tests/repo` (exports) + `pnpm typecheck`; boot/install paths add `company-entry` / `release-smoke` | Cordis composition or real session behavior |
| lib (`src/lib/`) | parsing, docs shape, deliverables, ledger | `pnpm test tests/lib` | module spec + shared-primitive reference truth or equivalence matrix (`docs/testing.md` §3 第 7 条) | host registration or client rendering |
| client (`src/client/`) | panel, tab, view model, CSS, error ring | `pnpm test tests/client` | `source run/env.sh && node checks/lanes/client-load.entry.mjs` + `node checks/lanes/ui-scene.entry.mjs --isolated --expected`; **after changing `src/client/`, rebuild the pack client bundle first** (build entry = `packages/company-pack/tsdown.config.ts`; the artifact `lib/client.js` is a gitignored build output, absent on a fresh checkout): `node ./node_modules/typescript/bin/tsc -b packages/company-pack && (cd packages/company-pack && ../../node_modules/.bin/tsdown)` (same steps as `tools/dev/company.mjs`); `pnpm company --rebuild` also works but starts a window and takes the dev home — stop it before `client-load`; live page via `probes/browser-visual/` | real browser interaction from a static render; an old `lib/client.js` passing as current |
| presets/skills (`presets/`) | persona/skill content, mount failure, tool row | `pnpm test tests/presets` | `source run/env.sh && node checks/lanes/preset.entry.mjs` (real mount, 11 presets) | model behavior or business acceptance |
| content/templates (`content/`) | handbook, product types, delivery modes, wiki templates | `pnpm verify` | `tests/host/prompt/handbook.spec.ts` + replay when a runnable scenario is affected | injection behavior from a static check |
| composition/profile | preset not mounted, client entry fails, row missing | `pnpm dsh --profile <p> --dump-config`; session log | `preset.entry` / `client-load` / `company-entry` / `release-smoke`; run in a fresh process | `--dump-config` = runtime behavior; a long-running Web/HMR process may not have the new composition |
| tooling/gates (`checks/`, `tools/`) | gate false red/green, command parsing, path rules | the consuming spec; `pnpm test:checks` | gate mutation + real-tree red (`prove-it-red`) + `pnpm verify` | spec shape = semantic correctness |
| packaging/release | install shape, tarball, bootstrap | `pnpm test tests/repo`; `node tools/release/release.mjs --check` | `node checks/lanes/release.entry.mjs` (real install shape) | repo dev = install shape |
| vendor (`vendor/dsh/`) | behavior inside DSH itself | minimal repro against `pnpm dsh` | upstream proposal + pin; local workaround with a Note/trigger | editing vendor (forbidden) |
| environment/session | dev home vs daily home, credentials, ports, HMR | `source run/env.sh && pnpm orient`; `pnpm diagnose --session ...` | reproduce in the right home; no product fix | that an environment issue is a product defect |

The exact mapping is owned by [tests/README](../../tests/README.md); the debug ladder is owned by [debugging](../../docs/guides/debugging.md). This table only routes the triage.

**Questions:**

- Is there an existing expectation (contract, test, docs, or observed behavior) the behavior violates? If not, it is an issue.
- Is it reproducible? If not, keep it in `调查中` and ask for evidence; or propose `待修` with a trigger — only the user flips `待修`.
- Is the cause in this repository's surface? If vendor or environment, document and stop: upstream proposal or environment fix.
- Is the fix material? Use the charter's materiality list. When in doubt, treat it as material and ask. P0 is always material.
- Severity P0/P1/P2; card or no-card; if more than one card is in scope, cluster by root cause before fixing (see §3). Even two cards can share a cause.

**Not a defect.** If diagnosis disproves the claim (expected behavior, test artifact, environment), record the disproof, do not use `已修`, and reclassify under the issue rules. Precedent: BUG-140. This is a track change, not a new defect status.

## 1. Build a red loop

**The loop is the ticket.** A defect without a red-capable command is not ready for a fix. The loop must:

- drive the actual surface, not a helper that bypasses it;
- assert the exact symptom the reporter described, not "didn't crash";
- be deterministic (for a flaky bug, a pinned high reproduction rate);
- be fast enough to run repeatedly;
- be agent-runnable;
- have been run at least once, showing red before the fix.

Record the command in `## 复现` **inside a fenced block or inline code**; a bare line does not count (the gate reads the code shape), and pasted output is not a command.

If no loop exists: stop and say what you tried. Ask for the environment that reproduces it, a captured artifact (log, HAR, screen recording with timestamps), or permission for temporary instrumentation. For DSH, the session log (`pnpm diagnose`), `--dump-config`, a replay fixture, or a live browser probe may be the loop; a keyless test that never reaches the surface is not.

Minimize before diagnosing: cut inputs, callers, config and data one at a time, re-running the loop after each cut, and keep only what is load-bearing. The minimized loop becomes the regression test when a correct seam exists. Redact secrets; quote only the lines that carry the signal.

## 2. Confirm the cause and sweep the class

- Generate three to five ranked, falsifiable hypotheses before testing any. Do not anchor on the first plausible idea.
- Confirm with evidence, not plausibility: a session-log frame or tool error, a `--dump-config` row, the bundle, git history or `git bisect`, a control experiment, a real mount, or an independent reference implementation.
- Separate where it surfaced from where it was introduced. A blank client page can be a client entry apply error, a preset mount failure, or a session/workspace issue. Follow the [debug ladder](../../docs/guides/debugging.md); do not jump layers.
- Keep refuted hypotheses on the card; do not erase them.
- Name the failure class (`tests/failure-classes.md`) and sweep the same class across the plugin surfaces. If the cause is a shared primitive (Markdown/YAML parsing, path segments, a state machine, a gate predicate), elevate to the primitive per `docs/testing.md` §3 第 7 条 and add independent reference truth or a read/write equivalence matrix; a single example guard is not enough.
- If the confirmed cause is in `vendor/dsh`, stop: capture the minimal repro and write an upstream proposal. A local workaround is a mitigation with a Note and a trigger, not a vendor edit.

**Stop:** no confirmed cause → stay in `调查中`; do not flip `修复就绪`.

## 3. Batch work: cluster by root cause

A **batch** is the subset of open cards you choose to fix in this round, not all open cards. One bug, half a batch, or several root-cause groups in one round are all valid; the model is the same.

1. **Inventory before fixing.** For each candidate card write one line: symptom, DSH surface, mechanism hypothesis (not the symptom), severity, materiality, and whether a red loop exists. A card without a red loop stays `调查中` (or goes back to `调查中` if it was already `修复就绪`); it does not join the batch just because it is nearby.
2. **Cluster by mechanism.** Group cards whose mechanism hypothesis is the same shared primitive, state, path rule, contract, recent change, or gate predicate. A pile of bugs often has one or two root causes; do not group by file name or by wording. Confirm the shared cause with one shared repro, a common code path, or a differential experiment. If a card does not fit, leave it independent; never force it into a group to make the batch look coherent.
3. **Pick the batch shape.** One confirmed root cause → one fix, several cards. Several root causes → sub-batches, ordered by dependency and risk. Independent one-offs → separate commits. Record the batch plan in the [bugs ledger](../bugs/README.md) "修复交接" section: group, cards, shared cause + evidence, fix, order, evidence commit. The ledger is the batch record; the cards remain the per-bug contracts.
4. **Order by dependency and blast radius.** Shared primitive before dependents; P1/P0-blocking before P2; the fix that other sub-batches build on first. Do not order by card number or by how easy the symptom looks.
5. **Keep the per-card contract.** Every card keeps its own `## 已修判定` and `## 修复证据`; one commit may serve a group if each card's surface is in it and each card's red/green is true. A batch must not let one card's green stand in for another card's criterion.
6. **Assess materiality per change, not per card.** A batch inherits the strictest materiality in its shared fix. If the shared primitive reaches a material surface (charter list), the whole batch is material: one authorization request with the full batch scope and trace proposal, not one self-authorized fix per card; each material card still flips to `等人拍板` on its own state line. If only one card's fix is material, split it out and ask; do not hide it in the batch.
7. **Decide the trace at batch level.** A batch that resolves one or more cards through one shared-mechanism decision — with a real alternative (symptom-by-symptom vs primitive fix) and a lasting invariant or contract — warrants **one batch Note**. The Note carries the shared cause, the rejected symptom-patching, the ordering constraint, and the evidence; all cards in that decision point `留痕：Note <path>`. If the batch has several independent shared mechanisms, use one umbrella Note with a section per decision, or separate Notes when each has its own lasting tradeoff; never one per card. A batch of independent mechanical one-offs does not warrant a Note: commit + card evidence is the record.
8. **Stop the batch from becoming a refactor.** A shared root cause licenses the smallest primitive fix that closes the group, not an unbounded cleanup. Cleanups outside the cards' criteria get their own card or stay out.

| Batch shape | Trace |
|---|---|
| One shared root cause; fix changes a shared primitive, invariant, or contract | One batch Note; every card in that decision points `留痕：Note <path>` |
| Several independent mechanisms, each with a lasting decision | One umbrella Note with a section per decision, or separate Notes |
| Several independent mechanical fixes | Commit per group or card; no Note |
| One-off, non-material, internal | Commit only; no card |

A batch Note is a **decision trace**, not a materiality upgrade: it does not turn non-material cards into material ones and it does not replace the authorization rule. Independently mechanical cards still use commit; the Note exists for the shared decision that would otherwise be lost.

**Stop:** no shared cause confirmed → keep the cards independent; do not invent a group. A material batch without authorization → each material card flips to `等人拍板` (the state is per card); send one request covering the batch, anchored on the first card listed for the batch in the ledger table and the ledger record.

## 4. Decide the fix and its gate

- Choose a root-cause fix or a mitigation. If mitigation, state what remains, why it is safe now, and when to revisit.
- Scope: surfaces to change, surfaces explicitly not changed, vendor boundary. Keep the diff minimal; unrelated cleanups get their own card.
- Re-check materiality at the diff, not only at triage. A fix that starts in host/lib but reaches a material surface named by the charter is material mid-flight: stop and ask.
- Write `## 已修判定`: observable post-fix behavior at the right surface, the regression or negative case, and the **same command** that will be red before and green after. "Code changed" is not a criterion. A criterion that cannot be judged is not ready.
- Choose the trace: `Note <path>` / `commit <sha>` / `none — reason`. Material fixes record the recommendation in the authorization request; non-material fixes are normally carried by the commit, except a batch shared-mechanism decision that warrants the batch Note (§3.7).
- Authorization: only P1/P2 non-material repair-type fixes may flip `修复就绪`; that flip is ticket **and** authorization. Material or P0 → `等人拍板` with the request and trace recommendation; do not implement first.
- Multi-card rounds: cluster by root cause before fixing — see §3. Do not fix a queue of symptoms one by one.

## 5. Land and prove

Sequence matters:

1. **See red.** Run the loop before the fix. If the fix is already written, revert it or use a control to observe red; do not claim a red you did not see.
2. **Fix the root cause.**
3. **See green.** Run the same command, then the nearest checks from [tests/README](../../tests/README.md) and `pnpm verify`. Add `pnpm typecheck`, `pnpm lint`, `pnpm dup` when the surface is code. For DSH, add the mount/smoke that observes the claim: preset/content → `preset.entry`; client → rebuild the pack client bundle (entry `packages/company-pack/tsdown.config.ts`; artifact `lib/client.js` is gitignored) and refresh the dev-home tarball for `client-load` (e.g. `pnpm company --rebuild`, then stop its window) first, then `client-load` and `ui-scene --expected` when visible; composition → the named smoke in a fresh process; packaging → `release-smoke`. A keyless green does not prove a real mount, a mount does not prove a real browser, and a browser does not prove model behavior.
4. **Add the regression guard** when a correct seam exists. Follow the naming contract and `guard-red-record`: a `BUG-nnn` test title requires the `// 负例留证` line. If no correct seam exists, record that fact; it is a finding, not a pass.
5. **Clean up.** Remove debug instrumentation and throwaway probes. Keep relied-on evidence under `runtime/tmp/` (gitignored) or a spec.
6. **Commit code and test first; get the sha.** Then flip `修复已落地`. Do not archive yet.
7. **Archive only when** `## 已修判定` is observed and the evidence is complete.

**Disproven:** if the fix fails the criterion or new evidence refutes the cause, revert the slice, return to `调查中`, and keep the refuted hypothesis. Do not keep a half-fix.

## 6. Review and close

- **Mechanical:** `pnpm verify`, `pnpm test`, plus typecheck/lint/dup and the surface smoke as applicable.
- **Semantic:** per [policy §P5](../../docs/policy.md), problem-card archive, gate changes, and cross-module/shared-primitive closure need an independent read-only blind review; the author cannot substitute self-review. User acceptance is required for P0, public behavior, business results, or a phase boundary.
- Record `审查：agent｜用户｜跳过 — 理由`; a skip is not "verified".
- `## 修复证据`: surface / red / green (same command) / commit. The commit must be an ancestor of HEAD, dated ≥ `opened`, and actually touch the surface. The gate is `fix-evidence`; it checks shape and reconciliation, not truth.
- `留痕：`: write the chosen trace on the card. If a Note is warranted, write it in the same change and use the same commands in its verification.
- Update the active and archive indexes, fix relative links, and run `pnpm verify` green.

## 7. The no-card quick fix (non-material only)

If triage says non-material and the fix fits the current turn, you may skip the card but not the loop:

1. See red with one command.
2. Fix the root cause.
3. Same command green; nearest checks.
4. Commit body: symptom, root cause, impact surface, red→green command. The commit is the record.
5. Record the same-class sweep in the round receipt (shape = [close-out-definition](../../.agents/skills/close-out-definition/SKILL.md); ① is external behavior and impact). If a Note exists, put it there.
6. If the diff reaches a material surface mid-fix, stop and create a card plus a request; do not retroactively call it non-material.

In this plugin, the charter's materiality list is the owner; presets, content, public commands/tools, and docs contracts are the usual material surfaces, and gate changes that alter a recorded decision fall under the same list. The no-card path is for internal host/lib fixes and test/non-contract docs corrections that do not change public behavior or a docs contract.

## 8. Stop conditions

- Expected behavior undecided or contested → issue; do not invent it inside a defect.
- No red loop → do not fix; ask for the environment or artifact, or propose `待修` with a trigger (user-only flip).
- Root cause unconfirmed → do not flip `修复就绪`; keep the hypotheses on the card.
- Material or P0 → do not self-authorize; `等人拍板`.
- Vendor cause → do not edit `vendor/`; write the upstream proposal.
- The same command cannot go red→green → it is not a fix; "tests pass" or a Note is not a substitute.
- Do not change the test to match the bug. If the test itself is wrong, prove why, fix the test as its own finding, and keep the product assertion.
- Do not claim a red you did not see, or a green you did not run.
- Do not let one card's evidence cover another card without its own surface/red/green check.
- Do not force unrelated cards into a root-cause group; a group needs one shared cause, not a shared folder.
- Do not let a material card hide inside a batch; split it out and ask.
- Do not write one Note per card; a batch decision gets one Note, independent one-offs get commits.
- Do not let a shared root cause become an unbounded refactor; fix the smallest primitive that closes the group.
- Do not use a Note as the fix; do not require a Note for every fix.
- Do not restart the Web server or change the environment to make a symptom disappear; reproduce in the right home first.
- When unsure whether it is material, treat it as material and ask; silence does not authorize.

## 9. Checklists

**Before `修复就绪`:**

- [ ] Defect confirmed; expected behavior has an owner (contract, test, docs, or user).
- [ ] One minimal command; red observed before the fix.
- [ ] Root cause confirmed; evidence named; refuted hypotheses kept.
- [ ] Failure class and same-class sweep, or why not swept.
- [ ] Fix approach, scope, exclusions, vendor boundary.
- [ ] `## 已修判定` observable, with regression or negative case.
- [ ] The same command is named for red and green.
- [ ] Batch: grouped by confirmed mechanism, or explicitly independent; order and batch plan recorded.
- [ ] Materiality re-checked; trace chosen; authorization path correct. A material batch has one request with the full scope.

**Before `已修`:**

- [ ] System-surface diff, not only card or Note.
- [ ] Same command red→green, run for real.
- [ ] Regression guard, or a documented no-seam finding.
- [ ] Surface checks + `pnpm verify` + `pnpm test` (and typecheck/lint/dup as applicable).
- [ ] Commit sha is an ancestor of HEAD and touches the surface.
- [ ] `审查：` recorded; independent review where required.
- [ ] Batch record updated (groups, cards, order, evidence commit); each card has its own evidence.
- [ ] Note scope matches the batch decision: one Note for the shared mechanism, not one per card.
- [ ] Client/composition change: rebuild the pack client bundle (entry `packages/company-pack/tsdown.config.ts`; artifact `lib/client.js` is gitignored) and/or use a fresh process before the real-surface evidence; an old bundle or old process does not count.
- [ ] `## 修复证据` four lines; `留痕：`; indexes and links updated.
- [ ] `pnpm verify` green; `fix-evidence` green.

Rules = [_backlog charter](../README.md)「缺陷的通道」; card, template and severity = [bugs README](../bugs/README.md); surface → check = [tests/README](../../tests/README.md); evidence policy = [testing](../../docs/testing.md); Note necessity = [notes/README](../../notes/README.md); DSH ladder = [debugging guide](../../docs/guides/debugging.md); loop discipline = the `diagnosing-bugs` skill when the session exposes it.
