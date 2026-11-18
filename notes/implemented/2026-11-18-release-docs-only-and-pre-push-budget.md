# 2026-11-18 · BUG-212：docs-only 收尾快速路径 + pre-push 预算挂起

状态：implemented（2026-11-18；BUG-212 部分修复后转入 suspended_bugs）

## 决定

1. **docs-only 收尾走 `release --check/--stamp` 的快速路径**（已修）：`release.mjs` 新增
   `docsOnlySince(manifest.gitSha)`，只允许 `docs/`、`notes/`、`_backlog/`、根 README/AGENTS/CLAUDE、
   `_dist/安装手册.md`。`--check` 在 source/pipeline/artifact 未变且 checks 已 pass 时允许 gitSha 落后；
   `--stamp` 同样只在 docs-only + checks pass 时更新 gitSha，不再触发全量 verify。
   - 边界：`--prepare` 之后 checks 仍是 `not-run` 时，docs-only 仍不能 stamp（没有可证明的验证记录）；
     这是故意的，不能把「未验证」盖成「已验证」。
2. **pre-push 46s 预算挂起**（未修，成本-only）：coverage ~22s + run-gates ~11s 是主因；并行化会
   改变资源竞争/失败归因，收益不确定，且不属于正确性缺口。BUG-212 迁 `suspended_bugs/`，触发器 =
   连续两次 push >60s，或出现真实的 push 阻塞投诉；届时再单独设计并行/分档。

## 输掉的方案

- **docs-only 无条件允许 stamp**：等于把未验证产物盖章；拒绝。
- **pre-push 去掉 coverage**：覆盖率棘轮是执行下限，去掉等于降门禁。
- **pre-push 全并行**：CPU 竞争下可能反而更慢，失败日志交错，未在本轮验证。

## 状态事实与载体

- **事实**：`--check` docs-only + checks pass 可通过；`--stamp` 只更新 gitSha/dirty，不改产物。
- **唯一入口**：`tools/release/release.mjs` 的 `docsOnlySince`/`check`/`stamp`；BUG-212 卡。
- **环境坏法**：manifest checks 未 pass 时 docs-only 仍失败（故意）；pre-push 并行化未做。

## 验证

- `pnpm test` / `pnpm verify` / `typecheck` / `coverage` 绿（C16 收口后）。
- docs-only 演练：prepare 后 checks 手工置 pass + docs-only commit → `release --check` PASS；
  `release --stamp` 更新 gitSha 后 `--check` PASS。
- pre-push 预算未重测（挂起）。

## 未覆盖轴

- [covered] docs-only 快速路径：`tools/release/release.mjs` → `tools/release/release.mjs`
- [unprovable] checks 未 pass 的 prepare-only 收尾仍要 verify；这是安全边界 → `tools/release/release.mjs`
- [policy] pre-push 46s 成本挂起，触发条件见 BUG-212 卡 → `_backlog/_archive/suspended_bugs/BUG-212-pre-push-and-release-tail-budget-overrun.md`

- 2026-11-19 演练：docs-only commit 后 `release --check` 允许、`--stamp` 只更新 gitSha。
