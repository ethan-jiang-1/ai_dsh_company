# Human interface

> Layer: generic · Load: on demand (T2)

## Human interface (four kinds: approval / material / advice / unknown rules)

Routing and authority follow `.dsh-company/kb/owners.md`; while the mechanism layer is not in place, use this section's **degraded shape**.

### "Inbox" = the human's only inbox (charter-level)

**Definition**: the digital double does everything it can itself; **what it cannot do, or should not do for you** — needs your approval, your material, your judgment, or your rule —
**all land in the "Inbox" panel and wait for you**. The panel has four sections: **approval pending** / **question pending** (material · advice · unknown rule) / **escalation pending** / **completion notice** (`present` lands the final; that is informational).

Hard requirements for the double:
1. **Pull a human only when truly needed** — one card per matter, do not re-ask the same batch, do not block a human with non-blocking items;
2. **Prepare context so the human can decide at a glance** — give the conclusion and the formula;
3. **Blocking = fail-closed** (no approval, no action; write "open item"); **non-blocking = continue with an explicit default assumption** and mark "to confirm";
4. **Never pretend the human answered** — no reply means no reply;
5. When the human does what the machine cannot, **saying so in the session counts as received**.

**It is honored in exactly one place**: the human sits at the desk with the page open — cards are live events, **lost on refresh** ⇒ when the human is away, what you need must be written into the draft as "to confirm". "Whose gate a card pops on" is native behavior (the panel is scoped to the originating session) ⇒ each person pins their own role's session.

### Three approval tiers

> **Mechanism fact**: **a delegated member session cannot raise human approval** — a member's `request_signoff` / question is auto-rejected and the human does not see it
> ⇒ a member hitting a line always escalates to the CEO; ⚠ but in multi-person mode the gate you opened yourself is the root session, **and it should raise it itself**.
| Tier | Scope | Shape |
|---|---|---|
| **Must approve** | **Only two quotation lines go through `request_signoff`** (gross margin/discount; the numbers' single home is `.dsh-company/kb/policy-lines.md`; CFO+CEO double sign; **only a human can set a new sign-off line**). ⚠ The budget-side fixed-spend co-sign line is also in policy-lines; it is a **file-layer co-sign**, not `request_signoff`. ⚠ Multi-person double sign: `request_signoff` routes by the originating session ⇒ the initiator sends the card and marks the draft "awaiting the CEO gate", the CEO gate signs the same item at the file layer; **both signatures are required** (BUG-005) | `request_signoff` (one-shot, valid within the round, fail-closed on no reply) + file-layer co-sign |
| **May inform after** | Any action that produces a **reversible artifact** (draft / drafts / list): do it first, write it into the draft and journal, report at close-out | after-the-fact review: traceable, revocable |
| **Autonomous** | Other operational decisions (within each CHARTER's boundary) | do it directly |

- **Three sign-off judgments**: ① **one gate for customer concessions** — credit/waiver/free period/discount all use the **equivalent discount rate** and the discount line (two lines coexisting means the looser one bypasses double sign); the CFO's unilateral "waiver line" is void; ② **double sign must not be same-source** — the initiator may not be one of the signers; both signatures independently review and record the **evidence type**; ③ **cost four-cell assembler = CFO**, due the first week of the quarter, **overdue fail-closed**.

### Rule gaps (when handbook / CHARTER / skill does not cover it)
1. Ask a human per the authority surface in `.dsh-company/kb/owners.md`; 2. **ruling flows back**: the human's answer changes the handbook / CHARTER / owners.md (search the existing owner first to avoid two rule homes); 3. journal it.
**Before the same kind of matter appears a second time, the rule must have flowed back** — approval is legislation; do not ask again.

### Absence tiers (when the human has not replied)
- Blocking = fail-closed (no approval, no action; write "open item"); non-blocking = continue with an explicit default assumption and mark "to confirm"; if the human does not return, **do not pretend they answered**.

### Degraded shape (while the mechanism layer is not in place)
- **Material**: the human writes the file to the shared disk + says the path in the session; the agent reading it counts as received. **Advice**: the human answers in-session — advice is input, it does not grant the right to land a final. **Approval**: existing `request_signoff`. **Routing**: per `.dsh-company/kb/owners.md` (each person answers only their own role's questions).

**Up/down votes**: a human upvoting/downvoting your reply in-session = lightweight feedback — record it in the journal's presence inventory at close-out (changes expression, not conclusions).

### Question throttling
Pulling a human in to ask should be **as rare and as precise as possible**.
- **Do not re-ask the same batch** (first): if the human has responded but the material has not arrived ⇒ produce the draft with the gap, and write "not implemented" into open items;
- **one card carries one kind of decision** (material/advice/rule gap/number clarification do not mix); **do not block a human with non-blocking items** — continue with a default assumption where possible; only blocking items deserve pulling the human in.
