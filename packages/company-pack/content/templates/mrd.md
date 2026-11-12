---
layer: MRD
definition: json-ledger
---

# MRD (market requirements · one page + opportunity ledger)

> Lead = **CMO**; save to `drafts/mrd.md`; it is the input to the PRD (VP-Eng leads the PRD).
> Answer "should we do it, what should we do, for whom, why we win"; **not a feature list** (that is PRD), **not a pricing judgment** (VP-Sales/CFO owns it).
> One opportunity gets one id `MR-001…`; label evidence [fact]/[assumption] and give the source or how it will be verified.
> Replace `productType` with the motion's type (type id = directory name under `content/product-types/`; parsing rules in `meta.md`).

```json
{
  "mrd": {
    "version": "0.1",
    "status": "draft",
    "productType": "business-software",
    "opportunities": [
      {
        "id": "MR-001",
        "title": "<one-line opportunity>",
        "segment": "<segment: who, in what scenario>",
        "buyer": "<economic buyer / decision chain>",
        "pain": "<how they cope today, the cost of not doing it>",
        "evidence": [
          { "kind": "fact", "source": "<customer interview / contract / public data source>" },
          { "kind": "assumption", "source": "<inference to verify and how to verify it>" }
        ],
        "alternatives": ["<what customers use instead today>"],
        "competitors": ["<competitors / substitutes>"],
        "value": "<one-line value proposition: why we win>",
        "success": ["<observable success criteria>"],
        "confidence": "medium",
        "recommendation": "go"
      }
    ],
    "openQuestions": []
  }
}
```

## One-minute summary

<Conclusion ≤3 points / recommendation go|no-go|defer + one-line reason / next step>

## Market and competition

- **Segment**: …
- **Alternatives**: how customers cope today (manual / Excel / outsourcing / competitors / doing nothing)
- **Competitors**: … (where each is strong; why we are different)
- **Buying points**: the three strongest buying points + the most likely reason for rejection

## Sizing and basis

| Basis | Number | Source | fact/assumption |
|---|---|---|---|
| TAM | | | |
| SAM | | | |
| SOM | | | |

## Success criteria

- <What facts to observe after launch: signed deals / pilot conversion / repeat purchase / delivery cycle…>

## Recommendation and open items

- **Recommendation**: go / no-go / defer — one-line reason
- **Open items** (who decides, what evidence is missing): …

## Handoff to VP-Eng

- Which opportunity first: MR-00x (reason)
- Known constraints (time / budget / compliance / technical prerequisites): …
