# kb-setup/ · kb assembly pieces

> This directory holds **assembly pieces only**: `seed.json` (source → target) + `guide.md` (seeded as `kb/AGENTS.md`) +
> `run-bundle.md` (seeded as `.dsh-company/README.md`). **Company facts do not live here** — they are in `company/`,
> `state/`, `product-types/`; this directory only describes "how to install".

- Add/rename a kb file: change `seed.json` and the table in `guide.md`; the `seed-integrity` gate checks both.
- Not allowed: move facts like `policy-lines.md` in here (the layer disappears and source/instance mix).
- This file is not seeded and does not enter agent context; it is for maintainers only.
