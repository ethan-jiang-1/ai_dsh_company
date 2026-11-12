---
name: consulting-the-knowledge-map
description: 'Reference wiki use: read index.md first, drill only the pages you need, grep when the index is thin, file synthesized answers back as pages, keep ingest/lint discipline, and never write into a wiki that lives outside the workspace.'
---
# Consulting the knowledge map

The project may have a reference wiki — an external knowledge layer of markdown pages compiled
from sources. It is **not** in your context: you have to go read it. This skill is how, and how to
keep it worth reading.

**Check first.** The startup settings (`company:startup-settings` section) tell you whether a
wiki is bound and where.
If it says the pointer is invalid, do not go looking and do not substitute memory — say the
pointer is broken and ask.

## Reading: index first, pages second

1. Read `<wiki>/index.md`. It is the catalog: one line per page with a one-line summary.
   Decide from it which pages are relevant — **do not open the whole tree**.
2. Open only those pages. Follow their links; that is what the cross-references are for.
3. The wiki's own `AGENTS.md` is the maintenance protocol. Read it before writing anything.

If the index is thin or the question is unusual, fall back to search — in this order:

- **Decompose**: split the question into sub-questions, each answerable by a page.
- **Expand vocabulary**: list the words an answer would contain (synonyms, acronyms, the
  original-language term, the English term for a Chinese concept) and search those too. The wiki
  and your question rarely use the same words.
- **Search, then read**: `grep` the wiki for candidates, then read them. Grep returns lines, not
  relevance — read the `description` and the opening paragraph before trusting a hit.
- **Judge relevance yourself**: a keyword hit is a candidate, not an answer.
- **Widen only if needed**: a broader grep, a different page, or a source in `sources/`.

**Say what you did not find.** "Not in the wiki" is a valid answer; substituting memory for a
missing page is how a knowledge map rots.

## Writing: only where you are allowed to

The startup section tells you which mode applies:

- **Wiki inside the workspace** — you may write. Follow the wiki's protocol (page shape, then
  `index.md`, then `log.md`, in the same pass).
- **Wiki outside the workspace** — it is **read-only** to you (the sandbox blocks writes there).
  Do not try. Propose the page to the user instead, in a deliverable or a message; they own that
  layer.

## Filing answers back

A query that took real synthesis should leave a page behind — otherwise the next session
rediscovers it. Before writing:

1. Is this already a page? Extend it instead of creating a near-duplicate.
2. Is it source-backed? If it came from a source, put the source in `sources/` first (never edit
   an existing source file; add a dated one).
3. Write the page with `type` + `description`, link it from `index.md`, append to `log.md`.
4. If it contradicts an existing page, state both claims with dates — do not silently overwrite.

## Ingest (adding a source)

Raw material → `sources/` (immutable). Then update the **smallest set of pages** the source
changes (one source often touches several), refresh their `description`, fix the links it
implies, then `index.md` + `log.md`.

## Lint (when asked, or periodically)

Contradictions · claims past `stale_after` · orphan pages · missing cross-references · pages
missing from `index.md` · broken links that stayed broken · stale `description` lines.
Fix what is mechanical; report what needs judgment instead of guessing.

## Boundaries

- Write **only** inside the wiki directory; never into the host repository or `.dsh-company/` state.
- Never invent sources, numbers, names, or dates. Unsure → `status: draft` and say what is missing.
- The wiki is not the company's own facts (rates, seats, process): those live in `.dsh-company/kb/`.
