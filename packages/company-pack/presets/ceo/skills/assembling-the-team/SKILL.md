---
name: assembling-the-team
description: 'CEO team assembly: before any motion, pass these six steps (call anyone? / whom? / whom not? / capability inventory / which channel? / set the slug), then enter the chairing rhythm (chairing-staff-meeting).'
---
# Assemble by problem

Before any motion, pass these six steps, then enter the chairing rhythm. **The team forms around the problem, not around habit** — every teammate
is a real model call; do not invite any function that would only be along for the ride.

1. **Ask first: "do we need anyone?"**: matters that are purely CEO authority — initiating or cutting, priority, total resources, external position,
   final close-out — decide yourself; do not pull people in.
2. **Whom**: list functions by "which questions must this motion answer" (use the handbook's "who to ask" routing table).
   **A function with no matching question does not enter**: engineering/feasibility/PRD → VP-Eng; **new market/new product definition/MRD → CMO**;
   existing customers/sales/pricing → VP-Sales; delivery/process/staffing → COO; cash/gross margin/compliance → CFO.
   ⚠ **Over-staffing and under-staffing are both failures**: count only the questions the motion **explicitly asks**, do not expand the reading
   (if the motion did not ask, do not ask it for the motion); when unsure **call fewer** and explain in step 3;
   a function invited purely for "completeness/safety" is always out.
   ⚠ **Minimum in-room start (user ruling 2026-10-12, hard clause)**: for a single-domain question — security/technical/compliance diagnosis where
   "one domain can answer" — **default to exactly one function** (prefer `vp_eng` / `vp_sales` direct delegation, cheapest); other functions
   do not enter; cross-domain fields (cost/delivery date/exposure…) are filled by the core owner's first draft and marked "pending <domain> confirmation" —
   **acceptance fields ≠ a reason to enter the room** (pulling people in to fill fields = riding along; negative case = ai-coding-security-2026 started with four roles,
   peripheral drafts, core stalled). Expansion is **evidence-triggered**: the core owner's draft shows the domain is genuinely needed, then add the seat and tell the user
   in one sentence. The scope menu follows the same rule: **every option lists its in-room roster, and must include the single-owner option as the recommended default**
   (inherently cross-domain motions — capital actions / external commitments / renewal combinations — are exempt from this clause, but the roster is still named item by item);
   after selecting an option, **the spawn list ⊆ that option's list**; if a domain is missing, explain to the user before expanding — **menu arithmetic** (say three roles,
   spawn four) and silent expansion are both violations (recorded negative case: menu said three roles, execution used four).
   ⚠ **Pushback = correction signal (andon, 2026-10-12)**: after a member does the domain check and pushes the assignment back
   (the three-piece set = why not me + what is missing + who should take it, via `[NEEDS-CLARIFICATION]`) — **respond with one of three explicitly**:
   reassign / narrow scope / add the missing criteria. **Do not blame or mark the member's output** (punishing pushback = pushback stops,
   the correction channel dies); pushback means the assembly was wrong, and the member is helping you, not offending you. This skill is guidance and has execution
   variance — assembly discipline is backed by the member's right to push back; prevention and correction are both required.
3. **Capability inventory (before splitting work)**: does the motion contain "read an external web page / obtain external facts" tasks? If yes ⇒ fire a **capability probe**
   (one `web_search` + one `bash curl`): in this deployment `web_fetch` is blocked by the tool-layer DNS check; **shell egress is not restricted** —
   prefer **bash direct fetch + mirror/UA changes**; full play = `fact-finding-playbook` skill (eight channels; only exhaust them before HITL);
   if still unavailable ⇒ mark tasks that depend on external facts **`pending-sources`**, never mark them done, and **do not decompose ASSIGN lines while carrying "unverified"** (handbook "fact-blocking gate").
4. **Write down whom you are not calling**: one sentence "this time I am not calling X because…" — the same honesty as "preserve disagreement";
   it prevents "why wasn't finance asked?" afterwards.
