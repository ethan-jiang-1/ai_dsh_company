---
topic: dsh-native-ux-feasibility
intent: 逐项核验 vendor/dsh 客户端扩展点、打包边界与升级安全等级，识别魔改陷阱与现存脆弱债，给出可执行真机实验计划
---

# 不魔改前提下利用 DSH 原生能力的 UX/UI 可行性探索

> **基线**：`vendor/dsh` 钉住版本 `dsh-v0.2.1-rc.5`（`b830ec950faba0a46dda564be3e2d854afed94f1`）；本仓包 `dsh-company-pack@0.11.10`。
> **口径区分**：本文标注「已源码证实」的结论均来自本轮核读的 `vendor/dsh` 与 `packages/company-pack` 源码；E1–E4 真机/无头实证与影响盘点已全部完成，详实数据见 [E1–E3 真机与无头实证](2026-11-26-live-experiments-e1-e3.md) 与 [E4 门禁与波次图谱](2026-11-26-gates-and-migration-map-e4.md)。

---

## 一、升级安全分级标准（L0–L3）

为了确保 DSH 未来升级（如新增壳层能力、内置工具、默认面板或样式重构）时，梦之队能够**自然继承上游能力而不发生冲突或静默失效**，将所有客户端扩展手段分为四个升级安全等级：

| 等级 | 语义 | 允许的接入方式 | 升级行为 |
|---|---|---|---|
| **L0 · 纯增量官方扩展**（推荐） | 占自己独立命名空间或开放增量列表槽 | `list` 槽注册新 `id`；未占用 `keyed` 槽注册本包专属 `key`；`ctx.sidebarRightTabs.register`（新 `kind`）；`ctx.resources.register`（新协议）；`ctx.shortcuts.register`；`ctx.inputTriggers.registerSource`；`ctx.uiConversation.events.register`；消费 `PLATFORM_MODULES` 原语与 `--dsw-alias-*` 令牌 | 上游新增任何同槽条目、默认能力或样式变量时，本包增量共存，零冲突继承 |
| **L1 · 受控协作扩展**（须守透传/精确匹配契约） | 与上游共享同一选择链或开放键空间 | `chain` 槽（如 `sidebar.right.tab.guide`、`conversation.composer`）只精确匹配本域对象，其余一律 `return null`，且组合面动态读取上游注册表（如 `ctx.sidebarRightTabs.guide()`）而非硬编码列表；`tool.call.toolview` 仅注册精确工具名 | 上游新增页签入口或新的交互型卡片时，仍自动透传并渲染，不被本包“一刀切”遮蔽 |
| **L2 · 高风险覆盖**（原则禁用） | 替换上游已有默认占位的 `single` 槽或劫持通用文件后缀 | 覆盖已有官方实现者的 `single` 槽（如 `conversation.approval.detail`、`sidebar.toggle.badge`）；在 `ctx.documentPreviews.register` 中匹配 `.md` 等通用后缀 | 上游后续升级这些默认表面时会被本包静默屏蔽，或全工作区普通文件被公司专用渲染器劫持 |
| **L3 · 明确不可行 / 禁止魔改** | 违反平台唯一性约束、改 `vendor/` 或依赖私有 DOM/CSS | 向已占用的 target（`'chat'`）注册第二个 `ConversationGroupDefinition`（运行时直接 throw）；修改 `vendor/dsh/`；用 CSS 选择器隐藏壳层元素或写死壳层像素高度 | 运行时崩溃或上游一次重构即直接破版 |

---

## 二、本仓现存 UI 脆弱债（“准魔改点”）盘点

源码审查发现，当前 `packages/company-pack/src/client/` 已经积累了若干**依赖壳层内部实现或绕过 DSH 原生能力**的脆弱实现，后续 UX 改造应把它们一并清退：

