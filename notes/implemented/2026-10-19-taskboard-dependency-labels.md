# 任务板依赖列：人读优先，id 降为次要（2026-10-19）

状态：implemented（2026-10-19；任务板卡收口）

## 决定

任务板表格（[卡](../../_backlog/_archive/settled_issues/2026-10-19-taskboard-table-ux-deep-dive.md)）的四件决定：

1. **依赖列 = `owner · subject` 为主体**。每项显示「谁 · 等什么」；`task-N` 只做 `title` 与 `data-dep-id`，不再占可见列宽。理由：人问的是「谁在等什么」，`task-N` 是机器键；subject 只进 `title` 是 hover-only，触屏/键盘读不到。
2. **行 id 并入任务列**。原 `id` 列去掉，`task-1@3` 灰字放在 subject 前；列序改为 任务 / 依赖 / 状态 / owner。真 app 截图发现独立 id 列把依赖列挤到屏外——合并后依赖列回到首屏可见。
3. **`已删` 死字面量移除**。`TasksTableView` 改走 `tasksFromTeamView`（过滤 deleted、owner 显示名、revision 归一），`STATUS_LABEL` 不再留 `deleted` 映射；deleted 墓碑不进表。
4. **入口可发现性进真浏览器**。新 `tasks-panel-probe` 验证桌面入口可见、可聚焦、Tab/Shift+Tab 在序里、焦点环可见、Enter 打开右栏任务板页签；窄栏 390 入口仍可见。

## 输掉的方案

- **`owner · id` 当默认**：最紧凑，但仍要二次查 subject；`title` 是 hover-only，触屏/键盘读不到。只留作退路。
- **subject 只进 `title`、可见只写 id**：同上，且把「谁在等什么」的核心信息藏起来。
- **保留独立 id 列**：真 app 1440 截图实测依赖列被挤到 pane 右侧之外，必须横向滚动才看到；与「依赖列可读」目标冲突。
- **真显示 deleted 墓碑（取消过滤）**：会把已删任务重新引入表格与 `（阻塞）` 标记，属新视图，不是本轮。
- **在表内做 `等 N 项` 折叠**：task-7 有 7 个依赖时行高仍大，但折叠交互属新功能；本轮先保证全量可读，后续按实测再议。

## 后果

- 表格列从 5 列减到 4 列；依赖列在桌面 650px 右栏首屏可见，多依赖自动换行、subject 2 行钳制（全量文本在 DOM）。
- `tests/client/tasks-table.spec.ts` 从 3 条扩到 6 条：依赖 owner/subject/title、悬空 `id（未找到）`、deleted 不进表 + 死映射移除。
- 新 `tasks-panel-probe` 把入口可见性/键盘/落点变成可复跑证据；视觉夹具在 [tasks-panel/desktop.png](../../snapshots/visual/tasks-panel/desktop.png) 与 [narrow.png](../../snapshots/visual/tasks-panel/narrow.png)。
- **未解**：窄栏 390 下表格仍需横向滚动（依赖列在第二列，先看到）；不做任务编辑/筛选；不替换官方 team 面板。

## 验证

真跑过的命令与红/绿形态：

- **依赖列红**：把 `DependencyLabel` 临时改成 `return <span className="wk-dep">{id}</span>` ⇒ `npx vitest run tests/client/tasks-table.spec.ts` **1 failed / 5 passed**；还原 ⇒ **6 passed**。
- **`已删` 红**：把 `deleted: '已删'` 加回 `STATUS_LABEL` ⇒ 同 spec **1 failed / 5 passed**；还原 ⇒ **6 passed**。
- `pnpm test` ⇒ **68 files / 677 tests passed**。
- `pnpm verify` ⇒ **ALL PASS**。
- pack 双面构建：`node ./node_modules/typescript/bin/tsc -b packages/company-pack && (cd packages/company-pack && ../../node_modules/.bin/tsdown)` ⇒ 成功；真 app 读的是 `lib/client.js`。
- `source run/env.sh && node checks/smoke/client-load-smoke.mjs` ⇒ **ALL PASS**（重建后复跑）。
- `source run/env.sh && node probes/browser-visual/tasks-panel-probe.mjs --fixture` ⇒ **ALL PASS**：桌面入口 `{"x":738,"y":11,"width":76,"height":28}`；`Tab` 离开 / `Shift+Tab` 回焦、`outline: auto 2px`；Enter 后 `.wk-pane-head` 标题 = 任务板，`tabCount=1`、`aria-selected=true`；窄栏 390 入口可见。
- 真 app 截图：T4 的依赖列 = `梦之队 CFO · T1 · CFO 经济性测算与签字线裁定…`，不再是裸 `task-1,task-3`。

## 边界

- 只证明：桌面/窄栏入口可见、焦点与落点、依赖列的人读形态、deleted 过滤与死映射移除、空/悬空依赖的显示。
- 不证明：窄栏 390 的完整列可读性（需横向滚动）、task-7 这类多依赖行的高度是否可接受、任务编辑/筛选、官方 panel 的 writeScopes/overlap 覆盖。
