# 2026-09-23 · demo 可视表达研究（机制怎么"演"出来）

状态：研究结论（供「demo 可视表达」条目开工用）
方法：三条后台调研线并行（平台能力 / 生态与官方口径 / 设计参照与库选型）+ 一条采用度线（进行中）。
标注：**【一手】** = vendor 源码、官方文档或 npm registry 直接核实；**【本地研究】** = 外部研究树
（`/Users/bowhead/deepseek-harness/`）的二次研究，非官方口径；**【推断】** / **【未发现】** 照字面。
平台基线 = `vendor/dsh` @ tag `dsh-v0.1.5-rc.2`（`fb2c4b9e`）。本笔记只记结论与落点，机制权威仍在 vendor 树。

## 0. 结论速览

1. **平台原生基座足够**：官方设计系统（`ui-primitives`）与停靠/浮层引擎（`ui-dockkit`）**都在平台模块表里**，
   已安装的 client 插件可直接 `import`（零体积、零信任风险）；`conversation.view` 是空位，可加**整页公司视图**。
2. **生态里有同类第三方插件，但过不了采用度门槛**（用户令：成熟 + 高采用 + 可审计）——借设计，不装。
3. **动效零依赖可做**：全树无动画库、无 View Transitions；动效令牌只有 4 个 `--ds-*`，需自加令牌
   （合法路径 `ctx.theme.overrideTokens`）并遵守 `prefers-reduced-motion`。
4. **一条构建前置**：本包 client 半的 tsdown 配置**未接 CSS Modules 流水线**（手抄的关键契约，只有
   banner/footer/externals）——要用样式表必须先补这一步，否则"样式写了没生效"。

## 1. 平台能力（一手：vendor 源码逐行）

### 1.1 扩展座位（slots）

- 权威清单是生成物：`packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:81`（61 个座位，
  `pnpm run gen-client-catalog` 生成 + freshness 门禁）。树形总览 `docs/subsystems/slots.md:111-172`。
- 卡位规则：cardinality = `single|list|keyed|chain`；scope = `root|session|session-maybe`；`list` 必填 `id`
  按 `order`；`keyed` 必填 `key`；`priority` **升序小者渲染**，同 cell 同 priority 二次注册抛错
  （`packages/client/ui-slots/src/index.ts:526-527,834-837`）。
- **「band」不是 slot 概念**：`extension(3) > builtin(2) > fallback(1)` 只存在于右栏 tab 类型注册
  （`ui-sidebar-right/src/client/tab-registry.ts:48-58`）。⚠ 本仓 `docs/design/30-ui-demo.md:57` 把它写成
  slot 优先级，**属表述不精确**，随本条目修正。
- 对可视化有用的座位（★ = 当前空位）：

| 座位 | kind/scope | 用途 | 占用者 |
|---|---|---|---|
| ★ `shell.overlay` | list/root | 全屏浮层（z 20、点击穿透、additive） | 无 |
| ★ `sidebar.panellist` | list/root | 侧栏主导航 | 无 |
| `conversation.view` | list/session | **整页视图**（Chat / Trajectory 已占两个） | chat、trajectory |
| `tool.call.toolview` | keyed/session | 工具卡（我们已用 `vp_eng`/`vp_sales`） | 17 个 key |
| `conversation.chat.node` | keyed/session | 新节点类型 | 18 个 key |
| `conversation.chat.turnTail` | chain/session | 轮末汇总条 | `ui-deliverables` |
| `sidebar.right.pane.tab` | keyed/session | 右栏页签体（Company 驾驶舱） | text-preview / files / guide |
| `conversation.session.header.actions` | list/session | 头部动作（任务板按钮） | agent-preset / jobs / schedule / agent-team |
| `conversation.input.dock` / `composer.dock` | list/session | 输入区上下仪表 | queue/todo/goal / StatsPills |
| ★ `sidebar.right.tab.menu.item`、★ `conversation.input.left/right`、★ `sidebar.right.tab.guide` | 各种 | 次级 | 无 |

- **root 座位禁止注册**（single，会整页顶掉 AppFrame）：`ui-renderer/src/client/registry.ts:37-40`。

### 1.2 ui-primitives（可直接 import 的官方设计系统）

