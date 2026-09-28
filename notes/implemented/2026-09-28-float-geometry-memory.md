# 浮窗几何记忆——浮出位置/大小下次还原 + 视口不足时钳入（已交付）

状态：已交付（2026-09-28 实施同日真入口验收 ALL PASS；含两处**实施期事实修正**，见下。
源卡 [_backlog/_done/_closed_plans/260928-float-geometry-memory.md](../../_backlog/_done/_closed_plans/260928-float-geometry-memory.md)）

## 问题

tab 浮出成浮窗后，「收回→再浮出」回到平台级联默认位（`float` 缺省 rect = "cascade from the
last panel"，且级联记忆只在同一客户端会话内有效）；用户期望**下次浮出在原位原大小出现**，且
浏览器窗口不够大时自动钳入视口。

**实施期事实修正 ①（原 premise 部分不成立）**：vendor 的浮窗态**本身跨页面刷新存活**——
侧栏布局持久化在 localStorage（`dsh.sidebar-right.v1.<sessionId>`，含 floats）并有服务端同步，
刷新后浮窗原样回来。所以真缺口不是「刷新即丢」，而是 **dock↔float 往返**（收回即毁浮窗 pane，
级联只记同客户端会话的"上一个浮窗"）与**刷新后的收回→再浮出**——本实现补的正是这两段。

**实施期事实修正 ②（key 选型）**：`info.tab.id` 是运行时生成 id（`tab3` 形，页签关掉重开会换
⇒ 存档孤儿化）；改用 `info.tab.contentId`（`openContent` 的去重身份，本 pack 页签 =
`sidebar://company-dag` 这类稳定 URI）。

## 方案（pack 侧，零 vendor 改动，已落地）

- **采集**（`company-tabs.tsx` PanelFrame）：浮出瞬间一次 + document 级 `pointerup`（拖拽/缩放
  手势落定）+ 收回 onClick 兜底——读 `closest('[data-dockkit-float]')` 的 boundingRect。
- **持久化**（`float-geometry.ts` 纯函数 + storage 注入）：localStorage，key =
  `dsh-company-pack/float/<contentId>`；损坏数据 fail-soft 回平台默认位。
- **还原**：浮出按钮把 `clampRect(存档, 当前视口)` 传给平台 `float(tabId, rect)`（签名本就带
  可选 rect，`ui-sidebar-right/service.ts:227/648`）；钳制 = 宽高先收缩进视口、保最小可见面积
  220×140（对齐 vendor 拖拽下限）、x/y 钳入 `[0, 视口−宽高]`。

## 验收（全部实跑通过）

- **keyless**（`tests/float-geometry.spec.ts` ×10）：clampRect 七态（原位/右下越界/负坐标/大屏
  存档/小存档/小视口/损坏值）+ 存取 roundtrip + 损坏 JSON fail-soft。
- **真入口**（无头浏览器驱动真 web app，依赖图页签四段）：① 浮出→拖拽→存档写入且 key =
  contentId 形；② 收回→再浮出 = 原位**含大小**；③ 拖远角→收回→900×700 小视口→再浮出 =
  钳入贴边（520,400 = clamp(1200,600) 精确值）；④ 收回→刷新（vendor 模块态重置）→再浮出 =
  按存档还原（收回时重采的钳入位）。
- `pnpm test` 242/242 + `pnpm verify` ALL PASS；vendor 零改动（vendor-clean 绿）。

## 输掉的方案

- **上游 ui-dockkit 持久化**：全插件受益但要走 upstream PR/升 pin 或 bundle patch 周期；平台
  `float(rect?)` 参数已够 pack 侧完整实现。留作将来 vendor 交互面批次候选（与 raise 置顶垫片
  上游修复合并）。
- **运行时 tab.id 做 key**：重开换 id ⇒ 存档孤儿化（实施期证伪，改 contentId）。
- **多显示器/工作区级记忆**：YAGNI。

## 已知边界

- localStorage 按 **origin** 隔离：同一次服务运行（含页面刷新）完整有效；**换端口重启即新
  origin、记忆清零**（`--port 0` 每次不同；固定端口 3081 的日用形态不受影响）。vendor
  自身的侧栏布局持久化同此边界——不是本实现独有缺陷。
