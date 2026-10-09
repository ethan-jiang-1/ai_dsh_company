---
name: requirements-elicitation
description: Clarify a vague request or incomplete issue card through structured questions, evidence and explicit human judgment. Use when terms, scope or outcome are uncertain, or an issue is too large for one discussion.
whenToUse: User-directed requirements deliberation; settle scope and questions on an _backlog/issues/ card. Not implementation or scheduling.
---

# Clarify requirements

**Input:** the user's request or named issue card and authorized deliberation scope.
**Output:** an issue card with confirmed answers, evidence links and a judgment-ready conclusion or explicit blocker.

## Confirm uncertain requirements

When confidence in a requirements interpretation, trade-off or recommendation is insufficient, ask the human before settling it. Present confirmed facts, uncertainty, impact, evidence and the specific decision needed. Recommend only when evidence supports it. Keep the decision open and pause dependent judgments, not independent work.

Facts are the agent's responsibility: inspect accessible code, docs or experiments. If evidence remains missing or contradictory, ask whether to investigate further, change direction or accept an explicit assumption. Confirmation of an assumption is not proof of fact. Business goals, taste, acceptable risk and authority boundaries require human judgment. Silence is not approval; explicit acceptance of a recommendation is confirmation.

## Load the named skills when needed

Check the current skill catalog. If a named skill is unavailable, inspect installed sources and discovery roots read-only; do not install or change global configuration here. Invoke only skills available under harness rules.

If a skill cannot be invoked but its complete source and referenced resources are accessible, state that this is source-read adaptation, then read them before proceeding. If neither route works, report the missing source and stop only the dependent branch. A summary is not a substitute. Fixed source and paths are listed in the [method index](README.md).

## 1. Establish scope and the owning card

Read the [backlog charter](../README.md), [issue rules](../issues/README.md), relevant decisions and owner docs. Search by domain concept for an existing card, implementation or rejection. Use the existing card or create one named `YYYY-MM-DD-<slug>.md`; record the trigger, observable outcome, completion condition, facts, assumptions and open questions.

For an unverified external bug or feature report, use the raw-report branch in [supplement evidence](requirements-probes.md) before treating it as aligned requirements.

**Done:** one issue card owns the deliberation and its current unknowns; a partial card is valid.

## 2. Interview and sharpen vocabulary

For a discussion that fits one branch, use the upstream `grill-with-docs` composition (`grilling` plus `domain-modeling`) when available. Supply the card, constraints, existing vocabulary and decisions. Follow the source protocol and record answers, attribution, considered alternatives and costs as they settle. Do not invent candidates for fixed constraints.

Tentative terms and choices stay on the card. Current room terms belong to [home](../../company-workspace/AGENTS.md), identity to [role definitions](../../packages/company-pack/README.md), structural contracts to [architecture](../../docs/design/architecture.md), and module terms to their owner README or JSDoc. Update current owners only for authorized effective facts; persistent decision rationale follows [notes](../../notes/README.md). Do not create parallel glossary or ADR directories.

**Done or waiting:** confirmed requirements and new unknowns are recorded. An empty ready frontier with pending facts or answers is waiting, not a completed interview. For evidence gaps, use [supplement evidence](requirements-probes.md) and return its findings to the dependent question.

## 3. Map only genuinely large problems

Load `wayfinder` only when the destination is too large or unclear for one discussion. Override tracker creation, automatic claims and task selection: keep a coarse dependency map on the scoped card with destination, resolved decisions, precise questions and prerequisites, Not yet specified, and Out of Scope. The map records judgment dependencies, not an execution queue.

Work one human-judgment branch per discussion; independent fact-finding may proceed in parallel. Keep the map coarse until a question is actionable. Stay within the named scope. Simple problems may be brief; one result or unresolved question is one card. Consider splitting only when branches can be decided and closed independently and have distinct results or triggers. Do not invent S/M/L labels or a ticket queue.

**Finish:** confirmed understanding or a concrete blocker and next step/trigger is recorded. When judgment or synthesis is ready, read [organize the conclusion](requirements-synthesis.md). This method does not schedule work or authorize implementation.
