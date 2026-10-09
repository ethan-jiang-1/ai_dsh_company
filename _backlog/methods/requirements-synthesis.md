---
name: requirements-synthesis
description: Organize confirmed requirements and evidence, compare approaches, and record a supported conclusion and closure conditions on an issue card.
whenToUse: An issue has enough information to compare approaches or prepare a conclusion. An authorized scope may need independently verifiable steps. Not implementation or scheduling.
---

# Organize the approach and conclusion

**Input:** scoped issue card, confirmed answers and terms, evidence, prototype findings, alternatives, constraints and unresolved questions. Follow [confirmation and skill-loading rules](requirements-elicitation.md). Keep missing facts or uncertain choices explicit.

## 1. Organize confirmed requirements

Read `to-spec` in full when this step is needed. Supply existing owner vocabulary and related decisions. Override tracker, setup, template and publication defaults: write to the existing issue card.

Synthesize the answers already obtained: user workflow, intended result, relevant failure and recovery cases, scope and exclusions. For model-facing work include authority per action, correction, and behavior when the model is wrong, uncertain, refuses or hallucinates. Retain alternatives actually considered, their costs and supporting evidence.

Use `codebase-design` only when module interfaces or test seams need analysis. Verify existing capabilities and prefer established seams. If a new requirements gap appears, return to that question rather than restarting the discussion.

**Done:** another session can reconstruct intended result, scope and reasons from the card without the conversation. For a do-it conclusion, prepare [acceptance criteria](validation-design.md) before comparing implementation steps or concluding. Deferral, rejection and an existing conclusion do not need hypothetical implementation criteria. This prepares a handoff; it does not require implementation or acceptance to have happened.

## 2. Compare approaches and necessary steps

Compare genuine candidates against confirmed requirements, costs and evidence. Prefer behavior and contract descriptions over brittle line-by-line recipes. Keep source paths and assertion targets where they make facts or criteria checkable.

For an authorized scope requiring multiple independently verifiable steps, read `to-tickets` for relevant breakdown principles. Keep candidate steps on the current card, not in new ticket files or an execution queue. Each step names delivered result, acceptance criteria and real prerequisites. A simple problem may be brief and needs no invented breakdown. A single result or unresolved question is one card. Consider splitting only where branches can be decided and closed independently and have distinct results or triggers.

Present unresolved choices with evidence and supported recommendations. Agreement on a breakdown does not grant implementation authority beyond the user's actual request.

**Done:** chosen approach and necessary steps are supported, or a precise fact/confirmation gap is recorded.

## 3. Record conclusion and prepare handoff

Use [backlog closure criteria](../README.md). Answer whether to do it, when, in what order and what is excluded only to the detail needed for the conclusion. Record one of:

- **Do it:** confirmed result, scope, approach, reasons and executable acceptance criteria.
- **Do it later:** reason, observable reconsideration condition and where it can be observed; future design may remain open.
- **Do not do it:** reason and applicable scope.
- **An existing conclusion answers it:** destination link and question it settles.

If facts or human confirmation block the conclusion, keep the issue active and name the exact gap and next step. A card status or skill ready label never grants authority.

Use [handoff method](issue-to-note.md) to request downstream handling when needed. Backlog prepares and submits materials; [notes](../../notes/README.md) decides whether they become a Note and how to handle them. Submission is not Note creation or downstream completion.

Persist confirmed answers, evidence and unresolved questions before a session boundary. On resume, reread the card and linked artifacts; ask the human only where reconstruction leaves a dependent choice uncertain.

**Finish:** the card has a supported conclusion ready for handoff, or a concrete unresolved question. Card closure follows backlog rules independently of downstream completion.
