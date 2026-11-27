---
status: 已结
opened: 2026-11-27
---

# 推敲：梦之队 UX/UI Round 2 · 历史遗漏盲区、交互深水区与契约边界全扫查计划

> 立卡：2026-11-27 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 白盒DOM复现+真Chromium+真模型三路交叉实证（只报不修，0产品代码改动）
>
> **结论/去向**：none — 已完成 Round 2 全量 Blind-Spot 实测与三路复现（Phase 0–4），证伪 5 处疑点后实证立案 `BUG-392..BUG-398`（7 张活跃 Bug 卡），未改任何产品源码或 `vendor/dsh/`。

**问题与期望结果：** [Round 1 全表面走查卡](2026-11-27-ux-ui-full-verification-and-e2e.md)立出 `BUG-384..BUG-391`，且已在 [2026-11-27 修复批次 Note](../../../notes/implemented/2026-11-27-ux-ui-audit-batch-fixes.md) 中全部修复归档。结合最新代码（`b99d1ca5`）与 Round 1 台账复盘，当前仍存在三大未顾及层面：
1. **Round 1 显式遗留与近期修复的次生脆点**：包括真模型下 `bash` 非公司审批透传、`request_signoff` **拒绝 + Esc/Enter 键 trap**、`/prd check` 与 `/delivery check` 真命令回执、自定义 `productName` 真渲染、热切 `zh ↔ en`（不刷新）、`768px` 右栏自动全屏临界宽度与全子视图窄屏适配、以及 `BUG-384..391` 修复边缘与 sibling 泄漏；
2. **源码契约深水区与交互竞态盲区**：预查代码与 `vendor/dsh` 契约已捕获多项高疑点——如 `SignoffComposerCard` 焦点在子按钮/`<summary>` 按 `Enter` 误批准、`openContext` 与全局页脚在 HQ 打开时漏调 `selectPanel(null)` 触发英文原始 `sidebarRight: no session surface is mounted`、`DagPanel` 初始空图永远不挂 `ResizeObserver` + 全局 SVG marker ID 冲突、`loadStartup` 吞并 `AbortError` 覆盖全局策略仓、`useWorkspaceText` 切会话滞留旧盘路径、HQ `started` 跨会话粘连及 `error` 态死重试按钮等；
3. **重交互生命周期与无测试保护区**：包括培养 GUI 全闭环（采纳 / 拒绝 / 验证>3条 / 两段式撤回 / 折叠上限 / `CultivationContextPicker` 搜索与键盘）、交付目录 5 档筛选与隐藏状态卡死、侧栏 `0 direct tests` 接线模块（`register-s2-ux.ts`、`register-s4-ux.ts`、`company-toast.tsx`）、以及 Round 1 已登记的 `6+2` 支陈旧探针/E2E 车道。

期望延续「只查报、不擅改、每实证即立 Bug 卡（从 BUG-392 起）」纪律，系统过完历史上未触及的 UX/UI 深水区与契约缝隙，给出一份带完整实测证据的 Round 2 体检结论与下一轮缺陷账本。

**当前情况：** `master`（`b99d1ca5`）工作树干净，`_backlog/bugs/` 活跃 0 张（`Next BUG ID = 392`），`_backlog/issues/` 活跃仅本卡 1 张。

**未决问题：** 见卡末「待人确认」节（Round 2 范围/额度确认、真模型复测范围、过期探针处置口径）。

**下一步：** 请用户审阅本计划并授权；确认后按 Phase 0 → Phase 4 静默自主跑完并逐项取证立卡。

---

## 范围与排除项

- **包含范围**：
  - `packages/company-pack/src/client/` 全部未在 Round 1 深测的组件/Hook/CSS/快捷键/本地存储/生命周期逻辑；
  - `packages/company-pack/src/host/` 中与 UI 直接联动的输出/报错面（`/prd`、`/delivery`、`/cultivation`、`company-settings`、`client-diagnostics`、`preset-health`）；
  - 与 `vendor/dsh/packages/client/` 上游宿主（`ui-approval`、`ui-sidebar-right`、`ui-user-questions`、`ui-layout`、`shortcuts`、`ui-chat`）衔接的全部契约缝隙；
  - `checks/lanes/` 与 `probes/browser-visual/` 中的陈旧探针与跨窗口/错误链车道。
