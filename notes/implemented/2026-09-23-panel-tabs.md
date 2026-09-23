# 2026-09-23 · 条目收尾：面板窗口化 → 公司页签（v4）

状态：✅ 已交付并收尾（队列条目「面板窗口化」完成即离队）
条目 RFC：[implemented/2026-09-23-panel-float.md](./2026-09-23-panel-float.md)（已毕业，状态「已消化」）

## ① Motivation（外部可观察行为）

用户原话：「这个窗口是不能移动的……两个就相互盖起来了，两个都不能移动，那就有问题了。另外，
窗口不仅仅不能移动，最好是还可以 resize。如果能的话，当然 resize 的话要约束它。」

## ② 交付（A1 决定：五面板提升为平台页签）

- **五个公司页签**：看板 / 依赖图 / 在场 / 用量 / 任务板（`ctx.sidebarRightTabs` + keyed 槽
  `sidebar.right.pane.tab`，id `dsh-company-pack/<name>`）——平台级 tab 才能被 `float()` 拖出。
- **浮出/收回**：页签头「浮出」按钮 = `float(tabId)`（tabId 由 `useTabInfo()` 给）；
  移动（grip）/ 缩放（角柄，`FLOAT_MIN_SIZE 220×140` 钳制）/ 置顶 / 收回（`data-dockkit-float-dock`）
  全部平台原生，**不自造窗口管理**（D13）。
- **公司视图「浮出」**：页签条一键 = 打开对应平台页签 + `float`（`openTab` 落位对 `active()`
  有延迟 ⇒ 推迟 + 50ms×10 重试 + kind 守卫；耗尽优雅降级）。
- **任务板按钮改 launcher**：anchored 弹窗退役（`openTab('company-tasks')`）——与官方
  Agent Team 弹窗不再互盖，**原始投诉从根上消灭**。
- **数据 hook 抽取**：`use-company-data.ts` 收拢轮询/流/投影/读模型，公司视图与页签体共用；
  `options.stream` 只让需要动态流的面板订阅。
- **驾驶舱并入「在场」**：原 R5b 页签与新「在场」重复 ⇒ 合并（行可点 + 流式动态保留），
  `CompanyPane.tsx` 删除（净 −136 行）。
- **wire / config / API 影响：零**（只动 client 面）。

## ③ 实际跑过的验证

| 检查 | 结果 |
|---|---|
| `pnpm verify` / `pnpm test` | ALL PASS / **91/91** |
| pack `tsc` + tsdown | 通过（client bundle 210.63 kB） |
| `node scripts/client-load-smoke.mjs` | ALL PASS |
| `node scripts/replay-smoke.mjs --ui --scenario r2-motion` | ALL PASS（在场端到端锚点更新：guide `/^在场/`） |
| `node scripts/replay-smoke.mjs --ui --scenario r3-delegation` | ALL PASS（委派卡金样零 diff——头部改动不进 centerCol aria） |
| 真页面 S2/S4（playwright + r2 重放） | 点「浮出」→ `[data-dockkit-float]` 在场 + **grip/resize/dock 三件套全真** + 内容正确；点 dock → 浮窗消失（收回）✓ |
| 真页面 S3 | anchored dialog **不在场** + 右栏页签体 = "任务板" ✓ |
| console | 全程 **0 错误** |

## ④ 环境状态（下条会话判断"哪些已就绪"只读这里）

- 观察窗（重放，无 key）在 **3081**；条目 ① 收尾时重起过一个（token 随 boot 变化）——
  **本轮未重起**（bundle 已重建但窗口是旧会话进程），下条会话要用就重起（`node /tmp/ux-serve.mjs`）。
- 一次性脚本在 `/tmp`：`ux-company.mjs`（含 S2/S3/S4 验收探针）、`ux-serve.mjs`、`ux-empty.mjs`、`ux-shots.mjs`。
- 截图证据：`dev/harness-home/ux-shots/`（gitignored，含 08-sidebar-guide / 09-sidebar-board /
  10-float-panel / 11-after-dock / tasks-tab-opened / view-float）。
- **未 push**（push 走 `ssh.github.com:443`，由人推）。

## ⑤ 条目去向与打磨点销账

| 项 | 归宿 |
|---|---|
| RFC「面板窗口化」 | 毕业 → 本目录（状态「已消化」） |
| 停靠 pane 上限 2 / 布局仅内存（刷新即收） | 平台事实，记录在案（不改） |
| `openTab` → `active()` 延迟 | **已修**（推迟 + 重试 + kind 守卫）；若上游将来给 `openTab` 返回 TabId，可简化 |
| 窄栏下五页签 chips 收缩 | 平台已处理（chips 有 80px 下限 + 滚动），视觉细修归「视觉打磨」条目 |
