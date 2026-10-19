---
status: 已结
opened: 2026-10-19
---

# 推敲：任务板的 UX 深挖（表格可读性 + 入口可发现性）

> 立卡：2026-10-19 ｜ 状态：已结（2026-10-19 完成：依赖列 owner · subject + id 次要、行 id 并入任务列、已删死映射移除、入口探针 PASS）｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是

## 当前结论（只写 now）

「任务板」两副面孔都在 [`TasksPanel.tsx`](../../../packages/company-pack/src/client/TasksPanel.tsx)：① 会话头部入口按钮；② 右栏页签体表格 `TasksTableView`。本轮已实施、验证、收口：

1. **依赖列人读优先**：每项 = `owner · subject`，`task-N` 只做 `title` / `data-dep-id` 次要信息；多依赖用 `wk-deps` 换行；悬空依赖显式 `id（未找到）`。
2. **行 id 并入任务列**：`task-1@3` 灰字在 subject 前，去掉独立 id 列，给依赖列让出宽度；列序 = 任务 / 依赖 / 状态 / owner，依赖在窄栏也能先看到。
3. **`已删` 死字面量移除**：表格改走 `tasksFromTeamView`（过滤 deleted、owner 显示名、revision 归一），`STATUS_LABEL` 不再留 `deleted` 映射；deleted 墓碑不进表。
4. **入口可发现性**：新 `tasks-panel-probe` 真 web 验证——桌面入口可见、可聚焦、Tab/Shift+Tab 在序里、焦点环可见、Enter 打开右栏「任务板」页签（`aria-selected=true`）；窄栏 390 入口仍可见；截图落 `snapshots/visual/tasks-panel`。
5. **刷新文案**：已由[看板卡](2026-10-19-board-dag-ux-deep-dive.md)统一修复（`投影更新`）；本卡页签头实测也是「投影更新」。

**未决**：无。窄栏表格仍横向滚动（known limitation；依赖列已在第二列，先看到），不阻塞收口。

## 本轮实施（2026-10-19）

- **表格**：`TasksTableView` 用 `tasksFromTeamView(view)` 归一化行；`DependencyLabel` 输出 owner + subject + `data-dep-id`；行 id 并入任务列；删 `STATUS_LABEL.deleted`。
- **样式**：依赖列 `white-space: normal`、`min-width: 10rem`；`.wk-deps` 可换行；`.wk-dep-subject` 2 行钳制（全量文本在 DOM）；id 只进 `title`/`data`。
- **测试**：`tests/client/tasks-table.spec.ts` 从 3 条扩到 6 条（依赖 owner/subject/title、悬空 id、deleted 不进表 + 死映射移除）。
- **探针**：新 [tasks-panel-probe](../../../probes/browser-visual/tasks-panel-probe.mjs)（真 web，1440/390；入口可见/焦点/Tab 序/Enter 落点；`--fixture` 落图）；[checks/README](../../../checks/README.md) 索引；[snapshots/README](../../../snapshots/README.md) 场景行。
- **Note**：[2026-10-19-taskboard-dependency-labels](../../../notes/implemented/2026-10-19-taskboard-dependency-labels.md)。

## 官方 layer 0 与 compact skin（边界声明）

官方 [`client-ui-agent-team`](../../../vendor/dsh/packages/experimental/client-ui-agent-team/README.md) 的任务板覆盖 roster、owner、blockers、readiness、writeScopes、overlap warnings、description、failure；本表是**紧凑 skin**，只画任务/依赖/状态/owner。**不重复**官方已覆盖的 writeScopes/overlap/description，也不自建任务存储；若只为「可浮出的右栏」而保留本表，按 [release.md](../../../docs/release.md) §vendor 政策先记录「官方面板不能 dock」的证伪，再决定留 skin 或提上游 seam。

## 事实与证据（本轮实跑）

