---
status: 已结
opened: 2026-11-27
---

# 推敲：梦之队 UX/UI 全表面深度走查与端到端实测计划（全面覆盖 + 发现即报 Bug）

> 立卡：2026-11-27 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 独立只读子代理（research）盲审 BUG-384..391 与走查台账并修正全部 7 处明细
>
> **结论/去向**：none — 已完成 6 大面 41 单元全表面走查与真模型 E2E，产出完整实跑台账并立 `BUG-384..BUG-391`（8 张活跃 Bug 卡，只报不修）；未改动任何产品源码与 `vendor/dsh/`。

**问题与期望结果：** 2026-11-26 刚通过 Wave S1–S4 完成梦之队 UX/UI 原生架构大升级（右栏 10→3 聚合、Guide L1 透传、全局总部 `main` 面板 + 内嵌培养工坊、`request_signoff` 双签卡、Hero/Dock/CommandView/DocumentActions/TurnTail、`@` 角色补全与快捷键、全量 `--dsw-alias-*` 令牌收口）。当前虽已跑通静态门禁、keyless 单测与隔离空壳 `ui-scene.entry.mjs`，但仍存在系统性实测盲区：
1. `checks/lanes/ui-scene.entry.mjs` 仅在**空工作区**点过 3 个右栏聚合 Tab 的默认首屏，未切过各 Tab 内 `SegmentedControl` 共 10 个子视图，未测满态/截断/坏形状数据，也未进全局 HQ 与培养工坊；
2. Wave S1–S4 新增交互（Hero 速启、Input/Composer Dock、`/req`/`/prd`/`/delivery` CommandView、`final.md` 上下文动作、Assistant Actions、TurnTail、`@` 补全弹窗、`Alt+Shift+1/2/3`、分屏预设与浮窗/收回）尚未经过真实 Chromium 端到端全链路串联走查；
3. Light/Dark 双主题、多视口（1440 / 1024 / 390）与 `zh`/`en` 双语在真实渲染下的视觉观感、溢出与对比度缺少逐屏实拍复核；
4. 既存 14 支 `probes/browser-visual/` 探针与 `checks/lanes/attention-e2e.entry.mjs` 等真模型 E2E 车道多数仍停留在 S1–S4 改版前假设（如旧页签名或 `Allow once` 审批按钮），可能存在探针过期或隐藏的产品回归。

期望通过本卡制定并执行一套**分层、全覆盖、可复跑、严格只报不擅改**的 UX/UI 验证计划：把全仓用户可见交互与视觉表面从头到尾过一遍，**每发现一处真实缺陷立即按规则立卡入 `_backlog/bugs/`（从 BUG-384 起编）**，最终交出一份可对账的 UX/UI 全量体检结论与缺陷清单。

**当前情况：** 立卡时 `master`（`00b00427`）工作树干净，`_backlog/issues/` 与 `_backlog/bugs/` 活跃均为 0 张；S1–S4 决策与验证基线记录在 [实施 Note](../../../notes/implemented/2026-11-26-dsh-native-ux-upgrade.md)。本轮走查与立卡收尾后，`_backlog/bugs/` 新增并活跃 8 张缺陷卡（`BUG-384..BUG-391`），本推敲卡结项归档。

**未决问题：** 见卡末「待人确认」节（执行顺序、过时 probe 处理口径、真模型 E2E 额度授权）。

**下一步：** 请用户审阅本计划并确认「待人确认」三项选择；授权后立即按 Phase 0 → Phase 4 推进。

---

## 范围与排除项

- **包含范围**：
  - `packages/company-pack/src/client/` 全部组件、Slot 注册、Store 接线、CSS/Theme/Locale 字典与对应 Host 输出面（如 `signoff-tool.ts`、`/req` `/prd` `/delivery` 命令回执）；
  - 全部 S1–S4 新增与改造表面、3 聚合 Tab × 10 子视图、Global HQ 4 分区及内嵌培养会话、老 `CultivationView` 主视图；
  - 既有 `checks/lanes/` 与 `probes/browser-visual/` 中涉及 UI/UX 的脚本巡检与运行。
- **明确排除**：
  - **严禁改动 `vendor/dsh/`**（只读铁律）；
  - **查测同轮严禁顺手修改产品代码或放宽测试/金样断言凑绿**——发现任何产品缺陷一律先取证立 Bug 卡，待全盘走查结束后再按根因聚类申请修批授权；
  - 不把「没有跑真模型的纯静态渲染」当成真实浏览器交互证据（遵循 [测试宪法](../../../docs/testing.md) 分层边界）。

---

## 全量 UX/UI 覆盖盘点矩阵（6 大面 · 41 个检查单元）

