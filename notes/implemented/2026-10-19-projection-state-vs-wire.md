# 投影 state ≠ wire 视图：三张缺陷卡复核与依赖徽章门槛修复

状态：implemented（2026-10-19；起因 = 用户点名"review 未提交的三张 BUG 卡并修掉"）

## 决定

用户交来三张未提交的缺陷卡（BUG-025/026/027），要求按流程 review 后修复。复核结论：**三张卡的前提全部
建立在同一个取法错误上**——复现脚本读 `session_projcache` 里的 `record.rows.agentTeam.val.tasks`，
那是投影的 **state**（`TeamTaskSnapshot`），不是浏览器收到的 **wire 视图**（`TeamTaskView`）。

据此分别处置：

1. **BUG-025（台账读错数据面）——成立，已修**。面板读 `kb/motion-ledger.md`（40 行动议），调研与四卡把
   「993 份成品」记在台账名下。修法 = 订正文档口径 + 补一条钉住数据面接线的判据。
2. **BUG-026（owner 全线缺失）——误报，已结**。wire 视图上 `ownerName` 由 host 侧
   `projectTaskView` 从 `ownerId` 解析（含 lead 特判），到客户端已经解好。实测 wire 侧 273/273 齐全、
   解不出 0；我们的真读模型解析出 344/379（其余 35 张投影里真无 owner）。**代码无需改动，vendor pin 不动。**
3. **BUG-027（依赖已就绪假信号）——症状真、根因假，已按真根因修复**。卡称
   `task.ready ?? readyOf(...)` 把官方语义放宽——**该回落不可达**：官方在非 pending 上给的是 `false`
   这个**有效值**，`??` 不触发。真缺陷在渲染层：`company-panels.tsx` 的徽章门槛只看
   `card.blockedBy.length > 0`，不看 status。真数据 147 枚徽章里 129 枚挂在已完成的卡上、
   2 枚挂在进行中的卡上，全是「等 …」噪声。

修复 = 三处小改 + 四条判据：

- `company-panels.tsx`：徽章门槛加 `column.status === 'pending'`（噪声 131 → 0，6 枚真「依赖已就绪」保留）。
- `board.ts`：回落值补 pending 半句（当前不可达，但投影改版去掉 `ready` 时就是同款陷阱）；
  `readyOf` 注释订正——它同义的是 `taskReady`（只查依赖），**不是** `ready`（依赖检查 ∧ 自己是 pending）。
- `presence.ts`：注释补「别去 projcache 找 ownerName」。
- `TasksPanel.tsx`：**同族第二处**——任务板表格的「（阻塞）」也只看 `task.ready === false`，
  真 wire 实测 298 行里 280 行挂该标记、其中 273 行非 pending。同样加 `status === 'pending'` 门槛。
- 判据：`tests/company/board.spec.ts`（真 wire 形状夹具）+ `tests/client/board-panel.spec.ts`（渲染面）
  + `tests/client/tasks-table.spec.ts`（表格「（阻塞）」）+ `tests/client/client-face.spec.ts`（台账数据面接线）。

## 输掉的方案

- **BUG-026 走"提上游升 pin 让 schema 带 ownerName"**（卡上的首选正路）：基于"schema 没有 ownerName"这个
  **错误前提**。实测 `projection.ts:328` 就是 `ownerName: z.string().optional()`。升 pin 会白动一次基座。
- **BUG-026 走"读 `session/follow` 事件流重建 owner 表"**（卡上正路三）：代价是每块面板多开一条流，
  且只有当前会话的流。既然 wire 已经带 owner，这条路纯属自找。
- **BUG-027 按卡上根因改 `??` 为显式 pending 判断**：技术上等价（因为回落不可达），但会把注意力留在
  一个不存在的 bug 上，而真正的噪声源（渲染门槛）继续挂着。**放弃修根因、改修症状源**。
- **BUG-027 顺手修依赖图的 `statusBadge`**（in_progress 也吐 `wk-dag-ready`）：同族但不同处，
  搭车会让本次 diff 的验收面变糊。留缺口，记在卡上。
- **给三个面板排"谁先做"**：本轮的证据把父卡的排序论据打掉了（三条里两条撤回），但重排优先级是产品判断，
  不是缺陷修复。父卡只订正事实，不替用户重排。

## 后果

- 三张卡全部离场：BUG-025/027 → `_archive/fixed_bugs/`，BUG-026 → `_archive/settled_issues/`（误报出口，
  照 BUG-023 先例——章程没有"误报"枚举，用 `已修` 会失真）。`_backlog/bugs/` 活跃清单归零。
- 父卡与三张深挖卡、两份调研、research README 里继承的"owner 全缺 / 131 张假就绪"全部打上作废标记。
  **被证伪的假设留在原地**（根因纪律），不抹掉——它们现在是"读错层"这个失败类的样本。
- 新失败类入库：**复现脚本必须指到消费者真正读的那一层**。BUG-025 量盘上有什么、BUG-026/027 量缓存存了
  什么，都没量"面板显示什么"。三张卡因此指向三个不同方向，而真相是面板全都对。

## 验证

真跑过的命令与形态（红 → 还原 → 绿，三步都留了证）：

- `npx vitest run tests/company/board.spec.ts tests/client/board-panel.spec.ts` ⇒ 22 passed。
  **红配方**：把 `board.ts` 的 `ready: task.ready ?? (status === 'pending' && readyOf(...))` 改回
  `ready: task.ready ?? readyOf(...)` ⇒ **2 failed**；把 `company-panels.tsx` 的徽章门槛改回无条件
  `card.blockedBy.length > 0` ⇒ **2 failed**。两处各自还原后复绿。
- `npx vitest run tests/client/client-face.spec.ts` ⇒ 5 passed。**红配方**：把 `index.ts` 的
  `readLedger` 路径从 `'kb/motion-ledger.md'` 改成 `'kb/deliverables-index.md'` ⇒ **1 failed**。
- `pnpm test` ⇒ **67 files / 665 tests passed**。
- `pnpm verify` ⇒ **ALL PASS**（`guard-red-record` ×18 条守卫声明对到真卡 + 自带红配方）。
- 真数据复核（只读、不需要 key）：复刻 vendor `projectTaskView` + `buildTeamProjection` 到
  `runtime/harness-home/storages/session_projcache/sessions/*.json` 的 `ver === 4` 行 ⇒
  61 板 / 298 任务 / ownerId 273 / wire ownerName **273** / 解不出 **0** / `ready` 非 pending **0**。
  真读模型吃这批 wire ⇒ 379 行 / 已解析 owner 344 / `readyOnNonPending` **0**。

**未验（如实）**：真浏览器未开——本轮口径 = 读码 + 真数据 + keyless 静态渲染。DOM 层的视觉走查
（徽章在真页面上的位置/密度）归"看板 + 依赖图"深挖卡，本 Note 不声称那部分。