- **明确排除**：
  - **严禁改动 `vendor/dsh/`**（只读铁律）；
  - **查测同轮严禁顺手修改产品代码或篡改测试断言凑绿**——实证缺陷一律按规则立 `BUG-392+`（只报不修）；
  - 不把 Round 1 已完全验证且本次未改动的静态开心路径机械重复当新增覆盖。

---

## Round 2 增量盲区全扫矩阵（组 R + 组 G–L · 共 46 单元）

### 组 R · `BUG-384..391` 修复边缘、同源泄漏与 Round 1 遗留复查（8 单元）

| ID | 目标点 / 源码坐标 | 排查焦点与实测路径 |
|---|---|---|
| **R1** | HQ 培养状态机与重入（`company-hq.tsx:209-385`） | 会话 A 点启动后切到会 B 检查 `started` 是否误自动建会话；切 `cwd` 查 `pinnedSessionIdRef` 是否滞留；故意制造创建/retain 失败进 `error` 态点「启动/重试」（查 `setStarted(true)` 是否无响应）；嵌入培养带 `agentPreset` 时点击内部 `MotionCommandDock` / `AssistantCultivateAction` 是否递归套娃 |
| **R2** | 培养语言单例滞留（`CultivationBoard.tsx:87-89`, `use-cultivation-board.tsx:58-90`, `CultivationCompose.tsx:95-100`） | 在发生校验失败或回执报错后，不刷新页面热切 `zh↔en`，检查已写入组件 state 的错误/结果文本及时间锚点是否卡死在旧语言 |
| **R3** | `390px`/`768px` 非 Hub 右栏与容器挤兑（`company-hub-tabs.tsx:110-227`, `styles.ts:801-1214`） | 在 `390px` 打开 Guide `files`、`openMemberAside`、`openFinal`（`final.md`），验证非 Hub 视图是否缺少 `[data-company-narrow-close]` 出口；扫 `MotionCommandDock`、`CompanyTurnTailCard`、`TasksPanel` 在 `390px` 与 `768px` 溢横；在 `821–1100px` 展开双侧栏查看 `.wk-hq-cultivation-split` 是否被压扁 |
| **R4** | 跨源问询去重、HQ 待办一致性与「刚完成」跳转（`attention-observers.ts:38-72`, `company-hq.tsx:415,488-504`, `AttentionTab.tsx:268-282`） | 触发 `ask_user_question` 后刷新页面，对照 live+history 拼接是否重复或误删；刷新后进入 HQ「总览 · 待办」对比 `Team -> 待办`（HQ 仅读 live 是否丢重建项）；检查 `刚刚完成` 条目是否缺少跳回/打开交付物的直接操作 |
| **R5** | `SignoffComposerCard` 键盘与拒批闭环（`signoff-card.tsx:177-235`） | **重点高危**：焦点分别落在 `<summary data-signoff-detail-toggle>` 与 `<Button>拒绝 (Esc)</Button>` 上按 `Enter`，实测是否误触发批准 `allowed-once`；补测 `Ctrl+Enter`、IME `isComposing`、`answerable === false` 禁用态、拒绝按钮点击、`Esc` 快捷键与 `answer` 抛错重试提示 |
| **R6** | 残余裸标识与本地化缺口（`DelegationFlowPanel.tsx:59-60`, `presence-status.ts:74-93`, `DeliverablesTab.tsx:124-127`, `CultivationInbox.tsx:118`, `company-hq.tsx:475`） | 排查并实拍 `DelegationFlowPanel` 裸 `node.preset` / `node.mode`、`DeliverablesTab` 硬编码 `UTC`、HQ 会话无标题回落 `session-`、培养背景卡片裸角色名、以及无投影任务属主回退英文常量 |
| **R7** | 浮窗记忆死区、Hub 浮出与 CSS 冲突（`company-tabs.tsx:86-90`, `float-geometry.ts:67-96`, `styles.ts:604-989`, `CommandScopeHint.tsx:49`） | 验证 `saveFloatRect` 从未在拖拽/缩放后写入存储；整个 Hub 浮出后再点内部 `SegmentedControl` / 分栏预设 / 缩窗回正 / 原生栏收回；核对 `.wk-guide-entry` 双份覆盖与 `.wk-command-scope-hint` 无样式落空 |
| **R8** | Zero-direct-test 注册面复核（`register-s2-ux.ts`, `register-s4-ux.ts`, `company-toast.tsx`, `use-cultivation-board.tsx`） | 对尚无直接单测或全靠字符串审计的接线面补充真实浏览器/Playwright 行为穿透校验 |

