---
status: 已结
opened: 2026-10-27
---

# 推敲：DSH 数据模型（FAQ 26）审计出的部署 Gap

> 立卡：2026-10-27 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是
>
> **结论/去向**：做；P0/P1/P2 落 `notes/implemented/2026-10-27-data-model-alignment.md` 与 `2026-10-27-data-model-p1-p2.md`，R1–R6 落 `2026-10-27-data-model-r1-r6.md`；剩余仅边界，不重开。

**问题与期望结果：** 发布后部署最怕的不是功能少，而是数据作用域、版本、备份、迁移和审计账本没有合同。对照 FAQ 26 审计本包后确认了 12 个 Gap；期望把 P0（部署阻断）收口，P1/P2 显性登记，不再只活在会话里。

**当前情况：** P0（G1–G5/G9/G10）已落树并验证，证据 = [P0 Note](../../../notes/implemented/2026-10-27-data-model-alignment.md)；P1/P2（G6/G7/G8/G11/G12）已落树，证据 = [P1/P2 Note](../../../notes/implemented/2026-10-27-data-model-p1-p2.md)。G8 的面板全量读仍保留为已知边界。详细合同 = [docs/data-model.md](../../../docs/data-model.md)。

**未决问题：** 只剩 G8 的面板全量读（分页）与多 Host 事务边界；方法层是否从 profile 级迁 home 级留作真实多 profile 需求。P0/P1/P2 以 0.3.12 真实安装/生命周期/隔离/升级 smoke 为准。

**下一步：** P0/P1/P2 均已落树；剩余收尾已转 [R1–R6 卡](2026-10-27-data-model-closeout.md)（面板加载、writer 护栏、presented 真证据、revoke 崩溃恢复、对账、hardlink 保底）。本卡保留为 12 Gap 的账，不重复记 R 项。

## 范围与排除项

- 范围：本包自造状态（`bundle.json`、`company-cultivation/`、`kb/deliverables-*`、`cultivation/records`）与 DSH 边界的部署合同。
- 排除：多租户、跨机器同步、session 删除 API、改 vendor、E1 依赖。

## Gap 账

| # | Gap | 风险 | 当前状态 |
|---|---|---|---|
| G1 | 培养记录按 session cwd 写，盘子目录会分叉 | 高 | P0 已落树并验证：company root + 明确拒绝 |
| G2 | 换盘只能新 home / 删 manifest（丢基部哈希） | 高 | P0 已落树并验证：`DSH_COMPANY_REBIND=1` + 备份/日志 |
| G3 | 备份口径混用，缺 restore 验收 | 高 | P0 已落树并验证：business/full 两档 + 手册 + lifecycle restore |
| G4 | `presented` 混在派生索引里，false 是审计状态却不可重建 | 高 | P0 已落树并验证：审计账本 + 索引派生 + 事件回扫 |
| G5 | `bundle.json` v 不校验；catalog schema 不符静默重建；基部升级非原子 | 中高 | 已落树并验证：fail loud + 原子写 + hardlink 回退告警 |
| G6 | 记录更新无 CAS；revoke 跨 store 半状态；多 Host 无锁 | 中 | 已落树并验证：CAS + revoke journal + writer lease；多 Host 高可用仍不支持（边界） |
| G7 | 方法层 profile 级，同 home 多 profile 不一致 | 中 | 已落树并验证：启动点名多 profile；一公司一 web profile 合同 |
| G8 | records 无 GC；坏记录静默隐藏；面板全量读 | 中 | 已落树并验证：archive + 坏记录点名 + 摘要全扫/open/最近 120 全文 + 未展开计数 |
| G9 | 读 DSH 私有 `storages/workspace.json` | 中低 | 已落树：优先 `ctx.workspaceRegistry`（inject），旧文件仅保底 |
| G10 | 数据卡不完整、FAQ 26 未登记 | 中低 | 已落树：`docs/data-model.md` + external-research 行 |
| G11 | `DSH_COMPANY_HOME` 等于 home/祖先时可能污染 home | 低中 | 已落树并验证：不安全落点停写 + 告警 |
| G12 | localStorage 键未命名空间/版本；降级未验 | 低 | 已落树并验证：float/instances v1 + 旧 float 迁移 + 降级 smoke |

## 已知与未决

- G1/G2 的边界：pack 只能修自己的数据身份，不能迁移 DSH session 的 `header.cwd`；旧会话仍锚旧绝对路径，手册必须说清。
- G4 的 `false` 没有事件可推导，只能来自操作员审计；因此账本必须是显式状态，不能继续叫“纯派生”。
- G9 的 N1 服务在部分组合可能缺席；旧文件读取只保留为诊断保底，不是主路径。

## 方案与取舍

- 不把 `bundle.json` 迁 `ctx.storageDomain`：它要在插件加载前存在、被人读、被 smoke/手册引用；迁过去是第二权威，也破坏现有恢复路径。
- 不把公司盘内容搬 home/数据库：用户要能看见、编辑、带走。
- 不新增 session event 类型；不物理删 session 日志/改 header；不引入 E1。

## 验收标准

- [ ] G1：子目录/盘外会话提交培养记录被拒；盘根会话正常；keyless + 活入口证据。
- [ ] G2：旧盘搬走 + `DSH_COMPANY_REBIND=1` 真启动后 manifest workspace 前移、备份在场、日志在场；旧盘仍在时拒绝。
- [ ] G3：安装手册有 business/full 两档与恢复/换盘步骤；`dist-manual` 门禁覆盖关键句。
- [ ] G4：删/坏索引后 `presented` 可从账本/会话事件恢复 true，false 不丢；present 事件写账本。
- [ ] G5：manifest v2 被保留并告警；catalog schema 2 告警；首建/升级无半截文件。
- [ ] `pnpm verify` + `pnpm test` + `release-smoke` + `lifecycle-smoke` 全绿；P1/P2 未完成项如实留在本卡。
