# .dsh-company/kb · company fact directory

> This directory belongs to the current deployment, not the plugin. On first start it is copied from the pack's `kb-setup/seed.json`; afterward people and roles maintain it.
> Upgrades only fill gaps and do not overwrite what you changed. For a missing file, follow the "missing-file discipline" — **do not guess**.

## At a glance

| File | What it is | Maintained by | If missing |
|---|---|---|---|
| `company.md` | Company identity + `productType` + timezone | human | report gap; rebuild from seed (sample marker remains) |
| `org.md` | Staffing / lines / headcount | human | report gap; rebuild then edit for your company |
| `policy-lines.md` | Sign-off / budget / parallel limits | human | report gap; **no quoting without it** |
| `owners.md` | Who maps to which role, what they may answer | human | report gap; ask each role |
| `review-protocol.md` | Review statement / external-facing gate | human | report gap; external deliverables fail-closed |
| `roster.md` | Seat roster (seat → who / allocation / can take) | human | report gap; `<to-fill>` = configuration gap, do not judge "no one" |
| `rates.md` | Labor rate card (person-week cost) | human | report gap; `<to-fill>` = configuration gap, never invent rates |
| `motion-ledger.md` | Motion ledger | CEO / operator | empty is fine; starts at 0 |
| `process-docs.md` | Seeded copy of the numbering contract (authority in the pack's type pack) | human | report gap; pack version wins |
| `<role>/CHARTER.md` | Long-term role summary | human (at convergence) | report gap; rebuild from the default charter |
| `<role>/journal/` | Current-round minutes | the role itself | empty directory is normal |

## Reading order (role session)

1. `company.md` — who I am, which `productType`
2. `policy-lines.md` — money and lines (read before quoting / discounting / budgeting)
3. On demand: `org.md` (staffing), `roster.md` (seats), `rates.md` (rates), `owners.md` (people), `review-protocol.md` (external deliverables)
4. Your own `CHARTER.md` + the latest 3 `journal/` entries

## Missing-file discipline (fail-loud)

- Report **which file is missing + what it affects** first; never use the pack sample as deployment fact and never guess numbers.
- Only seeds marked "sample" may stand in; files the user changed are never overwritten.

## Where this directory comes from

`kb-setup/seed.json` is the only mapping (source → target, only-fill); this file is copied from `kb-setup/guide.md`.
The assembly directory `content/kb-setup/` holds assembly pieces only; company facts stay in `company/`, `state/`, `product-types/`.
