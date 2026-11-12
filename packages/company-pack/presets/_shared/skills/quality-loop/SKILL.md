---
name: quality-loop
description: 'Quality loop (quality-loop-producer → quality-loop-verifier → disposition → re-verify): give a complex artifact to two independent activations — one produces against an external method pack, one independently reviews against the same pack; the verdict text is written to disk and auditable. The brief must name the method pack `<pack>@<version>`; if not, fail-closed and stop.'
---
# Quality loop: one produces, one verifies; method and verdict are on paper

**When to use**: an artifact must be "done right", not merely "done" — complex design/implementation, requirements or interface drafts, or anything handed to another person
to continue using or to an external party. One person producing and verifying in the same context interferes with themselves (anchoring, shared blind spots, self-scoring);
this process uses **two independent activations** to separate the two.

**Prerequisites**: the caller's composition has two named rows `quality_loop_produce` (→ `quality-loop-producer`, hands) and `quality_loop_verify` (→ `quality-loop-verifier`, read-only) — the same `quality-loop-` prefix; one search finds the whole set.
They are **capability tiers**, not company roles: they have identity and a tool surface, but no method and no process.
This skill is the single home of the process; **the method is not in any preset** (`<DSH_HOME>/company/methods/<preset id>/<pack>/`).
The verdict is the evidence pack for an internal quality gate; **external signing still belongs to a human** (the named human review in `review-protocol.md` is not exempted by this process).

## 0. Three sentences

1. **The method must be named first**: the brief writes `method: <pack>@<version>`, same name and version on both sides; if either side is missing = stop, do not guess.
2. **The verifier sees only the artifact**: the handoff pack gives baseline + artifact path + constraints + method; **it does not give the producer's reasoning or self-assessment**.
3. **The verdict lands verbatim**: the verifier is read-only and cannot write to disk; the caller (VP-Eng) writes its final text verbatim into
   `verdict-r<N>.md` with the header (session / preset / depth / method / body-sha256). Change one byte and the hash no longer matches.

## 1. Brief (`brief.md`)

One per task; work may start only when the fields are complete:

| Field | Content |
|---|---|
| Goal | What problem this artifact solves, for whom (one sentence) |
| Constraints | Time/cost/technical/compliance/out-of-bounds |
| Baseline | What the artifact builds on (file paths, upstream drafts, versions) |
| Artifact path | Where the producer writes (relative to the delivery directory); the verifier reads the same path |
| Method | `method: <pack>@<version>` (same name and version on both sides) |
| Round limit | Default **2** (produce→verify→disposition→re-verify); over the limit escalate, do not add rounds |
| Acceptance | What counts as pass: full method checklist coverage + no blocker findings |

If the method is missing, or either side cannot load the same-name same-version skill ⇒ **fail-closed**: do not dispatch; report what is missing.

## 2. Two-round handoff (strictly serial: produce first, then verify)

**The order is hard**: first `quality_loop_produce` writes to disk, **wait for that round to finish**, then send `quality_loop_verify`.
Sending both together is meaningless — the verifier would receive a half-finished artifact; that is interruption, not review.

**Dispatch (producer)**: `quality_loop_produce` brief = full brief + artifact path + "load the skill named by `method` first".

**Handoff pack (to verifier)**: `handoff-r<N>.md`, only four things — baseline, artifact path, constraints, method.
**Do not** attach the producer's reasoning chain, self-assessment, or "I already checked it". Attaching them makes the verifier review itself.

**Verdict (verifier returns)**: the final text is the verdict. The shape is fixed:

```
## Verdict: <pass | fail>
### Checklist
| check-id | result | evidence |
|---|---|---|
| <id in the method> | pass / fail / skip | one checkable piece of evidence; skip must say why |
### Findings
- F1 [<check-id>][blocker] one sentence: what is wrong, what it affects
- F2 [<check-id>][advisory] …
```

Rules: **every check-id in the method checklist must have a row** (a missing row = not passed, not "not checked");
one id per finding; the verdict is append-only — a re-verification is a new block or a new file, **never edits the old one**.

## 3. Artifacts on disk (caller does this; the verifier cannot)

```
<delivery dir>/quality-loop/
  brief.md              brief
  handoff-r<N>.md       handoff pack
  verdict-r<N>.md       verbatim verdict: header line + body (body = verifier's final text, unchanged)
  dispositions-r<N>.md  disposition table
```

`verdict-r<N>.md` header line (**one line, machine-parsed**, `body-sha256` = sha256 of all body text after the header line;
you may write `body-sha256=to-fill` first and backfill with the command below after saving):

