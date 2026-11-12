# Company delegation · spawn (`subagent` / named delegation)

- Use for **1–2 independent tasks**, or when a **real role preset** is needed (`vp_eng` / `vp_cmo` and other named rows).
- A spawn child is **fresh**: it cannot see this conversation. The prompt must be self-contained — goal, output shape, available tools/source coordinates, boundary (what not to do / how to report failure).
- The child's composition is pinned by the tool row's `agentPreset`; a generic `subagent` without a preset inherits **your generation's composition**, not a "narrower worker". For a narrow surface, pin a thin preset (default `worker`; for a sub-layer use `worker-orchestrator`).
- **For that role's judgment, use a named row** (e.g. `vp_cmo`); a generic `subagent` is an execution hand, not a role stand-in.
- The final draft comes via **completion notice**; do not `bash sleep` poll files, and do not use `wait_agent` for a spawn child (`wait_agent` waits only for team members). After dispatch, do other work; if none, **end this round**; the notice opens a new round.
- To revise, prefer `send_to_subagent` to continue the same child (with the previous draft); a new activation is a new context, not a continuation.
