---
status: 推敲中
opened: 2026-10-19
---

# 推敲：看板 + 依赖图的 UX 深挖（呈现层 + 可读性，按 wire 真值）

> 立卡：2026-10-19 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否

## 当前结论（只写 now）

本卡**不再是「修正确性缺陷」**：BUG-026 是误报、BUG-027 已按真根因修复。当前要处理的是呈现/可读性：

1. 依赖图 `statusBadge` 对 in_progress 也吐「可开工」样式（[`company-panels.tsx:67`](../../packages/company-pack/src/client/company-panels.tsx#L67)）。
2. 「每 5 秒刷新」文案不实（共享事实，归 Wave 1「新鲜度文案」小卡（待立）；本卡只验显示结果）。
3. 21 节点长链的窄栏双滚动未实测（读码推断会）。
4. drift 徽章需要真图复验（已有 [`board-drift-probe`](../../probes/browser-visual/board-drift-probe.mjs)）。
5. golden 若用 `record.rows.agentTeam.val`（state）会假绿；必须用 wire。

**未决问题**：

- 窄栏下是否接受纵向双滚动？（视觉判断，要图）
- 长链 2366px 高是否要拆/缩？（产品选择；本轮只记录，不扩功能）

**下一步：** 父卡已拍：本卡第一，任务板第二，台账第三。进入 plan mode / `exit_plan_mode` 呈实施计划；获批后按下面验证计划实施。

## 当前事实（带样本/层；不同层的数不要相加）

| 事实 | 样本/层 | 出处 |
|---|---|---|
| 非空板 84 / 任务 379；最大板 21；非空板中位 4 | projcache **state** 全量（1738 会话），**不是** wire | [真相复核 §三](../research/company-panels-ux/2026-10-19-panel-truth-audit.md) |
| drift 2/84 板、4 个任务 | 同上；drift 只读 subject/description/blockedBy/status，state 与 wire 同值 | 调研 §3.3 |
| 「每 5 秒刷新」不实 | 代码：看板/依赖图/在场走 `useSessions` 投影推送，无轮询 | [`CompanyView.tsx:102`](../../packages/company-pack/src/client/CompanyView.tsx#L102) |
| 21 节点串行链 = 高 2366px；`fitScale` 只缩宽、不缩高 | 实跑 `layoutDag` | 调研 §四 |
| `statusBadge` 的 in_progress 与 pending 共用 `wk-dag-ready` | 代码 | [`company-panels.tsx:64-69`](../../packages/company-pack/src/client/company-panels.tsx#L64-L69) |
| wire 上 ownerName 齐全、`ready` 官方语义成立；35 张是真没 owner | `ver === 4` wire；样本分层见 Note | [BUG-026 结论](../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md)、[BUG-027](../_archive/fixed_bugs/BUG-027-false-dependency-ready-badge.md)、[projection-state-vs-wire Note](../../notes/implemented/2026-10-19-projection-state-vs-wire.md) |

## 范围与排除项

- **范围内**：DAG 徽章样式；刷新文案的显示结果（共享修复归 Wave 1）；窄栏/长链可读性实测；drift 真图复验；wire golden/夹具。
- **范围外**：正确性缺陷修复（已做完）；不改任务投影本身（vendor）；不做拖拽改状态/任务编辑；不碰任务板表格（另卡）；不做成品台账（[新卡](2026-10-19-deliverables-ledger.md)）。

## 验证计划（按现有证据 owner，不新写手工五态）

0. 前置：读 [projection-state-vs-wire Note](../../notes/implemented/2026-10-19-projection-state-vs-wire.md)；`pnpm test tests/company/board.spec.ts tests/client/board-panel.spec.ts`；不读 state 当 golden。
1. **DAG 徽章**：扩 [`dag-visual-probe`](../../probes/browser-visual/dag-visual-probe.mjs)，断言 in_progress 的 class/style 与 pending ready 不同，文本四态仍齐。
2. **窄栏/长链**：`dag-visual-probe` 加窄视口断言；[`dag-midflight-probe --session`](../../probes/browser-visual/dag-midflight-probe.mjs) 复看 21 节点；记录双滚动结论。
3. **drift**：复跑 [`board-drift-probe`](../../probes/browser-visual/board-drift-probe.mjs)；图落 `snapshots/visual/board-drift`。
4. **空/加载/大板**：`client-load-smoke` + `dag-visual` 合成夹具；不新写无主截图。
5. **收口**：`pnpm verify` + `pnpm test` + `client-load-smoke`（`set -o pipefail`）；结论回填本卡与调研。

## 验收标准（草案；父卡选中后转正）

- [ ] **DAG 徽章**：in_progress 的样式与 pending 的「可开工」不同；pending「可开工」、completed「已完成」、waiting「等 N 项」文案不变；keyless 或视觉探针断言。
- [ ] **golden 层**：用 wire（`TeamTaskView`）或现有 `board.spec.ts` 真 wire 夹具；不用 `record.rows.agentTeam.val`；断言 ownerName 映射；真无 owner 的卡显示「未分配」（当前样本 35 张）。
- [ ] **窄栏/长链**：双滚动结论有实测（接受/不接受都要写明）；长链可读性有图或有度量。
- [ ] **drift**：`board-drift-probe` 通过；图落 `snapshots/visual/board-drift`。
- [ ] **刷新文案**：看板/依赖图显示与真实推送一致（共享修复归 Wave 1；本卡验显示结果）。
- [ ] 门禁 + `pnpm test` + `client-load-smoke` 绿；记录/索引同步。

## 修订史（只追加）

- rev 1 2026-10-19：立卡；核心假设 =「板面必须等于投影真值」，并据此要求先修数据 BUG-026/027。
- rev 2 2026-10-19 晚：该前提被证伪——BUG-026 是误报（wire ownerName 齐全），BUG-027 根因不成立、真缺陷是徽章门槛（已修）。「两个致命结论」撤回；核心转为呈现层。
- rev 3 2026-10-19 A 收口：当前路径重写为 now；验收标草案；golden 改 wire；验证计划改现有探针。**已撤回、不要再证**：owner 全缺（state 当 wire）、131 张假就绪（真因已修）、「板面 = 投影真值」断言（state 当 golden 会假绿）、「先修数据 BUG-026/027」（已结/已修）。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：①「板面已经对了，没什么可做」——剩下的是呈现层；②「21 条在窄栏糊」——要图/度量，读码只推断；③「golden 用 state 也行」——不行，会重犯 BUG-026。
- **口径**：本卡只认 **wire**（`TeamTaskView`）+ 现有探针输出；截图只用于视觉判断，审美争议不算缺陷，**不一致才算**。
- **别再证**：owner 全缺、ready 放宽、两视图一致性——前两条已证伪/已修，第三条同一函数恒真。