### 面 G · 壳层边缘、部署配置故障与错误环恢复（7 单元）

| ID | 表面 / 机制 | 探索场景与断言 |
|---|---|---|
| **G1** | 自定义 `company.md` 与多 `cwd` 切盘（`company-identity.ts`, `client/index.ts:355-404`） | 配置非空 `productName` 观察 `DreamTeamBrandName` 与 `sidebar.brand.mark`；切换两个不同 `cwd` 工作区的会话验证重读；构造超大截断 `eof === false` 与坏标量验证降级 |
| **G2** | `CommandScopeHint` 全生命周期（`CommandScopeHint.tsx:38-80`） | Blank 公司会话显现提示 → 发出首条消息转为 Active 后即时隐去 → 非公司角色会话不越界 → `zh↔en` 热切换 |
| **G3** | `instance-guard` 真多窗互踩（`instance-guard.ts:20-97`） | 同浏览器双标签页打开同工作区，触发横幅显现、检查 Dark 模式对比度、实时切语刷新滞后（10s 轮询 vs 立即响应）及关闭另一页后自动退场 |
| **G4** | `error-ring` 离线缓冲、脱敏与降级（`error-ring.ts`, `client/index.ts:85-114`） | 在未打开任何会话的冷启动首页制造报错 → 开出公司会话后验证队列自动冲刷写入 `$DSH_HOME/logs/company-client-errors.log` → 验证 `?token=` 脱敏、跨 reload `sessionStorage` 保留及发送失败 `console.warn` 不自激 |
| **G5** | `preset-health` 坏角色挂载体感（`preset-health.ts:33-98`） | 人为损坏某角色 preset 或触发警告后，检查 Web 前端创建/进入该会话是否给用户明确提示而非静默无感退化 |
| **G6** | `useWorkspaceText` 切会话滞留与 `localStorage` 污染（`workspace-text.ts:39-59`, `DeliverablesTab.tsx`） | 在 `DeliverablesTab` / `LedgerTab` 停留时快速从 Workspace A 会话切换到 Workspace B 会话，验证异步加载窗内是否残留显示 A 的成品列表并在点击「打开」时把 A 的路径发给 B；向 `localStorage` 写入畸形 JSON 检查容错 |
| **G7** | `CompanyToastOverlay` 多通知并发（`company-toast.tsx`） | 连续触发多条 Toast（Hero 速启 + 命令发草稿 + 错误），检查堆叠顺序、自动消失定时器、手动关闭及打开 HQ 时的层叠遮挡（`z-index`） |

### 面 H · 右栏深度状态机、异步竞态与高频边界（9 单元）

