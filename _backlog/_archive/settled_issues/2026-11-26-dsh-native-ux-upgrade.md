---
status: 已结
opened: 2026-11-26
---

# 利用 DSH 原生扩展能力升级梦之队 UX/UI 并清退脆弱 CSS/DOM 债（S1–S4）

> 立卡：2026-11-26 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 授权：用户 2026-11-26 点名“研究透彻后立一个可被 `/goal` 完整跑完的 issue” ｜ 可关闭：是 ｜ 审查：agent（独立只读盲审 [`acae8b6a-0228-4a6e-858a-99dcec14bd87`](conversation://acae8b6a-0228-4a6e-858a-99dcec14bd87) 首轮 4 阻断全清 + 二轮确认 0 架构阻断并清零 3 处 `oxlint` 测试告警）
> **来源调研**：[dsh-native-ux-feasibility](../research/dsh-native-ux-feasibility/README.md) · [可行性与 L0–L3 安全矩阵](../research/dsh-native-ux-feasibility/2026-11-26-dsh-extension-surface-feasibility.md) · [E1–E3 真机/无头实证](../research/dsh-native-ux-feasibility/2026-11-26-live-experiments-e1-e3.md) · [E4 门禁与迁移图谱](../research/dsh-native-ux-feasibility/2026-11-26-gates-and-migration-map-e4.md)
> **结论/去向**：`note` — [实施Note](../../../notes/implemented/2026-11-26-dsh-native-ux-upgrade.md)

---

## 背景与硬性工程约束（`/goal` 执行全程红线）

当前 `packages/company-pack/src/client/` 在扩展点选型、样式规范和模块耦合上存在显著“准魔改”债务，导致用户体验割裂且暗含上游升级破版风险；经 E1–E4 真机与无头实验实证，升级方案**完全无需触碰 `vendor/dsh/`**，也不得依赖私有 DOM/CSS 规则。执行本卡的 Agent 必须全程遵守以下红线：

1. **零 `vendor/dsh/` 修改**：一个字节都不改（`pnpm verify` 强制检查）。
2. **严禁 L2 / L3 碰撞陷阱**：
   - 禁止在 `ctx.uiConversation.groups.register` 二次占用 `'chat'`（L3 运行时抛错）；改用 `ctx.uiConversation.events.register` 与 `conversation.chat.turnTail`。
   - 禁止覆盖 `conversation.approval.detail`（已被 `ui-chat` 占用）与 `sidebar.toggle.badge`（已被 `ui-settings-general` `DesktopUpdateBadge` 占用）。
   - 禁止向 `ctx.documentPreviews.register` 注册 `.md` 后缀（无路径守卫，会劫持全工作区 Markdown）；改用 `sidebar.right.tab.document.actions` 与 `deliverables.file.actions`。
   - 禁止使用 `html[data-dsh-cultivation-view] [data-composer-seat]`、`height: calc(100dvh - 76px)`、`[data-dockkit-float*]`、裸色字面量（`#16111f` 等）、`1px` 中性边框、高于 `500` 的字重及业务组件内直接调用 `useSyncExternalStore`。
3. **打包与运行时白名单纪律（`PLATFORM_MODULES`）**：
   - 仅允许 runtime import 白名单内 11 个包（含 `react`、`@deepseek-ai/cordis`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-primitives` 等）；其余 `@deepseek-ai/dsh-client-*` / `dsh-api-*` 仅允许 `import type`。
   - 新增用到的上游客户端服务包（如 `@deepseek-ai/dsh-client-ui-layout`、`@deepseek-ai/dsh-client-ui-chat`、`@deepseek-ai/dsh-client-ui-input-trigger`、`@deepseek-ai/dsh-client-ui-shortcuts` / `shortcuts`、`@deepseek-ai/dsh-client-resources`、`@deepseek-ai/dsh-client-ui-deliverables`、`@deepseek-ai/dsh-client-ui-approval`）必须同步加入 `packages/company-pack/package.json` 的 `dsh.client.inject`（`platform: "web"`）与 `devDependencies`（`workspace:*`）。
   - 所有跨服务访问必须各自独立包裹在 `ctx.inject([...], scoped => ...)` 回调内（若内层 inject 引用 `'remote.commands'` 等子服务，顶层 `export const inject` 必须声明 `'remote'`）；注意 `createSnapshotStore` 的写接口是 `.set()`/`.update()` 而非 `.setState()`。
4. **双语与原语纪律（`company-ui-change-definition` / `web-styling`）**：
   - 所有新增用户可见字符串必须从首提交就提供 `zh` + `en`（默认 `zh`）并走 `packages/company-pack/src/client/locales.ts`。
   - 优先使用 `@deepseek-ai/dsh-client-ui-primitives`（`Button`、`Tag`、`Pill`、`SegmentedControl`、`Toast`、`DisclosureRow` 等），容器间距/圆角/边框遵循 `0.5px solid var(--dsw-alias-border-l1|l2)`、字重上限 `500`、全套使用 `--dsw-alias-*` 令牌以保证 Light/Dark 双主题一致。
5. **每波结束即检即收口**：按照下面 **S1 → S2 → S3 → S4** 顺序执行；每完成一波，先跑本波验证全绿，再推进下一波；严禁跨波累积未验证变更。

---

## 分波实施规格（S1 → S4）

### Wave S1 · 零破坏增量体验增强（不改 10-Tab 目录，不破旧 Golden）

**目标**：在不触动现有 10 个右栏 Tab 注册表与 `ui.expected.json` 的前提下，率先交付对用户体感提升最显著的 L0/L1 原生增量交互。

- **改动范围与设计**：
  1. **全局状态通知 (`shell.overlay` `list`) + 页头/侧栏状态角标**：
     - 注册 `shell.overlay` 条目渲染 DSH 原生 `Toast`（状态由公司 `SnapshotStore` 驱动，切出主面板不丢失；记住 `Toast` Portal 在 `document.body` 上）。
     - 注册 `conversation.session.header.utilities`（**必须用 `order >= 10`** 避让上游 `ui-open-in-app` `-10` 与 `ui-schedule` `0`，仅在 `active` 会话呈现当前动议/待签批状态徽标）与 `sidebar.footer.action`（冷启动/全局入口计数与快捷呼出）。
  2. **冷启动速启与输入框指挥带 (`conversation.hero.options` & `conversation.input.dock` & `conversation.composer.dock`)**：
     - 在 `conversation.hero.options` 挂公司高频动议模板速启胶囊（新会话 Hero 态即见，点击一键填入或呼起模板）；在 `conversation.input.dock` 挂紧凑型「动议指挥带」（当前阶段、快速命令触发如 `/req`、`/prd`、`/delivery`）；在 `conversation.composer.dock` 挂会话活跃态的轻量协作摘要胶囊。
  3. **结构化命令卡片 (`conversation.chat.commandview`) & 消息一键纠偏 (`conversation.chat.assistant-actions`)**：
     - 为公司斜杠命令（如 `req`、`prd`、`delivery` 等无斜杠 key）注册 `conversation.chat.commandview`，结合 Host 侧返回的可解析/结构化 payload 渲染需求追溯或交付核验卡片（保留纯文本降级）。
     - 注册 `conversation.chat.assistant-actions`（参考 `ui-message-feedback`），在助手回复下方提供「纠正 / 沉淀方法」一键动作（自动带出 `messageId` 与摘要，打开轻量培养/纠偏动作或预填表单）。
  4. **交付物终稿精准动作 (`sidebar.right.tab.document.actions` & `deliverables.file.actions`)**：
     - 仅当 `absolutePath` 匹配 `.dsh-company/deliverables/**/final.md`（或公司交付物目录终稿）时渲染「对比初稿 / 发起复盘」动作按钮，绝不拦截普通工作区 `.md` 预览。
  5. **`request_signoff` 双签决策卡 (`tool.call.toolview` + `conversation.composer` chain + Host `signoff-tool.ts`)**：
     - Host 侧 `packages/company-pack/src/host/commands/signoff-tool.ts` 优化 `signoffReason` / `displayReason` 结构化红线摘要；
     - 对话流内为 `tool.call.toolview`（`key: 'request_signoff'`）渲染高管双签摘要卡；
     - `conversation.composer` chain 以 `priority: 0` + 纯运行态属性鸭子类型判断（`kind === 'approval' && toolName === 'request_signoff' && typeof answer === 'function'`）渲染双签交互决策条并调用 `matched.answer('allowed-once' | 'rejected')`，**其余所有审批（如 `bash`）返回 `null` 100% 透传给上游 `ui-approval`（`priority: 1`）**。
- **配套单测**：在 `tests/client/` 新增覆盖 S1 新槽位的 keyless 测试（含 `conversation.composer` chain 的 `request_signoff` 拦截与 `bash` 透传对照、`.md` 非终稿不渲染 `document.actions`、`locales` 中英双语及 `package.json` inject 核对）。
- **Wave S1 验收门**：`pnpm typecheck && pnpm test && pnpm verify && pnpm lint`。

### Wave S2 · 右栏空间收敛（10→3 页签）+ Guide 作战概览透传 + `@` 补全与快捷键

**目标**：解决 10 个平铺右栏 Tab 触发上游 Guide 折叠阈值（`MAX_DESCRIBED_ENTRIES = 4`）与信息过载问题，同时保持上游 `files`/`browser` 工具无缝可用。

- **改动范围与设计**：
  1. **右栏 10→3 页签架构收敛（配合 `ui-primitives` `SegmentedControl`）**：
     - 在 `packages/company-pack/src/client/tabs/` 下将原有零散会话级页签整合为 3 个高内聚入口（例如：`作战总览/看板与DAG与任务`、`团队编排/在场与待办与用量`、`交付与审阅`；跨会话管理资产预备交由 S3 全局 HQ 承接），统一保证根节点继续携带 `[data-company-tab-title]` 供探针检查。
  2. **`sidebar.right.tab.guide` 链式「作战概览」（L1 严格透传）**：
     - 以 `priority: 0` 注册 `sidebar.right.tab.guide`，仅在有公司上下文/目标场景时匹配，并**动态消费 `ctx.sidebarRightTabs.guide()` 列表**：将所有非 `dsh-company-pack/` 的上游入口（如 `files` 等未来 DSH 新增功能）与 `sidebar.right.tab.guide.actions` 如实透传为一键可点入口（`tab.actions.openTab(entry.kind, { replaceTab: true })`）。
  3. **分屏与子代理旁路视角 (`ctx.sidebarRight.split()` & `subagentchat`)**：
     - 提供「督战 / 审稿 / 清净」分屏快捷动作（严格处理窄屏 `split()` 返回 `undefined` 的退化，不强写像素宽度）；并在非 Conversation `main` 面板下禁用或先 `selectPanel(null)` 后再触发 `sidebarRight.openResource('dsh-resource://subagentchat/...')` 查看高管子会话。
  4. **公司语义 `@` 输入触发器 & 快捷键**：
     - 通过 `ctx.inputTriggers.registerSource({ trigger: '@' })` 暴露公司角色与需求/交付物引用，与上游 `@` 文件引用共存（不独占、无冲突）。
     - 严格按 `vendor/dsh/packages/client/ui-shortcuts` / `shortcuts` 与 `ui-approval` 的 `registerFixed` / 标准注册契约注册公司快捷键，并补齐 `@deepseek-ai/dsh-client-ui-shortcuts` 依赖后用单测证实进目录且不冲突。
- **门禁与测试同步（E4 已锁点）**：
  - 同步更新 `tools/lib/probe/company-tab-catalog.mjs`（若解析模板变化）、`tests/client/company-client-composition.spec.ts`（`COMPANY_TAB_IDS`、`COMPANY_SLOTS`）、`tests/client/tabs/company-tab-registration.spec.ts`（`EXPECTED_TYPES` + Guide 透传单测）。
  - 执行 `node checks/lanes/ui-scene.entry.mjs --isolated --refresh-expected` 刷新 `snapshots/visual/company-shell/ui.expected.json`。
- **Wave S2 验收门**：`pnpm typecheck && pnpm test && pnpm verify && pnpm lint && node checks/lanes/client-load.entry.mjs && node checks/lanes/ui-scene.entry.mjs --isolated`。

### Wave S3 · 左侧全局「梦之队总部」(`main` 面板) + 培养工坊去 Hack 化

**目标**：把跨会话的公司资产（总览/台账/预算/策略/培养工坊）迁出 per-session 右栏，彻底拆除 `[data-composer-seat]` 隐藏与手搓聊天的脆弱债务。

- **改动范围与设计**：
  1. **`sidebar.panellist` + `main` 全局「梦之队 HQ」面板**：
     - 仿照 `ui-schedule`，注册左侧导航项 `sidebar.panellist` 与 `main` 面板（使用 `SegmentedControl` 切换公司总览、预算/台账、策略配置与培养工坊；返回主会话统一调用 `ctx.layout.selectPanel(null)`）。
  2. **培养工坊迁入全局 HQ 并用官方内嵌会话替代手写聊天气泡**：
     - 使用 `sessions.retain` + `<SessionProvider>` + `renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false }, { slots: { views: FixedChatView } })` 在 HQ 内承接培养对话（[`company-hq.tsx`](../../../packages/company-pack/src/client/ux/company-hq.tsx)；E3.1 已真机跑通并保留原生 Markdown/工具卡/命令卡能力），彻底删除原 `CultivationChatPanel` 的手写消息列表与简陋 `<textarea>`。
     - 消除 [CultivationView.tsx](../../../packages/company-pack/src/client/cultivation/CultivationView.tsx) 与 [StrategyPanel.tsx](../../../packages/company-pack/src/client/startup/StrategyPanel.tsx) 中直接调用 `useSyncExternalStore` 的违反纪律做法，改为 Slot `inject` 下的 `hooks` 隔层注入只读快照。
  3. **彻底清除 CSS DOM 劫持规则**：
     - 删除 [styles.ts](../../../packages/company-pack/src/client/ui/styles.ts) 中 `html[data-dsh-cultivation-view]`、`[data-composer-seat] { display: none !important; }` 以及硬编码 `height: calc(100dvh - 76px)`。
- **门禁与测试同步（E4 已锁点）**：
  - 重写 `tests/client/cultivation/cultivation-view.spec.ts` 验证 HQ `main` 面板、`embedded` 会话与 `selectPanel(null)` 往返；
  - 更新 `tests/client/company-client-composition.spec.ts` 校验 `sidebar.panellist` 与 `main` 卸载干净；
  - 检查 `probes/browser-visual/attention-panel-probe.mjs` 如选择器受影响则同步。
- **Wave S3 验收门**：`pnpm typecheck && pnpm test && pnpm verify && pnpm lint && node checks/lanes/client-load.entry.mjs`。

### Wave S4 · 原语全面统一、`web-styling` 与暗黑主题收口、轮次摘要卡 (`turnTail`)

**目标**：清退 `styles.ts` 残留坏味道与原生态表单元素，补全 `conversation.chat.turnTail` 轮次收口，并在 Light/Dark 双主题下通过全门禁与覆盖率棘轮。

- **改动范围与设计**：
  1. **控件原语化**：替换 `StrategyPanel.tsx` 与旧卡片内裸 `<select>`/`<input>`/`<button>` 为 `@deepseek-ai/dsh-client-ui-primitives` 组件。
  2. **`web-styling` 彻底达标**：
     - 清除 `styles.ts` 中全部字面色值（如 `#16111f`），全部使用 `vendor/dsh/packages/client/**/*.css` 中的 `--dsw-alias-*` 令牌；
     - 清除 `1px` 中性边框（改 `0.5px` hairline）及 `> 500` 字重；
     - 清退 `styles.ts` / `company-tabs.tsx` 中的 `[data-dockkit-float*]` 内部 DOM 穿透依赖；
     - 扩展 `tests/client/ui/client-css.spec.ts` 加入反回归规则，机械禁止 `[data-composer-seat]`、`dockkit`、`html[data-dsh-cultivation-view]` 与裸十六进制色值回归。
  3. **会议阶段/Turn 级收口 (`ctx.uiConversation.events` + `conversation.chat.turnTail`)**：
     - 在 Turn 结束节点渲染紧凑的「阶段摘要 / 本轮产物与纠偏跳转」收口条，且严格保证不注册 `uiConversation.groups`（`'chat'`）。
  4. **收尾文档与 Note（按 `agent-note-definition` 与 `close-out-definition`）**：
     - 在 `notes/implemented/` 新建对应实现 Note 记录设计决定、淘汰方案与真红/真绿实跑证据，并回填本卡「落地证据」完成归档迁出与索引同步。

