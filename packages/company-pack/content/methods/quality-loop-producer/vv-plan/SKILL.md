---
name: vv-plan
description: Producer side of the V&V-plan method (hardware-software / system products): map V-model left-side artifacts to right-side verification, using TC-### + covers + L1–L4.
metadata:
  method: vv-plan
  version: 1.0.0
  side: producer
---
# V&V plan · producer side (vv-plan@1.0.0)

> Applies when PRD/architecture/SyRS/IRS exist and an independent verification and validation plan is needed.
> Pure software / enterprise software does not use this method; write PRD AC in the product type's acceptance form.

## Input contract

- PRD (REQ/AC), StRS, architecture, SyRS, IRS, delivery constraints;
- On-site boundary, sample/environment/certification requirements from the brief;
- Known risks and fault paths (if none, label [assumption/to-verify]).
Missing left-side artifacts → stop and report what is missing; do not substitute "implementation is the requirement".

## Procedure

1. **Left → right mapping**: every requirement/interface/key architecture item maps to right-side verification (acceptance/system/integration/unit).
2. **Numbering**: each verification case `TC-###`, one criterion each; `covers` → `REQ-###` / `IF-###`.
3. **Levels**: L1 unit / L2 integration / L3 system / L4 acceptance; all four levels need rows; a missing level states "not covered this round + conditions to cover".
4. **Criteria**: measurable, reproducible, with environment and samples; failure state, recorded-time trust, and out-of-boundary tolerance listed separately when applicable.
5. **Coverage**: derive from the index, do not hand-write "N items"; check every REQ/IF has at least one TC.

## Checklist

| check-id | Criterion | Evidence requirement |
|---|---|---|
| VV-P01 | Every left-side artifact has right-side verification | Mapping table / coverage matrix |
| VV-P02 | Every TC has a unique id + covers (REQ/IF) | `TC-###` rows |
| VV-P03 | Every criterion is reproducible (values/conditions/samples) | Criteria column |
| VV-P04 | L1–L4 all have rows, or gap + conditions to cover | Level column |
| VV-P05 | Failure state / recorded time / out-of-boundary tolerance verified (when applicable) | Corresponding TC rows |
| VV-P06 | Coverage count matches row count; no overclaim | Count check |

## Output contract

`vv-plan.md`: `layer: V&V` + `definition: table-rows`; header carries `covers`; one `TC-###` per row;
columns include level, method, criterion, environment and samples, result. Conclusion first: pass/fail/pending counts + the three things to fix first.

## Escalation

- A `blocker` gap (unverifiable requirement, key risk with no verification means) → mark `[escalate]` and state what is missing;
  the caller carries it into final / escalates to the CEO; do not close by "accepting".
- Run dynamic evidence yourself and deliver raw output with the plan; the verifier has no bash — do not make it run for you.