| ID | 表面 / 机制 | 探索场景与断言 |
|---|---|---|
| **H1** | `Ops -> BoardTab` 边缘态 | 触发 `statusGap` / `revisionGap` 漂移徽标、`pending` 就绪 vs 阻塞、长标题与多列在 390px/浮窗下的横向滚动 |
| **H2** | `Ops -> DagTab` & `DelegationFlowPanel` 动态竞态与 SVG 冲突（`company-panels.tsx:185-235`, `DelegationFlowPanel.tsx`） | **空图挂载 → 随后动态注入节点**，实测 `ResizeObserver` 是否失灵致 `scale=1` 永不缩放；分栏同时挂两个 `DagPanel` 测 SVG `<marker>` ID 冲突；点击「重画/Redraw」；验证超宽图 `0.75` 横滚与 `d >= 2` 多层委派全终态（`failed`/`interrupted`/`aborted`/`max-tokens`/`refusal`/`lost`/`missing`） |
| **H3** | `Ops -> TasksTab` & `TasksAction` | 缺依赖 `wk-dep-missing`、阻塞/`statusGap`/`revisionGap`、窄屏表格横向滚动、顶栏徽标数字随流实时变化 |
| **H4** | `Ops -> StrategyPanel` 异步竞态与 `wikiCheck` 五态（`StrategyPanel.tsx:74-250`, `startup-handlers.ts:51-60`） | **在慢加载未完成时切换会话**，验证 `AbortError` 是否被吞并并把报错/空配置覆写入共享 `startupStore`；切会话查 `error` 与 `wiki` 草稿残留；遍历 `wikiCheck` 五态（`missing`/`not-directory`/`no-index`/`inside`/`outside`/`unchecked`）、`Enter`/失焦/`clear`、损坏 `startup-options.json` 与失效枚举选项保留 |
| **H5** | `Team -> AttentionTab` 6 边界与跳转边缘 | 构造并同屏显示全部 6 类边界警告（`workspaceUnknown` / `eventsTruncated` / `candidates.capped` / `asksCapped` / `failed` / `historyWindow`）；同毫秒多审批；在 HQ 打开态触发「去处理」 |
| **H6** | `Team -> PresenceTab` 导航空窗与终态成员（`member-navigation.ts:34`, `company-tabs.tsx:174-247`） | 在**浮窗或 HQ** 点成员行调用 `openMember` 验证是否静默无反应；对 `stopped`/`failed`/`provisioning`/多层子代理点「旁路查看」；验证 `activityCapped > 0` 与流断开报错 |
| **H7** | `Team -> BudgetTab` 阈值与动效无障碍 | 验证 `999_950 → 1M` 临界、`toolShare` 展示、`prefers-reduced-motion: reduce` 下 `useCountUp` 直接到位无闪烁 |
| **H8** | `Archive -> DeliverablesTab` 筛选死锁与截断分诊 | 切换全部 5 档筛选（`all`/`active`/`archive`/`unledgered`/`unpresented`）；**选中 `unledgered` 后让未入账归零，检查按钮隐藏但列表卡死在空态**；覆盖 `tooLarge`/`badShape`/`unreadable`/`skipped`/`metaProblem`、点击「重读」及 Unicode/空格路径 `openFinal` |
| **H9** | `Archive -> LedgerTab` 异常账本与撞 key | 覆盖 `!headerOk` 错表头、`truncated`、`unreadable`、带 `\|` 转义行、同 slug 或空 slug 多行 React `key` 冲突、以及未闭合 `**` 内联格式 |

### 面 I · 培养全生命周期 GUI 闭环、选择器与多端同步（6 单元）

| ID | 表面 / 机制 | 探索场景与断言 |
|---|---|---|
| **I1** | 收件箱真执行采纳与拒绝闭环（`CultivationInbox.tsx`） | 真实运行 `/cultivation adopt` 与 `/cultivation reject`：点「拒绝」不填理由点确定触发拦错、输入框内 `Escape` 关闭不误写、`Enter` 提交、成功后移出待审 |
| **I2** | 已采纳方法验证与两段式撤回（`CultivationBoardSections.tsx`） | 对已采纳规则点「有用 / 没用」（空证据拦错、>3 条验证记录折叠与展开）；点「撤回」先见后果提示再点确认执行，测进行中未禁用取消按钮的竞态与 `BUG-349` 已撤回态 |
| **I3** | 列表折叠、双计数与跨实例事件同步 | 构造待审 >10、我提交 >5+5（核对双列表隐藏计数）、已采纳 >5 的展开/收起；四态（`unreadable` / `empty(0)` / `noPending(N)` / `needsDecision`）切换；验证 `CULTIVATION_CHANGED_EVENT` 是否实时同步 Archive Hub / CultView / HQ 工坊 |
| **I4** | `CultivationCompose` 表单深入（`CultivationCompose.tsx`） | 选不同目标角色自动切为「跨角色建议」预览、teammate 身份明示按 Lead 记账、含疑似密钥内容触发 `secretLikeFindings` 告警、快速连击两次提交检查是否缺同步 ref 锁致发重命令 |
| **I5** | `CultivationContextPicker` 检索与焦点无障碍（`CultivationContextPicker.tsx`） | 搜索框内输入关键词过滤、在搜索框按 `ArrowDown`/`ArrowUp` 检查是否误劫持光标离开输入框、按 `Escape` 后焦点是否丢失未回落触发按钮；覆盖 `catalog.skipped` / 截断提示 / 未知 `cwd` `fail-closed` / `openContext` 失败提示 |
| **I6** | `CultivationView` 分隔条拖拽（`CultivationView.tsx:142-175`） | 桌面横向拖拽与 `<666px` 垂直堆叠模式拖拽（核查堆叠态光标为 `row-resize` 但拖拽仍读 `clientX` 且键盘仅支持 `ArrowLeft`/`ArrowRight`） |