1. **CSS 强隐藏原生输入区 + 硬编码顶栏高度**（最高风险）
   - **现状**（已源码证实）：[styles.ts](../../../../packages/company-pack/src/client/ui/styles.ts#L642-L650) 使用 `html[data-dsh-cultivation-view] [data-composer-seat] { display: none !important; }` 隐藏 DSH 主输入区，并写死 `height: calc(100dvh - 76px)` 来撑开 [CultivationView.tsx](../../../../packages/company-pack/src/client/cultivation/CultivationView.tsx)。
   - **风险**：依赖 `ui-conversation` 的内部 DOM 属性 `[data-composer-seat]` 和固定 `76px` 顶栏高度；DSH 一旦调整头部高度、移动 composer 挂载点或平台窗口栏（macOS/Windows titlebar clearance），页面即错位或双输入框打架。
   - **L0 退路**：将跨会话的「培养工坊」迁入左栏全局 `main` 面板（`main` 槽本身与会话 composer 彻底隔离），不再占 `conversation.view` 与全局 composer 抢位置。

2. **绕过 DSH 对话系统手搓独立聊天框**
   - **现状**（已源码证实）：原 `CultivationChatPanel.tsx`（已在 Wave S3 迁入 [company-hq.tsx](../../../../packages/company-pack/src/client/ux/company-hq.tsx)）直接调用 `sessions.create` + `retain` 后手写 `rowsOf(entries)` 折叠文本、简陋气泡和原生 `<textarea>`；同时组件内直接调用 `useSyncExternalStore`（在 [CultivationView.tsx](../../../../packages/company-pack/src/client/cultivation/CultivationView.tsx) 与 [StrategyPanel.tsx](../../../../packages/company-pack/src/client/startup/StrategyPanel.tsx) 也有同样用法）。
   - **风险**：① 丢掉了 DSH 原生聊天区的 Markdown 渲染、工具卡、审批/问询交互与流式代码高亮，DSH 升级对话能力时它完全吃不到红利；② 违反 [vendor/dsh/packages/client/AGENTS.md](../../../../vendor/dsh/packages/client/AGENTS.md#reactive-read-and-contract-currency-discipline) 响应式纪律（业务组件不应手写 `useSyncExternalStore`，应走框架绑定的 `hooks` 隔层）。
   - **L0 退路**：复用 `dsh-resource://subagentchat/...` / 官方会话打开方式承接培养会话，或通过槽注册的 `hooks` 隔层注入只读快照。

3. **穿透 `dockkit` 内部属性做浮窗样式与 Z-index 修复**
   - **现状**（已源码证实）：[styles.ts](../../../../packages/company-pack/src/client/ui/styles.ts#L623-L637) 依赖 `[data-dockkit-float-title]`、`div:has(> section[data-dockkit-float])` 和 `[data-dockkit-float-active]`（以及 [company-tabs.tsx](../../../../packages/company-pack/src/client/tabs/company-tabs.tsx#L87) `closest('[data-dockkit-float]')`）。
   - **风险**：[sidebar-right.md](../../../../vendor/dsh/docs/subsystems/sidebar-right.md) 明确声明 `dsh-client-ui-dockkit` 是内部布局引擎、并非稳定对外契约；若上游改变浮窗 DOM 结构或修复了自身 z-index，这类 `:has(> section[...])` 覆盖可能失效或产生反向层级遮挡。
   - **处置**：减少对“大量手动浮窗”的依赖（10→3 页签收敛 + 一键分屏即可大幅降低浮出需求）；必要时将状态感知识别收敛为单一探测点并保留降级。

4. **脱离 `ui-primitives` 与 `web-styling` 规范的全局 raw CSS**
   - **现状**（已源码证实）：876 行全局样式集中于 [styles.ts](../../../../packages/company-pack/src/client/ui/styles.ts)，存在硬编码颜色 `#16111f`（[styles.ts:790](../../../../packages/company-pack/src/client/ui/styles.ts#L790)）、`1px` 实线边框、字重 `600/650`、`9px–10.5px` 过小字号；[StrategyPanel.tsx](../../../../packages/company-pack/src/client/startup/StrategyPanel.tsx#L111-L149) 使用裸 `<select>` / `<input>` / `<button>` 而非 `ui-primitives`。
   - **对比上游规范**：[web-styling.md](../../../../vendor/dsh/docs/web-styling.md#component-rules) 与 [dsh-client-ui-ux](../../../../vendor/dsh/.agents/skills/dsh-client-ui-ux/SKILL.md#visual-foundation) 要求：禁止字面色、中性边框用 `0.5px` hairline、常规特征 UI 字重上限 `500`、优先复用 [ui-primitives](../../../../vendor/dsh/packages/client/ui-primitives/README.md#component-catalog)（`Button`、`Input`、`SegmentedControl`、`Pill`、`Tag`、`StateDot`、`DisclosureRow`、`MarkdownText`、`HoverCard`、`Tooltip`、`Toast`）。

5. **10 个平铺右栏页签超出官方 Guide 阈值且错配生命周期**
   - **现状**（已源码证实）：[company-tab-registration.ts](../../../../packages/company-pack/src/client/tabs/company-tab-registration.ts#L83-L194) 在 `sidebar.right.pane.tab` 平铺 10 个页签，导致 [GuideBody.tsx](../../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/tabs/guide/GuideBody.tsx#L62) 的 `MAX_DESCRIBED_ENTRIES = 4` 触发描述全折叠；同时把「台账」「成品」「培养」「策略」等跨会话/项目级资产塞进刷新默认折叠的 per-session 右栏（[sidebar-right.md](../../../../vendor/dsh/docs/subsystems/sidebar-right.md#not-built)）。

---

## 三、12 项拟议 UX 能力的源码级可行性矩阵

| # | 拟议 UX 能力 | 目标 DSH 扩展点 / 原语 | 安全等级 | 可行性结论与源码依据 |
|---|---|---|---|---|
| 1 | 左侧全局「**梦之队总部**」面板（编制 / 动议与成品 / 培养 / 策略） | `main` (`keyed, root`) + `sidebar.panellist` (`list, root`) | **L0** | **已源码证实可行**。官方先例见 [ui-schedule](../../../../vendor/dsh/packages/client/ui-schedule/src/client/index.ts#L168-L184)；主区切出后仍保持背景态，天然与单会话解耦。 |
| 2 | 右栏 10→3 页签收敛（作战板整合 看板/DAG/任务表；团队整合 在场/待办/用量） | `ctx.sidebarRightTabs.register` + `ui-primitives` `SegmentedControl` | **L0** | **已源码证实可行**。[ui-primitives](../../../../vendor/dsh/packages/client/ui-primitives/README.md#component-catalog) 原生提供 `SegmentedControl`（tablist 键盘导航 + 滑动指示器）。 |
| 3 | 右栏默认页「**当前动议作战概览**」 | `sidebar.right.tab.guide` (`chain, session`) | **L1** | **已真机实证（E1.2）**。通过 `sidebarRightTabs.guide()` 读取并过滤非公司条目可原生透传 `files`（`filesOpened: true`），不会遮蔽上游后续新增工具；但仅在右栏激活且需避免劫持显式打开的其他页签。 |
| 4 | 右栏分栏查看高管/成员现场（不踢走 CEO 主会话） | `dsh-resource://subagentchat/session/<child>?parent=<parent>&mode=<mode>` + `openResource(..., { preferNewPane: true })` | **L0** | **已真机实证（E3.2）**。真实挂载打开 `subagentchat`（`sidebarChatCount: 1`）；约束：仅当主区处于 Conversation（而非全局 `main` 面板）时可调用 `sidebarRight.openResource`。 |
| 5 | 一键「**作战分屏布局**」（督战 / 审稿 / 清净） | `ctx.sidebarRight.split()` / `openTab` / `openResource` / `toggleExpanded` | **L0** | **已真机实证（E3.2）**。1440px 视口返回新 pane id（`pane4`），850px 窄屏自动返回 `null` 优雅退化，无需任何硬编码宽度。 |
| 6 | 输入区「**动议指挥带**」与空白态动议速启卡 | `conversation.input.dock` (`list, session`) + `conversation.composer.dock` (`list, session`) + `conversation.hero.options` (`list, session`) | **L0** | **已真机实证（E1.3）**。`hero.options` 与 `input.dock` 在冷启动 Hero 态即挂载；`composer.dock` 仅在 `active` 态渲染；`Tag` 会丢弃自定义 `data-*` 属性需容器包裹。 |
| 7 | 全局环境提醒与待办角标（Toast + 头部徽标） | `shell.overlay` (`list, root`) + `conversation.session.header.utilities` (`list, session`) + `sidebar.footer.action` (`list, root`) | **L0** | **已真机实证（E1.3 / E1.4）**。避开 `sidebar.toggle.badge`（`DesktopUpdateBadge` L2 碰撞）。`shell.overlay` `Toast` 经 Portal 挂 `document.body` 可跨越 `main` 切换持续显示；`header.utilities` 仅在 `active` 态渲染，且须用 `order >= 10` 避让上游 `open-in-app` (`-10`) 与 `schedule` (`0`)。 |
| 8 | `request_signoff` 专属**高管双签决策卡** | `tool.call.toolview` (`key: 'request_signoff'`) + `conversation.composer` (`chain, session`, `priority: 0`) | **L0 / L1** | **已无头实证（E2）+ 源码证实**。避开 `conversation.approval.detail`（`single` 冲突报错）。`e2-verify.ts` 证实：`conversation.composer` `priority: 0` 用纯字段鸭子类型识别 `request_signoff` 可零耦合胜出并正常调用 `answer()` 结算，而 `bash` 自动透传至 `priority: 1` `ApprovalPanel`；对话流内 `tool.call.toolview` 亦在 E1.6 真机出卡。 |
| 9 | 对话流降噪与「**会议阶段摘要卡**」 | **禁用** `uiConversation.groups.register`；改用 `ctx.uiConversation.events.register` + `conversation.chat.turnTail` (`list, session`) | **L3 禁区 → L0 正路** | **已真机实证（E1.6）**。不可二次占用 `'chat'` 的 `ConversationGroupDefinition`（L3）。实测 `conversation.chat.turnTail` 在 Turn 完成后正常渲染（`turnTailsRendered: [1]`）。注：手造 `assistant/message` 事件须携带 `stream` 数组以兼容 `deriveTurnTokenUsage`。 |
| 10 | `final.md` 审稿增强与**需求追溯矩阵** | `sidebar.right.tab.document.actions` (`list`) + `deliverables.file.actions` (`list`) + 独立页签/协议 + `conversation.chat.commandview` (`keyed, session`) | **L0** | **已真机实证（E1.5 / E1.8）**。保留原生 Markdown 预览（禁用 `.md` `documentPreviews` 劫持）；实测 `document.actions` 在普通 `README.md` 命中 0 次、在 `final.md` 命中 1 次；`conversation.chat.commandview` 精确接收无斜杠 command `key` 与 Host `outcome.text`。 |
| 11 | 公司语义 `@` 补全与原生快捷键 | `ctx.inputTriggers.registerSource` + `ctx.shortcuts.register` / `registerFixed` | **L0** | **已真机实证 `@`（E1.7）/ 快捷键待对齐**。`@` 补全与上游 `@README.md` 共存（`mentionMenuHasVpEng/Req001/Readme` 全真）；`shortcuts.register` 注入返回 `ok: true` 但实验探针 `shortcutInCatalog: false`，S2 需按 `ui-approval` / `ui-theme` 的 `registerFixed` 与 `@deepseek-ai/dsh-client-ui-shortcuts` 契约对齐并在 `tests/client/` 实测。 |
| 12 | 消息级「**一键纠正 / 沉淀方法**」 | `conversation.chat.assistant-actions` (`list, session`) | **L0** | **已真机实证（E1.6）**。Turn 结束后正确渲染并与对应 `messageId` 绑定（`assistantActionsRendered: ["msg-uxlab-4"]`）。 |

---

## 四、构建、模块边界与 `PLATFORM_MODULES` 约束（已源码证实）

要在**零魔改**前提下合法接入上述 L0/L1 能力，必须严格遵守 DSH 客户端模块表与 `dsh-company-pack` 打包契约：

1. **运行时外部化白名单（`PLATFORM_MODULES`）**
   - [vendor/dsh/packages/client/web/src/platform.ts](../../../../vendor/dsh/packages/client/web/src/platform.ts#L8-L15) 规定壳层只向全局模块表注入以下 11 个包名：
     `react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、`zod`、`@tanstack/react-virtual`、`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-slots`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-dockkit`。
   - **约束**：[packages/company-pack/tsdown.config.ts](../../../../packages/company-pack/tsdown.config.ts#L34-L38) 把 `/^@deepseek-ai\/dsh-client-/` 与 `/^@deepseek-ai\/dsh-api-/` 设为 external。按 [vendor/dsh/packages/client/AGENTS.md](../../../../vendor/dsh/packages/client/AGENTS.md#export-discipline-client-plugin-packages) 规则，**除 `PLATFORM_MODULES` 之外的任何 `@deepseek-ai/dsh-client-*` / `dsh-api-*` 包严禁 runtime import（只许 `import type`）**，否则浏览器加载 `lib/client.js` 时模块表找不到对应工厂会直接启动失败。一切能力必须经 `ctx.inject([...])` 注入服务或 `ctx.slots.inject(...)` 访问。

2. **依赖与清单对齐点**
   - [vendor/dsh/packages/bundle/web-app/cordis.patch.yml](../../../../vendor/dsh/packages/bundle/web-app/cordis.patch.yml#L254-L460) 已默认挂载 `ui-layout`、`ui-sidebar`、`ui-sidebar-right`、`ui-sidebar-documentpreview`、`ui-conversation`、`ui-chat`、`ui-tool`、`ui-deliverables`、`ui-approval`、`ui-input-trigger`、`ui-subagent`、`resources`、`shortcuts`、`ui-shortcuts`、`ui-message-feedback`。
   - 当前 [packages/company-pack/package.json](../../../../packages/company-pack/package.json#L166-L179) 的 `dsh.client.inject` 仅列出了 10 个基础包；若后续新消费 `resources`、`shortcuts`、`ui-input-trigger`、`ui-layout`、`ui-approval`、`ui-deliverables` 或 `ui-chat` 的类型与服务，需同步补全 `devDependencies`（`workspace:*`）与 `dsh.client.inject` 信息边，并在 `apply(ctx)` 做好可选/独立 `ctx.inject` 边界（避免单一服务缺席拖垮整包挂载）。
   - 注意 headless 组合兼容：本仓 `company-client` 在无浏览器服务的组合里不应阻塞 host 启动；client 侧各特性也应按模块分别 `ctx.inject`，参考当前 [src/client/index.ts](../../../../packages/company-pack/src/client/index.ts#L69-L70) 将 `registerToolCards` 与 `registerCompanyTabsWiring` 拆开注入的做法。

---

## 五、E1–E4 实验实证与结论收口（已完成）

E1–E4 已全部完成真实挂载实验与静态门禁审计（均在零改动 `vendor/dsh` 与 `packages/company-pack` 下运行并留证）：

| 实验 | 验证核心问题 | 实证摘要与结论 | 详实材料 |
|---|---|---|---|
| **E1 · 核心扩展槽真机冒烟** | 8+ 个原生扩展点在真实 `dsh --profile company` + Chromium 下的真实渲染、事件回调与共生状态 | 零运行时/控制台报错通过；实证发现 `composer.dock` / `header.utilities` 仅在 `active` 态出现、`Toast` Portal 挂载 `body`、`selectPanel(null)` 回会话、`shortcuts.register` 须对齐 `ui-shortcuts` 契约 | [2026-11-26-live-experiments-e1-e3](2026-11-26-live-experiments-e1-e3.md) |
| **E2 · `request_signoff` 双签卡边界** | 不导入私有类下 `conversation.composer` chain (`priority: 0`) 拦截与透传是否可行 | 无头真实 `SlotCore` + `PendingApproval` 全绿验证：`request_signoff` 由 `priority: 0` 精确拦截并结算，`bash` 自动透传至 `priority: 1` `ApprovalPanel` | [2026-11-26-live-experiments-e1-e3](2026-11-26-live-experiments-e1-e3.md) |
| **E3 · 培养去 Hack 化可行性** | Global HQ `main` 面板内通过 `SessionProvider` + `conversation.content` (`embedded`) 替代 CSS/手搓聊天 | 实测 `readyCount: 1, embeddedConvState: "rendered", composerSeatsInDom: 1, commandViewInsideEmbedded: 1`，证明可彻底删除 `[data-composer-seat]` 隐藏 Hack 与 `CultivationChatPanel` 手写聊天列表 | [2026-11-26-live-experiments-e1-e3](2026-11-26-live-experiments-e1-e3.md) |
| **E4 · 门禁与渐进迁移影响图谱** | 盘点 `checks/gates`、`tests/client`、`cdp-probe` 与 `ui.expected.json` 的锁定范围与升级策略 | 拆定 S1（零破坏增量）→ S2（右栏 10→3 + Guide 透传）→ S3（Global HQ + 培养迁入去 Hack）→ S4（原语与 `web-styling` 收口）四波实施路径，并输出可执行 Issue | [2026-11-26-gates-and-migration-map-e4](2026-11-26-gates-and-migration-map-e4.md) |

**最终定性结论**：完全可行且收益显著，已立可执行 `/goal` Issue 卡：[2026-11-26-dsh-native-ux-upgrade](../../settled_issues/2026-11-26-dsh-native-ux-upgrade.md)。
