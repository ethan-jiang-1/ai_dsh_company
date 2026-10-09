---
name: issue-to-note
description: Prepare a confirmed issue conclusion and submit it to the downstream notes process; record the destination and close the issue when backlog conditions are met.
whenToUse: A confirmed issue conclusion needs downstream handling. The receiving process decides whether it becomes a Note; this method prepares and submits the request only.
---

# Request downstream handling

**Input:** scoped issue, confirmed conclusion and supporting evidence. For work to be done, include scope, alternatives and acceptance criteria. Resolve uncertain choices through [requirements confirmation](requirements-elicitation.md) before treating them as decisions.

**Output:** a submitted request with a traceable destination, or an explicit gap preventing submission.

Backlog and notes are successive parts. Backlog clarifies the problem and prepares the conclusion; this method requests the next part to handle it. The receiving process decides whether a Note is needed and its form. Submission does not mean a Note exists, a request is approved or downstream work is complete.

## 1. Prepare the materials

Use [backlog closure criteria](../README.md). State the applicable conclusion:

- **Do it:** observable problem, intended result, scope and exclusions, chosen approach, actual alternatives and costs, and executable acceptance criteria. If completion cannot be judged, return to [acceptance design](validation-design.md).
- **Do it later:** reason, reconsideration condition and where it can be observed. Leave future design unresolved when unnecessary for this decision.
- **Do not do it:** reason and applicable scope.
- **An existing conclusion already answers it:** link the existing decision or current contract and explain which question it settles. If no further handling is needed, the card can close under backlog rules without a request.

Separate confirmed facts from recommendations. A pending human choice keeps dependent conclusions open; record the exact question and next step.

## 2. Submit the request

Keep the complete request on the issue card. Present it in the current reply with the card link, confirmed conclusion and requested handling. If the user named a receiving session or destination, submit there within authorized scope. The receiver follows the [notes entry](../../notes/README.md); that README is a rules entry, not an inbox.

Record submission date, recipient or destination, and requested handling on the card. This makes the handoff reconstructable without the conversation. Source links support the problem and reasoning; they do not replace those statements. Moving the card later must preserve the request.

Backlog does not create a Note as proof of submission, decide whether one is needed, or prescribe downstream format or lifecycle. Drafting the request on the card is preparation, not submission. If delivery could not happen, report the gap and do not claim submission.

**Done:** request is presented to the user or submitted to the designated receiver, and submission is recorded. Waiting for downstream processing is separate from an unresolved backlog question. Submission grants no implementation authority.

## 3. Close when conditions are met

Apply the [backlog closure rules](../README.md): preserve discussion, add conclusion and request destination (or the existing conclusion that answers the issue), move the card to the appropriate archive, repair relative links, and update active and archive lists. Research follows its [consumer-linked lifecycle](../research/README.md). A submitted request need not have produced a Note before the card closes.

Existing cards that already carry implementation and pending acceptance stay active until their requirements resolve. Keep remaining evidence gaps and human decisions explicit; implementation alone is not acceptance. This exception creates no second implementation process.

**Finish:** another reader can tell what backlog concluded, why, where downstream handling was requested, and whether the card is closed or exactly what prevents closure. The receiving process owns all subsequent decisions about Notes and delivery.