### 面 J · 全局总部 HQ 与原生耦合死角（5 单元）

| ID | 表面 / 机制 | 探索场景与断言 |
|---|---|---|
| **J1** | HQ 打开态下全部右栏呼唤通道（`company-hq.tsx`, `context-wiring.ts:76`, `register-s1-ux.ts:115-134`） | **重点高危**：在 HQ 打开时分别点击：培养记录卡片内 `openContext`（文件源）、`SidebarFooterCompanyAction`、快捷键/按钮呼出右栏，实测是否直抛未处理/英文原始 `sidebarRight: no session surface is mounted` |
| **J2** | HQ 返回/切会话与四段深联动 | 从 HQ `Overview` 打开子代理会话或滚动至中段的会话返回、HQ 修改策略切回右栏/Composer 即时同步、全培养会话下 HQ 自指兜底行为 |
| **J3** | HQ 内嵌培养真多轮与快速切走 | 在 HQ 工坊连发两轮真对话并触发 `CommandView`/工具卡；发起创建后立刻切回主对话验证 `BUG-348` 无孤儿会话与 `localStorage` 残留清理 |
| **J4** | HQ 布局网格溢出与夹心宽度（`styles.ts:1104-1188`） | 在 `.wk-hq-grid` / `.wk-hq-card` 塞入超长连续文本/路径检查无 `min-width: 0` 撑爆视口；在 `960px` 打开左栏 + 右栏时观察 HQ 培养双栏挤压 |
| **J5** | 分栏预设边界与恢复（`company-triggers-shortcuts.ts:61-91`） | 测试 `review` 分栏缺少 `files` 页签时降级 `company-ops`（及无会话挂载态下无 try/catch 抛错）、`quiet` 收起后再次点开、在已有浮窗时切预设 |

### 面 K · 对话流上下文动作、真模型长尾与键盘无障碍（6 单元）

| ID | 表面 / 机制 | 探索场景与断言 |
|---|---|---|
| **K1** | 真模型 `/prd check` & `/delivery check` | 在真实会话（含 `productized`/`project-services`/`managed-service` 混合与缺失失败样本）运行两命令，校验 `CompanyCommandView` 标题/状态/要点/展开原文与「打开成品」跳转 |
| **K2** | 真模型 `bash` 原生透传 vs `request_signoff` 拒绝对照 | 同会话先触发越权 `bash` 审批确认 `ui-approval` `ApprovalPanel` 原生呈现与放行；再触发 `request_signoff` 并走**拒绝**与 `Esc` 快捷键确认本轮正确阻断并回写工具卡 |
| **K3** | 真模型 `ask_user_question` 多题与过期车道对照 | 实测多题选择 + 自由输入型 `ask_user_question` 界面闭环与 `AttentionTab` 联动；逐项记录 `attention-e2e` 与 `human-loop-e2e` 车道阻塞差 |
| **K4** | 上下文动作语义核验（`contextual-actions.tsx`, `register-s1-ux.ts:147-163`） | 点击高管消息下的「纠正 / 沉淀方法」与 `final.md` 右栏「核对草稿 / 发起复盘培养」：核验是否仅跳页弹 Toast 而**丢弃 `messageId`/`filePath` 上下文且未进入草稿对比**、普通非公司会话误露按钮、以及默认 `opacity: 0` 悬浮门槛的可发现性 |
| **K5** | 草稿误覆盖与运行中状态切换（`ambient-chrome.tsx`, `company-turn-tail.tsx`） | 输入未发文本后点 `HeroMotionOptions` / `MotionCommandDock` 是否无提示覆盖草稿；流式输出中/stopped/中途切换角色时 `MotionCommandDock`/`ComposerStatusPill` 跟随；`CompanyTurnTailCard` 在普通闲聊不出现、在委派/双签回合出现且按钮有效 |
| **K6** | 全局快捷键隔离与组件键盘通达（`company-triggers-shortcuts.ts:173-188`, `DelegationCard`, `TeamToolCard`） | 打开 Modal 弹窗或聚焦终端区时按 `Alt+Shift+1/2/3` 检查 `observeFixedInput` 是否忽略 `modal`/`terminal` 上下文误切右栏；键盘 `Tab` + `Space`/`Enter` 展开折叠 `DelegationCard`/`TeamToolCard` |

