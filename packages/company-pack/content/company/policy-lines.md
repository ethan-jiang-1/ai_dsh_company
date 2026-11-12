# Company policy lines (single source of truth)

> This file is **deployment configuration**: the single home of quoting, approval, budget, and capacity thresholds. The handbook, role charters, and skills only reference it,
> **never restate the numbers**; changing company means changing only this file. The numbers are independent of staffing ownership; human-side ownership is in `owners.md`.

- **Gross margin floor**: project gross margin < **30%** → CFO does not sign; requires CFO + CEO double sign (`request_signoff`).
- **Discount floor**: customer discount deeper than **10% off** → CFO + CEO double sign; all customer concessions are judged by the **equivalent discount rate**; credit/waiver/free period get no separate line.
- **Maintenance annual fee**: ≈ **15–20%** of the project amount (listed separately from project fees; does not reduce gross margin).
- **Fixed-spend co-sign line**: new fixed spend ≥ **$500/month** → CFO co-sign + CEO sign (**file-layer co-sign**, no `request_signoff`).
- **Infrastructure budget**: cloud **$2,000/month** (SRE-controlled).
- **Pilot budget**: AI / agent pilot API **$200/month per case hard cap**; stops at the line; no top-up.
- **Parallel delivery limit**: **8** concurrent projects (PMO 3 people, 1 PM : 2–3 projects); above it = COO "cannot carry".

## Service bonuses / service credit

- **Service bonus (free person-days / free training / on-site discounting)**: not counted as discount consideration; the discount line and gross-margin line remain **independently judged** and are not merged.
  One-off, non-discountable, non-carryover; expires at year end and does not cross years; not booked as "service credit"; does not reduce maintenance revenue.
  Not cited as precedent, not batched; may not be written into a contract as consideration — customer-facing text may not contain "free / consideration / discounted / carryover"; write only "one bonus included with the commitment".
  Booking: account = **sales expense — customer relationship maintenance** (not contract fulfillment cost); cost = `W·r + D` (`r` / `D` without a source ⇒ **no dollar number**; W goes only into the timesheet);
  four vouchers = approval basis / delivery record (with customer sign-off) / expense receipt (four-flow match) / review trail (person id + timestamp).
  SoD: operations produces the delivery record, finance reviews; **the cashier does not keep the books**; drafting and review are two people.
  Batching or writing it into a contract ⇒ it becomes standard consideration ⇒ back to CFO to recompute gross margin and discount line, and re-run CFO + CEO double sign.
- **Service credit**: breach compensation, offsets only, no cash; **≤ 10% of that year's maintenance fee**; may not be used as a gift/bonus quota (no account mixing); different from "customer gifts" (non-cash physical items, not written into a contract as consideration).
