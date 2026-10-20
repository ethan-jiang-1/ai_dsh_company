# fixed_bugs/ · 已修复缺陷卡

从 [`../../bugs/`](../../bugs/README.md) 迁入。卡片保留文件名和讨论正文，状态行记录修复判定。编号计数器唯一家 = [`../../bugs/README.md`](../../bugs/README.md)（本文件不复述数字，避免两处漂）。归档索引 = [`../README.md`](../README.md)，制度 = [`../../README.md`](../../README.md)。

## 修复流水（倒序）

- **BUG-031**（2026-10-20）：`orient --scenario replay/r3-delegation` ENOTDIR 崩——runBundleView 对 children 引用一律 readdirSync，而 r3 声明的是单文件形状（`sessions/vp-eng-child.jsonl`）。修法 = statSync 分流（文件且 .jsonl 计 1 / 目录数 .jsonl）；守卫 = orient.spec 真实 r3 断言 + 文件形状夹具（红 2 failed → 绿 27/27，活体视图完整渲染）。教训 = 消费引用合同要枚举全部合法形状。详见 [卡](BUG-031-orient-scenario-children-file-shape.md)。
- **BUG-030**（2026-10-20）：diagnose 审批判读字段错位——decisionOf 读想象键（decision/answer），真 v4 日志是 `{id,outcome}`（vendor persistence-catalog 权威），每条审批渲染成 `approval ? → `（无名无结论）；工具名在同 id 的 approval/asked 侧。附带同修 turn/end 对象 error 的 [object Object] 渲染。修法 = 读 outcome + asked/decided 按 id 配对 + detailOf 序列化 + 夹具改真形状；红 4 failed → 绿 27/27，活体 `approval request_signoff → rejected`（reason「毛利<30% 双签」可对勘）。教训 = **夹具用想象形状 = 绿灯保释错实现**，新工具判据夹具应从真日志取样。详见 [卡](BUG-030-diagnose-approval-outcome.md)。
- **BUG-029**（2026-10-20）：观察窗 token 再次随 `runtime/web-logs` 日志入库（BUG-013 同类复发）。修法 = untrack + `.gitignore` 规则 + **类级 tracked-token 窄扫**（`tools/lib/tracked-token.mjs` + `checks/gates/tracked-token.mjs`）+ `.gitignore` 红绿守卫；不做历史重写。红→绿：临时 tracked 文件写合成 token URL → `FAIL tracked-token ...`；移除 → `PASS tracked-token ×1740`；`pnpm verify` ALL PASS、`pnpm test` 71/699。详见 [卡](BUG-029-committed-web-token-recurrence.md) 与 [Note](../../../notes/implemented/2026-10-20-tracked-token-guard.md)。
- **BUG-028**（2026-10-19）：闸门④的锚粒度与纪律不一致——一条总锚覆盖多任务时被判「行动幻觉」（lingang-recon 实测 3 条误报）。修法 = 认总锚（该 slug 的锚在 title **或 prompt** 里点名 T 号即算已锚，整号边界匹配）+ 依赖链传递（`｜依赖：T4` 且 T4 已覆盖 ⇒ 连带覆盖），无锚/未点名照旧判红。红→绿：新守卫先红 `expected [ 'T4', 'T6' ] to deeply equal []`，修后 `pnpm test` 669/669；真入口 `--only lingang-recon` **3 条违规 → ALL PASS**（盘面一字未改）。同 diff 补手册一句（总锚须点名下游 T 号）。详见 [卡](BUG-028-pending-material-anchor-granularity.md)。
- **BUG-025**（2026-10-19）：台账数据面的口径错配——面板一直读 `kb/motion-ledger.md`（40 行动议表），而调研与四张卡把「993 份成品」记在台账名下，下游论证全线继承。修法 = 订正文档口径（面板代码本就正确）+ 补一条钉住「面板数据面 = `kb/motion-ledger.md`」的判据（`tests/client/client-face.spec.ts`；红/绿实证：改路径 ⇒ 1 failed，还原 ⇒ 5 passed）。真正的收获是失败类：**盘上有什么 ≠ 面板读什么**，那条连线此前无人查。详见 [卡](BUG-025-ledger-reads-wrong-data-face.md)。
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