- 入口 `packages/client/ui-primitives/src/index.ts`：41 个 value export + `export * from './icons/index.tsx'`。
- 组件：`StateDot`（状态点：绿完成/琥珀待用户/蓝 running 环/红错误/灰 idle）、`Button`、`Pill`、`Tag`、
  `Switch`、`Input`、`Menu`、`DisclosureRow`、`HoverCard`、`Modal`、`Tooltip`、`Toast`、`ConnectionIndicator`、
  `OnboardingSurface`、`RiskConfirmation`、`FishLogo`/`BrandWordmark`、`FileTypeIcon`、`LinkIcon`、`ReferenceIcon`；
  **数据块**：`JsonTree`、`TerminalBlock`、`ReadBlock`、`DiffBlock`（+`diffTotals`）、`SearchBlock`、`WebBlock`；
  **Markdown 族**：`MarkdownText`、`CodeBlock`、`JsonBlock`、`extractMarkdownPlainText`；
  工具：`useAnchoredPosition`/`useAnchoredMaxHeight`/`useDismissOnOutsidePointer`、`relativeTime`、`fileSizeText`、
  `writeClipboard`、`rankByName`、`projectUserText`。
- 图标：`icons/index.tsx` 938 行、**75 个 `Icon*`**，命名 `Icon<Name><Variant><Size>`（如 `IconSearchOutline16`），
  统一 `{size, className}`、`fill="currentColor"`。**无生成器**；vendor 只读 ⇒ 我们要新图标只能自建。
- 可达性：`@deepseek-ai/dsh-client-ui-primitives` **是 platform module**（`packages/client/web/src/platform.ts:9-14`）
  ⇒ 已安装插件可直接 import；**动态包（`cordis_define`）不能 import 任何东西**（只能 `React.createElement` +
  `styles.insert(css)`，`slot-catalog.ts:71`）。

### 1.3 设计令牌（`packages/client/ui-theme/src/styles/`）

- 颜色：73 个 `--dsw-static-*` + 79 个 `--dsw-alias-*`（`bg-*`/`border-l1..l4`/`label-*`/`state-{success,warn,error,business}-*`/
  `interactive-bg-*`/`markdown-*`/`scrollbar-*` …）+ 11 个 `--dsw-specific-*`；light/dark 双份，
  切换靠 `body[data-ds-dark-theme]`（`design-platform.css:4-154,156-340`）。
- elevation：`--dsw-shadow-lv1..lv3` + 派生 `--dsw-elevation-{stroke,panel,prominent,soft}`（`gradient-shadow-text.css:5-34`）。
- 字号：180 个 `--dsw-font-*`（markdown 角色族 + UI 阶梯 `xl-24/l-20/m-18/base-16/s-14/xs-13/xxs-12/xxxs-11`）。
- **未找到**：圆角令牌、间距令牌、z-index 令牌（全是组件字面量）。
- **动效令牌**：只有 4 个，且是上游命名 `--ds-*`：`--ds-ease-in-out: cubic-bezier(0.4,0,0.2,1)`、
  `--ds-transition-duration: 0.2s` / `-fast: 0.1s` / `-slow: 0.3s`（`base.css:11-14`）；大量 120–220ms 是硬编码。
- **扩令牌的合法路径**：`ctx.theme.overrideTokens(source, {light,dark})`（按 source 叠层、disposer 精确撤层，
  `ui-theme/src/client/index.ts:292-317`）。⚠ `docs/web-styling.md:11,17-18` 禁止 feature 包另立全局主题或写字面颜色。

### 1.4 ui-dockkit（窗口能力，就是用户要的"可移动/可缩放"）

- 浮窗 = `host:'float'` 的 pane（容量 1 tab、不画 tab strip，`ui-dockkit/README.md:33`）。
- 手势：header grip 拖动移动（`FloatLayer.tsx:120-124`）、右下角 20×20 `.floatResize` 缩放（`:157-161`）；
  **最小尺寸内建** `FLOAT_MIN_SIZE={width:220,height:140}`（`engine/constraints.ts:19`，`resizedRect` 用 `Math.max` 钳制
  `engine/geometry.ts:201-207`）；默认浮出 `380×300`；点击置顶（`FloatLayer.tsx:63-66`）。
