# 推敲：右栏停靠分栏预算 2 → 4（用户最多需要 4 个面板）

> 状态：推敲中｜毕业门判断 = 待定（先试用「2 停靠 + N 浮出」是否够用，够则消化、不够则推 upstream）｜下一步 = 用户点名；若推 = upstream PR（改动极小，事实已核清如下）

## 背景 / 触发

用户试用反馈（2026-09-28，浮窗几何记忆同轮）：看到「two panel is the limit」，问能否更多——
最多需要 4 个面板。

## 已知（2026-09-28 vendor 源码核实，钉版 dsh-v0.1.7-rc.2）

- **引擎容量本来就是 4**：`ui-dockkit/engine/constraints.ts:10`
  `MAX_DOCK_PANES = 4`（注释："V1 caps the docked grid at four panes; **floating panes do
  not count**"）；`canSplit` = `dockPaneCount < MAX_DOCK_PANES`。
- **用户看到的 2 是 sidebar-right 服务层策略**（硬编码，无配置旋钮）：
  `ui-sidebar-right/service.ts:426`（split gate `dockPaneIds >= 2` 拒绝）与 `:605`
  （`splitBlock` 返回 'budget' 提示）。
- **浮窗不占名额、无数量上限**（引擎无 MAX_FLOAT 常量）⇒ 「2 停靠 + N 浮出」今天即可用。
- `cordis.patch.yml` 的 `- id:` 替换是**换服务注册行**——要改那行 `< 2` 得整个替换
  sidebar-right 服务（surface 大），bundle patch 路线不经济。

## 候选与取舍

- **A 现状**：2 停靠 + N 浮出（零改动，今天可用；浮窗已带几何记忆，摆位快）。
- **B upstream PR**：把服务层两处预算对齐引擎常量 `MAX_DOCK_PANES`（`:426`/`:605`）——
  引擎本按 4 设计，是最理直气壮的小 upstream；代价 = merge 周期 + `sync-dsh.mjs` 升 pin。
- **C bundle patch / 自建**：替换整个 sidebar-right 服务，surface 大，否。

## 毕业门

- **该不该**：用户试用 A 后裁决「2+N 够不够」；不够 ⇒ B。
- **何时**：用户点名（D32）。
- **次序**：若推 B，可与浮窗 raise 置顶垫片等 vendor 交互面改进合并成一次 upstream 批次。
- **放弃线**：A 实测够用 ⇒ 消化进 pack README 已知限制（「停靠分栏 ≤2 为服务层策略，浮窗
  无限；需更多走 upstream」）。