### 面 L · 实时正交扫面与历史探针清算（5 单元）

| ID | 维度 | 覆盖动作与判据 |
|---|---|---|
| **L1** | **不刷新热切换语言 `zh ↔ en`** | 展开 HQ 4 分区、右栏 3 Hub × 10 子视图、`CommandScopeHint`、`instance-guard` 横幅、带错误态的 `CultivationBoard` 后不刷新页面实时切换语言，扫净所有滞后文字 |
| **L2** | **全视口临界扫面**（`1440` / `1024` / `850` / `768` / `390`） | 补足 Round 1 未扫的 `768px`（`RightbarSeat` 自动全屏临界）、`850px` 夹心宽、以及 `390px` 下的全部 10 个子视图 + `files` + `aside` + `final.md` + `CommandView` + `SignoffComposerCard` + `Toast` |
| **L3** | **Dark Mode 深度逐图审计** | 专测深色模式下的 `DagPanel` 箭头对比度、`StrategyPanel` 原生 `<select>`、弹窗/Picker、`<pre>` 折叠原文、多窗横幅、浮窗标题栏与 Toast 叠层，读图人工核查 |
| **L4** | **陈旧 `6+2` 探针与车道清单复盘** | 对 Round 1 发现的 6 支过时 `probes/browser-visual/` 与 2 支 `checks/lanes/` 进行差异比对，输出逐条明确的适配器更新清单（与产品缺陷分离） |
| **L5** | **浏览器日志与静态/动态错误零容忍** | 全程断言 `console.error = 0`、`pageerror = 0`、`window.__DSH_COMPANY_ERRORS__ = 0`、异常场景显式提示且 `$DSH_HOME/logs/company-client-errors.log` 落盘链路可通 |

---

## 分阶段执行路径（Phase 0 → Phase 4）

### Phase 0 · 当前基线确认（无模型，约 2 分钟）
- 跑 `pnpm verify && pnpm typecheck && pnpm lint && pnpm test`，锁定 `b99d1ca5` 后的起跑线全绿；
- 按需跑 `source run/env.sh && node checks/lanes/client-load.entry.mjs && node checks/lanes/ui-scene.entry.mjs --isolated --expected && node checks/lanes/ui-scene.entry.mjs --isolated --lang en` 确认本地 pack client 构建指纹最新。

### Phase 1 · `BUG-384..391` 修复验证与高疑点白盒靶向复核（无模型）
- 优先围绕 Round 1 修复边界与预查高疑点做隔离 DOM / Keyless / 浏览器前哨探针，验证 **组 R（R1–R8）** 与 **G4/G6/H4/I5/J1/K6**：先确认哪些高疑点会在真实 DSH 客户端运行时复现（去伪存真，排除单元测试盲区或假阳性）。

### Phase 2 · Round 2 深度交互 Playwright E2E + 正交矩阵（核心扫雷，无 LLM 成本）
在 gitignored `runtime/tmp/ux-audit-r2/` 搭建面向状态转换与破坏性交互的隔离驱动（复用 `tools/drivers/playwright.mjs` 与 `tools/lib/probe/probe-web.mjs`）：
1. 构造多盘（双 `cwd` + 自定义 `company.md`）、坏策略/坏目录/错表头/超限边界/大量待办与已采纳记录、多层嵌套子代理树、及空→有任务动态转换样本；
2. 逐一打穿 **G1–G7、H1–H9、I1–I6、J1–J5、K4–K6** 全部无模型交互链；
3. 跑完 **L1–L5**（不刷新实时 `zh↔en`、`768`/`850`/`390` 全视图+弹窗、Dark Mode 逐屏逐控件截图），并用 `read_file` 逐张视觉审图，同时保持控制台/网络/错误环零容忍。