- **受支持服务面 `ctx.sidebarRight` 公开 10 个**：`openResource`、`openTab`、`close`、`active`、`isExpanded`、
  `toggleExpanded`、`focus`、`split`（shipped Sidebar 硬限 2 个 docked pane）、**`float(tabId, rect?)`**、**`dock(paneId)`**
  （`ui-sidebar-right/src/client/service.ts:137-201`）。其余（`openTabIn`/`bind`/`_undo`）是内部；直接 import dockkit
  引擎**明确不稳定**（README:14）。
- 层叠（源码值）：浮窗 host 60（body portal）< dockkit tab 菜单 70 < **Agent Team 弹窗 110**
  （`client-ui-agent-team/.../TeamAction.module.css:42-49`）< Modal 1000 < Menu/Toast/Onboarding/ModelSelect 1100。
  **浮窗(60) vs Agent Team 弹窗(110) 需浏览器实测**（祖先 stacking context 可能改变结论）。
- 布局状态仅内存，刷新即收（`docs/subsystems/sidebar-right.md:140`）。

### 1.5 平台自带的可视化参考面

- **Trajectory 视图**：turn-aware 事件账本 + 可交互时间概览（分组 User/Assistant/Tool/嵌套 Subtool/compaction，
  记录检查器含 token 用量与时长）。数据 = durable Session events 的投影（`ui-trajectory/src/client/index.ts:56-64`）。
- **ui-deliverables**：轮末交付行 = mutation 工具产出文件（词表来自工具 `locations`）+ 显式 `present`；
  卡片网格（>4 折叠、60px 高、40px 图标框、13px 文件名）。占 `conversation.chat.turnTail` + `tool.call.toolview#present`。
- **Markdown 渲染**：支持 GFM、**表格**、**shiki 代码高亮**、**KaTeX 数学**、脚注、文件提及；
  **不支持 mermaid、无图表渲染器**；raw HTML 保持字面文本（`ui-primitives/src/markdown/render.tsx:322-324`）。

### 1.6 动效现状

- 全树**无动画库**（297 个 package.json 扫 motion/framer/spring/gsap/lottie/animate 零命中）；
  **无 View Transitions API 用法**；既有 = 手写 CSS：84 处 `transition:`、36 处 `@keyframes`、
  **28 个 `.css` 带 `@media (prefers-reduced-motion: reduce)`**。
- 官方惯例（in-repo README = 一手）：尊重 reduced-motion；**面板/轨道共用同一条 duration/easing 变量**，
  插件自带曲线会与对话区脱开；全屏态抑制 transition。

### 1.7 host → client 数据通道

- `agentTeams`：`view` / `createTask` / `updateTask`（unary）——**任务 DAG、owner、修订号是权威活状态**。
- `session`：`list` / `page` / **`follow`（流）** / **`control`（流）** / prompt / cancel / …；
  流式 = 单条 WebSocket mux `/api/remote.mux`（`api/gateway/src/stream-protocol.ts:6`）。
- **host→client 推送事件是固定 19 条白名单**（`api/remotes/src/remote-events.ts:17-35`），第三方**不能自行新增**。
- 客户端**能读原始 session 事件**（`SessionEventEntry`、follow 快照 records、`session/page` 翻页）；
  **`ctx.sessionQuery` 是 host-only，无 client 面**。
- 成本数据：投影 `tokenUsage`（uncachedInput/output/cacheRead/cacheWrite）、`sessionStats`、`contextPressure`、
  `contextBreakdown`；先例 `useProjection('tokenUsage')`（`ui-chat/.../StatsPills.tsx:319`）。
  **wire 上没有货币金额字段**（只有 token 数）——预算表达只能做"令牌 + 规则"，不能编美元。
- `jobs` / `workflows` / `deliverables` **没有 Remote 命名空间**：jobs 走 session control 流的 `jobs` frame；
  deliverables 由原始 session events 折叠。

### 1.8 构建与加载约束

- 产物是 **CJS**，包成 `window.__ModuleLoader__.load({id, factory})`，以 async classic `<script>` 加载；
  lazy-CJS、materialize 时同步 `require` 查模块表（`packages/client/modules/src/client/system.ts:13-25`）。
