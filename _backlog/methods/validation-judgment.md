---
name: validation-judgment
description: Judge an implemented change against confirmed criteria, separating technical evidence, model behavior and human product judgment.
whenToUse: Implementation claims completion and its acceptance criteria and evidence are available. Not a replacement for requirements elicitation, debugging or release authorization.
---

# Judge delivery against its criteria

**Input:** the existing record carrying confirmed criteria, the implementation diff or fixed point, evidence selected through [validation-evidence](validation-evidence.md), and any named human judgment. This is an evidence check; it does not decide downstream Note location or lifecycle.

Do not reopen settled requirements because implementation is inconvenient. If a criterion exposes a genuinely ambiguous product choice, stop that row and return it to requirements discussion for human confirmation.

## 1. Check evidence, not claims

For each criterion, record one of: **pass**, **fail**, **blocked**, or **human judgment pending**. Rerun the stated command or inspect the retained artifact at the stated baseline. Confirm that:

- The evidence exercises the named behavior and input/state.
- The pass signal is independent of implementation and can catch the stated failure.
- Negative, recovery or complementary states were covered when required.
- The evidence belongs to the correct owner and claims no more than that owner proves.
- Model-visible claims include applicable focused evaluation or real-request observation; human-quality claims remain explicit human judgments.
- A technical green result is not silently promoted to product acceptance.

A missing command, stale artifact or unsupported interpretation is **blocked**, not pass. An unrun human step is **human judgment pending**, separate from technical evidence gaps. A failed criterion becomes a bug or issue follow-up in its existing owner; do not create a second validation queue.

## 2. Keep judgment axes separate

Report independent views where they apply:

- **Contract/spec:** does delivered behavior match confirmed intent, including failures, recovery and Out of Scope? Name any unmet criterion; clean code does not compensate for missing behavior.
- **Standards/technical:** does the change meet existing tests, composition, rendering, documentation and review contracts? The `code-review` skill separates standards and spec review; use this repository's fixed point and owners rather than importing a tracker or workflow.
- **Model behavior:** did applicable evaluation or real-request evidence hold, and what remains for human review?
- **Human/product:** has the right person decided required business value, tone, acceptable risk, compliance or authority? The agent may prepare a comparison but cannot turn silence or a score into approval.

## 3. Close honestly

Accept delivery only when every required technical criterion passes and required human judgments are recorded. Otherwise return exact failing or blocked criteria, evidence gap, owner and next trigger. Distinguish:

- **accepted:** applicable criteria and human judgments pass;
- **rework/bug:** a criterion fails and has a concrete correction path;
- **waiting:** evidence or human input is missing;
- **requirements gap:** a criterion cannot be interpreted without changing confirmed intent;
- **not accepted:** evidence contradicts the plan or an explicit human rejection applies.

Record what acceptance failed to catch on its existing owner: a mechanical miss may inform a candidate check; a judgment miss may inform a Note. Do not create a new queue. Do not rewrite criteria to make a failed result green. If intended behavior changed, return to synthesis and record the new decision before revising criteria.

**Finish:** report row outcomes, evidence links/commands, limitations, attribution and any human decision to the existing record that owns the work. Existing active cards carrying implementation keep results on the card; downstream handling owns later records. Leave frozen archives unchanged.