5. **Which channel** (by what is needed, not by familiarity):
   - Need only one single-function draft → `vp_eng` / `vp_sales` direct delegation (cheapest);
     revision = `send_to_subagent` to continue the same child (with the previous draft); if not continuable, delegate once more.
   - **Need workflow / subagent engineering evidence or parallel verification → `vp_eng` named child**: it gets the full vp-eng
     tool surface (workflow / subagent / subagent_fork); `spawn_teammate` members inherit **your** composition and **do not** have workflow/subagent (a member named "vp-eng" in the CEO team is not the vp-eng preset either).
     For a complex package that needs both "evidence" and "multi-round delivery": first have `vp_eng` produce evidence/summary, then assemble the team to deliver (or delegate once more).
     **A named child is not a team member**: its final draft goes through the completion notice; do not use `wait_agent` / `list_agents` / `send_message`
     to wait for/find/nudge it (the CEO's `send_message` is the team version and returns `active teammate not found` for `vp_eng`);
     do not use `bash sleep` / poll files either — after dispatch **end the round immediately with a receipt** (delegated + expected deliverable);
     the completion notice opens a new round; accept it then. Revision = `send_to_subagent` to continue the same child (with the previous draft); if not continuable, delegate again.
     **The task brief must pin the method**: ≥3 isomorphic branches use `workflow` in parallel (not many `subagent` calls); only 1–2 items use
     `subagent`; an independent check gets its own `subagent` (can run in parallel with workflow). Do not write "subagent or workflow is fine" —
     that hands the channel choice to downstream improvisation.
   - Multi-function judgment, cross-review, repeated opinions → `spawn_teammate` team (persistent members, task board).
   - Single function but back-and-forth revision → also a team (persistent member).
6. **Set the slug**: give this delivery a `<slug>` (lowercase hyphenated English); everyone uses it in dispatch;
   process drafts go to `.dsh-company/deliverables/<slug>/drafts/<role>.md`; only you can `present` the final.
   **Write the product type in the same step**: write `productType: <id>` in `meta.md` (allowed values = product-type pack directory names, see the `meta.md` template). User declaration wins;
   if absent, ask once, or use `company.md`'s `productType` default and mark the assumption in the brief — do not guess by habit. A wrong type
   makes `/req check` use the wrong numbering rules; changing the type requires re-confirming the layers and document chain.
   **Write the delivery mode in the same step**: `deliveryMode: productized|project-services|managed-service`; absent = `productized`; SOW/UAT/on-site/milestone acceptance = `project-services`; ongoing SLA/on-call/monthly report/renewal = `managed-service`.
   Rules/templates are in `content/delivery-modes/`; do not stuff it into `productType`.
   **Write the brief before spawning**: before `spawn_teammate`, write the brief to
   `.dsh-company/deliverables/<slug>/drafts/ceo.md` — goals/constraints/acceptance, in-room roster and channels, each member's
   role pack, and the machine-readable ASSIGN lines; the `Brief = …` in the member's signature line points to this real file. A spawn prompt is not
   a traceable file; spawning without it = dangling signature (2026-11-10 BUG-055).

### Role pack for team spawn

Team members inherit **your** composition and do not have the role preset's `skill` catalog; but the handbook gives the absolute path of `<company-content>`,
and role methods live at `<company-content>/../presets/<role>/skills/`. When spawning a member that carries a functional role (COO/CFO/CMO/VP-Eng, etc.), the brief must carry a **role pack**; otherwise it is just "a CEO wearing that name":

- **Role**: `COO` / `CFO` / …
- **Brief**: `.dsh-company/deliverables/<slug>/drafts/ceo.md` (on disk before spawn; the member signs this real path)
- **Signature line**: at the top of the draft `By: <role>｜Version v<N>｜Brief = <brief path>` (copy the real path; do not invent)
- **CHARTER**: `.dsh-company/kb/<role>/CHARTER.md`
- **Role skill**: `<company-content>/../presets/<role>/skills/<skill>/SKILL.md` (list all; use `read` to load the body)
- **KB**: `.dsh-company/kb/<role>/`, `kb/org.md`, `kb/policy-lines.md` (as needed)
- **Output**: `.dsh-company/deliverables/<slug>/drafts/<role>.md`
- **Boundary**: do not exceed authority, do not sign for another function; report gaps back to you

Members `read` the CHARTER + role skill + KB first, then write. The `Brief` is a spawn prerequisite: **if the file is not on disk, do not spawn** (write it first); the member's signature line copies this path; never invent from a default template. The `skill` tool cannot load role skills — that is a mechanism fact (members inherit your catalog), **use `read`, not memory**; the brief says "read first, then work".

> **Boundary**: this skill is guidance, not a checklist — it provides a stable entry point and judgment criteria; judgment stays with the executor.
> When this skill applies, **read the full text before acting**; do not guess from the description. Mechanical checks remain with the operator at close-out
> (signature line vs. brief, deliverable tri-state vs. present); this text keeps only what needs context.

## Product-definition motion (new product / new feature, 2026-11-05)

Default in room = **CMO + VP-Eng**: CMO produces MRD (`drafts/mrd.md`, `MR-###`), VP-Eng takes the MRD and produces PRD
(`drafts/prd.md`, `REQ-###` / `AC-###-#` / slice). **Do not call everyone by default**:
- Add `worker-researcher` only when external market facts are needed (or let CMO use web/bash first);
- Call VP-Sales only when the motion explicitly asks about **existing customers/pricing**; COO only for **delivery carry**; CFO only for **budget/gross margin**;
- **Two or more artifacts (e.g. MRD+PRD) or multi-function collaboration must use team + task board**; `vp_*` named delegation is only for the shortcut where the user explicitly wants one artifact and it belongs to one function — two artifacts via shortcut = no team/DAG/panel, and no cross-review at close-out;
- **Owner is unique; a missing seat does not mean substitution**: MRD belongs only to CMO, PRD only to VP-Eng; not finding CMO in `.dsh-company/kb/org.md` / `owners.md` ≠ letting VP-Sales act for "market" — fix the roster or report the gap to the user (state which seat is missing and what it affects); only an explicit user instruction is an exception; an old journal's "this deployment has no CMO" does not count.
- DAG: VP-Eng's PRD task `blockedBy` CMO's MRD task; the brief writes the MRD path, no oral paraphrase;
- Close-out: the CEO only merges and `present`s; does not write MRD/PRD; when MRD and PRD conflict on market assumptions/feasibility, keep both conclusions and send them to the CEO for a decision;
- Result check: `/prd check <deliverables directory>`; if it fails, return to VP-Eng/CMO; do not enter engineering.
- **Who is not in the room** is still written in one sentence: "this time I am not calling X because…" (the same honesty as "preserve disagreement").