- externals = `PLATFORM_MODULES`（react / react-dom / cordis / dsh-client-store / dsh-client-ui-slots /
  **dsh-client-ui-primitives** / **dsh-client-ui-dockkit**）+ preloaded + 本包 `dsh.client.external`；
  **其余一律内联成私有副本**（`packages/client/tsdown.client.ts:406-453`）。
- **纯化门禁**：任何 `@deepseek-ai/*` 值导入若不在白名单，构建立即报错 ⇒ **跨插件值导入被禁，协作用 cordis 服务**。
- `packages/client/tsdown.client.ts` **不是已发布 subpath** ⇒ 树外插件要自己复刻 CJS 外壳、externals 与 CSS 流水线。
- 体积：只有 combo URL 预算 `MAX_COMBO_URL_BYTES = 3 KiB`，**无单 bundle 字节上限**。
- React **18**（`^18.2.0`）⇒ 不能用 React 19 专有 API。

## 2. 生态与官方口径

- **无官方插件市场/注册表**：分发 = `dsh plugin add`（npm 名 / 本地目录 / tarball / git 规格），
  发现靠 GitHub `dsh-plugin` topic；上游**不接受外部 PR**（`CONTRIBUTING.md:9`）。
- **安全事实**：git 安装会跑包的 `prepare`——官方明文警告这等于**在用户机器上、agent 沙箱之外执行该包代码**；
  社区策展列表（awesome-dsh-plugin）**不是官方审核**。
- UI 扩展唯一 API = `ctx.slots.register/inject`；硬约束 = 只 `import type` 引别的 feature 包、
  UI 域之间只传 JSON + 回调、slot store 只放视图态（`docs/subsystems/slots.md:176-184`、`packages/client/AGENTS.md`）。
- 生态已有第三方可视化插件（**社区目录登记，未逐一核实**）：`dsh-task-graph`（交互式 DAG + live status + critical path）、
  `dsh-flowglass`（实时 flowgraph + drill-down）、`dsh-planchart`（plan → 框架图，可导 SVG/PNG）、
  `dsh-genui` / `dsh-raw-html`（对话内 charts / mermaid / HTML 卡）、`dsh-whale-animation`（主题动画 + reduced-motion 回退）、
  看板类 `DamonKoy/dsh-web-ui#dsh-task-board`、`1070296335-create/dph-taskboard`、`springbrand-lab/dsh-skin-universe`。
- 判断：**借设计、不装依赖**（采用度门槛 + git 安装风险 + 我们已有等价数据源）。

## 3. 设计参照与库选型

- 参照产品与母题（一手文档）：LangGraph Studio（执行轨迹时间线）、LangSmith（Trajectory/Turns/Details 三视图 +
  子 agent 内联可钻取 + 每块挂 token/成本）、CrewAI Crew Studio（画布 + 执行时间线）、AutoGen Studio（消息流 +
  控制转移图）、Temporal Web UI（事件史 + 关系树 + Compact 分组 + 连续 N 次失败才亮红）、GitHub Actions（job DAG：
  节点左侧状态图标 + 依赖连线 + 实时）、n8n（执行列表四态 + 拷回重跑）、Dify（串并行语义图形化）、
  Anthropic 多智能体工程博客（orchestrator-worker + 成本叙事：agent ≈4× token、多 agent ≈15× chat；同步 subagent
  造成信息流瓶颈）。
- 母题 → 我们哪一段 demo：任务 DAG（谁依赖谁）/ 状态图标 + 实时（跑到哪了）/ 时间线泳道（并行与阻塞）/
  消息流（跨角色协作）/ 组织在场（谁在岗）/ 子 agent 内联钻取（子任务归属）/ 成本令牌表（预算纪律）/
  diff 评审（互审与保留分歧）/ 交付物卡（成品从哪来）/ 失败收敛告警（互审僵持）/ 重放（可审计）。
- 库选型（bundlephobia 一手 gzip；许可证 npm registry 核实）：DAG 类 `@xyflow/react` 59.9 kB (MIT)、
  `@dagrejs/dagre` 15.8 kB (MIT)、`elkjs` 433 kB (**EPL-2.0 OR GPL-3.0-or-later**)、`d3-dag` 41.9 kB (MIT)、纯 SVG 0；
  动效类 `motion` 47.7 kB (MIT)、`react-spring` 20.0 kB (MIT)、`@formkit/auto-animate` 3.2 kB (MIT)、CSS 0、
  View Transitions 0。
