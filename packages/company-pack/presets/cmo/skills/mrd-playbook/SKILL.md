---
name: mrd-playbook
description: 'CMO playbook: MRD market opportunity (segment / economic buyer / alternatives / competitors / buying points / sizing) → go/no-go, then StRS stakeholder requirements (REQ-### + traces→MR); read the shared product-definition spine and the product-type playbook first.'
---
# MRD playbook (CMO)

Load `product-definition` first (spine + product-type playbook), then write the MRD. This skill only adds the market-side play.

## Inputs

- Constraints given in the motion (time / budget / existing customers / strategic intent).
- `.dsh-company/kb/cmo/CHARTER.md` and company facts (`kb/company.md`, `kb/org.md`).
- External evidence: primary sources first (customer behavior, tenders/contracts, public competitor material, industry data); label secondary sources.
  Label every judgment **[fact]** (with source) or **[assumption]** (inference, to verify).

## Steps

1. **Opportunity signals**: customer complaints/churn, competitor gaps, regulatory change, technology inflection, reuse in an adjacent market.
   First write "who is underserved in what scenario"; do not start with features.
2. **Segments and economic buyer**: separate user / economic buyer / decision chain; write the "cost of not buying".
3. **Alternatives and competitors**: how customers cope today (Excel, outsourcing, competitors, doing nothing); why we win.
4. **Value and buying points**: one-line value proposition; the three strongest buying points; the most likely reason for rejection.
5. **Sizing**: TAM/SAM/SOM with a reproducible method (top-down or bottom-up); label numbers [assumption] + basis.
6. **Success criteria**: what facts to observe after launch (signed deals, pilot conversion, repeat purchase, delivery cycle).
7. **Verdict**: `go / no-go / defer` + one-line reason; list open items separately (who decides, what evidence is missing).

## MRD output

Write it with `<company-content>/templates/mrd.md`, save to `deliverables/<slug>/drafts/mrd.md` (`layer: MRD`, `definition: json-ledger`).
- One opportunity gets one `MR-###`; title, segment, economic buyer, pain, evidence, alternatives, competitors, value, size, success criteria, confidence.
- One page max; conclusion first; do not write a feature list (that is PRD's job).

## StRS output (stakeholder requirements)

After the MR is settled, produce the StRS in the same round: write it with `<company-content>/templates/strs.md`, save to `deliverables/<slug>/drafts/strs.md`
(`layer: StRS`, `definition: headings`).
- Each `### REQ-###` is one stakeholder requirement; the line below writes `traces: [MR-###]` (missing upstream = orphan red).
- Write "who cares, what they care about, who signs off at acceptance"; **do not write thresholds** (that is PRD/SyRS) and do not write pricing (VP-Sales owns it).
- `REQ` is an **any-layer** number: StRS/PRD/SyRS share one append-only sequence; the owner takes `max+1` when registering.
- After writing, run `/req check <slug>` (operator command); fix red, do not bypass it.

## Boundary

- Do not price for VP-Sales (existing customers / quotes / discounts); do not decide the technical solution for VP-Eng; do not commit delivery for COO.
- Do not invent customers or numbers; if evidence is unavailable, write "unverified + what would verify it".
- CMO vs VP-Sales: CMO owns **new markets / new product opportunities**; VP-Sales owns **existing customers / sales / pricing**.
  When they overlap, first state whether this is a new opportunity or an expansion of an existing customer.
- Handoff to VP-Eng: the MRD is the input to the PRD; VP-Eng authors the PRD; CMO only reviews whether the PRD's market assumptions and MR id traceability hold.
