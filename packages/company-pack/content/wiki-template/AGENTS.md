# Knowledge map — maintenance protocol

> Layer: wiki template (not loaded by roles) · This file is the **schema**: it tells an LLM how to maintain this wiki.
> Copy this directory somewhere, point the project's strategy `wiki` field at it, and let agents read it.

You are the maintainer of this knowledge map. Humans source material and ask questions;
you write and keep the pages. The wiki is a **persistent, compounding artifact** — the point is
that answers do not get rediscovered from scratch every time.

## Three layers (never mix them)

| Layer | What it is | Who writes |
|---|---|---|
| `sources/` | Raw material as received (links, pasted text, exported docs). **Immutable** — quote it, never edit it. | Human |
| this wiki (everything else) | Pages you compile from sources, with cross-links. | LLM |
| this `AGENTS.md` | The protocol: page shape, index/log discipline, ingest/query/lint. | Human (rarely) |

A page is not a source. If a claim is not in `sources/` or in another page, either find a source
or mark it as an open question — do not invent it.

## Page shape

Every concept is one markdown file with YAML frontmatter. **`type` is the only required key.**

```markdown
---
type: concept            # required; free-form short string (concept / howto / reference / decision / …)
description: One line that tells a reader whether this page is relevant.
# Optional, add when you actually need them:
# sources: [{ resource: '../sources/2026-11-12-talk.md', title: 'Talk transcript' }]
# generated: { by: 'agent/company-pack', at: '2026-11-12T00:00:00Z' }
# verified: [{ by: 'human:owner', at: '2026-11-12T00:00:00Z' }]
# status: draft | stable | deprecated      (default: stable)
# stale_after: 2027-01-01                  (absolute date; past = stale)
---

# Page title

Body in plain markdown. Link other pages with relative paths: `[Index](../index.md)`,
`[Sibling](./other-page.md)`. Links may point at pages not yet written — that is
**not-yet-written knowledge**, not an error.

Keep every page short enough to read in one go; split when a page starts covering two ideas.
```

## index.md — the entry point

`index.md` is **content-oriented**: a catalog of what exists, one line per page,
with a link and a one-line summary. Every directory may have its own `index.md`.

Rules:
- **Update it in the same pass as the page you add or rename.** A page missing from its
  index is invisible to everyone.
- One line per page: `- [Title](path.md) — one-line summary.` Group under `##` headings when
  the list gets long.
- Keep it small enough to read first, before opening any page. That is the whole point.

## log.md — append-only history

One line per change, newest **last**, dates ISO (`YYYY-MM-DD`):

```markdown
## 2026-11-12
- **Ingest** — added `concepts/pricing-tiers.md` from `sources/2026-11-12-pricing-call.md`; touched `index.md`.
- **Lint** — fixed 2 stale cross-links, flagged 1 contradiction (see `concepts/pricing-tiers.md`).
```

Never rewrite history. Never delete a line to "clean up".

## Ingest — adding a source

1. Put the raw material in `sources/` (do not paraphrase it there).
2. Decide the smallest set of pages this source changes — one source often touches several.
3. Write or update those pages; keep `description` accurate (it is what search reads first).
4. Add the cross-links the new material implies (and fix links it contradicts).
5. Update `index.md`; append to `log.md` under today's date.

If the source contradicts an existing page, do not silently overwrite: state both claims,
date them, and flag the contradiction in the page and in the log.

## Query — answering from the wiki

Read `index.md` first, then open only the pages it points at. When the index is not enough:

1. **Decompose** — split the question into sub-questions, each answerable by a page.
2. **Expand vocabulary** — before searching, list the words an answer would contain (synonyms,
   acronyms, the original-language term); search those too.
3. **Search, then read** — `grep` the wiki for candidate pages, then read them.
4. **Judge relevance yourself** — grep returns lines, not relevance; read the `description`
   and the first paragraph before trusting a hit.
5. **File good answers back** — if the answer took real synthesis, write it as a new page
   (or extend one) and link it from `index.md`. Explorations compound like sources do.

Cite pages you used; say "not in the wiki" when it is not, instead of filling the gap from memory.

## Lint — periodic health check

Look for: contradictions between pages · claims past `stale_after` · orphan pages with no
inbound links · missing cross-references · pages missing from `index.md` · broken links that
have stayed broken · `description` lines that no longer match the page.
Fix what is mechanical; for anything judgmental, report it instead of guessing.

## Boundaries

- **Write only inside this wiki.** Do not touch the host repository, the workspace's
  `.dsh-company/` state, or anything outside this directory.
- If this wiki lives outside the workspace it is **read-only** to agents: propose pages to the
  user instead of writing them.
- Never invent sources, numbers, names, or dates. If unsure, mark the page `status: draft` and
  say what is missing.