- **最小可行组合（推荐起步）**：纯 SVG 手写布局 + CSS keyframes（可选 auto-animate 3.2 kB）。
  **效果优先组合（规模上来再上）**：xyflow + dagre + motion（≈+123 kB gzip）；elkjs 不进主路径（体积 + 许可）。
- 零依赖可做清单：进度条 `scaleX`、状态点脉冲 keyframes、列表增删（`grid-template-rows: 0fr→1fr` / `@starting-style`）、
  SVG `stroke-dashoffset` 连线生长、≤20 节点分层布局（最长路径分层 + 绝对定位 SVG 边）、rAF 数字滚动、
  面板开合、CSS Grid 泳道、节点左侧状态图标。

## 4. 看板（kanban）插件：路径 A 不成立 ⇒ 自建（路径 C）

**判据**：它读谁的数据。(a) 读官方 `agentTeams`/`TeamView` → 能显示我们的任务；(b) 自建存储 → 孤岛；
(c) 读会话列表 → 也不是我们的任务数据。

**一手核实（15 个 npm tarball 逐个 `grep agentTeams` = 全部 0 命中）**：

| 候选（代表） | 数据源 | 判定 |
|---|---|---|
| `@linxin666/dsh-client-ui-task-board`（生态内最高采用：**30,427 周下载**；Apache-2.0；上游 `zhu1090093659/dsh-web` 7,962★） | (b) localStorage（`core/store.ts:2-14,144-155`）；状态枚举 backlog/todo/running/done/failed **与官方不同** | **边缘**（采用度高，但仍第三方 + 自建存储 + DOM 挂载） |
| `DamonKoy/dsh-web-ui` / `springbrand-lab/dsh-skin-universe` | **同一份包的 fork / 旧拷贝**（版本落后 0.1.16 vs 0.3.24） | **不合格**（并暴露 awesome 列表质量问题：同一上游被列成两个候选） |
| `dph-taskboard` | (c) 卡片 = 真实会话；localStorage + `~/.dsh/storages/taskboard.json`；**脚本补丁官方 `ui-workspace` 挂载点** | **不合格**（侵入式 monkey-patch） |
| `callmesoul/deepseek-kanban-plugin` | (b) 自建 Host 任务状态机 + DSH Storage；**无 LICENSE**；首推 git 安装 | **不合格** |
| `@starpivot/dsh-kanban`（Ericwong fork 的拷贝） | (c) 卡片本质是 Session；**无许可声明** | **不合格** |
| `@goodandready/dsh-kanban`（787 周下载）/ `@firetruck666/dsh-task-board`（729）/ `@alpacachen/dsh-kanban`（682）/ `dsh-kanban`（266）/ `@dsh-suite/plugin-team-board`（92）/ `@linsibin/dsh-task-board`（13）等 | 自有存储或会话 | **全部不合格**（个人作品、stars ≤11、未见 CI） |

- **没有任何 (a) 类候选**——本次调研最强的否定结论 ⇒ **路径 A（装现成的直接显示我们的任务）不成立**。
- **官方也没有看板**：vendor 全树 `grep -il kanban` 0 命中；官方 team UI（`TeamAction.tsx`）是 header 弹出面板
  = 成员列表 + 任务 `<article>` 列表（无列、无拖拽）；**未开任何"看板 slot"**。
- **可扩展性**：候选均未暴露可被消费的 slot/service（最高档那份靠 `document.querySelector('[data-pane="sidebar"]')`
  DOM 注入）；在 DSH 官方硬规则（跨包只 `import type` + slots/service + JSON）下"嵌入它们的视图"不可行。
- **路径 B（fork 改造）**：改动量 ≈ 重写 UI 层（换 store、换状态枚举、换 DOM 挂载为 slot 注册）⇒ 只值得
  **读源码取形态**。
