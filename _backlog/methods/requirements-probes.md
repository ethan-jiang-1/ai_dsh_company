---
name: requirements-probes
description: Resolve a requirements evidence gap with research, a questionnaire or a prototype; verify incoming external reports before deliberation.
whenToUse: An issue question cannot be settled from current evidence, or an incoming report needs verification. Not production implementation or approval.
---

# Probe a requirements unknown

**Input:** a scoped issue card, the exact unknown, and the judgment it blocks. First read the [confirmation and skill-loading rules](requirements-elicitation.md). Load a selected skill and its branch resources only when needed; use only the missing functional step.

## 1. Choose by the unknown

| Unknown | Skill and input | Result to return |
|---|---|---|
| External fact | `research`: bounded question, version and primary sources | Cited answer, counterevidence and limits |
| Knowledge held by another person | `to-questionnaire`: recipient and needed facts/decisions | Sendable questions and attributed replies feeding the issue discussion |
| Logic/state feel or UI shape | `prototype`: one question, candidates and shared inputs | Runnable artifact, observed behavior and separately confirmed human verdict |

For an incoming external bug or feature report, use `triage`, not a fourth probe: supply the original report, implementation, relevant rejections and verification steps. Return a verified claim or structured confirmed/still-needed request with a disposition recommendation.

For questionnaires, settle the send rather than asking the requester to invent the recipient's knowledge. Send early, order questions by importance and assume one reply. Replies are evidence, not decisions. For triage, search by domain concept and reproduce the claim where possible; use existing issue, bug and Note owners rather than tracker labels or a new rejection directory. Already aligned requirements need no duplicate triage; a ready brief is not permission to build.

**Done:** the probe has a bounded question, input, destination and stated way to judge its result.

## 2. Run without stalling independent questions

Independent primary-source research may proceed in parallel while ready discussion questions continue. Verify each load-bearing finding against its source and baseline. Treat source limits and contradictions as unresolved.

For a prototype, read the skill's `LOGIC.md` or `UI.md` resource as applicable and use its artifact shape. Hand off the bounded question to an isolated session, directory or branch. Compare candidates on the same inputs and let the stakeholder react to the runnable result. If the branch, interpretation or verdict is uncertain, ask the human; do not guess. Preserve a prototype as primary evidence on a side branch with a commit pointer. Production keeps only an authorized validated change, not the demo. No production integration here.

For model-facing requirements, evidence may test extraction, failure mechanisms or harness capability. Human judgment still determines acceptable behavior, autonomy and risk; one successful operation does not establish reliability, adoption or business value.

**Done or waiting:** distinguish observed result, human verdict and unresolved assumptions. Missing input or confirmation blocks only its dependent judgment, not independent fact-finding.

## 3. Return evidence to its consumer

Put short findings in the card's known/unresolved section. Retained research, experiment reports, questionnaires and replies serving active cards belong under a topic in [research](../research/README.md), following its naming, ledger and consumer-linked lifecycle. Link evidence once and state which question it settles, source/version or artifact commit, limitations, attribution and what becomes answerable next. Temporary hand-off files are not cross-session authorities; preserve relied-on results in the card or retained evidence. Research follows its owner lifecycle when its last active consumer closes.

**Finish:** the consuming card has updated evidence and unresolved items. Return to the affected question in [clarify requirements](requirements-elicitation.md), or proceed to [organize the conclusion](requirements-synthesis.md) only when the judgment is ready. A report or prototype alone neither settles a requirement nor authorizes implementation.
