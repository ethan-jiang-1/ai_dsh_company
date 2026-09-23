# demo 可视表达（公司整页视图 · 皮肤 · 动效）

状态：已消化（2026-09-23 交付并收尾；收尾 Note = [2026-09-23-company-view.md](./2026-09-23-company-view.md)）
类型：feature（原队列序 1；完成即离队）
研究依据：[research/2026-09-23-visual-expression-for-demo.md](../research/2026-09-23-visual-expression-for-demo.md)

## 打磨点销账（收尾时补，用户 2026-09-23 走查后）

| 打磨点 | 归宿 |
|---|---|
| 视觉细修（用户原话「视觉上，我们回头再打磨」） | → 队列新条目 **⏸ 视觉打磨**（本 RFC 不重开） |
| 面板可移动 / 可缩放（依赖图、在场目前不能移动） | → 队列 **⏸ 面板窗口化**（②；首要决定 = 四面板是否提升为平台页签） |
| 命名统一 | **本条目内解决**：`docs/design/30-ui-demo.md` §5 命名表（公司视图 / 公司驾驶舱 / 四面板） |
| 平台行为：空白会话不渲染视图页签条 | 记录在案，非缺陷、不改 |

## 问题

1. **表达面薄且糙**：全仓 client 面只有三处（委派工具卡、头部任务板弹窗、右栏 Company 页签），且四个组件
   一律「纯 DOM + 内联样式、不依赖 ui-primitives」——硬编码色（`#e5534b`/`#3fb950`/`#d29922`）、emoji 按钮（🗂 任务板）、
   文字星号（★）、原生 `<button>`（「查看轨迹」）、固定 flex 宽（列头「团队内状态」被挤成两行）、页签标题被截断
   （「Company 驾驶…」）。截图证据见收尾 Note。
2. **机制看不见**：demo 的验收轴是「不讲解也能看懂」（[demo.md](../../docs/demo.md) 镜头纪律），但"谁依赖谁、活怎么流转、
   成品从哪来"目前只能靠讲解。
3. **动态流是假的流**：现在 5s 差分轮询——打开时「暂无动态」，看不到已发生的历史。
4. **平台能力未用**（研究已核实）：官方设计系统与停靠/浮层引擎可直 import；`conversation.view` 是空位；
   `session/follow` 是流式；成本投影现成。

## 提案（三个切片；同一条可观察行为 = 一场 demo 走查零"需要讲解"）

### 切片 1 · 公司整页视图（`conversation.view` 新页签）

四个母题，各回答观众会问的一个问题：

| 母题 | 回答 | 形态 | 数据 |
|---|---|---|---|
| 任务看板 | 活到哪一步 | 列 = `status`（pending/in_progress/completed）；卡 = subject + owner 徽章（未分配）+ `blockedBy` 徽章 + `ready` + `id@revision` | `agentTeams.view` |
| 任务 DAG | 谁依赖谁、关键路径 | 自绘 SVG；节点左侧状态图标（照 GitHub Actions）；依赖连线 | 同上（blockedBy/ready） |
| 组织在场 | 谁在岗、谁在等谁 | 角色行 + `StateDot` + 当前任务 + 阻塞提示 | 同上（members） |
| 协作动态 | 活怎么流转 | 角色间方向箭头 + 实时条目流 | `session/follow`（流式，替代差分轮询） |
| 预算与交付 | 为什么可信 / 成品从哪来 | 每角色 token 条 + 数字滚动；产出链（草稿 → 互审 → CEO `present`） | `useProjection('tokenUsage'/'sessionStats')` + 原始 session 事件 |

**看板与 DAG 并存、同视图切换**（研究 §4 结论）：看板答"活到哪一步"（信息密度高），DAG 答"谁依赖谁"
（分列会丢掉依赖结构，三级链看不出关键路径）。

**只做令牌不做美元**（wire 上没有货币金额字段，研究 §1.7）。

### 切片 2 · 皮肤与组件改造（与切片 1 同 diff）

- import `@deepseek-ai/dsh-client-ui-primitives`（**platform module**，零体积）与 `--dsw-*` 令牌；
  图标替换 emoji/★；原生 `<button>` 换 `Button`；状态用 `StateDot`/`Tag`；**不写字面颜色**（`docs/web-styling.md`）。
- 修正现有三处组件的排版缺陷（列头换行、页签标题截断、窄表列宽）。
- 会话流里的**团队工具卡**：`tool.call.toolview` 加 key（`spawn_teammate` / `team_task_*` / `send_message` /
  `wait_agent`）——让每个团队动作在对话流里都是公司语义的卡（"不讲解也能看懂"最便宜的一招）。

### 切片 3 · 动效层（零新依赖）

- DAG 连线生长（`stroke-dashoffset`）、节点入场与状态变色、running 脉冲、消息定向滑入、数字滚动（rAF）、面板开合。
- 令牌：复用 `--ds-ease-in-out` / `--ds-transition-duration[-fast|-slow]`；不够时用 `ctx.theme.overrideTokens`
  自加（source 作用域，官方一等公民路径）。**必须 `prefers-reduced-motion` 回退**（官方惯例，28 个文件已这么做）。

### 实施期发现的缺陷（真页面实测；**登记在此，不只在 commit 里**）