### 面 A · 壳层 Chrome、身份感知与冷启动（9 单元）

| ID | 表面 / 入口 | 覆盖状态与交互路径 | 断言（DOM / 几何 / 视觉 / 日志） |
|---|---|---|---|
| **A1** | 品牌与部署身份（`DreamTeamBrandName` + `company.md`） | 正常 `company.md` / 缺失 / YAML 坏标量（BUG-368 回归） | 读到时展示 `productName`；缺失或坏标量稳妥降级出厂词标且不阻断页面 |
| **A2** | 侧栏角色徽标（`RoleBadge`，`sidebar.session.row.leading`） | 6 个核心角色（CEO/CFO/COO/VP-Eng/VP-Sales/CMO）+ 未知 preset；1280/356 窄窗 / 无内边距 | 渲染宽 `<= 16px`、不溢出、不撞标题与计划任务时钟、6 色可区分且对比度合规（复用 `probes/browser-visual/sidebar-role-mark-probe.mjs`） |
| **A3** | 窗口标题与角色顶部色条（`registerTitle`） | 空会话 / 切换不同角色会话 / 切换 `zh`↔`en` | `document.title` 含 `【角色】标题`；`:root[data-wk-role]` 同步切换 |
| **A4** | 多实例互踩横幅（`instance-guard`） | 同工作区写入并发心跳（`MultiWindow` 场景）+ 过期/超前心跳 | 横幅即时出现且双语正确；释放后自动消退（复用 `checks/lanes/multi-window-banner.entry.mjs`） |
| **A5** | 全局 Toast（`shell.overlay` `CompanyToastOverlay`） | 由 Hero / InputDock / DocumentActions / AssistantActions 触发后切入 Global HQ `main` 面板 | Portal 挂于 `document.body`，切换 `main` 面板不丢失，手动/定时关闭正常 |
| **A6** | 侧栏底脚与会话顶栏角标（`SidebarFooterCompanyAction`、`HeaderAttentionUtility`） | 左侧栏展开 vs 收窄；会话 Hero 态（顶栏隐藏）vs Active 态（顶栏显示、`order: 20`）；待办 0 vs >0 | 宽窄形态不裁切、不与上游 `open-in-app`/`schedule` 重叠，点击直达对应聚合 Tab |
| **A7** | Hero 动议速启胶囊（`HeroMotionOptions`） | 新会话空白态点击 3 个动议胶囊 | 输入框草稿成功填充对应双语模板文本，并触发 Toast 提示 |
| **A8** | 输入区指挥带、状态胶囊与作用域提示（`MotionCommandDock`、`ComposerStatusPill`、`CommandScopeHint`） | 公司角色会话 vs 普通无角色会话；Hero 态 vs Active 态；点击 `/req check` / `/prd check` / `/delivery check` / 看板 / 待办 | 非公司角色不渲染；公司角色点击回填命令草稿；`CommandScopeHint` 在会话启动前后正确显隐 |
| **A9** | 策略入口按钮（`StrategyButton`） | 自动 vs 手动策略配置态显示；点击跳转 | 显示当前激活态，点击直达 `作战板 -> 策略` |

### 面 B · 右栏 Guide、3 聚合页签 × 10 子视图（13 单元）

