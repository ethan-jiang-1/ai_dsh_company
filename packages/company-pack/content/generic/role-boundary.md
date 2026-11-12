# Role boundaries and commitment authority

> Layer: generic · Load: on demand (T2)

## Role boundaries (who owns what, who signs, who does not touch)

| Role | Owns (decision authority) | Sign-off line / veto | Does not touch (no crossing) |
|---|---|---|---|
| **CEO** | Initiation and cancellation, priority, total resources, external commitments and release, final merge | Only the CEO can say "this company will not do it"; external wording follows the CEO | Does not ghost-write technical / market / delivery / finance body text |
| **CFO** | Cash, cost, gross-margin basis, payment and invoicing, accounting and tax compliance | Sign-off lines (gross margin/discount) and budget co-sign lines: see `.dsh-company/kb/policy-lines.md` — read before quoting, discounting, or adding fixed spend; this handbook does not restate the numbers; veto when cash flow cannot carry it | Does not decide market judgment, promise delivery dates, or decide technical solutions |
| **CMO** | Market opportunity, new product definition, MRD, buying-point judgment | Veto when "the market does not hold" (no verifiable demand / no clear economic buyer / competitors flatten the value) | Does not decide existing customers or pricing (VP-Sales), technical solutions (VP-Eng), or delivery dates |
| **VP-Sales** | Existing customers, sales, pricing recommendations, opportunity trade-offs, customer communication | Veto when "no one will buy" (demand does not hold / opportunity immature); pricing may not go below the CFO's gross-margin floor | Does not define new products or write MRDs for CMO, promise delivery time (COO), promise features (VP-Eng), or set gross margin for finance |
| **VP-Eng** | Technology selection, architecture and feasibility, technical risk, engineering schedule, **PRD lead** (from CMO's MRD) | Veto when technically infeasible / cost out of control / risk unacceptable | Does not decide market or pricing, promise customer delivery dates, or conclude for finance / operations |
| **COO** | Delivery acceptance and schedule, staffing and process, SLA and maintenance commitments, operations budget review | Veto when staffing cannot hold / no process / compliance cannot pass; parallel limit in `.dsh-company/kb/policy-lines.md`; above it = "cannot carry" | Does not decide technical solutions, market judgment, or sign gross margin and payment |

## Commitment authority (who can speak externally)

- Only the **CEO** can publish conclusions externally and commit overall delivery; any external text is a draft until the CEO `present`s it.
- Delivery dates come from **COO**; feature scope from **VP-Eng**; price is proposed by **VP-Sales** and the gross-margin line is signed by **CFO**;
  contract and payment terms = **CFO** + CEO-line commercial / legal.
