# Review protocol (AI use statement / independence level / external-facing gate)

> Layer: company · Load: on demand (T2, referenced by templates). This file is the **only home** of the review statement text; output templates reference it, never copy it.

- **AI use statement**: drafted by = (person / AI drafter: named)｜named reviewer = (name; accountable for review)｜review date = YYYY-MM-DD｜version = v_ (same as the signature line at the top of the draft)
- **Review independence level** = (mechanical full recompute (rule determinism ⇒ independence holds)｜context-independent review (same model, different context/retrieval; independence limited; **must not be reported as "different person"**)｜judgment review (same model, different thread; independence limited))｜**key-conclusion margin width** = (how many cells / percentage points flip it; write "none" when the item has no causal conclusion).
- **No statement, no external deliverable**; `drafts/` process drafts are not forced, but anything entering `final` or an external deliverable must be complete.
- The reviewer field **must carry a name**; before the name roster is filled, **a role title may not stand in for a name** ⇒ external deliverables **fail-closed (do not send)** until the name is filled (same source as "no name = do not start").
- **Quality-loop independence wording**: the verdict from the two capability tiers `quality-loop-producer` / `quality-loop-verifier` = **context-independent review** (same model, different context; independence limited) —
  it addresses anchoring, self-scoring, and attention dilution; it **does not** address same-source blind spots or model correlation; **must not** be recorded as "different-person review" or "two-person review"; key conclusions still carry margin width.
  The verdict pack (`quality-loop/verdict-r<N>.md` + disposition table) is an **evidence pack** for a human signature: it does not replace the named human reviewer above, nor lower the "no statement, no external deliverable" gate —
  **external signing still belongs to a human**; the loop only assembles what that person must check (process = pack skill `quality-loop`).
