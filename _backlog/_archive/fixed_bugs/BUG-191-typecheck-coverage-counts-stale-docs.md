---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-191：两份 live 文档的类型面覆盖计数停在搬移前（227/245 与 226/244，实测 231/249）

> 严重级别：P2（次要）｜发现：2026-11-15｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（typecheck 规则类型互斥；归档后 bug-coverage 缺具名守卫）已修复；建议 S1–S8 全部处置（根配置覆盖、tools coveredBy 补 coverage-ratchet、tests/README 同 diff、阈值判据口径、负例过滤、词表全量核对、计数校正、删「未接 N」数字）
>
> **关联**：[探索卡 Round 92](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M4（静默弱化）/ M2（活指针）。
> **留痕**：Note [2026-11-16-move-side-effects-and-live-pointers.md](../../../notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md)（本批共用）。

## 症状

两份 live 文档给出同一个会漂的分数：

- [docs/testing.md](../../../docs/testing.md) 第 67 行：`三个 tsconfig.test-* 覆盖 227/245 spec`
- [docs/guides/dev-loop.md](../../../docs/guides/dev-loop.md) 第 112 行：`typecheck … 覆盖 226/244 spec`

盘上实测（2026-11-15）：**231/249**——三份 `tsconfig.test-*` 的 `include` 并集覆盖 231 个 `tests/**/*.spec.ts`，盘上共 249 个。未接的 18 个与 AGENTS.md 的公式一致（contract 5 + pack-exports 1 + client 4 + host 8），但两个分数都少了 4 个 spec；本批新增 spec 后实测已到 235/253。

## 运行面

文档 / 验证面（`docs/testing.md`、`docs/guides/dev-loop.md`）；影响 fresh agent 对类型面覆盖的读数，不影响 `pnpm typecheck` 行为。

## 复现

```sh
pnpm test tests/repo/docs/typecheck-coverage-claim.spec.ts
```

修复前：两处 `x/y spec` 字面量 → spec 红。独立探针 = `node runtime/tmp/c11/typecheck-count-check.mjs`，输出 `claims=2 stale=2`。

## 根因与证据

- **根因**：类型面覆盖数在三次搬移里变化（245→249 spec、227→231 覆盖），`AGENTS.md` 已改成「覆盖 = include 减 exclude（未接 18 = …）」的公式，但这两份文档仍保留手写分数，没有随行。
- **为什么全绿**：`doc-budget` 只查行数，`nav-count-claims` 只查页签计数，没有任何门禁校验「x/y spec」这类数字。
- **确认**：`tsc -p <三个 config> --listFilesOnly` 的 tests spec 并集 = 231；`git ls-files 'tests/**/*.spec.ts'` = 249；两份文档逐字写旧分数。

## 失败类与同类排查

**失败类 = 文档指针**（会漂的分数字面量没有单一来源；搬移后未同 diff 更新）。

同类：全 live 文档 `rg '\d+/\d+ spec'`；只有这两处。`AGENTS.md` / `tests/README.md` 已用公式或指针，不写死分数，是对的。`notes/implemented/2026-11-15-*` 的历史收据保留旧值，不算。

## 修复方案与范围

- 把两处改成单一来源公式（推荐且采用）：覆盖 = 三个 `tsconfig.test-*` 的 `include` 减 `exclude`，不写分数；未接 18 的构成保留（清单以配置为准）。
- 防复发：新增 `tests/repo/docs/typecheck-coverage-claim.spec.ts`，断言导航面文档不出现 `x/y spec` 字面量（`docs/**` + 根 `AGENTS.md`/`README.md`/`tests/README.md`/包 README）；`notes/` 与归档不扫（历史收据保留旧值是当时事实）。
- 明确不改：不改 tsconfig 的 include/exclude，不把 18 个未接 spec 硬塞进类型面（结构性 exclusion），不动 vendor。

## 已修判定

`pnpm test tests/repo/docs/typecheck-coverage-claim.spec.ts` 退出 0；`node runtime/tmp/c11/typecheck-count-check.mjs` 退出 0（`claims=0 stale=0`）；`rg -n '227/245|226/244' docs` 零命中；`pnpm typecheck` 仍 exit 0（新增 4 份 spec 在类型面内，实测并集 235）。

## 修复证据

- 改动面：`docs/testing.md`、`docs/guides/dev-loop.md`、`tests/repo/docs/typecheck-coverage-claim.spec.ts`
- 红：`pnpm test tests/repo/docs/typecheck-coverage-claim.spec.ts`（2 处写死的 x/y spec 分数）
- 绿：`pnpm test tests/repo/docs/typecheck-coverage-claim.spec.ts`（2 passed；独立探针 claims=0）
- 提交：commit 713acc60
