# Operations review · one page (COO template)

> Use for delivery reviews / operations plans / budget checks (COO primary). Conclusion first, one page max.
> Different from `review-note.md` (VP-Eng technical review: build/buy/hybrid): this template's three choices are
> **can carry / can carry with conditions / cannot carry (veto)**, and it requires all three cells — who executes / which process / how much it costs.
>
> **AI use statement / review independence level / external-facing gate**: see `.dsh-company/kb/review-protocol.md` (this template does not repeat the statement text).

## One-minute summary (plain language, write this first)

<Give senior readers three paragraphs, no internal jargon (gates/T#/anchors/grades/slug): ① what happened (one sentence); ② conclusion (≤3 points, business language);
③ next step (who/when) + what the user must decide (if any). Process detail goes in the report body below; the same text goes into `present`'s description.>

## Conclusion (choose one + one-line reason)

- [ ] can carry　- [ ] can carry with conditions (list every condition)　- [ ] cannot carry (veto, one-line reason)
- One-line reason: …
- If exercising veto: state it in the conclusion (staffing cannot hold / no process / compliance cannot pass).

## Three cells (missing one = "cannot carry")

| Cell | Requirement | What this review writes |
|---|---|---|
| **Who executes (staffing)** | Name the person: who in the roster, how many hours per week; if you cannot name a person = "no one" | … |
| **Which process** | SOW + milestone acceptance (counts only after UAT passes); RACI's R goes to a person; if there is no carrier, establish one first | … |
| **How much it costs (budget)** | Against the budget baseline in `.dsh-company/kb/coo/CHARTER.md`; label [within baseline] / [new] / [over limit] | … |

## Timeline and parallelism

- Dependencies and buffers for each critical-path segment; list external dependencies (customer/supplier/counterpart team) separately — time outside our control is not our schedule.
- Parallel load: how many slots this plan takes from the project pool, how many remain (see the derived facts in `.dsh-company/kb/org.md`); if slots are unavailable, write "not registered".

## Worst-case stress test

- Volume ×2 and unit price ×2, each calculated once; a plan that hits the line must carry a reduce-tier fallback ("we'll figure it out later" is not a plan).

## Gaps and unverified items (do not use as conclusions)

- …

## Disagreements (do not flatten)

- Different opinions from other functions / the CEO, kept verbatim.

## Next step

| Who (name or "no one") | When | Which one thing |
|---|---|---|
| | | |