条目实施中由**真页面**（重放 + playwright + 截图）发现的行为缺陷，一律登记回本 RFC——发现权在代理一侧，
但**发现要留痕**（只写在 commit message 或待办里 = 无归属；规则见 guides/60 §12）：

1. **`remote.session` 命名空间未 inject** ⇒ `session/follow` 直接不可用，而当时的 `catch` 静默吞错
   （违反 fail-loud）。修：补 `remote.session`；流错误改为**显式落面板**。（切片 1 收尾）
2. **follow 快照只带最新一页** ⇒ 成员 provisioning 事件在页外，动态里的**目标** id 解析不出名字
   （显示裸 uuid；发送方有 `senderName` 兜底，所以只有目标中招）。修：用轮询的权威名册建 id→名表
   （`memberNames`）补上；+2 条回归测试。（切片 1 收尾）
3. **公司视图铺满整列压住页签**（实测几何）：视图 1390px、会话内容列仅 ~912px，内容列两侧的
   `.widthHandle` 抓取条（左柄 455→495）正好盖住第四个页签 ⇒ **真实用户点不动**。
   修：视图宽度约束到 `--dsh-chat-content-width` 并居中；实测四页签命中恢复正常。（切片 2）
4. `docs/design/30-ui-demo.md:57` 的 band 表述订正（见「风险与未决」）。（切片 2）

### 构建前置（不先做会"样式写了没生效"假绿）

- 本包 client 半 tsdown 配置是手抄契约（只有 banner/footer/externals），**未接 CSS Modules 流水线** ⇒
  二选一：给 tsdown 接 CSS 处理，或改用注入式样式（`styles.insert` 同款）。
- `ui-primitives` / `ui-dockkit` 进 pack `devDependencies`（只为类型；运行时由平台模块表回答，
  我们的 external 规则已覆盖 `@deepseek-ai/dsh-client-*`）。

## Alternatives（输掉的方案留尸）

- **装第三方看板/可视化插件**（`dsh-task-board` / `dph-taskboard` / `dsh-task-graph` 等）：**否决**——
  ① **数据源不匹配**：15 个 npm tarball 逐个 `grep agentTeams` **全部 0 命中**，无一读官方 team 任务
  （不是自建 localStorage 就是读会话列表）；② 采用度门槛（用户令）下**全部候选不合格**——最高档
  `@linxin666/dsh-client-ui-task-board`（30,427 周下载）也只是"边缘"，且是自建存储 + DOM 注入挂载；
  ③ git 安装会在**沙箱外执行 `prepare`**（官方 publish 文档明文警告）；④ 社区列表非官方审核
  （还把同一上游的两个 fork 列成两个候选）。**借形态，不装依赖**（研究 §4）。
- **引重库**（React Flow / motion 等）：**暂缓（非否决）**——先零依赖起步（纯 SVG + CSS 可做 80%）；
  规模上来再按采用度门槛评估（研究 §3 有选型表）。
- **mermaid / 图表渲染器**：**否决**——平台 Markdown 渲染器不支持 mermaid、无图表渲染器（研究 §1.5）⇒ 自绘 SVG。
- **自建任务存储 / 自造调度器**：**否决**（D13）——数据继续用官方 Agent Teams 任务板，我们只重画。
- **大改皮肤 v2 / 重新分镜**：原 ux-polish 已否决（超出打磨语义、无用户证据），本条不重开。

## 验收

- **人工轴**（吸收原「UX 打磨」）：一场完整 demo 走查零卡点、**零「需要讲解」的瞬间**；走查产出的打磨点逐条销账
  （修 / 转搁置池 / 明确不做，各有归宿）。
- **机器轴**：`pnpm verify` + `pnpm test`（迭代环）；client 改动 → `node scripts/client-load-smoke.mjs`（零挂载失败）；
  页面行为 → `node scripts/replay-smoke.mjs --ui --scenario r2-motion`（金样/在场板/行可点）；新增读模型纯函数 → keyless 单测。
- **清理判据**：现有组件内联硬编码色与 emoji **清零**（grep 可核）。
- **边界**：只改 client 面，不动 preset 与日志 ⇒ 旧会话不受影响。

## 风险与未决

- CSS 流水线未接（见构建前置）；`conversation.view` 新页签的 tab 顺序/图标需实测定；
  无货币字段（预算只做令牌）；动效令牌薄（需自加或复用 `--ds-*`）。
- **看板拖拽写回**需要官方 `updateTask`（乐观并发 `expectedRevision`，冲突即重拉）——我们目前**只注入 `load`、
  纯只读**。v1 是否只做只读看板（拖拽延后）需在 Plan Mode 定；写共享任务板要与 agent 循环协调（日志税）。
- 顺带修正：`docs/design/30-ui-demo.md:57` 把 tab-registry band 写成 slot 优先级（研究 §1.1 已证伪）。

## 条目去向（吸收原「UX 打磨」）

原 [UX 打磨](../implemented/2026-09-23-ux-polish.md) 三条 → 本条目：
驾驶舱/在场板交互细节 → 切片 1 + 2；demo 分镜顺滑度 → 验收人工轴；打磨清单逐项落地 → 切片 2 + 验收销账。
原提案已毕业（`notes/implemented/2026-09-23-ux-polish.md`，状态「已消化」）。
