# 看板拆穿"假就绪"：声明 vs 板面的依赖分叉判据

状态：implemented（2026-10-13；起因 = 用户追问"是不是个 bug？是个 bug 你就得修"）

## 决定

看板不再只信板面 `blockedBy`——它同时读**任务文本里声明的依赖**（`依赖 T1、T2` 这类纸面号，
写在 subject/description 里），两者分叉时在卡上直接标出来：

- `lib/board.ts` 新增 `declaredDependencyLabels()`（抽纸面号，**`不依赖 T1` 不算**）、
  `paperToTaskId()`（subject 形如 `T1 · …` ⇒ 纸面号→板面 id）、`dependencyDrift()`（逐任务比对）、
  `driftLabel()`（文案唯一家）；`TaskRow` 增加 `description`，`BoardCard` 增加 `drift`。
- `client/company-panels.tsx` 的看板卡脚多一条警示 tag：`⚠ 声明依赖未落板：T1、T2`
  （无法核对映射时报 `声明依赖无法核对：T3`）。它**与板面自己的信号并存**——板面说"依赖已就绪"、
  分叉 tag 说"声明依赖未落板"，两个信号同屏，谁也别替谁说话。

## 为什么这是 bug（不是"文案没教清楚"）

板面只认结构化 `blockedBy`，而 CEO 的依赖意图按派活约定写在**自由文本**里（任务书派活行
`依赖：<T号>`、任务 description `依赖 T1,T2`）。同批并行建任务时板面 id 还不存在（id 由板子
发号 `task-N`），于是**意图与板面静默分叉**：

- 真事故（会话 `session-663ff4b6` / turn1 step9）：`task-3` 的 description 写"依赖 T1,T2"，
  板面 `blockedBy` 一路 `[]`；看板当时把它显示成**没有等待 tag 的自由任务**、依赖图少画两条边，
  **没有任何信号**提示这条边从未落地——静默到人工扫盘才发现。
- 我在最近 12 个公司会话里扫了一遍：**只有这一场有团队任务，且正好命中**（1 个任务缺边）——
  单点、但类别真实（协议本身鼓励并行批量建 + 文本声明）。

所以补的不只是文案（那一半 = [任务依赖两拍落](2026-10-13-task-dependency-two-phase.md)），
还有**看得见的判据**：声明没落板，卡上必须自己说出来。

## 输掉的方案

1. **只在 CEO 技能里加"建完自查一遍"**：靠模型自觉，拦不住"忘了查"；且用户/驾驭者看不到盘面与声明不一致。
2. **让看板拒绝渲染这种任务/报红**：盘面是事实层（板面真的没有这条边），渲染层不该假装它没有任务——**并存两个信号**才是诚实的（板面事实 + 声明分叉）。
3. **host 侧拦截 team 工具调用做纠正**（把 `T1` 归一成 `task-1`）：team 工具是 vendor 的（`tool-agent-team`），本仓不改 vendor；归一化还会掩盖真错（猜错号也能蒙对）。
4. **把依赖也写进结构化字段的人**（改 handbook 让任务描述带机器字段）：动的面比本 bug 大（任务书格式、审计、成员读法），且 vendor 的 create 参数只有 `blocked_by`/`write_scopes`；文本声明在协议里仍会存在（标题里的 T 号、任务书派活行）。
5. **只在审计脚本里报**（不进 UI）：驾驭者看的是看板——报告写在没人打开的地方等于没报。

## 后果与边界

- **判据是启发式，不是门禁**：`T<N>` 映射靠 subject 前缀约定（`T1 · …`），认不出时报"无法核对"而不是猜；`不依赖 X` 已排除，但更绕的措辞仍可能误报（文案是警示，不是拒绝渲染）。
- **依赖图页签这一轮没改**（节点上的分叉标记留待需要时做）：缺边在图上表现为少一条线，看板卡是当前唯一可见面——**已知不对称**。
- **只在读模型层生效**：`description` 走 `TeamViewLike`（vendor `TeamTaskView` 有该字段）；事件路径（`TeamTaskSnapshot` 无 description）下声明抽取退化为 subject-only，届时"无法核对"会少报——记为边界。

## 验证（都真跑过）

- `pnpm test tests/company/board.spec.ts` —— **15 tests 绿**：真事故形态报 `missing`、T4 自我修复后无分叉、无映射报 `unmapped`、`不依赖 T1`/`可先做不依赖它们的部分` 不误报、`boardColumns` 把分叉挂上卡。
- `pnpm test tests/client/board-panel.spec.ts` —— **2 tests 绿**：分叉 tag 在场且点名 T1、T2；整块板**有且只有一条**（假阳性守卫，按卡切段而不是按全文字符串）。
- 反证（红→还原→绿）三处：
  ① 删掉 `company-panels.tsx` 里的分叉 tag 分支 ⇒ `board-panel.spec.ts` **2 条红**，且视觉档夹具发射器先红（探针 exit 2，拿不到夹具）；
  ② `boardColumns` 里把 `drift` 写死 `null`（判据不接进卡）⇒ `board.spec.ts` + `board-panel.spec.ts` **3 条红**；
  ③ 抽词函数的"行首空串"边界（`'不无非勿未'.includes('')` 恒真）——首跑真红（`依赖 T1、T2` 抽出空数组），修在 `board.ts` 的守卫里。
- `source run/env.sh && node probes/browser-visual/board-drift-probe.mjs` —— **ALL PASS**（真 web app 注入真组件+真 CSS：D1 tag 在场点名、D2 有且只有一条 + 卡数守卫、D3 tag 不越出卡片盒）→ 图 `snapshots/visual/board-drift/board.png`。
- `pnpm test` + `pnpm verify` —— 全绿。
- **未跑**（如实登记）：依赖图页签的节点级标记（本轮不做）、真动议上的端到端（要 $ 与真 key；本改动的行为证据 = 真事故板面夹具 + 真 DOM 判据）。

## 落点

- 判据：`packages/company-pack/src/lib/board.ts`（`declaredDependencyLabels` / `paperToTaskId` / `dependencyDrift` / `driftLabel`；`TaskRow.description`、`BoardCard.drift`）。
- 渲染：`packages/company-pack/src/client/company-panels.tsx`（BoardPanel 卡脚）。
- keyless：`tests/company/board.spec.ts`、`tests/client/board-panel.spec.ts`；夹具发射器 `tests/client/board-drift-fixture.spec.ts`。
- 真渲染判据 + 图像：`probes/browser-visual/board-drift-probe.mjs`、`snapshots/visual/board-drift/`。
- 姊妹决定（协议侧）：[任务依赖"两拍落"](2026-10-13-task-dependency-two-phase.md)。