### Phase 3 · 真模型长尾与对照实测（`DEEPSEEK_API_KEY` + 排练场）
1. 真模型实跑 **K1**（`/prd check` + `/delivery check` 成败回执）、**K2**（同会话 `bash` 越权原生审批 vs `request_signoff` **拒绝 + Esc**）、**K3**（多题 `ask_user_question`）、**K5**（流式/停顿/多回合 `TurnTail`）、**J3**（HQ 内嵌培养真实多轮）；
2. 实跑 **H5/H6** 真实子代理动态切换、跨会话跳转与「旁路查看」边缘态；
3. 核验 **G4** 冷启首屏报错跨真实会话落盘。

### Phase 4 · 账本归档与 Round 2 缺陷报告收口
1. 严格按 `_backlog/bugs/README.md` 规范将所有已实证（浏览器实复现或端到端实测确认）的缺陷逐张立卡（`BUG-392+`，`status: 调查中`），标注运行面、最小复现、截图/日志证据与 `severity`；
2. 独立只读 `research` 子代理对新增 BUG 卡与实跑台账盲审清零；
3. 结项归档本卡并向用户呈报 Round 2 体检报告、缺陷聚类及修复批次建议（同时附 `6+2` 陈旧探针更新建议）。

---

## 发现即报 Bug 纪律（硬线）

1. **只查报、不擅改**：发现任何缺陷，**本轮严禁修改 `packages/company-pack/src/` 源码**，不修改任何测试用例门槛；
2. **先复现、再立卡**：代码审计发现的可疑点（如 `R5`、`H2`、`H4`、`J1`、`K4`、`K6` 等），必须经实际运行时/真实 Playwright/真模型或精确复现测试实证“用户可触发且确有故障”，才立 BUG 卡——绝不凭静态猜测滥立假卡；
3. **四类严格分流**：产品缺陷（`BUG-392+`）/ 探针陈旧债务（仅记录，不立产品 BUG）/ `vendor/dsh` 上游契约限制（记录复现与规避方案，不改 `vendor/`）/ 测试脚本自身失误。

---

## 验收标准

1. **全矩阵闭环**：`pnpm verify && pnpm typecheck && pnpm lint && pnpm test` 通过，且组 R（8 单元）与面 G–L（38 单元）共 **46 个检查单元** 全部给出可对账结论（`PASS` / `FAIL -> BUG-NNN` / `N/A-not-bug` / `probe-stale`）；
2. **视觉与状态证据落盘**：`runtime/tmp/ux-audit-r2/` 留存 `zh↔en` 热切、`768`/`850`/`390` 全子视图及 Dark Mode 关键弹窗/图表截图，并完成逐图视觉复核；
3. **零越界**：`packages/company-pack/src/` 与 `vendor/dsh/` 工作树零改动，新增 Bug 卡全部通过 `pnpm verify` 与独立盲审。

---

## 待人确认（授权后立即开跑）

用户已通过直接回复明确授权开跑：严格只报不修，先复现再立卡。

---

## 实跑执行台账（Round 2 · 2026-11-27 完成）

### Phase 0 · 当前基线锁定（ALL PASS）
- `pnpm verify`、`pnpm typecheck`、`pnpm lint` 全绿；`pnpm test` 303 files（并发 CPU 下 `company-client-composition.spec.ts` 超时后隔离复跑 5/5 passed）；
- Keyless 真浏览器基线：`setup.mjs --check`、`client-load.entry.mjs`、`ui-scene.entry.mjs --isolated --expected` / `--lang en`、`client-error-chain.entry.mjs`、`multi-window-banner.entry.mjs` 全部 PASS。

