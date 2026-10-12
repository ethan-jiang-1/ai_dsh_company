# fixed_bugs/ · 已修复缺陷卡

从 [`../../bugs/`](../../bugs/README.md) 迁入。卡片保留文件名和讨论正文，状态行记录修复判定。编号计数器唯一家 = [`../../bugs/README.md`](../../bugs/README.md)（本文件不复述数字，避免两处漂）。归档索引 = [`../README.md`](../README.md)，制度 = [`../../README.md`](../../README.md)。

## 修复流水（倒序）

- **BUG-015**（2026-10-12）：backfill 证据目录按 slug 解析真实收敛目录（`tools/lib/converge-rules.mjs` `resolveEvidenceDir`：多日取最新、无证据 fail-loud）——隔天补登不再写断链。详见 [卡](BUG-015-charter-backfill-evidence-date-coupling.md)。
- **BUG-014**（2026-10-12）：backfill 查重改条目行锚（`charterHasEntry`），COO 缺失的 ai-sprint-2026 历史纪要已补登；回归锚 = `tests/company/converge-rules.spec.ts`。详见 [卡](BUG-014-charter-backfill-dedupe-false-skip.md)。
- **BUG-013**（2026-10-12）：runtime/e2e/assembly-e2e-driver.mjs untrack + `.gitignore` 显式规则——观察窗 token 出库（重启即轮换，无历史重写）；规则防再犯。详见 [卡](BUG-013-e2e-driver-token-committed.md)。
- **BUG-010**（2026-10-11）：HITL 前排空的行为验证落地（`probes/session-context/hitl-dispatch-order-probe.mjs`）：V4 = `ask-before-dispatch`，新场景 = `dispatch-before-ask`（ask 前已建 10 个任务）。
- **BUG-009**（2026-10-11）：对账回合的行为验证落地（`probes/session-context/reconcile-round-probe.mjs`）：V4 = `no-reconcile`，新场景 = `reconciled`（CEO 双向转述对方数值）。
- **BUG-012**（2026-10-11）：5 份带「AI 使用声明」的模板各加「复核独立性层级」与「边际宽度」两栏；`tests/company/templates.spec.ts` keyless 断言守（删栏位即红）。行为面等下一份带复核的 final 观察。
- **BUG-011**（2026-10-11）：派活行扩可选 `｜假设：<待证/内容>` 段（`tools/lib/candidate-scan.mjs` 解析出该字段）；`tests/company/candidate-scan-labels.spec.ts` 断言新旧行都解析。统计面等下一场派活跑法。
- **BUG-008**（2026-10-10）：deliverables-check 归档件存量降 `legacy-archive` 观察项（exit 1→0）；原 recon-pack 判据漂移清零。
