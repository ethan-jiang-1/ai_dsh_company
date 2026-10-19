---
status: 推敲中
blockedBy: [2026-10-19-company-panels-ux-priority]
opened: 2026-10-19
---

# 推敲：任务板的 UX 深挖（表格可读性 + 入口可发现性）

> 立卡：2026-10-19 ｜ 状态：推敲中 ｜ 类型：Task ｜ 毕业：未定 ｜ 可关闭：否

## 当前结论（只写 now）

「任务板」有两副面孔，都在 [`TasksPanel.tsx`](../../packages/company-pack/src/client/TasksPanel.tsx)：① 会话头部入口按钮；② 右栏页签体表格 `TasksTableView`。数据面与看板同源（`agentTeam` 投影）。

**owner 不是缺陷**：wire 视图 `ownerName` 齐全（BUG-026 是误报）；`（阻塞）` 已按 BUG-027 同族修复（只在待办行显示）。当前要处理的是：

1. **依赖列显示裸 `task-N`**，人问「T3 在等谁」要二次查询——真问题。
2. **入口可发现性/键盘可达/落点**未实测（Tab 焦点、Enter 是否打开右栏任务板页签）。
3. **`已删` 是死字面量**：`STATUS_LABEL` 有 `deleted: '已删'`，但 `tasksFromTeamView` 在到表格前已过滤 deleted。
4. **刷新文案**默认「每 5 秒自动刷新」不实（共享事实，归 Wave 1「新鲜度文案」小卡（待立））。

**未决问题（产品选择）**：

- 依赖列显示什么？建议 `owner · id`（title 给 subject），或 `owner · subject`。要能一次答出「谁在等谁」，不是只把 id 换成标题。
- `已删`：删掉映射，还是取消过滤让墓碑真显示？建议删映射（本轮不做墓碑视图）。

**下一步：** 父卡选中本卡后按下面验证计划进 `exit_plan_mode`；未选中前只维护卡面。

## 官方 layer 0 与 compact skin（边界声明）

官方 [`client-ui-agent-team`](../../vendor/dsh/packages/experimental/client-ui-agent-team/README.md) 的任务板已覆盖 roster、owner、blockers、readiness、writeScopes、overlap warnings、description、failure；本表是**紧凑 skin**，只画 id / 任务 / 状态 / owner / 依赖。**不重复**官方已覆盖的 writeScopes/overlap/description，也不自建任务存储；若只为「可浮出的右栏」而保留本表，按 [release.md](../../docs/release.md) §vendor 政策先记录「官方面板不能 dock」的证伪，再决定留 skin 或提上游 seam。

## 当前事实（带层；不把 state 当 wire）

| 事实 | 样本/层 | 出处 |
|---|---|---|
| 与看板同源 | 代码：都走 `tasksFromTeamView` | [`use-company-data.ts`](../../packages/company-pack/src/client/use-company-data.ts)、[`board.ts`](../../packages/company-pack/src/lib/board.ts#L183) |
| owner 列有信息 | wire：`ownerName` 齐全；真无 owner 的卡显示「未分配」（当前样本 35 张） | [BUG-026 结论](../_archive/settled_issues/BUG-026-owner-missing-from-team-projection.md) |
| 依赖列裸 id | 代码 + 渲染 | [`TasksPanel.tsx:60`](../../packages/company-pack/src/client/TasksPanel.tsx#L60) |
| `已删` 死字面量 | 代码：过滤发生在到表格之前 | [`board.ts:183`](../../packages/company-pack/src/lib/board.ts#L183) + [`TasksPanel.tsx:12`](../../packages/company-pack/src/client/TasksPanel.tsx#L12) |
| 「（阻塞）」已修 | 代码 + spec | [`TasksPanel.tsx:56-57`](../../packages/company-pack/src/client/TasksPanel.tsx#L56-L57) + [`tasks-table.spec.ts`](../../tests/client/tasks-table.spec.ts) |
| 入口按钮文案随真值变化 | 代码：`useSessions` 读 Lead 投影 | [`TasksPanel.tsx:90-100`](../../packages/company-pack/src/client/TasksPanel.tsx#L90-L100) |
| 刷新文案不实 | 代码：`PanelFrame` 默认 5 秒；实际投影推送 | [`company-tabs.tsx:62`](../../packages/company-pack/src/client/company-tabs.tsx#L62) |

## 范围与排除项

- **范围内**：依赖列可读性；入口可发现性/键盘/落点；`已删` 死字面量；刷新显示结果（共享修复归 Wave 1）；官方 parity 边界。
- **范围外**：不改任务投影（vendor）；不做任务编辑/拖拽/筛选；不写「任务板 vs 看板一致性」断言（同一函数，恒真无鉴别力）；不重复看板卡的渲染问题；不做成品台账（[新卡](2026-10-19-deliverables-ledger.md)）。

## 验证计划（按现有证据 owner）

0. 前置：`pnpm test tests/client/tasks-table.spec.ts`；读 [`probe-window.mjs`](../../tools/lib/probe-window.mjs) 的共享开场步骤。
1. **依赖列**：改 `TasksTableView` 后，用 `tasks-table.spec.ts` 断言「T3 在等谁」能从单元格一次读出（不是裸 id）；产品格式先拍。
2. **入口**：新开一个 `probes/browser-visual/` 探针（待建，命名按该目录惯例；复用 `probe-window.mjs`）：按钮可见、Tab 可达、焦点可见、Enter 打开右栏任务板页签、`aria-expanded`/标题正确。
3. **`已删`**：删映射或真显示，二选一；同 diff 测试。
4. **刷新**：验任务板页签显示与真实推送一致（共享修复归 Wave 1）。
5. **收口**：`pnpm verify` + `pnpm test` + `client-load-smoke`（`set -o pipefail`）；结论回填。

## 验收标准（草案；父卡选中后转正）

- [ ] **依赖列可读性**：「T3 在等谁 / 谁在等 T3」能直接在表里答出（依赖列显示 owner 名 + id 或 owner + 标题，不是裸 `task-N`）；有 keyless 断言与实测记录。
- [ ] **入口三件**：可发现性 + Tab 焦点可见 + Enter 落点 = 右栏任务板页签；浏览器探针断言。
- [ ] **`已删`**：死字面量已处理（删映射或真显示），带判据。
- [ ] **刷新文案**：任务板页签显示与真实推送一致（共享修复归 Wave 1）。
- [ ] **官方 parity**：卡面写明官方 layer 0 与 compact skin 边界；不自建任务存储。
- [ ] 门禁 + `pnpm test` + `client-load-smoke` 绿；记录/索引同步。

## 修订史（只追加）

- rev 1 2026-10-19：立卡；核心假设 =「同源两视图不一致即 bug」，并计划「修 owner 后重测」。
- rev 2 2026-10-19 晚：两视图同一函数，恒一致——该验收无鉴别力；BUG-026 是误报（owner 不是缺陷）；BUG-027 同族已修 `（阻塞）`。旧版「owner 列空」「修 owner 后重测」撤回。
- rev 3 2026-10-19 A 收口：当前路径重写为 now；依赖列/入口/死字面量/刷新分开；官方 parity 边界补上；验收标草案。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：①「入口按钮显然看得见」——没跑的人不知道；②「依赖列显示 id 也够用」——真用户任务是「谁在等谁」，id 要二次查询；③「任务板可以直接替掉看板」——两副面孔，数据同源但任务不同。
- **已被证伪、不要再证**：① 同源两视图可能不一致；② 修订号可能显示 0；③ owner 列空是缺陷。
- **口径**：以 wire 为准；「两处一致」不是判据，可读性与落点才是。