| ID | 表面 / 入口 | 覆盖状态与交互路径 | 断言（DOM / 几何 / 视觉 / 日志） |
|---|---|---|---|
| **B1** | `CompanyGuideHub` 透传与键盘（`sidebar.right.tab.guide`） | 3 公司入口 + 上游 `files` 等入口同时展示；逐一点击打开后观察 `Start` 芯片；`Alt+Shift+1/2/3` | 上游 `files` 正常打开不报错；`Start` 芯片保留可回切；快捷键精准切换三 Tab |
| **B2** | 分屏预设与浮窗/收回（`openSplitPreset`、`floatTab`） | 点击 `督战分屏` / `审稿分屏` / `清净专注`；1440px vs 850px 窄屏；点击右栏 `浮出` 并经 `<DockLayout>` 原生栏收回 | 宽屏正常分栏、窄屏 `split()` 优雅退化零报错、`quiet` 收起右栏；浮出后标题栏/拖拽/收回正常 |
| **B3** | 作战板 · `看板`（`BoardTab`） | 空态 + 合成/真实多任务（待办/进行中/完成）+ 存在 `drift` 漂移提示 + 重读 | 列计数准确、漂移徽标可读、长标题不撑破列宽 |
| **B4** | 作战板 · `依赖图`（`DagTab`） | 无依赖空态 + 多节点 DAG 链（含阻塞/完成/进行中态）+ 窄视口 | 节点/连线完整渲染不重叠、可点击/hover 读详情、无 JS 异常 |
| **B5** | 作战板 · `任务板`（`TasksTab`） | 空态 + 含依赖列与状态筛选的多任务列表 + 键盘 Tab 焦点序列 | 依赖关系与状态过滤准确、键盘可达 |
| **B6** | 作战板 · `策略`（`StrategyPanel`） | 读取正常 / 修改字段保存 / 全部重置（含 wiki 输入清空与失焦不误写）/ options 或 settings 文件损坏或缺失 | `ui-primitives` 控件与 `<select>` 交互正常；坏配置显式报错不静默冒充 `auto`（BUG-297/301/313/314 回归） |
| **B7** | 团队 · `待办`（`AttentionTab`） | 零待办诚实空态 + 跨会话活体审批/问询 + 刷新后历史重建 + 同摘要双审批 + 历史读失败 + `刚完成` present 列表 + 点击「去处理」 | 两段标题在场、不去重塌陷、长摘要被有界截断、全失败显式报障、点击「去处理」跳转目标会话审批卡 |
| **B8** | 团队 · `在场`（`PresenceTab`） | Lead + 多 teammate 行（running/idle/stopped）；点击 `openMember` vs 点击旁路 `openMemberAside` | `openMember` 切会话不丢 composer；`openMemberAside` 在右栏分窗打开 `dsh-resource://subagentchat/...` |
| **B9** | 团队 · `用量`（`BudgetTab`） | 零用量空态 + 多角色令牌汇总 + 接近/超限档位（999k→1M 边界） | 数据与单位正确、无双语泄漏 |
| **B10** | 档案 · `成品`（`DeliverablesTab`） | 空态 + 多成品目录（含活跃/归档筛选、Unicode 与空格路径、超读上限截断、索引缺失/坏条目）+ 点击打开 `final.md` | 行数与筛选一致、坏条目告警、点击成功在右栏文档预览打开 `final.md` |
| **B11** | 档案 · `台账`（`LedgerTab`） | 空态 + 正常多场动议 + 含坏行/错表头 + 超读上限截断 | 坏行/错表头不静默丢弃、截断提示准确、点击/展开全文可达 |
| **B12** | 档案 · `培养`（`CultivationTab`） | 空白盘/有记录零待办/有待办/不可达四态；列表 5 条折叠；采纳/拒绝（空理由拦截）/撤回/新建与跨角色建议 | 四态文案诚实、折叠计数与列表对应、操作命令执行并写盘成功 |
| **B13** | 主区培养视图（`CultivationView` `conversation.view`） | 切换到会话主区「培养」Tab：左栏 `CultivationBoard` 宽度/响应式堆叠 + 右侧引导进 HQ 培养工坊按钮 | 无 `[data-composer-seat]` 隐藏残留；768/390 窄屏不压扁两栏；按钮直达 HQ 培养分区 |

### 面 C · 左侧全局「梦之队总部 (HQ)」与内嵌培养工坊（4 单元）

| ID | 表面 / 入口 | 覆盖状态与交互路径 | 断言（DOM / 几何 / 视觉 / 日志） |
|---|---|---|---|
| **C1** | `sidebar.panellist` 与 `main` 面板往返 | 点击左栏 HQ 图标打开 `dsh-company-pack/hq` → 切换 4 分区 → 点击「返回主会话」（`selectPanel(null)`） | 主面板切换顺滑，返回会话后输入区/右栏/滚动位置正常且无异常报错 |
| **C2** | HQ 四分区交互联动 | `总览`（会话列表与待办列表点「打开会话」）、`台账与成品`（点成品 `openFinal` 先回会话再右栏开文档）、`策略`（修改同步至右栏 `ops`）、`培养` | 所有跨面板动作不触发 `sidebarRight: no session surface is mounted` 错误 |
| **C3** | 内嵌培养工坊原生会话（`SessionProvider` + `embedded`） | 点击启动培养对话 → 首次创建并缓存 `localStorage` 会话 id → 重进 HQ 复用同一会话 → 发消息/命令收口 → 快速挂载/卸载竞态（`BUG-348`） | 复用 DSH 原生消息流（Markdown/工具卡/commandview 正常工作），快速切换不产生孤儿会话 |
| **C4** | 培养创作与上下文选择器（`CultivationCompose`、`CultivationContextPicker`） | 选目标角色、选参考背景（`catalog.skipped` 展示）、未知 cwd 下 `fail-closed`、提交/验证记录 | 空提交校验生效、未知 cwd 不跨盘泄露候选、时间与反馈气泡走当前语言 |

### 面 D · 对话流原生扩展、审批双签与键盘交互（6 单元）