| 项 | 结果 | 命令/产物 |
|---|---|---|
| 依赖列 keyless | 6 tests passed（owner/subject/title、悬空、deleted） | `npx vitest run tests/client/tasks-table.spec.ts` |
| 全量 keyless | 68 files / 677 tests passed | `pnpm test` |
| 结构门禁 | ALL PASS | `pnpm verify` |
| 真挂载 | 零挂载失败 + 品牌在场 | `client-load-smoke`（重建 `lib/` 后） |
| 入口探针 | 桌面入口可见/可聚焦/焦点环/Enter 落点；窄栏入口可见；tab `aria-selected=true` | `tasks-panel-probe --fixture`（ALL PASS） |
| 视觉夹具 | [desktop.png](../../../snapshots/visual/tasks-panel/desktop.png) / [narrow.png](../../../snapshots/visual/tasks-panel/narrow.png) | `snapshots/visual/tasks-panel/` |
| 依赖列真 app | 截图中 T4 = `梦之队 CFO · T1 · CFO 经济性测算与签字线裁定…`，不再是裸 `task-1,task-3` | 上述 fixture |
| 刷新文案 | 页签头读到「投影更新」 | 看板卡 + 本卡探针 |

## 范围与排除项

- **范围内**：依赖列可读性；行 id 并入任务列；入口可发现性/键盘/落点；`已删` 死字面量；刷新显示结果；官方 parity 边界。
- **范围外**：不改任务投影（vendor）；不做任务编辑/拖拽/筛选；不写「任务板 vs 看板一致性」断言（同一函数恒真）；不重复看板卡渲染问题；不做成品台账（[新卡](../../issues/2026-10-19-deliverables-ledger.md)）。

## 验收标准（本轮已执行）

- [x] **依赖列可读性**：「T3 在等谁 / 谁在等 T3」能直接在表里答出（`owner · subject`，id 只做 title/data）；keyless + 真 app 截图。
- [x] **入口三件**：可发现性 + Tab 焦点可见 + Enter 落点 = 右栏任务板页签；`tasks-panel-probe` 断言。
- [x] **`已删`**：死映射移除；deleted 墓碑不进表；keyless 断言。
- [x] **刷新文案**：任务板页签显示「投影更新」（看板卡统一修复）。
- [x] **官方 parity**：卡面写明官方 layer 0 与 compact skin 边界；不自建任务存储。
- [x] 门禁 + `pnpm test` + `client-load-smoke` + 探针绿；记录/索引同步。

## 修订史（只追加）

- rev 1 2026-10-19：立卡；核心假设 =「同源两视图不一致即 bug」，并计划「修 owner 后重测」。
- rev 2 2026-10-19 晚：两视图同一函数，恒一致——该验收无鉴别力；BUG-026 是误报（owner 不是缺陷）；BUG-027 同族已修 `（阻塞）`。旧版「owner 列空」「修 owner 后重测」撤回。
- rev 3 2026-10-19 A 收口：当前路径重写为 now；依赖列/入口/死字面量/刷新分开；官方 parity 边界补上；验收标草案。
- rev 4 2026-10-19：实施「owner · subject + id 次要」；真 app 截图发现依赖列被独立 id 列挤到屏外 ⇒ 行 id 并入任务列、列序改为任务/依赖/状态/owner；删 `已删` 映射；入口探针 PASS；本卡归档。

## Review 指南（给 review 的人/Agent）

- **要证伪的假设**：①「入口按钮显然看得见」——探针已证桌面可见、窄栏仍可见；②「依赖列显示 id 也够用」——真用户任务是「谁在等谁」，subject 已进主位；③「表格只有改文案」——行 id 并入任务列是宽度结构变化，别把它当排版小事。
- **已被证伪、不要再证**：① 同源两视图可能不一致；② 修订号可能显示 0；③ owner 列空是缺陷。
- **口径**：以 wire + 真 app 截图为准；「两处一致」不是判据，可读性与落点才是。