### Phase 1 · 白盒 DOM 靶向复现（15/15 命中）
- `runtime/tmp/ux-audit-r2/targeted-repro.spec.tsx`（15 tests 全部证实）：
  - `R5-A/B/C`（[BUG-392](../fixed_bugs/BUG-392-signoff-composer-enter-focus-trap-and-answerable-guard-gaps.md)）：`<summary>` 与 `拒绝` 按钮焦点按 `Enter` 误调 `allowed-once`；`Ctrl+Enter` 未拦；`answerable: false` 按钮未禁用；
  - `R1` / `J5`（[BUG-393](../fixed_bugs/BUG-393-hq-rightbar-no-surface-crash-and-embedded-workshop-lifecycle.md)）：HQ 培养 `error` 态重试按钮死掉且 `started` 跨会话粘连；`openSplitPreset('review')` 降级抛未捕获异常；
  - `G1` / `G6` / `H4-A` / `H4-B`（[BUG-394](../../bugs/BUG-394-cross-session-brand-text-and-startup-abort-state-leaks.md)）：身份读取失败不回落、`useWorkspaceText` 切会话滞留前盘文本、`loadStartup` 吞并 `AbortError` 覆写全局 store、`StrategyPanel` 切会话残留 `error`；
  - `H2` / `H8`（[BUG-395](../../bugs/BUG-395-dag-empty-mount-never-scales-and-deliverables-hidden-filter-trap.md)）：`DagPanel` 空图先挂后 `ResizeObserver` 永不生效；`DeliverablesView` 隐藏筛选按钮卡死空态；
  - `I5` / `I6` / `K6`（[BUG-396](../../bugs/BUG-396-context-picker-arrow-trap-modal-shortcuts-and-stacked-drag.md)）：`ContextPicker` 搜索框劫持 `ArrowDown` 且 `Esc` 失焦；`CultivationView` 堆叠忽略垂直键；`observeFixedInput` 穿透 Modal/终端；
  - `R2`（[BUG-397](../../bugs/BUG-397-live-locale-lag-in-cultivation-errors-and-remaining-raw-labels.md)）：热切语言后培养表单报错停在中文。

### Phase 2 · Chromium 多盘多视口深扫（`round2-deep-audit.mjs` + `round2-part2-audit.mjs`）
- 真实双盘（`wsA` 定制 `company.md` `NovaCorp` / `wsB` 无 `company.md`）复现 `G1` 跨盘品牌滞留、`K5` Hero 覆盖未发草稿、`K4` `final.md`/消息上下文未预填与未比对草稿、`R7` `saveFloatRect` 死写（`floatKeys=[]`）、`G2` `.wk-command-scope-hint` 零样式、`J1` HQ 点页脚弹 `sidebarRight: no session surface is mounted`（`r2-02`）、`R6` `DelegationFlowPanel` 裸 `ceo`/`subagent`（`r2p2-04`）、`DeliverablesTab` `UTC` 与旁路 `session-fff`（`r2-04`）；
- **实测排伪**：`390px` `final.md` 右栏有上游原生 `退出全屏` / `收起右侧边栏`（`r2p2-02`）；`960px` Dark HQ 网格与双栏均 `overflowX=false`（`r2p2-05` / `r2p2-06`）；普通会话 `AssistantCultivateAction` 隐藏（`count=0`）；已停止成员 `openMemberAside` 正常打开；`Ledger` 转义竖线 `\|` 正常。

### Phase 3 · 真模型端到端长尾（`phase3-live-r2.mjs`）
- CFO `request_signoff` 触发 → 点击「拒绝」成功落 `outcome: 'rejected'` 并流内工具卡翻为「已拒绝」（`p3r2-01` / `p3r2-02`）；
- 真实会话键入执行 `/prd check` 与 `/delivery check` 均渲染 `CompanyCommandView`（`p3r2-04`）；
- HQ 培养工坊真开会话实证内嵌区出现「选择工作区 / 选择一个工作区开始」且 `HeroMotionOptions` 被窄栏裁成 `委派团`（`p3r2-05` → 并入 `BUG-393`）；
- 控制台报错全程为 `0`（`[]`）。

### Phase 4 · Bug 账本收口（`BUG-392..BUG-398`，均 `status: 调查中`）
- P0：[BUG-392](../fixed_bugs/BUG-392-signoff-composer-enter-focus-trap-and-answerable-guard-gaps.md)、[BUG-393](../fixed_bugs/BUG-393-hq-rightbar-no-surface-crash-and-embedded-workshop-lifecycle.md)
- P1：[BUG-394](../../bugs/BUG-394-cross-session-brand-text-and-startup-abort-state-leaks.md)、[BUG-395](../../bugs/BUG-395-dag-empty-mount-never-scales-and-deliverables-hidden-filter-trap.md)、[BUG-396](../../bugs/BUG-396-context-picker-arrow-trap-modal-shortcuts-and-stacked-drag.md)
- P2：[BUG-397](../../bugs/BUG-397-live-locale-lag-in-cultivation-errors-and-remaining-raw-labels.md)、[BUG-398](../../bugs/BUG-398-contextual-actions-drop-ref-dead-float-save-and-hero-draft-overwrite.md)