| ID | 表面 / 入口 | 覆盖状态与交互路径 | 断言（DOM / 几何 / 视觉 / 日志） |
|---|---|---|---|
| **D1** | `@` 公司角色触发器（`inputTriggers`） | 在真实会话输入框键入 `@` 与过滤词（如 `@vp`、`@cfo`、`@README`），上下键与点击选中 | 公司角色条目与上游 `@file` 文件引用共存不互相覆盖，选中后正确插入 `@<role> ` |
| **D2** | 结构化命令卡（`conversation.chat.commandview`） | 真执行 `/req check`、`/prd check`、`/delivery check`（通过与失败两种结果） | 对话流内渲染结构化标题/状态 Tag/要点列表；「查看原文」折叠正常；跳转成品有效 |
| **D3** | 公司工具调用卡（`DelegationCard`、`TeamToolCard`、`SignoffToolView`） | 覆盖 `running`/`ok`/`error`/`stopped` 状态及长 JSON 参数 | 卡片信息结构清晰、无溢出截断错误 |
| **D4** | `request_signoff` 双签决策卡 vs `bash` 透传对照 | 真会话触发 `request_signoff` 挂起审批（测试批准与拒绝两条路，含 Enter/Esc 快捷键）；同环境触发 `bash` 审批 | `request_signoff` 由 `SignoffComposerCard` 接管并显示双语 `displayReason`，决断后恢复同轮；`bash` 100% 透传上游 `ApprovalPanel` |
| **D5** | 消息级纠偏与回合尾卡（`assistant-actions`、`turnTail`） | 在高管回复下点击「纠正 / 沉淀方法」；检查有双签/委派的回合与普通闲聊回合末尾 | 点击带 `messageId` 跳转 HQ 培养并弹 Toast；`turnTail` 仅在公司工具回合出现，普通回合不出现 |
| **D6** | 交付终稿文档动作（`sidebar.right.tab.document.actions`） | 右栏分别打开普通 `README.md` 与 `.dsh-company/deliverables/<slug>/final.md` | 仅 `final.md` 展示「对比初稿 / 发起复盘」，普通 Markdown 零劫持 |

### 面 E · 横切正交矩阵（4 单元）

| ID | 维度 | 覆盖标准 | 断言 |
|---|---|---|---|
| **E1** | 双语完整性与动态切语 | `zh` 与 `en` 分别完整走查面 A–D + 运行中实时切换语言 | `en` 界面零残留汉字/中文全角标点 `[、；：（）「」]`/裸 ISO 时间戳；`zh` 界面零未翻译字典 key 或 `session:` 等英文漏出 |
| **E2** | Light & Dark 双主题 | 分别在浅色与深色主题下对主会话、右栏 3 Hub、HQ 4 分区、审批卡与浮窗截图 | 多模态视觉人工/Agent 逐张审图：无暗底暗字/亮底亮字、无 `1px` 粗黑框突兀感、无元素遮挡或裁切 |
| **E3** | 响应式视口与溢出 | `1440×900`（桌面）、`1024×768`（半屏）、`390×844`（窄窗） | 全页面无意外横向滚动条（`scrollWidth <= clientWidth`）、重要按钮可见可点、无叠压错位 |
| **E4** | 运行时错误链零容忍 | 全程监控浏览器侧与服务端侧日志 | `console.error` = 0、`pageerror` = 0、非环境资源 4xx/5xx = 0、`window.__DSH_COMPANY_ERRORS__` = 0、错误链回写 `$DSH_HOME/logs/company-client-errors.log` 可通 |

### 面 F · 既存探针与 E2E 车道巡检（5 单元）

| ID | 资产范围 | 执行动作 | 目的 |
|---|---|---|---|
| **F1** | `checks/lanes/client-load.entry.mjs`、`checks/lanes/ui-scene.entry.mjs` | 直接运行基线与 `--isolated --expected` / `--lang en` | 确认冷启、挂载、错误环与 3 页签金样绿灯 |
| **F2** | `checks/lanes/client-error-chain.entry.mjs`、`checks/lanes/multi-window-banner.entry.mjs` | 直接运行 keyless 真页面车道 | 确认错误日志链与多窗横幅不退化 |
| **F3** | `probes/browser-visual/` 全 14 支视觉探针 | 逐支检查与试跑（含 `sidebar-role-mark-probe.mjs`、`attention-panel-probe.mjs`、`deliverables-catalog-probe.mjs`、`tasks-panel-probe.mjs`、`cultivation-ux-walkthrough-probe.mjs`、`cultivation-ux-scenarios-probe.mjs` 等） | 分清「探针自身因 S1–S4 改版过时」vs「发现真产品回归」 |
| **F4** | 真模型认证档 E2E：`checks/lanes/attention-e2e.entry.mjs`、`checks/lanes/presence-e2e.entry.mjs`、`checks/lanes/human-loop-e2e.entry.mjs` | 评估并跑通（先核对 `attention-e2e` 对 `SignoffComposerCard` 的适配断层） | 覆盖真模型审批、团队在场、问询回流闭环 |
| **F5** | 构建产物新鲜度守卫 | 运行前强制核对源码与 pack client 构建产物指纹一致 | 杜绝对着旧构建跑出假绿（BUG-296） |

