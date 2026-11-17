---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-184：vitest 覆盖率阈值仍指向搬移前的 5 个 host 路径，阈值静默失效

> 严重级别：P2（次要）｜发现：2026-11-15｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（typecheck 规则类型互斥；归档后 bug-coverage 缺具名守卫）已修复；建议 S1–S8 全部处置（根配置覆盖、tools coveredBy 补 coverage-ratchet、tests/README 同 diff、阈值判据口径、负例过滤、词表全量核对、计数校正、删「未接 N」数字）
>
> **关联**：[探索卡 Round 92](../settled_issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M4（静默弱化）。
> **留痕**：Note [2026-11-16-move-side-effects-and-live-pointers.md](../../../notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md)（本批共用）。

## 症状

`vitest.config.ts` 的 `coverage.thresholds` 是**按路径键**生效的。5 个高风险的 host 模块在 host 分组搬移后换了目录，但阈值键仍写旧扁平路径：

- packages/company-pack/src/host/workspace-resolution.ts
- packages/company-pack/src/host/runtime-guard.ts
- packages/company-pack/src/host/deliverables-command.ts
- packages/company-pack/src/host/catalog-state.ts
- packages/company-pack/src/host/presented-ledger.ts

这 5 个键在盘上都不存在；实际文件现在分别在 `workspace/`、`run-bundle/`、`commands/`、`ledger/` 下。vitest 对「阈值键匹配不到任何文件」**不报错、不警告、不计入汇总**——看起来覆盖率仍被这 5 条 floor 守着，实际它们已经不参与判定。

## 运行面

tooling / 验证面（`vitest.config.ts` 与 `pnpm test:coverage`），不是产品运行时。影响发布前的覆盖率执行下限。

## 复现

```sh
pnpm test tests/repo/budget/vitest-coverage-thresholds.spec.ts
```

修复前：5 个键 `MISSING`，spec 红。独立探针（gitignored 证据）= `node runtime/tmp/c11/vitest-threshold-check.mjs`，输出 `thresholds=10 missing=5`。

## 根因与证据

- **根因**：host 模块搬进子目录时，`vitest.config.ts` 的阈值表没有随迁；阈值表的键是字符串，TypeScript 与 vitest 都不会对「键是否命中文件」做静态检查。
- **搬移出处**：`1eb14f46` 之前的 host 分组（`src/host/{workspace,run-bundle,commands,ledger}/`），不是本轮三批之一；但它是同一失败类在搬移面上的存量，且 C11 的 M4 正是抓这个。
- **为什么全绿**：`pnpm test` 不跑 coverage；`pnpm test:coverage` / `coverage-ratchet` 只对实际产出的文件算，不校验阈值键清单。vitest 对未命中的键是静默忽略。
- **确认**：5 个旧路径都不存在、5 个现行路径都存在；覆盖率运行日志里 5 个死键没有 ERROR 行。

## 失败类与同类排查

**失败类 = 配置组合**（配置注册表随文件搬移漂移，且消费者对缺失键静默）。

同类扫描：`vitest.config.ts` 的 10 条 threshold 全查（5 死）；`tsconfig.test-*.json` 的 exclude 全查（18 条均可解析）；`tests/support/coverage-baseline.json` 的 197 个文件键 + 5 条豁免全查（0 缺失）。结论：**只有 vitest threshold 这一处**。

## 修复方案与范围

- 把 5 个键改成现行路径：`src/host/workspace/workspace-resolution.ts`、`src/host/run-bundle/runtime-guard.ts`、`src/host/commands/deliverables-command.ts`、`src/host/ledger/catalog-state.ts`、`src/host/ledger/presented-ledger.ts`。
- 防复发：新增 keyless spec（`tests/repo/budget/vitest-coverage-thresholds.spec.ts`）断言每个键命中文件、落在 pack 源码面（`packages/company-pack/src/`）内、同时给 statements 与 branches、阈值表非空。
- 明确不改：不调整任何 threshold 数值，不扩大/缩小 include 面，不动 vendor。

## 已修判定

`pnpm test tests/repo/budget/vitest-coverage-thresholds.spec.ts` 退出 0；`node runtime/tmp/c11/vitest-threshold-check.mjs` 退出 0（`missing=0`）。负控 = 把一条键临时改回旧扁平路径 → 同一命令红；还原 → 绿。

## 修复证据

- 改动面：`vitest.config.ts`、`tests/repo/budget/vitest-coverage-thresholds.spec.ts`
- 红：`pnpm test tests/repo/budget/vitest-coverage-thresholds.spec.ts`（5 个阈值键 MISSING、spec 红）
- 绿：`pnpm test tests/repo/budget/vitest-coverage-thresholds.spec.ts`（exit 0；独立探针 missing=0）
- 提交：commit 713acc60
