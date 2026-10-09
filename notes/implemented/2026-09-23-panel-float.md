# 面板窗口化（可移动 · 可缩放 · 最小尺寸约束）

状态：已消化（2026-09-23 交付并收尾；收尾 Note = 2026-09-23-panel-tabs.md（已删，历史在 git））
类型：feature（原队列序 1——条目 ① 收尾后递补；完成即离队）
研究依据：implemented/2026-09-23-visual-expression-for-demo.md（已删，历史在 git） §1.4

## 问题

- 我们的任务板弹窗是 `position:absolute; right:0` 的 anchored 浮层（`packages/company-pack/src/client/TasksPanel.tsx:76-96`），
  从头部按钮往左铺、盖住会话正文；窄列还导致任务标题竖排。
- 官方 Agent Team 面板同样是 anchored 浮层（`position:absolute; left:0; z-index:110`，
  `vendor/dsh/packages/experimental/client-ui-agent-team/src/client/TeamAction.module.css:42-49`）——
  **vendor 只读，改不了**。
- 结果：两个面板互盖，**都不能移动**；用户要求可移动，最好可缩放，且缩放要有**最小尺寸约束**（否则会缩坏）。

## 提案

### 首要设计决定（2026-09-23 用户现场提问带出）

用户看观察窗时问：「看板 / 依赖图 / 在场 / 用量」**这叫什么东西**——答案是：**平台里没有名分**，
它们是条目 ① 里我在 `CompanyView.tsx` 自造的一排 `<button role="tab">` + `useState` 条件渲染
（组件内部开关：不可注册、不可寻址、**不可移动**）。按 D13「优先用现成载体、不自造」，这本该先问。
两条路：

- **(a) 把四个面板各提升为平台级右栏页签类型**（`ctx.sidebarRightTabs.register` + keyed 槽
  `sidebar.right.pane.tab`）⇒ 每个都能 `ctx.sidebarRight.float(tabId)` 拖成浮窗，也能被 split。
  **倾向此路**：正是用户要的"可移动"，且不再自造子页签。
- (b) 保留整页公司视图，视图内嵌 dockkit surface 做分栏/浮出——能力更全，但要在我们的组件里
  自建 dockkit surface 接线（风险与工作量都高，且 dockkit 自述 internal engine）。

本条开工时先钉这个决定，再谈浮窗细节。

### 浮窗本体

- **用平台原生浮窗，不自造窗口管理**（D13）：`ctx.sidebarRight.float(tabId, rect?)` 把已停靠页签拽出成浮动面板，
  `dock(paneId)` 收回（服务面公开 10 个操作之一，`ui-sidebar-right/src/client/service.ts:195,200`）。
- 手势与约束由 `ui-dockkit` 提供：header grip 拖动移动、右下角缩放、**`FLOAT_MIN_SIZE = 220×140` 钳制**、
  点击置顶、默认浮出 `380×300`（研究 §1.4 已逐行核实）。
- 落点：公司驾驶舱页签（`sidebar.right.pane.tab`）+ 任务板。任务板从 anchored 弹窗改为
  「右栏页签 + 浮出按钮」，或直接浮出。
- **死局解除**：官方弹窗仍不可移动（vendor 只读），但我们的面板可拖开、可置顶、可缩放到合适尺寸。

## Alternatives（输掉的方案留尸）

- **自造拖拽/缩放窗口管理**：**否决**——平台已有成熟实现（含最小尺寸与置顶语义），自造违反 D13。
- **改官方 Agent Team 面板**：**否决**——`vendor/` 只读铁律（`pnpm verify` 强制）。
- **只做互斥**（开一个自动关另一个）：**否决**——官方那侧我们无权关闭，且没解决"想并看"的需求。

## 验收

- 面板可拖动移动；右下角可缩放；**缩到最小被 220×140 钳制**（不出现塌陷）；点击置顶；可 `dock` 收回停靠。
- `node scripts/client-load-smoke.mjs` 零挂载失败；`node scripts/replay-smoke.mjs --ui --scenario r2-motion` 金样更新。
- 实测项：浮窗（z 60，body portal）与 Agent Team 弹窗（z 110）的**实际压层**——浏览器实测，结论写进收尾 Note
  （研究 §1.4 标注为源码不足以定论）。

## 风险与未决

- `ui-dockkit` 自述 "internal engine"（README:14）：本条**只用受支持的 `ctx.sidebarRight` 操作面**（`float`/`dock`），
  不碰内部导出（`openTabIn`/`bind`/`_undo` 或直接 import 引擎）。
- shipped Sidebar 把 docked pane 硬限 2 个；布局状态仅内存、刷新即收（可接受；若成问题记进收尾 Note）。