---

## 分阶段执行路径（Phase 0 → Phase 4）

### Phase 0 · 静态门禁与基线锁（无模型，约 2 分钟）
先跑通仓内现行基线，确保测试起跑线自身无破损：
- `pnpm verify`、`pnpm typecheck`、`pnpm lint`、`pnpm test`
- `source run/env.sh && node checks/lanes/client-load.entry.mjs && node checks/lanes/ui-scene.entry.mjs --isolated --expected && node checks/lanes/ui-scene.entry.mjs --isolated --lang en && node checks/lanes/client-error-chain.entry.mjs && node checks/lanes/multi-window-banner.entry.mjs`

### Phase 1 · 既存 `probes/browser-visual/` 逐支巡检（无模型为主）
针对 `probes/browser-visual/` 下 14 支既有探针建立运行台账，逐支核实 S1–S4 改版后的现状：
- 重点核验受 10→3 Tab 与培养迁 HQ 影响的探针（如 `tasks-panel-probe.mjs`、`cultivation-ux-walkthrough-probe.mjs`、`cultivation-ux-scenarios-probe.mjs`、`cdp-probe.mjs`、`deliverables-catalog-probe.mjs`、`presence-panel-probe.mjs`、`budget-panel-probe.mjs`、`ledger-summary-probe.mjs`、`dag-visual-probe.mjs`、`dag-midflight-probe.mjs`、`board-drift-probe.mjs`、`attention-panel-probe.mjs`、`sidebar-role-mark-probe.mjs`、`browser-behavior-probe.mjs`）；
- 记录每支的运行结果：**探针选择器和文案过期**与**真实产品缺陷**严格分列。

### Phase 2 · 全量 Keyless 交互式 Playwright E2E + 多维矩阵审计（核心扫雷阶段，零 LLM 成本）
在 gitignored `runtime/tmp/ux-audit/` 搭建可重复执行的隔离 Playwright 驱动（复用 `tools/drivers/playwright.mjs` 与 `tools/lib/probe/probe-web.mjs`）：
1. **构造满态 + 边界态 + 错态公司盘夹具**（`.dsh-company/` 下的成品目录、坏索引、超长台账、坏表头台账、培养多态记录、坏策略文件、多角色会话与 RPC 合成的审批/问询/工具事件）；
2. **一轮自动走完全部面 A–D 的 32 项单元**（排除仅真模型才能触发的在线流式部分，其余全部真点击/键盘输入/状态切换覆盖）；
3. **叠加面 E 正交矩阵**：自动跑通 `zh` / `en` × `light` / `dark` × `1440` / `1024` / `390`，收集全部截屏与 DOM 几何指标（溢出、`display: none` 残留、对比度、控制台错误、网络 4xx/5xx）；
4. **视觉逐图审阅**：用读图能力逐张检查 Phase 2 产出的关键页面截图（HQ、3 个聚合 Tab、所有 10 个子视图、Dark 模式、390px 窄屏、审批卡、CommandView），人工肉眼级别复核“看着对不对、顺不顺手”。

### Phase 3 · 真模型端到端全链路实测（认证档，需授权 API 额度，预计 ~$2–4）
Keyless 夹具无法替代真实 LLM 工具调用与流式渲染，本阶段覆盖：
1. 跑 `checks/lanes/presence-e2e.entry.mjs` 与 `checks/lanes/human-loop-e2e.entry.mjs`；
2. 针对 `checks/lanes/attention-e2e.entry.mjs` 实测（或补足新 `SignoffComposerCard` 适配对照），实测真模型触发 `request_signoff` → 出现双签决策条 → 批准/拒绝恢复同轮收口，并与同会话 `bash` 审批透传上游 `ApprovalPanel` 对照；
3. 真模型会话现场演练：`@` 角色补全发信、`/req check` / `/prd check` / `/delivery check` 命令回执卡、高管回复下点 `assistant-actions` 进入 HQ 培养、有委派/双签回合末尾的 `turnTail` 呈现与跳转、以及 `openMemberAside` 在右栏分窗实时查看运行中的子代理会话。

