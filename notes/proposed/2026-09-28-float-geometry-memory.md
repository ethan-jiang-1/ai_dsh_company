# RFC：浮窗几何记忆——浮出位置/大小下次还原 + 视口不足时钳入

> 状态：待实施｜批准：用户 2026-09-28（试用反馈轮令「依次放入 propose，都要修改掉」；卡
> [_backlog/plans/260928-float-geometry-memory.md](../../_backlog/_done/_closed_plans/260928-float-geometry-memory.md) 毕业转入）

## 问题

tab 浮出成浮窗后，每次出现都在默认位、默认大小；拖好/缩好的几何**刷新即丢**
（vendor `ui-dockkit` 的 `LayoutState.floats` 纯内存，src 全树零 localStorage/sessionStorage，
2026-09-28 grep 实证）。用户期望：**下次浮出在原位原大小出现**；且浏览器窗口不够大时自动摆到
合适位置（不悬空到看不见）。

## 方案（pack 侧，零 vendor 改动）

1. **采集**：浮窗 pane 的 DOM 可由 `[data-dockkit-float]` 识别；从我们页签容器
   `closest('[data-dockkit-float]')` 读 `getBoundingClientRect`。采集时机 = 浮出后一次 +
   document 级 `pointerup`（拖拽/缩放手势结束）+ `unfloat` 前。
2. **持久化**：`localStorage`（浏览器侧 UI 偏好，非会话数据），key =
   `dsh-company-pack/float/<tabId>`，值 = `{ x, y, w, h }`。
3. **还原**：`ctx.sidebarRight.float(tabId, rect)`——**平台签名本就带可选 rect**
   （`ui-sidebar-right/src/client/service.ts:227` 接口 / `:648` 实现，2026-09-28 核实），
   传 clamp 后的存档 rect。
4. **钳入（用户担心的摆位）**：restore 前把 rect 钳进当前视口——x/y 钳入
   `[0, viewport−wh]`，并保证最小可见面积阈值（约 220×160 可见）；不够就先缩到阈值再钳。
   几何计算仅几行，复杂度本就不在此（卡里已核实：难处是引擎状态同步，而 rect 参数的存在
   把这个问题消掉了）。

## 输掉的方案

- **上游 ui-dockkit 持久化**（localStorage 按 tabId 存 floats + 初始化还原）：最干净、全插件
  受益，但要走 upstream PR + 升 pin（或 bundle patch）周期；平台 API 已带 rect 参数 ⇒ pack 侧
  即可完整实现，杀鸡用牛刀。留作将来 vendor 交互面批次（与 raise 置顶垫片上游修复合并）的候选。
- **不做**：浮窗是高频查看形态，每次回默认位已被用户点名烦。
- **多显示器/工作区级记忆**：localStorage 是浏览器 profile 内的，当前 demo 无此场景，YAGNI。

## 验收

- playwright（真 web app）：浮出→拖动+缩放→记 rect → 刷新页面 → 再浮出 ⇒ rect 与存档一致。
- 视口缩小于存档 rect ⇒ 浮出位置自动钳入视口、最小可见面积达标（不给 0 尺寸/负坐标）。
- 不触碰 vendor（`vendor-clean` 门禁保持绿）；`pnpm test` + `pnpm verify` 全绿；回归钉 = 存档
  读写与 clamp 的纯函数测试（`tests/` 新 spec）。
