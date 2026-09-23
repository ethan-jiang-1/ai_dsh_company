# 2026-09-23 · 条目收尾：demo 可视表达 → 公司视图 v1

状态：✅ 已交付并收尾（队列条目「demo 可视表达」完成即离队）
条目 RFC：[implemented/2026-09-23-demo-visual-expression.md](./2026-09-23-demo-visual-expression.md)（已毕业，状态「已消化」）
研究依据：[implemented/2026-09-23-visual-expression-for-demo.md](./2026-09-23-visual-expression-for-demo.md)

## ① Motivation（外部可观察行为）

**一场 demo 走查，观众不讲解也能看懂机制**——谁依赖谁、活到哪一步、活怎么流转、成品从哪来。

## ② 交付

- **公司视图**（`conversation.view` 第三页签，id `dsh-company-pack/company`，标签「公司」）：四个面板
  **看板 / 依赖图 / 在场 / 用量**。依赖图自绘 SVG（最长路径分层 = 关键路径；成环安全：层级钳在 N-1）；
  协作动态走 `session/follow` **流式**（快照给历史 ⇒ 打开即见全程，不再是「暂无动态」）；
  用量走 `useProjection('tokenUsage'/'sessionStats')`——**只做令牌不做美元**（wire 无金额字段）。
- **皮肤**：四个旧组件令牌化（硬编码色清零 / emoji → 官方图标 / 原生 `<button>` → `Button` /
  状态 → `StateDot`·`Tag`）；**团队工具卡**（`spawn_teammate`·`send_message`·`team_task_*` 等在
  对话流里渲染成公司语义卡）；修任务板弹窗窄列竖排与驾驶舱列头折行。
- **动效层**：零依赖纯 CSS（边画线 / 节点入场 / 动态滑入 / 令牌滚动）+ `prefers-reduced-motion` 回退。
- **命名**（`docs/design/30-ui-demo.md` §5 命名表）：公司视图 / 公司驾驶舱（旧「Company 驾驶舱」改名）/
  四面板（看板·依赖图·在场·用量）。
- **wire / config / API 影响：零**——只动 client 面（`packages/company-pack/src/client/**` 与 `src/lib/*`）；
  新增两个 **type-only** devDeps（`dsh-session-stats` / `dsh-token-meter`）；不动 preset、不动会话日志、
  不改 host 行 ⇒ **旧会话不受影响**。

## ③ 实际跑过的验证

| 检查 | 结果 |
|---|---|
| `pnpm test` | **91/91**（新增 board 10 / dag 10 / budget 4 / team-tool-card 9 / motion-css 3） |
| `pnpm verify` | **ALL PASS**（16 项；doc-budget 108/115、132/145、439/440） |
| pack `tsc -p packages/company-pack/tsconfig.json` | 通过 |
| `node scripts/client-load-smoke.mjs` | **ALL PASS**（真浏览器零挂载失败 + 品牌槽在场） |
| `node scripts/replay-smoke.mjs --refresh-ui --ui --scenario r3-delegation` | **ALL PASS**（委派卡金样**同 diff 更新**；可访问名断言保持） |
| `node scripts/replay-smoke.mjs --ui --scenario r2-motion` | **ALL PASS**（驾驶舱端到端：5 行在场板 / 「团队内状态」列头 / 点行进成员空间） |
| 真页面走查（r2-motion 重放 + playwright，`/tmp/ux-company.mjs`） | 四面板全渲染 + **console 错误 0**；证据截图 18 张 |
| 动效机器判据（真页面 `getComputedStyle`） | 常规 = `wk-edge-draw` / `wk-node-in` / `wk-slide-in`；`emulateMedia({reducedMotion:'reduce'})` 下三者全 `none` |
| 拖柄遮挡修复判据（真页面几何） | 视图宽度 1390→**896**（= 会话内容列宽）；四页签 `elementFromPoint` 全部命中 `BUTTON.wk-tab` |
| 空态健壮性（新会话无团队） | 平台行为：空白会话不渲染视图页签条（`全部页签 = []`，Chat/Trajectory 亦无）⇒ **非本条目缺陷** |
| 用户验收（人工轴） | **通过**——用户原话「不错，这个超出了我的预期，尤其是结构上」 |

## ④ 环境状态（下条会话判断"哪些已就绪"只读这里）

- 观察窗（重放组合、**无 key**）起在 **3081**（3080 是本 GUI）；收尾后用改名后的 bundle 重起，
  URL/token 随 boot 变化——以收尾后给的新 URL 为准；**用完请关掉**（后台 job）。
- 截图证据：`dev/harness-home/ux-shots/`（**gitignored**，18 张：公司视图四面板 / 任务板 / 驾驶舱 /
  委派卡 / 走查分镜）。
- 一次性脚本在 `/tmp`：`ux-company.mjs`（公司视图截图 + 动效判据）、`ux-shots.mjs`（委派卡/驾驶舱）、
  `ux-empty.mjs`（空态检查）、`ux-serve.mjs`（常驻观察窗）。
- **未 push**（R6 环境状态：push 走 `ssh.github.com:443`，由人推）。

## ⑤ 条目去向与打磨点销账

| 项 | 归宿 |
|---|---|
| RFC「demo 可视表达」 | 毕业 → [implemented/2026-09-23-demo-visual-expression.md](./2026-09-23-demo-visual-expression.md)（状态「已消化」） |
| 原「UX 打磨」提案 | 已被本条目吸收并毕业（[implemented/2026-09-23-ux-polish.md](./2026-09-23-ux-polish.md)） |
| **视觉细修**（用户：「视觉上，我们回头再打磨」） | → 队列新条目 **⏸ 视觉打磨** |
| 面板可移动 / 可缩放（依赖图、在场不能移动） | → 队列 **⏸ 面板窗口化**（首要决定 = 四面板是否提升为平台页签） |
| 命名统一 | **本条目内解决**（design/30 §5 命名表） |
| 平台行为：空白会话不渲染视图页签条 | 记录在案（非缺陷，不改） |
