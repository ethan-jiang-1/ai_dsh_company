---
status: 已修
severity: P2
opened: 2026-11-10
---

# BUG-059：质量环 audit 的原文索引跨轮全局，R2 换新 verifier session 会被误报 `not-verbatim`

> 严重级别：P2（次要）｜发现：2026-11-10｜状态：已修
>
> **留痕**：commit（本修复同 diff；hash 见提交后回填）
>
> **审查**：agent — 合成用例红→绿 + 真盘 R2（cdf67a74 / 7ae15c99）audit 复跑；见「修复证据」。

## 症状

- 质量环 R2 用**新的** verifier session（`cdf67a74-…`）时，`verdict-r2.md` 正文与该 session 的第 2 条
  助手正文完全一致（`body-sha256=1daeeb0f…`），但 `quality-loop-audit` 报：
  `verdict-r2.md：正文与该会话第 3 条起的 2 条助手正文都不一致`。
- R1 用的是 `7ae15c99-…`，R2 是新的 `cdf67a74-…`；两条裁决正文都各自与自己的 verifier 正文逐字一致。
- 同一轮 R1 还有 `body-modified`（`5738a1…` vs `d9d252…`），但那是**另一个问题**：R1 头里的 hash
  是旧的/手算错的，正文本身与 `7ae15c99` 的第 2 条助手正文一致（`5738a1…`）；用
  `verdict-hash.mjs --fix` 修正头后 audit 绿。不是本卡根因。

## 根因（假设）

`tools/lib/quality-loop.mjs` 的 `auditQualityLoop` 用**一个跨轮全局** `lastTextIndex` 记录
"上一轮在该 session 的哪条正文命中"。R2 换了新 session 后，代码仍从 R1 的 index+1 开始找；
新 session 的 `assistantTexts` 只有 2 条（前导 + 裁决），从 index 2 起为空 → 误报 `not-verbatim`。
正确语义：原文索引进度按 **session id** 记；同一 child 续跑（同 session）才沿用上一轮的 index。

## 暴露的失败类

**跨轮状态没有按 session 隔离**。同型检查：任何"上一轮命中位置"用于下一轮、但下一轮可能换 session
的审计器。修复应把 index 做成 `Map<sessionId, index>`，新 session 从 -1 开始；无 session 的轮次
用轮次键，避免串。

## 复现

- 合成：R1 session `s1`（`finalText=BODY`）+ R2 session `s2`（`finalText=BODY`），
  两条 verdict 头分别 `session=s1` / `session=s2`、`round=1/2`；旧实现 → `not-verbatim`。
- 真盘：`2026-11-10-probe-qloop` 的 R2（`cdf67a74`）与 R1（`7ae15c99`）；
  `node probes/team/quality-loop-audit.mjs --deliverable <dir>` 旧实现 → `not-verbatim`。
- 红证由 `tests/harness/tools/quality-loop.spec.ts` 的「R2 换新 verifier session」用例钉住。

## 修复关联

- `tools/lib/quality-loop.mjs`：`lastTextIndex` → `lastTextIndexBySession`（`Map`）；
  `sessionKey = header.session ?? 'round:<n>'`；命中后只更新该 session 的 index。
- `tests/harness/tools/quality-loop.spec.ts`：新增 R1/R2 不同 session 的用例 + `// 负例留证`。
- 不改变 R1 头 hash 的判据（`body-modified` 仍然红）；R1 盘上旧 hash 由 `verdict-hash.mjs --fix`
  按正文重算（正文已核为 verifier 原文）。

## 已修判定

- 合成用例：R1/R2 不同 session、两条正文都逐字一致 → **无** `not-verbatim`；
  同一 session 续跑的旧语义仍允许按顺序命中。
- 真盘 R2：`quality-loop-audit --deliverable 2026-11-10-probe-qloop` → **ALL PASS**（先修正 R1 头 hash）。
- `pnpm test` / `pnpm verify` / `pnpm typecheck` 绿；`guard-red-record` 对到本卡。

## 修复证据（2026-11-10）

- **红**：把 `lastTextIndexBySession` 临时改回跨轮全局 → 新用例 **1 failed**
  （`expected [ 'not-verbatim' ] to not include 'not-verbatim'`）；还原即绿。
- **绿**：`pnpm vitest run tests/harness/tools/quality-loop.spec.ts` = **40 passed**；
  真盘 R2 audit = **ALL PASS**（R1 头 hash 用 `verdict-hash.mjs --fix` 修正后）。
- **R1 artifact**：正文 sha256 `5738a1…` 与 verifier `7ae15c99` 第 2 条助手正文一致；
  头里旧值 `d9d252…` 是 round-8 手算/旧副本残留，不是 R2 的代码缺陷；修复只重算头、不改正文。
- **未覆盖**：同一 session 续跑 R2 的旧语义仍保留（既有用例覆盖）；无真实模型重跑（本修复是纯审计）。
