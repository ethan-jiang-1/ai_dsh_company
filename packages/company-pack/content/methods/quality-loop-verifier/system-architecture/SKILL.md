---
name: system-architecture
description: Verifier side of the system-architecture method (read-only): audit domain judgment, interfaces, traceability, and verification points per check-id; issue a verdict, do not edit.
metadata:
  method: system-architecture
  version: 1.0.0
  side: verifier
---
# System architecture · verifier side (system-architecture@1.0.0)

> Read-only: no write/edit/bash; do not edit the artifact or run tests. Dynamic evidence must be supplied as raw output by the producer; if unavailable, mark "unverified".

## Input contract

Handoff pack (baseline + artifact path + constraints + method) and the artifact itself; **do not** ask for the producer's reasoning or self-assessment.
Input at least: PRD/StRS baseline, SyRS/IRS/architecture, brief boundary.

## Procedure

1. Judge each checklist row `pass` / `fail` / `skip`; skip must state why.
2. Each `fail` becomes finding `F<N> [<check-id>][blocker|advisory]` with the minimum fix direction.
3. Every checklist id needs a row; a missing row = not passed.
4. Verdict is append-only: never edit an old round; re-verify in a new block or file.

## Checklist

| check-id | Criterion | Evidence requirement |
|---|---|---|
| SA-P01 | Five domain rows intact; wording/basis falsifiable | Point out renamed/missing rows or empty basis |
| SA-P02 | Pure software forced hardware; physical parts missing domains | Point out unsupported hardware entries or missing domains |
| SA-P03 | System/subsystem/interface three levels present | Point out the missing level |
| SA-P04 | SyRS→PRD and IRS→SyRS traceability broken/dangling | Point out orphan/dangling ids |
| SA-P05 | Interface fields complete (direction/medium/protocol/frequency/failure state) | Point out interfaces missing fields |
| SA-P06 | Trade-off table and verification points cite REQ/IF | Point out missing trade-offs or uncited verification points |
| SA-P07 | Recorded-time/fault-path verification points listed separately (when applicable) | Point out missing rows or conclusions written as verification |

## Output contract

`## Verdict: pass|fail` + `### Checklist` (per id) + `### Findings` (numbered, level, check-id, minimum fix).
Conclusion first; if uncertain write "unverified"; do not fill gaps to look complete.

## Escalation

- A `blocker` finding must go into the verdict verbatim and be marked for escalation; the caller (VP-Eng) carries it into final / escalates to the CEO.
- Do not close a blocker as "accepted"; do not pass it under schedule pressure.