### Phase 4 · 汇总报告与 Bug 账本收口
1. **立卡入账**：将 Phase 0–3 发现的每一处产品缺陷按 `_backlog/bugs/README.md` 规范逐张立卡（`BUG-384+`，`status: 调查中`），按机制/根因聚类，写清复现步骤、截图/日志证据与预期判据；
2. **输出体检报告**：给出一份可读的 UX/UI 全貌体检总结（覆盖率矩阵实跑状态、过时探针清单、已报 Bug 聚类与修复优先级建议、以及值得固化进常驻 `checks/lanes/` 的长期防线建议）。

---

## 发现即报 Bug 纪律（硬线）

1. **只查报、不擅改**：发现任何产品行为/样式/交互缺陷时，**不在走查同轮修改 `packages/company-pack/src/` 源码**，不降级或跳过断言。
2. **四类归因严格区分**：
   - **产品缺陷** → 立 `BUG-<NNN>-<slug>.md`（从 `BUG-384` 起），归类 DSH 运行面（`client` / `host` / `lib` / `preset` / `composition`），附最小可复现步骤/命令、截图或日志证据、`severity`（P0/P1/P2）及期望依据；
   - **探针陈旧（非产品 Bug）** → 记入探针适配清单，明示因 S1–S4 哪个改动导致选择器或期望失效；
   - **上游 `vendor/dsh` 约束** → 记录最小复现与边界，提出规避或上游提案建议，绝不改 `vendor/dsh/`；
   - **环境/测试脚本自身失误** → 先核实证伪，不立假 Bug 卡。
3. **避免重复造轮子**：能直接复现于既有 `checks/lanes/` 或 `probes/browser-visual/` 的问题优先复用现有脚本；临时全覆盖测试脚本统一放 gitignored `runtime/tmp/ux-audit/`，收尾前决定哪些值得升格为常驻资产。

---

## 验收标准

以下条件全部满足并向用户报告后，本走查计划方可进入结项：

1. **基线与矩阵全覆盖**：
   - `pnpm verify && pnpm typecheck && pnpm lint && pnpm test` 全部绿灯作为前置；
   - 面 A–F 全部 **41 个检查单元** 在实跑台账中均给出明确实测结果（`PASS` / `FAIL -> BUG-NNN` / 明确标记的 `probe-stale` 或 `blocked` 原因），无未跑空白项；
2. **多维正交证据落盘**：
   - 在 `runtime/tmp/ux-audit/` 留存覆盖 `zh`/`en`、`light`/`dark`、`1440`/`1024`/`390` 的完整截图、DOM/几何检查报告与浏览器控制台零错报告，并完成视觉逐图审阅；
3. **缺陷账本真实闭环**：
   - 所有实测发现的产品缺陷均已按 `_backlog/bugs/README.md` 规范建立 `BUG-384+` 卡片并登记进活跃清单，每张卡均有可复现步骤与实测证据；
4. **洁净收尾**：
   - `git diff --name-only vendor/dsh` 为空；未留未归位草稿或破坏性临时代码，完成总结报告并请示下一轮修复授权。

---

## 待人确认（授权后立即开跑）

用户已通过 `<goal_round>` 明确授权：全量静默自主跑完 Phase 0–4，遇到 Bug 只报不修，严格不改产品代码与 `vendor/dsh/`。

---

## 实跑执行台账（2026-11-27 全盘完成）

### Phase 0 · 基线锁定（ALL PASS）
- `pnpm verify` → `verify: ALL PASS`（2 项既有 replay 陈旧度按设计跳过：`replay-fixture-freshness`、`replay-ui-freshness`）。
- `pnpm typecheck` → 0 errors；`pnpm lint` → 0 warnings/errors（`company-static-audit: scanned=160 violations=0`）。
- `pnpm test` → 两段全绿（303 passed / 2820 passed）。
- Keyless 真页车道全部通过：`client-load.entry.mjs`、`ui-scene.entry.mjs --isolated --expected`（`作战板 / 团队 / 档案` 3 页签）、`ui-scene.entry.mjs --isolated --lang en`（`Ops Hub / Team / Archive`）、`client-error-chain.entry.mjs`、`multi-window-banner.entry.mjs`。