---

## 验收标准

以下所有门禁、回归测试、静态反回归断言及无头/浏览器 Probe 在 S4 完成时必须全部真实通过：

1. **零 Vendor 改动与全仓结构门禁**：
   - `git diff --name-only vendor/dsh` 输出为空。
   - `pnpm verify` 退出码 `0`（全部 gate 通过，包含 `ui-expected-freshness`、`md-links`、`doc-budget`、`preset-sync`、`company-ui-change-definition` 字典完整性）。
2. **类型、Keyless 回归与静态 Lint 全绿**：
   - `pnpm typecheck && pnpm test && pnpm lint` 全部退出码 `0`。
   - `pnpm coverage:ratchet` 达标通过。
3. **浏览器真实挂载与 Golden 场景一致性**：
   - `source run/env.sh && node checks/lanes/client-load.entry.mjs` 退出码 `0`（真实加载无运行时报错）。
   - `source run/env.sh && node checks/lanes/ui-scene.entry.mjs --isolated` 退出码 `0`（与 `snapshots/visual/company-shell/ui.expected.json` 一致，且无多余浮动控制台错误）。
4. **脆债彻底清退（反回归机械断言）**：
   - `rg -n "data-composer-seat|data-dsh-cultivation-view|dockkit-float|#16111f" packages/company-pack/src/client/` 返回 0 匹配（退出码 `1`）。
   - `rg -n "useSyncExternalStore" packages/company-pack/src/client/cultivation/ packages/company-pack/src/client/startup/` 返回 0 匹配。
   - `rg -n "conversation\.approval\.detail|sidebar\.toggle\.badge|uiConversation\.groups" packages/company-pack/src/` 返回 0 匹配。
