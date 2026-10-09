---
name: validation-evidence
description: Route a confirmed acceptance criterion to an existing repository evidence owner without inventing a parallel test or evaluation system.
whenToUse: A plan states what must be true and needs a credible evidence route before or during implementation. Not requirements discovery, test-framework design or a new queue.
---

# Route acceptance evidence

**Input:** confirmed acceptance criteria with behavior class, pass/fail signal, negative or complementary state, and named human judgment. First read [design acceptance](validation-design.md). If a criterion is uncertain, return to requirements discussion instead of selecting evidence that hides the gap.

## 1. Select the existing owner

Use the [testing constitution](../../docs/testing.md) as authority; [tests navigation](../../tests/README.md) and [checks index](../../checks/README.md) route to actual owners. Choose by the behavior being proven, not merely because the product uses an agent. Read the target script's own header for its trigger, cost, status and parameters.

| Behavior | Existing evidence route | Proves | Does not prove |
|---|---|---|---|
| Deterministic domain or service behavior | Owning `tests/<domain>/*.spec.ts` with `pnpm test tests/<domain>`; use the relevant module spec where practical | Repeatable rules and pure logic at that seam | Loader composition, real browser interaction or model quality |
| Composition or orchestration | Relevant keyless tests, then the named smoke in `checks/README.md` (for example `node checks/smoke/preset-smoke.mjs`, `node checks/smoke/client-load-smoke.mjs` or `node checks/smoke/delegation-smoke.mjs`) | The composition, mount or mechanism the smoke observes | Product value or arbitrary end-to-end behavior |
| Client rendering | `pnpm test tests/client`, plus `client-load-smoke` or an admitted visual fixture as appropriate | View-model/static rendering, assembly, or the specific visual assertion | Human product judgment or model quality |
| Model-visible behavior | The owning real-model check or replay scenario named by the testing map and script header; select the least costly route that observes the claimed behavior | The actual recorded behavior within that scenario | General reliability, domain taste or business acceptance |
| Documentation, plan or gate shape | `pnpm verify`; when a guard changes, include its existing negative fixture or red evidence | Structural consistency, links and gate wiring | Semantic correctness of the requirement itself |
| Session or web replay | Existing admitted owner under [snapshots](../../snapshots/README.md), selected through the testing map | The replay or web expectation it owns | Unit/CLI expectations or an unadmitted observation type |

Do not make `snapshots/` a general evidence bucket. Unit, CLI and generator expectations stay with their owners. Do not cite a test script that does not exist in this repository; add no new test framework or asset shape through this method.

## 2. When no owner exists

Some behavior is visible only in a live run or external observation. A path is not an evidence owner, and a screenshot or temporary file alone is not a repeatable protocol. Before reporting such a criterion:

1. Name the assertion object, input/state and reading protocol: the command or existing file that allows a later session to make the observation again. Inspect repository tools and checks rather than assuming a path from another repository.
2. If no real owner or repeatable reading protocol exists, record the criterion as blocked and name the evidence-owner gap. One-time observation is not a pass.
3. If the same observation class recurs, record the observed trigger on its owning issue or decision. Admission of a new evidence shape is a separate decision; do not prebuild it here.

No equivalent usage-report path was found in this repository when this method was adapted. For session-log or side-effect evidence, first locate the actual local owner and verify its interface; until then mark the row blocked rather than borrowing an external path or assuming a schema.

**Done:** every criterion points to an existing owner or is explicitly blocked with the reading protocol and missing owner named.

This method selects planned evidence only. During implementation, use the relevant card and repository validation map to choose the narrowest real command. If a listed command is stale or broad, follow the current map and record the deviation on the existing work record. This method does not define Note content or lifecycle.

## 3. Make evidence complementary and attributable

For each row, record the exact command or artifact, baseline/commit, input and state, and what it can and cannot establish. Conditional claims need triggering and complementary states. A happy-path demo, keyword search, command exit code or unrelated green suite is not acceptance. For a new guard, include prove-it-red evidence for its negative fixture.

Keep deterministic tests, composition/render evidence, model evaluation and human judgment separate. An automatic score cannot stand in for user value, taste, risk, compliance or authority.

**Done:** each row has an existing owner or explicit human action, evidence limitations and the complementary/negative case needed to interpret its result.
