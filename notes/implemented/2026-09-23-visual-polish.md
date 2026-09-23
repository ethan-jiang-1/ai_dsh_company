# 2026-09-23 · 条目收尾：视觉打磨（公司视图 / 公司页签 / 任务板 / 委派卡）

状态：✅ 已交付并收尾（队列条目「视觉打磨」完成即离队）
出处：[implemented/2026-09-23-company-view.md](./2026-09-23-company-view.md) ⑤（用户走查后登记）

## ① Motivation（外部可观察行为）

用户原话：「**视觉上，我们回头再打磨**」+「不错，这个超出了我的预期，尤其是结构上」——
四个面（公司视图 / 五个公司页签 / 任务板 / 委派卡）在**浅色·深色、宽窗·窄栏**下无排版瑕疵，
且不留"拿文字当图标"这类旧痕迹。

## ② 交付

- **★ 退役**：lead 标记从文字星号 → 官方 `Tag tone="neutral"`「Lead」（与既有 tooltip
  「进入 CEO（Lead）空间」同词汇；官方 team UI 不标 lead，无现成符号可抄）。
- **内联样式收口**：6 处 margin 字面量 → `styles.ts` 类；DAG 边的颜色/线宽/dash 也从内联搬进 CSS。
- **空态/错误态统一**：新增 `StateNote`（**一处定义**，四面板 + 页签体共用）+ `LOADING_NOTE`；
  「（空）」「还没有共享任务」等各写各的收敛为统一句式。
- **对比度修正**（本条目唯一"真问题"）：DAG **待办边**原用 `border-l3`（浅色下 1.47，几乎看不见）
  → 改 `label-tertiary`（3.71 / 8.54）；**已走通边**原用 `success-primary`（深浅同值 green-500，
  浅色下仅 2.28 < 3:1）→ 改 `color-mix(成功绿 70%, 标签墨色)`（**4.14 / 9.93**，主题自适应、
  零字面色，带不支持时的令牌回退）。

## ③ 实际跑过的验证

| 检查 | 结果 |
|---|---|
| `pnpm verify` / `pnpm test` | ALL PASS / **91/91** |
| pack `tsc` + tsdown | 通过（client bundle 214.21 kB） |
| `node scripts/client-load-smoke.mjs` | ALL PASS |
| `node scripts/replay-smoke.mjs --ui --scenario r2-motion` | ALL PASS（在场端到端：5 行 / 列头 / 点行进成员空间） |
| `node scripts/replay-smoke.mjs --ui --scenario r3-delegation` | ALL PASS（委派卡金样零 diff） |
| **深色机器核对**（computed style，读不了截图） | 元素随主题翻转 `rgb(15,17,21) ↔ rgb(249,250,251)`；对比度 **17.4 / 15.0** ✓ |
| **窄窗 900×800 核对** | 无页面级横向溢出；容器自适应（视图 896→680、卡 265→208）；页签 chips 不裁切 ✓ |
| **DAG 边对比度复测** | 浅色 `rgb(28,143,72)` = **4.14** / 深色 `rgb(98,213,141)` = **9.93**（原 1.47 / 2.28） |
| 硬编码残留扫描 | 颜色零硬编码；内联尺寸字面量零残留；`★` 零残留 ✓ |

## ④ 环境状态（下条会话判断"哪些已就绪"只读这里）

- 观察窗：重放窗在 **3085**（`OBSERVE_PORT=3085 node /tmp/ux-serve.mjs`）；**实时窗在 3084**
  （`pnpm dsh web -- --port 3084`，走真 key，用户试过一场动议）。两窗都还开着，用完请关。
- 一次性脚本：`/tmp/ux-polish-probe.mjs`（深色/窄窗核对）、`ux-polish-probe2.mjs`（在场板 + DAG 边色）、
  `ux-serve.mjs`（重放窗，已修 realpath）、`ux-company.mjs`（S2–S4 验收）、`ux-path.mjs`（用户路径）。
- **用户试用的产物在排练场**（`dev/rehearsal-workspace/`，gitignored）：`deliverables/` 与
  `kb/*/journal/` 有他跑那场动议的痕迹。
- **未 push**（push 走 `ssh.github.com:443`，由人推）。

## ⑤ 条目去向与打磨点销账

| 项 | 归宿 |
|---|---|
| 用户试用时的"不顺手点" | **本轮未收到**（用户批准按 1–4 做）；清单留口，后续发现即登记 |
| 排练场纪要被 `md-newline` 抓红（**第二次**） | → 队列 **整治转待办**：公司手册加"文件以单个换行结尾"一行（根治） |
| 平台 UI 的坑（工作区选择 `Edit path`、侧栏会话列表不同源） | 已写 runbook（`docs/demo.md` 前置 + 条目 ② 收尾 Note），vendor 只读不改 |
| 深色/窄栏的结构性问题 | **未发现**（机器核对全绿） |
