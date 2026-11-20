---
status: 已修
severity: P2
opened: 2026-11-17
---

# BUG-205：live-pointer 守卫的扫描面没有随 63 个 lib 搬进 tools/lib / checks/lib / probes/lib

> 严重级别：P2（次要）｜发现：2026-11-17｜状态：已修｜修复：2026-11-17｜审查：agent（独立盲审）— 3 blocker 已修（归档同批 / Note 一致 / 红证配方），S1–S4 已处置
>
> **关联**：[C12 归属波次探索卡](../settled_issues/2026-11-17-ownership-wave-exploratory.md)（C12-2 / N1）。
> **留痕**：批次 Note [2026-11-17-c12-ownership-wave-repairs](../../../notes/implemented/2026-11-17-c12-ownership-wave-repairs.md)（本批共用）。

## 症状

`tests/repo/docs/live-pointer-paths.spec.ts` 的 `FACES` 只覆盖：

```text
packages/company-pack/src
notes/implemented
checks/audit
packages/company-pack/presets
.agents/skills
```

`2450d0ef` 把 63 个 lib 搬进 `tools/lib/{core,company,repo,release,session,probe}`、
`checks/lib/`、`probes/lib/`、`tests/support/`，这些新家**都不在** `FACES`。因此这些模块头注/注释里
写错的 `tests/*.spec.ts` 路径不会被 BUG-187 的活指针判据抓到——而 agent 正是会照着这些头注去跑
`pnpm test <path>` 的读者。

## 复现

在 `tools/lib/core/asset-lanes.mjs` 末尾注入一条陈旧 spec 注释（不改任何可执行语句）：

```sh
python3 - <<'PY'
from pathlib import Path
p = Path('tools/lib/core/asset-lanes.mjs')
p.write_text(p.read_text() + '\n// probe: stale spec pointer tests/lib/old-ledger.spec.ts\n')
PY
pnpm exec vitest run tests/repo/docs/live-pointer-paths.spec.ts
git checkout -- tools/lib/core/asset-lanes.mjs
```

实测修复前 `Test Files 1 passed (1)` / `Tests 8 passed (8)`、`exit=0`；同一注入放进
`checks/audit/` 会被既有用例抓到（BUG-190 的负例）。还原后 `git status` 干净。

## 根因与证据

- 根因：[live-pointer-paths.spec.ts](../../../tests/repo/docs/live-pointer-paths.spec.ts) 的 `FACES`
  是手写面清单，搬移没有同 diff 扩面；`stalePointers()` 只遍历 `FACES`。
- 证据：上负控实跑；`FACES` 原文不含 `tools/lib`/`checks/lib`/`probes/lib`/`tests/support`。
- 影响：本波 63 个 lib 的注释是「活指针」的一部分，却不在判据面；搬移后最容易出现旧 spec 路径的
  正是这些文件（BUG-187 的三条模块头注就是同类）。`pnpm test` 绿不代表这些注释能跑。

## 失败类与同类排查

**失败类 = 文档指针 / 守卫判据面按上次事故文件清单写**（与 BUG-194/195 同族，但这次是**新家**）。

同类：

- `checks/lib` 的 `coverage-baseline.json` 不是文本面；不扫它没影响。
- `tests/support` 的 `doc-grammar.ts` 有两条 tests/lib/prd-check.spec.ts 陈旧字面量，是负向夹具
  （v6 排除项），不是本卡缺陷；扩面时必须按 `fixture` 放行。
- `tools/lib` 的计算型 import 盲区是另一条判据面问题 → [BUG-206](BUG-206-coveredby-evidence-does-not-execute.md)
  只谈 `coveredBy`；本卡只谈注释里的 spec 路径。

## 已修判定

修成什么算修好：

1. `FACES` 纳入 `tools/lib`、`checks/lib`、`probes/lib`、`tests/support`（文本后缀按面）；每个面收集文件数 > 0，空面不许通过。
2. `tests/support/doc-grammar.ts` 的负向样本改用现行 spec 路径，不留豁免口子。
3. 最小负例（同一条命令）：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts`——向 `tools/lib/core/asset-lanes.mjs` 注入旧扁平的 tests/lib/old-ledger.spec.ts 注释 → 红；删除 → 绿。

## 修复证据

- 改动面：`tests/repo/docs/live-pointer-paths.spec.ts`、`tests/support/doc-grammar.ts`
- 红：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts`（同一条命令；红证注入配方见下一行）
- 红证（注入配方，非证据命令）：向 tools/lib/core/asset-lanes.mjs 末尾注入 `// probe: stale spec pointer tests/lib/old-ledger.spec.ts` → 同一条 spec 红；删除 → 绿
- 红输出：`AssertionError: 所有 live 载体面一起判：任一面的旧指针都红: expected [ Array(1) ] to deeply equal []`
- 绿：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts`（修复后绿；日志 = `runtime/tmp/c12-fix/evidence/205-green.log`）
- 提交：commit eccd5f16
