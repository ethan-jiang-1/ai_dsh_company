---
status: 已结
opened: 2026-10-19
---

# 推敲：issue 卡本身的质量——当前态被历史埋住，怎样收口成 DSH-native 卡

> 立卡：2026-10-19 ｜ 状态：已结（2026-10-19 A 内容收口已执行；B 以后做，C = 后续卡执行协议）｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是

## 当前结论（只写 now）

四张公司面卡（[父卡](2026-10-19-company-panels-ux-priority.md)、[看板/依赖图](../../issues/2026-10-19-board-dag-ux-deep-dive.md)、[任务板](../../issues/2026-10-19-taskboard-table-ux-deep-dive.md)、[台账](../../issues/2026-10-19-ledger-ux-deep-dive.md)）的**证据不差**；收口前的问题是当前态/历史混写、状态/门票/依赖不匹配、索引与研究稿旧结论没清、证据层/样本口径不标。**用户拍 A（内容收口）**，本轮已执行；B（Card v2 结构）以后做，C（ask/plan/todo/goal）不是三选一，而是后续每张卡的执行协议。

**A 已完成**：

- 四张公司面卡各加 `## 当前结论（只写 now）` / `## 修订史（只追加）`；旧矛盾段移入修订史，不留在判断路径。
- 三张子卡加 `blockedBy` 父卡；下一步从「等你点」改成「等父卡选定」；验收标「草案」。
- 父卡的「成品台账」拆成 [新卡](../../issues/2026-10-19-deliverables-ledger.md)。
- `issues/README` 减成薄索引（只列位置与下一步）；研究稿 §五/§六/§五加失效标记。
- 看板卡 golden 改 **wire**，不再用 `record.rows.agentTeam.val`（state）；台账卡补 `PanelFrame` 默认 5 秒的错标事实；刷新文案共享事实归 [看板卡](../../issues/2026-10-19-board-dag-ux-deep-dive.md)（共享事实唯一 owner）。
- 本卡迁入 `_archive/settled_issues/`；活跃清单、归档索引、研究索引同步。

**B 为什么以后做**：Card v2（`owner/blockedBy/blocker/touches` + 派生视图 + 语义审 skill + 不变量）是结构变更，需门禁红/绿与迁移成本。触发条件：A 收口 + 第一张面板落地后，仍出现同类「当前态被历史埋住」或跨卡事实多 owner；到时新开卡引用本卡，不在这张卡上继续扩。

**C 是什么**：`ask_user_question` 拍选择、`exit_plan_mode` 呈计划、`todo_write` 管本轮切片、`goal` 管长程；它是执行协议，不是 A/B 之外的第三个内容方案。后续每张卡按它跑。

**收口去向**：本卡结论与 A 的落点写在这张卡；B 的触发条件写在这里；下游实施归四张公司面卡与 [成品台账](../../issues/2026-10-19-deliverables-ledger.md)，不另建 Note 证明本卡已交接。

## 证据（本轮实跑）

| 事实 | 样本/层 | 命令或出处 |
|---|---|---|
| 形状门禁全绿 | 本轮实跑 | `node checks/run-gates.mjs`（ALL PASS） |
| keyless 回归 | 本轮实跑 | `pnpm test`（67 files / 669 tests） |
| 旧结论分布 | source | `grep -R "BUG-026\\|BUG-027\\|等你点\\|owner 列空" -n _backlog/issues _backlog/research` |
| 逐条发现 | source | [issue 卡质量审](../../research/backlog-ux/2026-10-19-issue-card-audit.md) |
| 状态映射的根 | source | [_backlog 章程](../../README.md)「双轨状态生命周期」 |

## 修订史（只追加）

- rev 1 2026-10-19：立卡；把四张卡/两份调研的质量审结论从会话移入 issues；本卡未改四张公司面卡的正文。
- rev 2 2026-10-19：用户拍 A；执行内容收口（四卡当前结论/修订史、`blockedBy`、README 薄索引、研究稿失效标记、成品台账拆卡、wire golden 订正）；本卡归档。B 以后做，C = 执行协议。
- rev 3 2026-10-19：收口回执补实跑数字；不再重开。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：①「四张卡已经很清楚了，只是没排版」——只读卡顶 20 行，看能否答出「now / 未决 / 谁下一步」；②「门禁全绿所以没问题」——`backlog-liveness` 只查形状；③「A 做完就该接着做 B」——B 是结构变更，等复发触发；④「golden 用 state 也行」——生产读 wire，会假绿。
- **口径**：本卡只认「当前态可读 + 证据层/样本可复算 + 状态与下一步一致」；审美争议不算缺陷。
- **别做**：不要为了收口而重写四张卡的历史正文；被证伪的假设留在修订史。不要在没有红/绿证据时新增门禁。
