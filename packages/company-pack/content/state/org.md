# Dream Team · company roster (single source of truth)

> Factory default: **50 people** total, down to positions (change for your company after install). This file is the single authority for staffing — each role's CHARTER
> keeps only its line's facts and references this file; **never write a second total** (the company-disk version of D10 "one home per fact").
> Company business (same-day decision): a high-tech company with three lines = software development / services / systems integration.
> **The human side**: seats / names / allocation in `roster.md`; role ownership and authority in `owners.md`;
> labor rates in `rates.md`. This file gives position counts only, not names or rates.

## Six lines (50 people, position level)

### CEO and company functions (3)

| Position | Count | One-line responsibility |
|---|---|---|
| CEO | 1 | Sole owner of the global result; sole entry/exit for a motion |
| HR and administration | 1 | Recruiting, onboarding/offboarding, office and admin |
| Commercial/legal | 1 | Contract review, bid qualifications, external agreement templates |

### Finance (CFO, 4)

| Position | Count | One-line responsibility |
|---|---|---|
| CFO | 1 | Cash / cost / compliance; gross-margin floor and sign-off lines |
| Accountant (receivables and project accounting) | 1 | Project accounting, receivables, milestone invoicing |
| Accountant (general ledger and tax) | 1 | General ledger, tax filing, cost-allocation basis |
| Cashier | 1 | Payment execution; **SoD: the cashier does not keep the books** |

### Sales (VP-Sales, 6)

| Position | Count | One-line responsibility |
|---|---|---|
| VP-Sales | 1 | Existing customers / sales / pricing; "no one will buy" veto |
| Pre-sales solution | 2 | Solution architecture 1 + POC/bid support 1 |
| Account sales | 3 | Key accounts 2 + new-business development 1 |

### Market and product (CMO, 3)

| Position | Count | One-line responsibility |
|---|---|---|
| CMO | 1 | Market opportunity / product definition / MRD; "market does not hold" veto |
| Product manager | 1 | Product requirement definition, PRD collaboration, roadmap |
| UX | 1 | Interaction and usability |

### Product engineering (VP-Eng, 16)

| Position | Count | One-line responsibility |
|---|---|---|
| VP-Eng | 1 | Feasibility / cost / technical risk; technical veto |
| Platform/backend | 6 | Two internal services and platform capability |
| Frontend/mobile | 3 | Customer-facing surfaces and internal tool frontends |
| Data and AI | 2 | Agent pilots, data pipeline and evaluation |
| Test | 2 | Functional test 1 + automation 1 |
| SRE/engineering productivity | 2 | Infrastructure (cloud budget in `.dsh-company/kb/policy-lines.md` "infrastructure budget"), CI/productivity; no DBA (backend covers) |

### Delivery and customer success (COO, 18)

| Position | Count | One-line responsibility |
|---|---|---|
| COO | 1 | Delivery / budget / process compliance; "cannot carry" veto |
| PMO | 3 | Delivery managers 2 + project specialist 1; parallel project pool and scheduling |
| Systems-integration engineer | 8 | ERP/finance integration 4 + business-system integration 4 (the main force for reconciliation and invoicing) |
| Custom development | 3 | Project on-site development |
| Operations and support | 2 | Maintenance-contract tickets (next-business-day response) |
| Customer success | 1 | Renewal and satisfaction |

| **Total** | **50** |  |

## Company facts derived from staffing (cite here; do not restate)

- **Infrastructure has dedicated staff**: SRE 2 (engineering line); no DBA (backend covers) — reviews must still answer "who maintains it", naming a person.
- **Parallel limit / quote sign-off lines / budget lines**: only in `.dsh-company/kb/policy-lines.md` (this file writes no numbers).
- **Customer base**: 9 mid-sized existing customers (6 with annual maintenance contracts) — customer profiles and pricing detail belong to
  `.dsh-company/kb/vp-sales/CHARTER.md`.
- **Internal systems**: two internal services (Node.js 22 + SQLite); toolchain = Markdown + git + weekly meeting minutes.
