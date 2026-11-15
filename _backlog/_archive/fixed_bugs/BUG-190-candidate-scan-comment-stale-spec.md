---
status: 已修
severity: P2
opened: 2026-11-15
---

# BUG-190：candidate-scan 审计脚本的注释指向不存在的 candidate-scan-labels spec

> 严重级别：P2（次要）｜发现：2026-11-15｜状态：已修｜修复：2026-11-16｜审查：agent（独立盲审）— 2 blocker（typecheck 规则类型互斥；归档后 bug-coverage 缺具名守卫）已修复；建议 S1–S8 全部处置（根配置覆盖、tools coveredBy 补 coverage-ratchet、tests/README 同 diff、阈值判据口径、负例过滤、词表全量核对、计数校正、删「未接 N」数字）
>
> **关联**：[探索卡 Round 92](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)；C11 子面 M2（活指针）。
> **留痕**：Note [2026-11-16-move-side-effects-and-live-pointers.md](../../../notes/implemented/2026-11-16-move-side-effects-and-live-pointers.md)（本批共用）。

## 症状

[checks/audit/candidate-scan-eval.mjs](../../../checks/audit/candidate-scan-eval.mjs) 第 141 行写：

```text
// IO + 三规则实跑；解析与打分逻辑在 lib（纯逻辑，配 tests/tools/candidate-scan-labels.spec.ts）
```

tests/tools/candidate-scan-labels.spec.ts 不存在；解析/打分逻辑的现行 spec 是 `tests/tools/candidate-scan-assignments.spec.ts`（10 passed，覆盖 `parseAssignments` / `parseLabelsText` / `scoreLabels` 等）。

## 运行面

tooling / 审计脚本注释（`checks/audit/`）；不是运行时行为。影响维护者在改 candidate-scan 时找测试。

## 复现

```sh
pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 审计脚本
test -e tests/tools/candidate-scan-labels.spec.ts   # 旧路径：不存在（exit=1）
```

旧路径不存在由 `node runtime/tmp/c11/live-pointer-check.mjs` 第 6 条覆盖；新 spec 实跑日志 = `runtime/tmp/c11/candidate-scan-new.log`。

## 根因与证据

- **根因**：测试树拆分/重命名时，`candidate-scan` 的 spec 从计划名 `candidate-scan-labels.spec.ts` 落成 `candidate-scan-assignments.spec.ts`（2026-10-11 起的 BUG-011 守卫与实际导入都在 assignments 文件里），审计脚本注释没有改。注释在 `.mjs` 里，不在 Markdown 裸路径/`command-refs`/`md-links` 任一扫描面。
- **确认**：旧文件名在盘上不存在；`assignments` spec 的 import 明确消费 `tools/lib/candidate-scan.mjs` 的同一组函数，10 passed。

## 失败类与同类排查

**失败类 = 文档指针**（脚本注释里的测试路径未随测试重命名更新；注释载体不在门禁射程）。

同类：`checks/audit/**` 的 `tests/*.spec.ts` 注释逐条对盘；本处是 audit 面唯一缺失。`checks/gates/**` 的同类命中均为负例/历史留证（`zz-` / `nonexistent` / 「当时的 tests/company/dag.spec.ts」），不判、也不在本次扫描面内。

## 修复方案与范围

- 把注释里的文件名改成 `tests/tools/candidate-scan-assignments.spec.ts`。
- 防复发：`tests/repo/docs/live-pointer-paths.spec.ts` 的「审计脚本」用例扫 `checks/audit/**` 的 `tests/*.spec.ts` 字面量并要求存在。
- 明确不改：不改审计逻辑、不改 spec、不改 `tools/lib/candidate-scan.mjs`。

## 已修判定

`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 审计脚本` 退出 0；`rg -n 'candidate-scan-labels' checks/audit` 零命中；`pnpm test tests/tools/candidate-scan-assignments.spec.ts` 10 passed 不变。

## 修复证据

- 改动面：`checks/audit/candidate-scan-eval.mjs`、`tests/repo/docs/live-pointer-paths.spec.ts`
- 红：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 审计脚本`（注释指向不存在的 candidate-scan-labels spec）
- 绿：`pnpm test tests/repo/docs/live-pointer-paths.spec.ts -t 审计脚本`（1 passed / 5 skipped）
- 提交：commit 713acc60
