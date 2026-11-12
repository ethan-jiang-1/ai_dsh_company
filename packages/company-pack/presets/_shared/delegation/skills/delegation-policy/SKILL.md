---
name: delegation-policy
description: 'Company delegation policy (core): do it yourself by default, the four brief elements, effort budget, chain design, result readability; how to use each channel comes from the capability section injected into this session.'
---
# Delegation policy (core)

> **First read the capability header of this session.** It lists the channels available to **this seat**; a channel absent from the header is not available to this seat (the tool may still be installed, but the call will be rejected) — do not call it, and do not let downstream "give it a try".
> The concrete rules for each channel live in the `company:delegation-<channel>` section; workflow engine facts live in the `company:workflow-contract` section. This skill keeps only cross-channel decisions and discipline.

## 1 Do it yourself by default

- Delegate only when at least one of "parallel context / independent verification / heterogeneous role" holds; multiple agents cost about 15× tokens — do the math first.
- If one layer of parallelism solves it, do not add three; flatten before nesting.
- Delegation is not "looking busy"; stop when the evidence is enough.

## 2 Brief four elements (all required)

1. **objective**: what result is wanted, and the acceptance basis.
2. **output format**: structured output / file path / one page.
3. **tools & sources**: available tools, read/write paths, source coordinates (file/session/URL).
4. **boundaries**: what not to do, authority that must not be crossed, how to report failure.

A child cannot see what you just read this round (fresh); the brief must be self-contained. Only fork carries completed rounds, and **the current round is not in the seed**.

## 3 Effort budget

- Simple fact: 1 agent, 3–10 tool calls.
- Direct comparison: 2–4 agents, 10–15 calls.
- Complex research: >10 agents, explicit split; write the budget before spawning.
- Do not treat "run a few more" as quality; stop when the evidence is enough.

## 4 Chain design

- **Depth is absolute at parent+1**; `maxDepth` is the limit of **that row**, not a chain budget. If your direct child delegates again, read its own preset row (e.g. vp-eng's generic `subagent` row).
- Long chains (CEO→VP→workflow→subagent; VP-Eng→workflow→subagent) need depth, fan-out, and concurrency budgets; see the capability section and each preset row.
- The root gate = Team Lead; a named child is not a member. **Do not mix the two control planes**: members are addressed by name, subagent children by session id.
- Mark missing data `unavailable`; do not describe "missing" as a status.

## 5 Result readability

- Children write files; the parent gets a path/summary only; do not push large text through three layers (telephone game).
- On failure keep the original text/diagnostics; `null` does not mean "no result".
- A completion notice only proves "it stopped", not that the result is correct; accept structured artifacts and files, not self-reports.

## 6 Three hard rules

1. A member must not impersonate a role; only that role's named child may issue the role's conclusion.
2. One writer per file; formal deliverables are written only by the parent/owner.
3. Do not retry silently; attempt/terminal must be visible (for short tasks see the retry section).
