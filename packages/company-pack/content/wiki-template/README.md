# Knowledge map template

A five-minute starting point for a project's reference wiki. Copy this directory, point the
project's strategy at it, and let the team's agents maintain it.

## 1. Copy it out

```sh
cp -R packages/company-pack/content/wiki-template /path/to/your-wiki
```

Put it anywhere readable: inside the workspace (agents may write) or outside it (agents read,
only you write). The location decides the mode — nothing else does.

## 2. Point the project at it

In the composer toolbar, open **Strategy** (the button showing `Strategy: Auto`) and
set the **Reference wiki** row to that directory — relative paths resolve against the workspace,
absolute paths may live anywhere. Save is implicit; the next turn sees it.

Or from a session:

```
/company-settings set wiki /path/to/your-wiki
```

## 3. Check it took

```
/company-settings show
```

You want `wiki=...` marked usable, with `writable` or `read-only` next to it. If it reports
**invalid**, the directory is missing, is not a directory, or has no `index.md` — roles are told
the pointer is invalid instead of being sent to read nothing.

## 4. First real page

1. Drop the raw material into `sources/` (never edit it afterwards).
2. Write the page under `concepts/` (or a directory you create), with `type` + `description`.
3. Add one line to `index.md` pointing at it.
4. Append a line to `log.md` under today's date.

That is the whole loop. The protocol in [AGENTS.md](./AGENTS.md) covers ingest / query / lint in
detail — agents load it when they work on the wiki.

## What is here

| File | Purpose |
|---|---|
| `AGENTS.md` | Maintenance protocol (page shape, index/log discipline, ingest/query/lint, boundaries) |
| `index.md` | Entry point: one line per page; read this first |
| `log.md` | Append-only change history |
| `concepts/example-concept.md` | A page to copy (shows frontmatter + links) |
| `sources/README.md` | Why raw material is immutable and how to name it |
