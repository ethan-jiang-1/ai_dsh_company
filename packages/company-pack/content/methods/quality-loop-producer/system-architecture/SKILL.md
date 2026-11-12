---
name: system-architecture
description: Producer side of the system-architecture method (hardware-software / system products): judge five engineering domains, then write SyRS/IRS/architecture and verification points; do not write verification conclusions.
metadata:
  method: system-architecture
  version: 1.0.0
  side: producer
---
# System architecture · producer side (system-architecture@1.0.0)

> Applies to: hardware-software products with on-site devices/firmware/electrical/mechanical parts, or products needing system-level requirements and interfaces.
> Pure software / enterprise software does not use this method; use the `business-software` product-definition chain.

## Input contract

- Product-layer PRD (`REQ-###` / `AC-###-#`) and StRS;
- On-site boundary, physical-part declarations, and artifact purpose (whether evidence is required) from the brief;
- Tech stack/constraints (cite KB or brief; do not rely on memory).
If the baseline or boundary is missing → stop and report what is missing; do not invent requirements.

## Procedure

1. **Judge domains first**: five fixed rows — software / firmware / electrical / mechanical / system test; write `in/out + basis` per row; product subdivisions or extra brief domains may only append, not replace the five.
2. **System level**: system context, deployment shape, external interface list.
3. **Subsystem level**: hardware/software boundaries, power/communication/storage/installation, accountable party.
4. **Interface level**: each `IF-###` gets name, direction, medium, protocol, frequency, failure state.
5. **System requirements**: derive `SyRS` from PRD (`REQ-###`, `traces` → PRD); interfaces `IRS` (`IF-###`, `traces` → SyRS); allocation appendix `allocation.md` (no ids).
6. **Trade-offs**: one line per key choice — what was chosen / what was given up / cost / condition that would change the decision.
7. **Verification points**: list references to `REQ-###` / `IF-###` and what must be proven; do not write verification methods or pass conclusions.

## Checklist

| check-id | Criterion | Evidence requirement |
|---|---|---|
| SA-P01 | Five domain rows complete; each has a falsifiable basis | Architecture domain table |
| SA-P02 | Pure software does not force hardware; physical parts do not omit electrical/mechanical | Five rows + brief boundary |
| SA-P03 | System/subsystem/interface three levels present | Three architecture sections or equivalent |
| SA-P04 | SyRS traces PRD, IRS traces SyRS, no orphan/dangling | `traces:` lines |
| SA-P05 | Every interface has direction/medium/protocol/frequency/failure state | `IF-###` entries |
| SA-P06 | Trade-off table + verification points cite REQ/IF | Trade-off table, verification list |
| SA-P07 | Recorded-time and fault-path tolerance verification points listed separately (when applicable) | Verification list rows |

## Output contract

`syrs.md` (`layer: SyRS` / `definition: headings`), `irs.md` (`layer: IRS` / `definition: headings`),
`allocation.md` (`definition: none`, no ids), `system-architecture.md` (reference surface, no ids).
Conclusion first on one page: architecture in one sentence + three key trade-offs + risks; label assumptions [fact/assumption/to-verify].

## Escalation

- A `blocker` finding or an unresolvable boundary conflict → mark `[escalate]` in the final body and state what is missing;
  the caller carries it verbatim into final / escalates to the CEO; **do not close by "accepting the risk" yourself**.
- Run dynamic evidence (tests/simulation/samples) yourself and deliver raw output with the artifact to the verifier; do not just write "verified".
