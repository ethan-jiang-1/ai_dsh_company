# fixed_bugs/ · 已修复缺陷卡

从 [`../../bugs/`](../../bugs/README.md) 迁入。卡片保留文件名和讨论正文，状态行记录修复判定。编号计数器唯一家 = [`../../bugs/README.md`](../../bugs/README.md)（本文件不复述数字，避免两处漂）。归档索引 = [`../README.md`](../README.md)，制度 = [`../../README.md`](../../README.md)。

## 修复流水（倒序）

- **BUG-019**（2026-10-16）：判据加「证据可得性」维——显式声明 `evidenceMissingBefore`（CLI `--evidence-from`）后，该期内无 present 背书的成品由违规降为观察项 `present-evidence-missing`；不声明维持严格判红。深挖同时推翻首版诊断（本案是**真阳性**：收口会话从未调 `present`）。详见 [卡](BUG-019-final-present-evidence-lost.md)。
- **BUG-020**（2026-10-16）：收敛半态可续跑——清 live journal 判 tracked（未跟踪走 `rmSync`，不再因「角色刚写未入库的 journal」崩在半途）＋新增 `converge --resume <目录名>`（只做剩余步骤、不搬移交付物；不可续跑时 fail-loud 给恢复指引）；判定纯函数 = `convergenceResume`。详见 [卡](BUG-020-converge-crash-untracked-journal.md)。
- **BUG-018**（2026-10-16）：署名审计的写入者归属补「基础角色」规范化——`tools/lib/authorship.mjs` 新增 `baseRoleOf`（只抹 `<角色>-<数字>` 实例后缀），判档与显示用基础角色、原始 preset 存 `writerRaw`；真盘 `authorship-audit` 由「署名不实 10 + exit 1」变「署名不实 0 + ALL PASS」。守卫 = 同 spec 的「规范化只抹实例后缀，不吞跨角色差异」。详见 [卡](BUG-018-authorship-instance-preset-false-positive.md)。
- **BUG-017**（2026-10-12）：记录残留四件清偿——归档卡计数统一为五缺陷、issues/README stray 断链删、台账叙述校正、落地决定补 implemented Note（convergence-executor）。详见 [卡](BUG-017-record-hygiene-residue.md)。
- **BUG-016**（2026-10-12）：converge 自述三处对齐——未知旗标 fail-loud（`--plan` 即拒）、dev-loop §12 与 checks/README 改无参计划口径、动作清单/完成 TODO 对齐 journal-only 与 `--charter-backfill`。详见 [卡](BUG-016-converge-self-description-drift.md)。
- **BUG-015**（2026-10-12）：backfill 证据目录按 slug 解析真实收敛目录（`tools/lib/converge-rules.mjs` `resolveEvidenceDir`：多日取最新、无证据 fail-loud）——隔天补登不再写断链。详见 [卡](BUG-015-charter-backfill-evidence-date-coupling.md)。
- **BUG-014**（2026-10-12）：backfill 查重改条目行锚（`charterHasEntry`），COO 缺失的 ai-sprint-2026 历史纪要已补登；回归锚 = `tests/company/converge-rules.spec.ts`。详见 [卡](BUG-014-charter-backfill-dedupe-false-skip.md)。
- **BUG-013**（2026-10-12）：runtime/e2e/assembly-e2e-driver.mjs untrack + `.gitignore` 显式规则——观察窗 token 出库（重启即轮换，无历史重写）；规则防再犯。详见 [卡](BUG-013-e2e-driver-token-committed.md)。
- **BUG-010**（2026-10-11）：HITL 前排空的行为验证落地（`probes/session-context/hitl-dispatch-order-probe.mjs`）：V4 = `ask-before-dispatch`，新场景 = `dispatch-before-ask`（ask 前已建 10 个任务）。
- **BUG-009**（2026-10-11）：对账回合的行为验证落地（`probes/session-context/reconcile-round-probe.mjs`）：V4 = `no-reconcile`，新场景 = `reconciled`（CEO 双向转述对方数值）。
- **BUG-012**（2026-10-11）：5 份带「AI 使用声明」的模板各加「复核独立性层级」与「边际宽度」两栏；`tests/company/templates.spec.ts` keyless 断言守（删栏位即红）。行为面等下一份带复核的 final 观察。
- **BUG-011**（2026-10-11）：派活行扩可选 `｜假设：<待证/内容>` 段（`tools/lib/candidate-scan.mjs` 解析出该字段）；`tests/company/candidate-scan-labels.spec.ts` 断言新旧行都解析。统计面等下一场派活跑法。
- **BUG-008**（2026-10-10）：deliverables-check 归档件存量降 `legacy-archive` 观察项（exit 1→0）；原 recon-pack 判据漂移清零。
