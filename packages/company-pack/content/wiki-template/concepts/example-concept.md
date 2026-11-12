---
type: concept
description: The shape of a wiki page — frontmatter, body, cross-links — as a working example to copy.
---

# Example concept

This page exists to show the shape, not to teach a subject. Copy it, rename it, replace the body.

## What a page carries

- **Frontmatter**: `type` (required) + `description` (what a reader scans before opening the page).
  Add `sources` / `verified` / `stale_after` only when they earn their keep.
- **Body**: one idea, short enough to read in one go. Split when a second idea shows up.
- **Links**: relative paths to sibling pages and to the [index](../index.md). A link to a page
  nobody has written yet is fine — it marks not-yet-written knowledge.

## How pages connect

A page should be reachable: from the [index](../index.md), or from a sibling that links it.
An orphan page (no inbound links) is a lint finding, not a style preference.

## Where the truth lives

Raw material goes to `sources/` and is never edited; this page is the compiled view of it.
When a source contradicts this page, state both claims with dates instead of silently
overwriting — see the [protocol](../AGENTS.md).
