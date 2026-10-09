# 推敲：浮窗几何记忆（浮出位置/大小下次还原 + 视口不足时的摆位）

> 状态：已毕业（2026-09-28，用户批准转入 RFC）｜去向 = notes/implemented/2026-09-28-float-geometry-memory.md（已删，历史在 git）｜原毕业门判断 = 待定——**B 案前置已核实：平台 `float(tabId, rect?)` 本就带可选 rect（service.ts:227/648），pack 侧零 vendor 改动可行**

## 背景 / 触发

用户试用反馈（2026-09-28，DAG 缩放修复同轮提出）：tab 浮出成浮窗后，位置/大小希望**下次浮出时在原位出现**（现状 = 每次默认位，刷新即丢）；并担心浏览器窗口不够大时需要「算一算最合适的位置」——若复杂先挂 plans 推敲，用户令。

## 已知与未决

已核实：

- 浮窗几何活在 vendor `ui-dockkit` 的内存 `LayoutState.floats`（`FloatRect` per pane；`engine/tree.ts`
  `floatRect`、`FloatLayer.tsx` 绘制与拖拽 intent）——**src 全树零 localStorage/sessionStorage**
  （2026-09-28 grep），刷新即丢，vendor 侧本无持久化。
- pack 侧浮出入口 = `ctx.sidebarRight.float(tabId)`（`company-tabs.tsx`），签名不带 rect。
- vendor 交互面既有欠账不止一处：浮窗 raise 置顶已靠 pack CSS 垫片顶着（pack README 已知限制 +
  suspended 池有行）。

未决：

- **B 案前置**：`moveFloat`/`resizeFloat` intents 能否从 pack 侧驱动；`float(tabId)` 后立刻 move
  是否可见抖动。
- 持久化 key：tabId 还是页签语义 id（收回再浮出，paneId 会不会变）。
- 拖拽中 vendor 是否已把几何 clamp 在视口内（`measure.ts`/`pointer.ts` 待读）；restore 时的 clamp
  规则谁定。

## 候选与取舍

- **A 上游 ui-dockkit 持久化**：localStorage 按 tabId 存 floats + 初始化还原 + 视口 clamp。最干净、
  全插件受益；代价 = upstream PR + 升 pin 周期，或 bundle patch（每次升 pin 的同步负担）。
- **B pack 侧快照回放**：监听 `[data-dockkit-float]` 的 rect 存 pack 自己的存储，浮出后回放。零
  vendor 改动；代价 = 与引擎状态博弈（见未决①），vendor 升级易碎。
- **C 不做**：浮窗定位 = 临时查看形态，默认位可接受。
- 用户担心的**摆位 clamp 本身不难**：`min(x, vw−w)` 优先靠右下 + 最小可见面积阈值即可；复杂度在
  「与引擎的状态同步」，不在几何计算——不构成否决理由。

## 毕业门

- **该不该**：先答 B 前置（intents 可否外部驱动 + 是否抖动）；答案决定候选池剩 A/B 还是只剩 A/C。
- **何时**：用户再次被浮窗默认位烦到，或 demo 需要固定布局。
- **次序**：若走 A，与 raise 置顶垫片的上游修复合并成一次 upstream 批次。
- **放弃线**：浮窗在产品里始终是临时态且默认位实测不碍事 ⇒ C，卡消化进 pack README 已知限制行。