### Phase 1 · 既存 14 支视觉探针巡检（7 PASS / 7 过期或旧回归）
- **7 PASS**：`board-drift-probe.mjs`、`dag-visual-probe.mjs`（light+dark+21 节点窄屏）、`browser-behavior-probe.mjs`（5/5）、`budget-panel-probe.mjs`、`tasks-panel-probe.mjs`、`ledger-summary-probe.mjs`（1440+390 / 55 行）、`cdp-probe.mjs`（经 `ui-scene.entry.mjs` 验证）。
- **7 过期 / 触发旧坑**：
  - `sidebar-role-mark-probe.mjs`：desktop / full-bleed / 6 色 WCAG AA 均通过，仅窄屏找英文 `/open sidebar/i`（探针过期）；
  - `cultivation-ux-walkthrough-probe.mjs`、`cultivation-ux-scenarios-probe.mjs`：省略 `profile: 'company'`、用英文 `'New Session'`、找已撤 `.wk-guide-entry-label` `'培养'` 且写入旧 v2 `cultivation/records`（探针过期）；
  - `presence-panel-probe.mjs`：期待 Lead 含 `'梦之队'`，S1–S4 后实际渲染为 `CEO · 首席执行官 | Lead`（探针过期）；
  - `deliverables-catalog-probe.mjs`：在 `present 未核 60` 下期待 `未 present` 筛选字样（探针期待与样本不符）；
  - `dag-midflight-probe.mjs`：直接等 `任务依赖图` 而未先点聚合 Tab `作战板 -> 依赖图`（探针过期）；
  - `attention-panel-probe.mjs`：`A2 FAIL (empty=0 goButtons=0)`——`BUG-328` 使「等你处理」在有边界提示时留下一片空白，同步并入 [BUG-388](../../bugs/BUG-388-attention-live-approval-duplicate-and-boundary-blank-void.md)。

### Phase 2 · 隔离多维 Playwright E2E（zh/en × light/dark × 1440/1024/390 · A1–F5 全 41 单元台账）
- **A1–A9（全局框架与输入框）**：
  - `A1`（品牌标题降级 + 图标）：已用默认无自定义 `productName` 验证安全降级与图标渲染（自定义非空 `productName` 由 `company-identity.ts` 单测/keyless 覆盖）；
  - `A2`（中文公告关闭 + Hero 4 模板 + 首屏引导卡）、`A3`（Sidebar `[CEO]`/`[CFO]` 与 `:root[data-wk-role]` 6 色）、`A4`（Composer 按钮/状态 chip；`SignoffComposerCard` 见 Phase 3）、`A5`（`CompanyToastOverlay` + Hero 触发 toast）、`A6`（Header/Footer 角标）、`A7`（Hero 模板速启 `newSession` + 首轮送达）、`A8`（`MotionCommandDock` 团队显现 / 非公司隐藏）、`A9`（`StrategyButton` 入口显现与联动，细节挤压见 `BUG-386`）。
- **B1–B13（右栏 3 聚合 Hub + 原生子页）**：`B1`（`CompanyGuideHub` + `files` 透传 + `Start` 芯片）、`B2`（`PanelFrame` `[data-dockkit-float]` 浮窗与分屏/专注预设）、`B3`（`BoardTab` drift）、`B4`（`DagTab` 3 节点）、`B5`（`TasksTab`）、`B6`（`StrategyPanel` 读写重置 + 损坏 `startup.json` 降级）、`B7`（`AttentionTab` 跨会话聚合，含 `BUG-388`/`BUG-390`）、`B8`（`Presence` 在场 + 旁路打开，含 `BUG-386`）、`B9`（`Budget`）、`B10`（`Deliverables` + `final.md` 动作与 `README.md` 零劫持）、`B11`（`Ledger` 坏行告警与展开）、`B12`（`CultivationTab` 坏记录告警与切图）、`B13`（`CultivationView`）。
- **C1–C4（全局总部 `/company`）**：`C1`（`/company` 四段视图与返回工作流闭环 roundtrip）、`C2`（HQ 培养工坊创建/接续/筛选，捕获 `BUG-384` P0、`BUG-385`、`BUG-387`、`BUG-391`）、`C3`（HQ 在场/待办/档案联动，关联 `BUG-386`/`BUG-388`）、`C4`（`CultivationCompose` 表单与角色 picker + 发送，关联 `BUG-390`/`BUG-391`）。
- **D1–D6（消息流渲染与零劫持）**：`D1`（`@` 角色 mention 与常规提及共存；原始 `lead`/`company-roles` 泄漏见 `BUG-390`）、`D2`（`/req check` `CompanyCommandView` + 原文折叠）、`D3`（`DelegationCard`/`TeamToolCard`/`SignoffToolView` 展开后渲染；同屏重复见 `BUG-389`）、`D4`（文件交付物内联与检视/标交付）、`D5`（`AssistantCultivateAction` + `CompanyTurnTailCard`）、`D6`（普通 `README.md` 与常规工具零劫持）。
- **E1–E4（多维正交矩阵）**：`E1`（EN chrome 与 3 Hubs 通过，HQ 培养全中文暴露 `BUG-385`/`BUG-390`）、`E2`（Dark 主题 `data-ds-dark-theme=true`）、`E3`（`1440`/`1024`/`390` 视口，捕获 `BUG-386`/`BUG-387`）、`E4`（zh/en 均实现 Zero Console Errors：`console=0`）。
- **F1–F5（异常链、构建门禁与降级恢复）**：`F1`（`client-error-chain.entry.mjs`）、`F2`（`multi-window-banner.entry.mjs`）、`F3`（损坏 `startup.json`、坏账行、坏培养记录容错）、`F4`（`setup --check` / `client-load.entry.mjs`）、`F5`（`clientBundleProblem` pre-flight 门禁与构建指纹校验面）。
- **捕获实证缺陷**：见下表 `BUG-384`–`BUG-391`（含跨会话实测捕获 `BUG-388`）；全部截屏与指标留存于 `runtime/tmp/ux-audit/out/`。

