---
name: validation-design
description: Turn confirmed requirements into observable acceptance criteria before implementation, using this repository's evidence owners and human-judgment boundaries.
whenToUse: Confirmed requirements need executable acceptance criteria before an approach is finalized. Deferral, rejection and links to existing conclusions need no implementation matrix.
---

# Design acceptance before implementation

**Input:** a scoped issue card with confirmed behavior, constraints, alternatives, failure or recovery paths, and explicit Out of Scope. First read the [confirmation and skill-loading rules](requirements-elicitation.md).

The goal is to make the conclusion clear to build and possible to accept. Do not invent criteria for an uncertain product choice: expose the uncertainty and ask the human. Evidence selection can be agent-led when behavior is confirmed.

## 1. Partition behavior

For each user-important behavior, classify it as one or more of:

- **Deterministic logic:** parsing, state, business rules or other repeatable code behavior.
- **Model behavior:** extraction, generation, judgment, dialogue or other model-dependent output.
- **Orchestration:** composition, triggers, registration, data flow or assembly behavior.

One end-to-end demo does not prove all three. A plan may have no model behavior; do not create an evaluation just because this is an agent product.

## 2. Record criteria on the issue

Keep criteria in `## 验收标准` on the same card. A small scope can use a short list; when behaviors need separate checks, use one row per load-bearing behavior. Existing `## 验收矩阵` remains readable as criteria; new writing uses the common heading. `## 关闭条件` refers to criteria without repeating them.

| Field | What to record |
|---|---|
| Behavior | User-observable result and requirement it traces to |
| Class | Deterministic logic, model behavior or orchestration |
| Input/state | Preconditions, representative input and relevant complementary state |
| Pass/fail signal | Observable assertion, expected-value source and failure signal |
| Negative/recovery | Failure, refusal, uncertainty or recovery path; exercise the complement of conditional claims |
| Evidence owner | Existing repository owner, command or artifact and what it can/cannot prove |
| Human judgment | Only where taste, business value, risk, compliance or authority cannot be mechanically decided |

Use the [testing evidence map](../../docs/testing.md) to choose an owner and command. Preserve source links, versions, artifact commits and attribution for load-bearing evidence. A command finishing, keyword presence, one happy-path example or a passing demo is not itself a pass condition.

## 3. Keep criteria executable and honest

- Deterministic behavior normally becomes a behavioral test at an existing seam. Borrow TDD's red-before-green and independent expected values; use established owners rather than making every technical seam a human approval.
- Model behavior needs a bounded evaluation case and, for load-bearing claims, real-model observation. Automated evaluation is regression evidence, not a substitute for human judgment of tone, taste, business value or risk.
- Orchestration needs existing composition or web evidence. Use [snapshots](../../snapshots/README.md) only for its admitted replay shapes; do not prebuild a harness here.
- Conditional claims need triggering and complementary states. A proposed guard needs a negative fixture before it counts as evidence.

**Done:** each load-bearing requirement has a behavior class, observable pass/fail signal, negative or complementary case, evidence owner and named human judgment or explicit none. Criteria describe downstream acceptance and do not imply implementation has happened. Include them in [handoff materials](issue-to-note.md); the receiving notes process decides how to use them.
