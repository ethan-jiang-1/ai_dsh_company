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

- 观察窗（重放，无 key）：**给人现场试用时的三个坑**（2026-09-23 实测，都已踩过）：
  1. **`mkdtemp` 必须取 realpath**：macOS 的 `/var/folders/…` 是 `/private/var/folders/…` 的符号链接，
     而界面目录选择器返回 `/private/…`、客户端把它规范化 ⇒ 用 `/var/…` 建会话会让它们落进**另一个
     工作区分组**（侧栏永远看不到）。`/tmp/ux-serve.mjs` 已修（`realpathSync(mkdtempSync(...))`）。
  2. **侧栏会话列表与 `session/list` 不同源**：RPC 返回全部 6 条（含「动议（R2 正式场）」），
     但界面侧栏只列客户端自己创建的会话 ⇒ **重放会话要用侧栏放大镜（Search sessions）搜索进入**。
  3. **工作区路径要手粘**：对话框默认是目录浏览器，**必须先点 `Edit path`** 才出现粘贴框（已写进
     `docs/demo.md` 前置第 3 条）。
- 当前窗口：**3083**（`OBSERVE_PORT=3083 node /tmp/ux-serve.mjs`），工作区 `/private/var/folders/…/dsh-observe-r2-motion-ZCkbT1`。
- 一次性脚本在 `/tmp`：`ux-company.mjs`（S2/S3/S4 验收探针）、`ux-serve.mjs`（常驻观察窗）、
  `ux-path.mjs` / `ux-priv.mjs` / `ux-where.mjs` / `ux-reload.mjs`（用户路径与界面结构探针）。
- 截图证据：`dev/harness-home/ux-shots/`（gitignored）。
- **未 push**（push 走 `ssh.github.com:443`，由人推）。

## ⑤ 条目去向与打磨点销账

| 项 | 归宿 |
|---|---|
| RFC「面板窗口化」 | 毕业 → 本目录（状态「已消化」） |
| 停靠 pane 上限 2 / 布局仅内存（刷新即收） | 平台事实，记录在案（不改） |
| `openTab` → `active()` 延迟 | **已修**（推迟 + 重试 + kind 守卫）；若上游将来给 `openTab` 返回 TabId，可简化 |
| 窄栏下五页签 chips 收缩 | 平台已处理（chips 有 80px 下限 + 滚动），视觉细修归「视觉打磨」条目 |