5. **双语与协作透传验证**：
   - **Given** 新建空白/活跃/交付物/审批四种会话状态与 Light/Dark 双主题；**When** 运行 `tests/client/` 与 `ui-scene.entry.mjs`；**Then** `request_signoff` 命中双签条而 `bash` 仍走上游 `ApprovalPanel`，`sidebar.right.tab.guide` 仍透传并打开上游 `files`，`final.md` 展示交付动作而普通 `README.md` 不劫持，全界面 `zh`/`en` 零缺失键。

---

## 落地证据

- **实现 Note（决定、淘汰方案与完整红→绿验证总帐）**：[实施Note](../../../notes/implemented/2026-11-26-dsh-native-ux-upgrade.md)
- **主要变更文件**：
  - 依赖与声明：[package.json](../../../packages/company-pack/package.json)、[pnpm-lock.yaml](../../../pnpm-lock.yaml)、[src/README.md](../../../packages/company-pack/src/README.md)
  - Host / Shared：[signoff-tool.ts](../../../packages/company-pack/src/host/commands/signoff-tool.ts)（新增 `displayReason: { en, zh }`）、[signoff.ts](../../../packages/company-pack/src/lib/accounting/signoff.ts)（`parseSignoffReason`）
  - Client UX 与装配：[client/index.ts](../../../packages/company-pack/src/client/index.ts)、`packages/company-pack/src/client/ux/`（`register-s1-ux`..`register-s4-ux`、`ambient-chrome`、`command-views`、`company-guide`、`company-hq`、`company-toast`、`company-triggers-shortcuts`、`company-turn-tail`、`contextual-actions`、`signoff-card`）、[locales.ts](../../../packages/company-pack/src/client/locales.ts)、[styles.ts](../../../packages/company-pack/src/client/ui/styles.ts)、[instance-guard.ts](../../../packages/company-pack/src/client/wiring/instance-guard.ts)
  - 右栏 3 页签与去 Hack：[company-hub-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx)、[hub-subview-store.ts](../../../packages/company-pack/src/client/tabs/hub-subview-store.ts)、[company-tab-registration.ts](../../../packages/company-pack/src/client/tabs/company-tab-registration.ts)、[company-tabs.tsx](../../../packages/company-pack/src/client/tabs/company-tabs.tsx)、[startup-handlers.ts](../../../packages/company-pack/src/client/startup/startup-handlers.ts)、[StrategyPanel.tsx](../../../packages/company-pack/src/client/startup/StrategyPanel.tsx)、[CultivationView.tsx](../../../packages/company-pack/src/client/cultivation/CultivationView.tsx)（已删 `CultivationChatPanel.tsx` 与 `cultivation-chat-panel.spec.ts`）
  - 门禁/探针/Golden/单测：[ui-expected.mjs](../../../checks/lib/ui-expected.mjs)、[probe-window.mjs](../../../probes/lib/probe-window.mjs)、[attention-panel-probe.mjs](../../../probes/browser-visual/attention-panel-probe.mjs)、[ui.expected.json](../../../snapshots/visual/company-shell/ui.expected.json)、[coverage-baseline.json](../../../checks/lib/coverage-baseline.json)、`tests/client/**`、`tests/host/index/signoff-tool.spec.ts`、`tests/ui/ui-expected.spec.ts`