```
<!-- quality-loop: round=1 session=<verifier sessionId> preset=quality-loop-verifier depth=<delegationDepth> producer=<producer sessionId> method=<pack>@<version> body-sha256=<hex64> -->
```

Get session / depth / producer from the matching `list_subagents` row (read the child durable header; if unreadable write `unavailable` and explain).
`producer` is not decoration: the audit uses it to check **produce before verify** (the verifier session must be created after the producer's first round finished).

**Hashing goes through the tool, never by hand**: write the body and header into `verdict-r<N>.md`, then run

```sh
node <company-content>/../presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs --fix .dsh-company/deliverables/<slug>/quality-loop/verdict-r1.md
```

It recomputes and backfills with the same normalization as the audit (body without trailing whitespace). **Do not use `tail -n +2 file | shasum`** — it counts the trailing
newline and the audit reports `body-modified` (real incident 2026-11-10 BUG-056). To hash only a body use
`--body <body file>`; to check use `--check <verdict file>`.
**Do not hand-edit the body**: once changed it no longer matches the header or the verifier session (the audit turns red).

## 4. Disposition (one of three per finding; no silent ignoring)

`dispositions-r<N>.md`:

```
| Finding | Disposition | Note |
|---|---|---|
| F1 (or `F1 [check-id] title` in the first cell) | fixed | what changed + how re-verification sees it |
| F2 | rebut | evidence: why it does not hold (must be checkable, not "I think") |
| F3 | accept | what the risk is + who accepts it (named role/person; without "who accepts" it is not a disposition) |
```

A `blocker` finding may not be closed with "accept" (to accept it, escalate to the authorizer and write it in the note).

**If the artifact/draft changes after the verdict**: do not stop at "it was verified, then changed" — either open a new R2 verdict (`verdict-r2.md`),
or explicitly write "unverified" in the disposition note and have the authorizer accept the residue. The audit emits a `post-verdict-unverified` warning for
"unverified" in the latest round's dispositions (it does not pretend the text still matches; it is not a runtime veto).

## 5. Rounds and escalation

1. **R1**: producer finishes → handoff → only then dispatch verify → verdict → disposition item by item.
2. **R2**: re-verify after fixes (new verdict file `verdict-r2.md`); look only at the previous round's findings and checklist, do not reopen the whole line.
   In the re-verify round, re-list the previous findings as **"resolved / still stands"**; no need to copy the disposition table (dispositions belong to the round that first raised them);
   only findings **new in this round** need a disposition in `dispositions-r2.md`.
3. **Over the limit** (R2 still has blockers, or producer and verifier keep disagreeing on the same item) ⇒ **stop and escalate**:
   hand up both verdicts, the disposition tables, and the disagreement points verbatim; the delegator (VP-Eng) decides, and if needed the CEO/human.
   **Never** add a third round to grind the disagreement flat — a flattened disagreement becomes an incident at delivery.

## 6. Method-pack contract

One method = one skill on each side, **same `method`, same `version`, different `side`** (`side` is the method pack's own vocabulary:
`producer` / `verifier`; directory names follow the preset id, so `quality-loop-producer` / `quality-loop-verifier`):

```
<DSH_HOME>/company/methods/quality-loop-producer/<pack>/SKILL.md
<DSH_HOME>/company/methods/quality-loop-verifier/<pack>/SKILL.md
```

```yaml
---
name: <pack>
description: <one sentence: what this method covers, what it produces>
metadata:
  method: <pack>        # same name on both sides
  version: <x.y.z>      # same version on both sides
  side: producer        # producer | verifier
---
```

The body has four sections (order does not matter, content does): **input contract** (what it consumes) | **procedure** (how) |
**checklist** (`check-id` + criterion + evidence requirement; the verifier concludes item by item) | **output contract** (which sections the artifact must contain).
Producer and verifier checklists use the **same** check-ids — otherwise coverage checking has no anchor.

A **human** places the method into the method layer (pack upgrades do not erase it; new sessions see it); a role may not write it.
Changing company/product type only changes the method pack; the presets and process do not move.

## 7. How to describe independence (do not overclaim)

- The label is **context-independent review (same model, different context; independence is limited)** — never report it as "different person" or "two-person review".
- It addresses anchoring, self-scoring, and attention dilution; it **does not** address same-source blind spots or model correlation.
- Mark the **margin width** next to key conclusions (how many cells/percentage points flip it).
- External deliverables still go through `review-protocol.md`: named human reviewer + independence level + missing-data fail-closed.
  This process's output is the **evidence pack** for that person, not a signature.
