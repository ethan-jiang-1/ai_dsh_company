---
name: issue-to-note
description: Prepare a confirmed issue conclusion and submit it to the user for a decision; on approval, land it as an RFC in notes/proposed or as an implemented Note. Record the typed destination and close the issue when backlog conditions are met.
whenToUse: A confirmed issue conclusion needs a downstream decision. The user decides authorization; the notes owner applies notes/README to decide whether a Note is warranted. This method prepares the request, records the landing, and closes the issue under the backlog rules. It does not grant implementation authority.
---

# Request downstream handling (RFC / Note)

**Input:** scoped issue, confirmed conclusion and supporting evidence. For work to be done, include scope, alternatives and acceptance criteria. Resolve uncertain choices through [requirements confirmation](requirements-elicitation.md) before treating them as decisions.

**Output:** a submitted request with a typed destination, or an explicit gap preventing submission.

Backlog and notes are successive parts, but the handoff is not a single "notes inbox". The user is the queue: the request is presented to the user; the notes rules decide what form the result may take after the decision. Submission does not mean a Note exists, the request is approved, or downstream work is complete.

## 1. Prepare the materials

Use the [backlog closure criteria](../README.md). State the applicable conclusion:

- **Do it:** observable problem, intended result, scope and exclusions, chosen approach, actual alternatives and costs, and executable acceptance criteria. If completion cannot be judged, return to [acceptance design](validation-design.md).
- **Do it later:** reason, reconsideration condition and where it can be observed. Leave future design unresolved when unnecessary for this decision.
- **Do not do it:** reason and applicable scope.
- **An existing conclusion already answers it:** link the existing decision or current contract and explain which question it settles. If no further handling is needed, the card can close under the backlog rules without a request.

Separate confirmed facts from recommendations. A pending human choice keeps the dependent conclusion open; record the exact question and next step.

**Request type** (choose one; do not leave it implicit):

- `rfc` — approved, not yet implemented; lands in `notes/proposed/`;
- `note` — the decision is delivered with the current change; lands in `notes/implemented/`;
- `implementation` — a small authorized change with no RFC/Note; record the commit or contract;
- `none` — no downstream handling; the card closes with the existing conclusion.

**Destination** must be durable: a repository path (`notes/proposed/<file>` or `notes/implemented/<file>`), or `user (YYYY-MM-DD)` when the request is left with the user. "This reply" alone is not a destination unless the user decided in the same turn.

## 2. Submit the request

Keep the complete request on the issue. Present it in the current reply with the card link, confirmed conclusion, request type, and requested handling. If the user named a receiving session or destination, submit there within authorized scope. The receiver follows the [notes entry](../../notes/README.md); that README is a rules entry, not an inbox.

Record the submission date, recipient or destination, and requested handling on the card. This makes the handoff reconstructable without the conversation. Source links support the problem and reasoning; they do not replace those statements. Moving the card later must preserve the request.

**Two decisions, two owners:**

- **Authorization** — the user decides whether to do the work and its scope.
- **Note necessity and form** — the notes owner applies [notes/README §二](../../notes/README.md) ("real alternatives + lasting tradeoff") to decide whether a Note is warranted and in what form.

Do not describe the second decision as "the receiver decides"; it is rule-bound, not discretionary.

**Landing after the decision:**

- conclusion confirmed, downstream request still with the user → record `destination = user (YYYY-MM-DD)`; the card may close, but the user owns the pending request;
- approved and not yet implemented → write the RFC to `notes/proposed/` with `批准：` and `## 验收`;
- approved and delivered in the same turn → write the Note to `notes/implemented/`;
- conclusion not confirmed → keep the card active in `等人拍板`; do not close it as `已结`;
- no downstream handling → `request: none`.

**Done:** the request is presented to the user or submitted to the designated receiver, and its type and destination are recorded. The card may close when the conclusion is confirmed; a pending downstream acceptance does not block closure. Waiting for downstream processing is separate from an unresolved backlog question. Submission grants no implementation authority.

## 3. Close the issue when its conditions are met

Apply the [backlog closure rules](../README.md): preserve the discussion, add the conclusion and request destination (or the existing conclusion that answers the issue), move the card into the appropriate archive, repair relative links, and update the active and archive lists. Research follows its [consumer-linked lifecycle](../research/README.md). A submitted request need not have produced a Note before the card closes.

**Close condition:** the conclusion is confirmed by the user, and the downstream request is recorded. The downstream acceptance is not a close condition. If the user's confirmation of the conclusion is still pending, keep the card active in `等人拍板`.

Existing cards that already carry implementation and pending acceptance stay active until their requirements resolve. Keep remaining evidence gaps and human decisions explicit; implementation alone is not acceptance. This exception creates no second implementation process.

**Finish:** another reader can tell what backlog concluded, why, where downstream handling was requested, whether the request was landed (RFC/Note/user) or is still with the user, and whether the card is closed or exactly what prevents closure. The receiving process owns all subsequent decisions about Notes and delivery.