- **独立盲审与全量闭环**：独立只读子代理 `acae8b6a-0228-4a6e-858a-99dcec14bd87` 两轮盲审阻断全部清零；`vendor/dsh/` 零变更，`rg` 四条反回归断言全部 0 命中，`pnpm verify`、`pnpm typecheck`、`pnpm lint`、`pnpm dup`、`pnpm test`、`pnpm coverage:ratchet`、`pnpm notes:audit` 与隔离双语真浏览器 `client-load.entry.mjs` + `ui-scene.entry.mjs`（`--expected` 与 `--lang en`）全部通过（见 Note `## 验证` 与收尾回执）。

---

## 抽象度

- **当前抽象定位**：位于具体实现代码与单测之上的端到端任务规格层（按 S1–S4 波次给出精确 DSH 原生槽位契约、碰撞禁区、受影响门禁与可机检验收标准）。
- **未越界到微观实现**：不预先写死组件 JSX 行内代码细节或配色数值，确保 `/goal` 执行模型能在保持架构纪律前提下依据实时 TypeScript 类型报错与测试反馈完成高质量实现。

---

## 关闭条件

1. Wave S1–S4 全部实现合入工作区，`vendor/dsh/` 零变更，且「验收标准」节全部验收命令均以真实通过（非 skip/放宽断言）收口；
2. 已在 `notes/implemented/` 按 `agent-note-definition` 与 `close-out-definition` 落盘实现 Note，含红→绿实跑记录与淘汰方案说明；
3. 本卡「落地证据」节已填实可对账文件路径与命令结果，且本卡与调研归档完成生命周期迁移与索引更新。
