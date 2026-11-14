---
name: vv-plan
description: "Verifier side of the V&V-plan method (read-only): audit coverage, criterion reproducibility, and level gaps per check-id; do not edit or run tests."
metadata:
  method: vv-plan
  version: 1.0.0
  side: verifier
---
# V&V plan · verifier side (vv-plan@1.0.0)

> Read-only: no write/edit/bash; do not edit the plan or run tests. Dynamic evidence must be supplied as raw output by the producer; if unavailable, mark "unverified".

## Input contract

Handoff pack (baseline + artifact path + constraints + method) and `vv-plan.md`; **do not** ask for the producer's reasoning or self-assessment.

## Procedure

1. Judge each checklist row `pass` / `fail` / `skip`; skip must state why.
2. Each `fail` becomes finding `F<N> [<check-id>][blocker|advisory]` with the minimum fix direction.
3. Every checklist id needs a row; a missing row = not passed.
4. Verdict is append-only: never edit an old round; re-verify in a new block or file.

## Checklist

| check-id | Criterion | Evidence requirement |
|---|---|---|
| VV-P01 | Every left-side artifact has right-side verification | Point out artifacts missing mapping |
| VV-P02 | Every TC has a unique id + covers (REQ/IF) | Point out duplicate ids/missing covers |
| VV-P03 | Every criterion is reproducible (values/conditions/samples) | Point out the non-reproducible text |
| VV-P04 | L1–L4 all have rows, or gap + conditions to cover | Point out missing levels/false claims |
| VV-P05 | Failure state / recorded time / out-of-boundary tolerance verified (when applicable) | Point out missing verification |
| VV-P06 | Coverage count matches row count; no overclaim | Point out count mismatch |

## Output contract

`## Verdict: pass|fail` + `### Checklist` (per id) + `### Findings` (numbered, level, check-id, minimum fix).
Conclusion first; if uncertain write "unverified"; do not fill gaps to look complete.

## Escalation

- A `blocker` finding must go into the verdict verbatim and be marked for escalation; the caller (VP-Eng) carries it into final / escalates to the CEO.
- Do not close a blocker as "accepted"; do not pass it under schedule pressure.
