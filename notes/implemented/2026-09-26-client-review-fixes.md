# 2026-09-26 · client 面两轴审查修复：7 条真缺陷 + 3 道新防线

状态：已交付（2026-09-26；起因 = 对三笔 UX 实验 client 改动跑 Standards+Spec 两轴 code-review）

## 问题

UX 实验轮的三笔 client 改动（`3bb26cd` 依赖图三刀 / `3288709` 堆叠虫 / `fc9eb85` toolview 槽位）
只过了当轮完成定义（keyless + 真页面走查），**没做过正式审查**。补跑两轴审查（范围
`ed7d872..HEAD` 的 `packages/` + `tests/`，Standards 轴 + Spec 轴并行子代理）后，findings 逐条核实，
**7 条是真缺陷**——其中两条属同一类"CSS 静默失效"，一条是本轮**刚修过的虫类的第三次复发**。

## 真缺陷（逐条）

1. **令牌错名 + 硬编码兜底**：`.wk-dag-wait` 用 `--dsw-alias-state-warning-primary`（**不存在**；
   真名 `state-warn-primary`）+ `#b8860b` 兜底 ⇒ 徽章永不跟主题。vendor 自己的 note 把这种
   "不存在的别名 + 硬编码兜底"列为**已否决形态**。
2. **死重复**：新增的 `.wk-edge` / `.wk-edge[data-done='true']` 被下方同特异性规则完全覆盖
   （死代码），且把上轮明令废弃的 `border-l3`（1.47 对比度，"几乎看不见"）又写了一遍 ⇒ 那一刀 CSS 无效果。
3. **动画吃掉状态**：`.wk-node[data-status='completed'] { opacity: .55 }` **永不生效**——该元素带
   `animation: wk-node-in … both`，而 CSS 级联里 **animation 声明高于普通作者声明**，动画结束态的
   `opacity: 1` 把 0.55 覆盖掉。**与 2026-09-25 的 transform 覆盖 SVG 定位是同一个坑**（第三次咬）。
4. **徽章把进行中读成「可开工」**：`waitingOn > 0 ? 等N项 : completed ? 已完成 : 可开工` ——
   `in_progress` 落进最后一支，文案误导调度；`data-ready` 属性无任何消费者。
5. **悬空 blocker 口径不符**：`waitingOn` 先 `filter(byId.has)` 丢掉悬空 id，而 `board.ts` 是
   "悬空 id 视为未完成" ⇒ 同一张图两个口径。
6. **箭头依赖新特性**：marker 用 SVG2 `context-stroke`——**Chrome 124+ / Firefox 支持，Safari 无信号**；
   不支持时 marker fallback 成黑，深色主题下箭头消失。
7. **文档/测试过期**：`dag.ts` 的 `order` JSDoc 仍写"= 输入序"（实际已改 blocker 重心排序）；
   `ledger.spec.ts` 标题「11 场」vs 断言 12；且钉真盘总行数 = 每场动议都要改测试（Shotgun Surgery）。

## 处置（含取舍）

| # | 处置 | 取舍 |
|---|---|---|
| 1 | 改真令牌、**去兜底** | 兜底会掩盖名字写错——宁可失效可见（新门禁兜住） |
| 2 | 删死重复，注释指向下方权威块 | 保留"边两态"的语义在一处 |
| 3 | 降透明改落**不被动画的子元素**（`.wk-dag-card` / `.wk-dag-node`） | 比"把 opacity 写进 keyframes 变量"更小、不动动效层 |
| 4 | 抽 `NodeBadge` 组件一处定义四态；删 `data-ready` 与 `DagNode.ready` | 无消费者的抽象一律删（vendor 纪律） |
| 5 | `waitingOn` 按 board.ts 同口径计悬空 blocker | 与 `board.ts` 一致优先于"图更干净" |
| 6 | **双 marker 显式上色**（CSS 令牌驱动） | 比 `context-stroke` 多一个 marker def，换来全浏览器一致 |
| 7 | 修 JSDoc；ledger 测试改**结构不变量 + 抽真样本**，stats 走 fixture | 不钉总行数 ⇒ 每场动议不用改测试 |

**核实后判为非缺陷（不改）**：`--dsw-elevation-prominent` 合法（定义在 vendor
`gradient-shadow-text.css`；初版扫描只看了 `design-platform.css` 才误判）；`priority: -1` 是 vendor
文档化的 shadow 语义（`ui-slots`："lowest renders"）。

## 新防线（均带红绿反证）

1. `tests/client-css.spec.ts`：① 我方每个 `var(--dsw-*)` 必须在 **vendor 源码 CSS** 里有定义；
   ② 禁硬编码颜色兜底；③ **带动画元素自身不得声明 opacity/transform**（把"级联里 animation 更高"
   这条静默规则变成机器判据）。
   反证 = 注入错名 + 把 opacity 写回 `.wk-node` ⇒ 3 项红；还原 ⇒ 绿。
2. `tests/client-face.spec.ts`：toolview 注册必须带 `priority: -1`（同键同优先级会 throw）。
   **反证过程本身产出一条结论**：去掉 priority 后 `client-load-smoke` **仍全绿** ⇒ 加载档不是这个
   虫类的防线（冲突要等该 key 的一次工具调用渲染才炸），故只能源码钉。反证 = 去 priority ⇒ 红。
3. `tests/dag.spec.ts` + `tests/dag-panel.spec.ts`：waitingOn（含悬空 blocker）、重心排序（含
   "同层输入序倒置不改落位"）、四态徽章文案、双 marker 断言。

## 后果 / 验证

- 后果：完成态降透明、进行中描边、箭头随色**现在真的会显示**；令牌错名与"动画吃属性"两类
  静默失效从此有门禁（此前**全部门禁盲区**）。
- 验证：`pnpm test` **202/202**（新增 12 项）/ `pnpm verify` ALL PASS / `client-load-smoke` ALL PASS
  （真浏览器）/ client+host 两面重建。
- **未验证**：真页面上"完成态确实变暗、箭头确实随色"的**视觉确认**——已由 `scripts/dag-visual-probe.mjs`
  夹具档答（机器 12/12 + 图像目视通过，2026-09-26）；深链可读性归 A 案真动议。
- **副作用（有意）**：本轮 findings 就是搁置池「视觉打磨二期」的触发条件本身 ⇒ **该项已关闭**
  （ROADMAP §搁置池 15 → 14 项），剩余主观观感并入 A 案一并看。
- commit：`cd64e86`。