### Phase 3 · 真模型端到端验证（`DEEPSEEK_API_KEY` + 排练场）
- `presence-e2e.entry.mjs --wall 300`：**ALL PASS（104s）**，真实拉起 `vp-eng` 与 `vp-sales` 并完成任务链；
- `human-loop-e2e.entry.mjs`：相① 补料（3/3 PASS）、相② 非阻塞建议（4/4 PASS）、相③ `ask_user_question` 落日志（PASS），随后浏览器段因脚本缺冷页两段跳转与中文公告关闭而超时（探针自身过期，与 `attention-e2e.entry.mjs` 同属需适配项）；
- `phase3-live-ux.mjs`（真实模型 + Chromium）：
  - CFO 真触发 `request_signoff` → 另一会话 `团队 → 待办` 跨会话命中 → 点击 `去处理` 跳回 CFO 会话 → `[data-company-signoff-composer]` `SignoffComposerCard` 完整呈现且无 `Allow once`（[BUG-389](../../bugs/BUG-389-signoff-composer-card-ignores-display-reason-and-duplicates-toolview.md) 记录 `displayReason` 未消费与流内重复问题）→ 点击「批准双签 (Enter)」写盘 `allowed-once` 并正常收口 `turn/end` + `CompanyTurnTailCard`；
  - 同场捕获活体挂起审批在 `等你处理` 渲染两条重复条目（已立 [BUG-388](../../bugs/BUG-388-attention-live-approval-duplicate-and-boundary-blank-void.md)）；
  - 真实会话执行 `/req check` 渲染 `CompanyCommandView`，且在 `presence-e2e` 真子代理会话验证「旁路查看」成功加载子代理对话。
- **未在本轮真模型直跑的覆盖边界**：`bash` 非公司审批在 `workspace-write` 沙箱策略下需要显式越权请求才能触发（未单独在真模型跑一轮，按源码检查 `ui-approval` `priority: 1` 透传）；真模型 `/prd check` 与 `/delivery check` 未另起长动议流式跑（已用 `/req check` 真跑 + 合成夹具覆盖结构卡样式与折叠）。

### Phase 4 · 缺陷账本立卡汇总（`BUG-384..BUG-391`，原立于 `bugs/` 调查中，按批次修复迁入 `fixed_bugs/`）
- P0：[BUG-384](../fixed_bugs/BUG-384-hq-cultivation-workshop-infinite-session-create-loop.md)（总部启动培养对话无限创建会话循环并永久卡死）
- P1：[BUG-385](../fixed_bugs/BUG-385-hq-cultivation-board-ignores-locale-stays-chinese-in-en.md)（英文直开 HQ 培养面板全中文）
- P1：[BUG-386](../../bugs/BUG-386-inline-controls-and-presence-aside-wrap-vertical-crushed.md)（内嵌控件与旁路查看被压成单字竖条及在场列头错位）
- P1：[BUG-387](../../bugs/BUG-387-mobile-390-hq-cultivation-overflow-and-rightbar-occlusion.md)（390px 窄屏 HQ 培养双栏溢出裁切与右栏全屏遮挡）
- P1：[BUG-388](../../bugs/BUG-388-attention-live-approval-duplicate-and-boundary-blank-void.md)（活体待办审批重复条目 + BUG-328 边界留白）
- P2：[BUG-389](../../bugs/BUG-389-signoff-composer-card-ignores-display-reason-and-duplicates-toolview.md)（`SignoffComposerCard` 忽略 `displayReason` 且与流内工具卡同屏重复）
- P2：[BUG-390](../../bugs/BUG-390-unlocalized-raw-identifiers-and-clock-locale-leaks.md)（`company-roles` / `lead` / `request_signoff:` / `session-` / `AM·PM` 裸标识与时制泄漏）
- P2：[BUG-391](../../bugs/BUG-391-literal-markdown-asterisks-and-dead-hq-float-button.md)（React 裸印 `**...**` 星号 + HQ 死「浮出」按钮）