- **路径 C（自建）= 推荐**：列 = `TeamTaskView.status`（pending/in_progress/completed，过滤 deleted）；
  卡 = `subject` + `ownerName`（未分配徽章）+ `blockedBy` 徽章 + `ready` + `id@revision`；数据沿用现有拉式
  `agentTeams.view`。**拖拽写回**需注入官方 `updateTask(sessionId, {taskId, expectedRevision, action})`
  （乐观并发，冲突即重拉——照官方 `TeamAction.tsx:195-230` 的 settleTask 策略）；**我们目前只读**
  （`packages/company-pack/src/client/index.ts` 只注入 `load`），这是唯一需要补的能力面；写共享任务板
  需与 agent 循环协调（日志税）。
- **形态取舍**：看板按 status 分列会丢依赖结构（`blockedBy` 退化为卡上徽章，三级链看不出关键路径）⇒
  **两者并存**：看板答"活到哪一步"（信息密度高、写回路径短），DAG 答"谁依赖谁"（关键路径、就绪前沿）；
  同一右栏 tab / 同一视图内切换，不新开座位。

### 4.1 通用库采用度档案（用户门槛：成熟 + 高采用 + 可审计）

| 库 | 周下载 | GitHub ★ | 最后发版 | 维护者 | 许可 | 判定 |
|---|---|---|---|---|---|---|
| `@xyflow/react` | 8,242,396 | 38,477 | 2026-09-01 | xyflow（组织） | MIT | **通过** |
| `motion` | 15,405,315 | 33,704 | 2026-09-23 | motiondivision | MIT | **通过** |
| `@dagrejs/dagre` | 3,121,943 | 5,801 | 2026-08-08 | dagrejs | MIT | **通过** |
| `@formkit/auto-animate` | 1,129,458 | 13,922 | 2026-07-10 | FormKit | MIT | **通过** |
| `elkjs` | 5,564,151 | 2,778 | 2026-07-17 | kieler（学术项目） | **EPL-2.0 OR GPL-3.0-or-later** | **边缘**（许可需确认） |
| `d3-dag` | 30,763 | 1,519 | 2026-07-05 | 个人 | MIT | **边缘**（下载量低两个数量级） |
| `dagre`（旧名） | 1,991,861 | — | **2019-12-03**（停更） | — | MIT | **不合格** ⇒ 用 `@dagrejs/dagre` |

结论：若做 DAG 视图，`@xyflow/react` + `@dagrejs/dagre` 是唯一"百万级下载 + 万级 stars + 近一年发版 + MIT"
的组合；`motion` 可做看板拖拽/过渡。**起步仍建议零依赖**（纯 SVG + CSS 够做 80%），规模上来再按此表引。

## 5. 对设计的决策速览

1. **整页公司视图** → `conversation.view`（新页签，主舞台）；全屏形态可选 `shell.overlay`（空位）。
2. **右栏驾驶舱升级** → 现有 `sidebar.right.pane.tab` + `ctx.sidebarRightTabs`；浮出/收回走 `float`/`dock`（min 220×140）。
3. **任务 DAG / 名册** → `agentTeams.view()`（unary）；**动态流** → `session/follow`（流式，替代 5s 差分轮询）。
4. **成本表达** → `useProjection('tokenUsage'|'sessionStats')`，**只做令牌不做美元**（wire 无金额）。
5. **图/表** → 平台无 mermaid/图表渲染器 ⇒ **自绘 SVG**；现成块（JsonTree/DiffBlock/TerminalBlock）用于细节。
6. **皮肤** → import `ui-primitives` + `--dsw-*` 令牌；**禁写字面颜色**（`docs/web-styling.md`）。
7. **动效** → 自加令牌（`ctx.theme.overrideTokens`）或复用 `--ds-*`；尊重 reduced-motion。
8. **构建前置** → 本包 tsdown **未接 CSS Modules 流水线**（手抄契约），需补；或改用注入式样式。

## 6. 不确定项（未核实，勿当结论）

- Agent Team 弹窗(110) vs 浮窗(60) 的**实际压层**：需浏览器实测。
- 看板插件采用度档案与数据源判定：进行中。
- `dsh-market`/`dsh-im` 的真实打包与依赖声明：vendor 与本仓树内均无，无法引证（只有本仓文档转述）。
- 无单 bundle 字节上限的明文；无图标生成器；wire 无货币成本字段。
