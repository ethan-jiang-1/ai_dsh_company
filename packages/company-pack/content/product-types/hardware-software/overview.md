# Hardware-software / systems integration · product type overview

> Layer: product type · Load: on demand (T2); this file is a ≤2KB summary. Use for products with hardware (device/module/complete unit) plus software, or delivered as systems integration.

## When to use

- The deliverable includes hardware, firmware, on-site installation, or third-party system integration;
- Acceptance happens at the customer site or a third-party lab, not only in a software environment;
- Requirements map to subsystems / purchased parts, and interfaces cross organizational boundaries.

If delivered by SOW/UAT/on-site acceptance, **the product type is still `hardware-software`**; write delivery mode as `project-services`;
delivery documents and templates are in `content/delivery-modes/project-services/`.
If selling ongoing SLA / device operations / spares and on-site response, write delivery mode as `managed-service`; documents in `content/delivery-modes/managed-service/`.

**Capability prerequisite**: check `capabilities.md` before entering PRD/quoting; report missing seats (hardware/firmware/electrical/mechanical/certification/supply chain/trial production/on-site); do not enter quoting or external commitments.

## Stages (mapped to the document chain)

1. **Opportunity and requirements**: MRD (should we do it, for whom) → StRS (who cares, who signs acceptance).
2. **Product definition**: PRD (what we sell) → SyRS (what the system as a black box must satisfy) → IRS (cross-boundary interfaces).
3. **Design/implementation**: hardware, firmware, software in parallel; interfaces and allocation fixed first.
4. **Trial production and certification**: EVT/DVT/PVT, DFM, submission and certification (CE/FCC/3C per market).
5. **Mass production and on-site**: ramp, yield, OTA/on-site upgrade, spares and repair.

## Key differences from pure software

- Two more requirement layers (SyRS/IRS); acceptance has "inspection/submission/on-site" forms;
- Risk list includes long-lead components, certification failure, trial-production yield, supply-chain single points;
- A version is a "hardware × firmware × software" compatibility matrix, not a single semantic version.

## Terms

See `glossary.md` (BOM / EVT / DVT / PVT / DFM / certification / OTA / FAT / SAT).
