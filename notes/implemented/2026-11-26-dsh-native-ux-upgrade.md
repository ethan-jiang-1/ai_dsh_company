# 利用 DSH 原生扩展能力升级梦之队 UX/UI 并清退脆弱 CSS/DOM 债（S1–S4）

状态：implemented（2026-11-26）；批准：用户 2026-11-26「研究透彻后，立一个 issue 出来，可以被 `/goal` 完整全部跑完」「严格按照本实施卡硬性红线，按 S1 → S2 → S3 → S4 顺序逐波落地」。

上游 = [已结实施卡](../../_backlog/_archive/settled_issues/2026-11-26-dsh-native-ux-upgrade.md)；依据 = [可行性研究总纲](../../_backlog/_archive/research/dsh-native-ux-feasibility/README.md)（含 [L0–L3 安全矩阵](../../_backlog/_archive/research/dsh-native-ux-feasibility/2026-11-26-dsh-extension-surface-feasibility.md)、[E1–E3 真机实证](../../_backlog/_archive/research/dsh-native-ux-feasibility/2026-11-26-live-experiments-e1-e3.md)、[E4 迁移图谱](../../_backlog/_archive/research/dsh-native-ux-feasibility/2026-11-26-gates-and-migration-map-e4.md)）。

## 决定

在严格遵守**零 `vendor/dsh/` 修改**、**零 L2/L3 碰撞**与 **`PLATFORM_MODULES` 运行时白名单**的前提下，分 S1–S4 四波将梦之队客户端扩展全面迁入 DSH 官方 L0/L1 原生契约面并清退遗留脆弱债：

1. **Wave S1 · 零破坏增量原生槽位**（[`register-s1-ux.ts`](../../packages/company-pack/src/client/ux/register-s1-ux.ts)）：
   - [`company-toast.tsx`](../../packages/company-pack/src/client/ux/company-toast.tsx)：在 `shell.overlay` 注册原生 `Toast`（`createSnapshotStore` 驱动 `.set()`），切至全屏面板不丢通知。
   - [`ambient-chrome.tsx`](../../packages/company-pack/src/client/ux/ambient-chrome.tsx)：注册 `conversation.session.header.utilities`（`order: 20 >= 10`，避让 upstream `-10`/`0`）、`sidebar.footer.action`、`conversation.hero.options`、`conversation.input.dock`（真实调用 `inputActions.setDraft(cmd)` 回填草稿并触发 Toast）与 `conversation.composer.dock`。
   - [`command-views.tsx`](../../packages/company-pack/src/client/ux/command-views.tsx) 与 [`contextual-actions.tsx`](../../packages/company-pack/src/client/ux/contextual-actions.tsx)：接入 `conversation.chat.commandview`（`req`/`prd`/`delivery`）、`conversation.chat.assistant-actions` 与 `sidebar.right.tab.document.actions`（严格仅匹配 `.dsh-company/deliverables/**/final.md`，不拦截普通 Markdown；点击触发 `openCultivation({ messageId / filePath })` 切至全局总部培养工坊并显示来源提示 Toast）。
   - [`signoff-tool.ts`](../../packages/company-pack/src/host/commands/signoff-tool.ts)、[`signoff-card.tsx`](../../packages/company-pack/src/client/ux/signoff-card.tsx) 与 [`signoff.ts`](../../packages/company-pack/src/lib/accounting/signoff.ts)：Host 侧传入原生双语 `displayReason: { en, zh }`；Client 接入 `tool.call.toolview`（`key: 'request_signoff'`）与 `conversation.composer` chain（`priority: 0`；鸭子类型精确匹配 `request_signoff` 并调 `matched.answer`，`bash` 等其他审批 100% 返回 `null` 透传 upstream `ApprovalPanel`）。
2. **Wave S2 · 右栏 10→3 收敛、Guide L1 透传与 `@`/快捷键**（[`register-s2-ux.ts`](../../packages/company-pack/src/client/ux/register-s2-ux.ts)）：
   - [`company-hub-tabs.tsx`](../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx)、[`hub-subview-store.ts`](../../packages/company-pack/src/client/tabs/hub-subview-store.ts) 与 [`company-tab-registration.ts`](../../packages/company-pack/src/client/tabs/company-tab-registration.ts)：将右栏 10 个平铺页签整合为「作战板 (`dsh-company-pack/ops`)」「团队 (`dsh-company-pack/team`)」「档案 (`dsh-company-pack/archive`)」3 个聚合 Tab，内部使用 `ui-primitives` `SegmentedControl` 并保留 `[data-company-tab-title]` 契约。
   - [`company-guide.tsx`](../../packages/company-pack/src/client/ux/company-guide.tsx) 与 [`company-tabs.tsx`](../../packages/company-pack/src/client/tabs/company-tabs.tsx)：`sidebar.right.tab.guide`（`priority: 0`）动态消费 `sidebarRightTabs.guide()`，对非 `dsh-company-pack/` 的上游条目（如 `files`）全量透传并调用 `tab.actions.openTab(kind)`（保留 tab strip 中的 `Start` 入口）；提供督战/审稿双分栏与「清净专注 (`quiet`)」一键收起右栏预设；并在在场面板 teammate 行挂接 `openMemberAside`（先 `selectPanel(null)` 再经 `sidebarRight.openResource('dsh-resource://subagentchat/...')` 旁路开启成员子会话）。
   - [`company-triggers-shortcuts.ts`](../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts)：通过 `inputTriggers.registerSource({ trigger: '@' })` 共存暴露公司角色触发源；按 `ui-shortcuts` 契约使用 `shortcuts.registerFixed` + `observeFixedInput` 注册 `Alt+Shift+1/2/3`。
3. **Wave S3 · 全局「梦之队总部」与培养工坊去 Hack 化**（[`register-s3-ux.ts`](../../packages/company-pack/src/client/ux/register-s3-ux.ts)）：
   - [`company-hq.tsx`](../../packages/company-pack/src/client/ux/company-hq.tsx) 与 [`startup-handlers.ts`](../../packages/company-pack/src/client/startup/startup-handlers.ts)：注册 `sidebar.panellist` 与 `main` 面板（`dsh-company-pack/hq`），承载总览/台账/策略/培养四分区，返回主会话统一调 `layout.selectPanel(null)`。
   - 在总部培养工坊通过 `sessions.retain` + `<SessionProvider>` + `renderFactorySlot('conversation.content', { variant: 'embedded', ... }, { slots: { views: FixedChatConversationView } })` 承接原生培养对话（含 `BUG-348` `cancelled` 守卫），删除旧自造培养聊天面板及其旧单测文件，由 [`cultivation-view.spec.ts`](../../tests/client/cultivation/cultivation-view.spec.ts) 与 [`company-hq.spec.ts`](../../tests/client/ux/company-hq.spec.ts) 承接验证。
   - 清除 `CultivationView.tsx`、`StrategyButton.tsx`、`StrategyPanel.tsx`、`CommandScopeHint.tsx` 与 `startup-store.ts` 内全部业务组件 `useSyncExternalStore` 调用，统一改用 Slot `hooks` 或标准 `useEffect` 订阅；删除 `html[data-dsh-cultivation-view]`、`[data-composer-seat]` 隐藏 Hack 与 `calc(100dvh - 76px)`。
4. **Wave S4 · 原语统一、样式收口与 TurnTail 收口条**（[`register-s4-ux.ts`](../../packages/company-pack/src/client/ux/register-s4-ux.ts)）：
   - [`StrategyPanel.tsx`](../../packages/company-pack/src/client/startup/StrategyPanel.tsx) 输入框与按钮迁至 `ui-primitives` `Input` / `Button`（原生 `<select>` 因 `ui-primitives` 无 `Select` 原语按契约保留）。
   - [`styles.ts`](../../packages/company-pack/src/client/ui/styles.ts)、[`instance-guard.ts`](../../packages/company-pack/src/client/wiring/instance-guard.ts) 与 [`company-tabs.tsx`](../../packages/company-pack/src/client/tabs/company-tabs.tsx)：清除全部 `dockkit-float` DOM 穿透与伪造的浮出态按钮切换（保留安全 `floatTab(tab.id, savedRect)`，浮出后的拖放/收回交由 DSH `<DockLayout>` 原生浮窗标题栏持有）、裸十六进制色值（全用 `--dsw-alias-*`）、`> 500` 字重与 `1px` 中性边框（改 `0.5px` hairline）。
   - [`company-turn-tail.tsx`](../../packages/company-pack/src/client/ux/company-turn-tail.tsx)：注册 `uiConversation.events.register(companyTurnSummaryDefinition)` 与 `conversation.chat.turnTail` list 槽，在回合末尾展示双签/委派状态并可一键打开作战板或档案。
   - [`ui-expected.mjs`](../../checks/lib/ui-expected.mjs) 与 [`probe-window.mjs`](../../probes/lib/probe-window.mjs)：对隔离盘目录生成时间 `\d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC` 归一化为 `<UTC>` 消除跨分钟金样漂移；共享浏览器探针 `openCompanyTab` 适配三合一聚合页签与分段切换。

## 输掉的方案

- **二次占用 `ctx.uiConversation.groups.register('chat', ...)`（L3 禁区）**：DSH 运行时强制单一 target owner，注册会直接抛错；改为 `ctx.uiConversation.events.register` + `conversation.chat.turnTail` 列表槽与上游共存。
- **覆盖 `conversation.approval.detail` / `sidebar.toggle.badge` 或劫持 `.md` `documentPreviews`（L2 禁区）**：会静默屏蔽 `ui-chat` / `DesktopUpdateBadge` 及全工作区 Markdown 预览；改为精确 `conversation.composer` chain (`priority: 0` + 其余 `null` 透传)、`sidebar.footer.action` 与路径守卫 `sidebar.right.tab.document.actions`。
- **接入 `deliverables.file.actions`**：核实上游 `vendor/dsh/packages/client/ui-deliverables/src/client/file-actions.ts` 仅传 `{ actionUrl, available, pending, onAction }`，不携带工作区 `absolutePath` 与文件名，无法在不篡改上游的前提下区分 `.dsh-company/deliverables/**/final.md` 与普通工作区文件，故保留唯一安全且带 `absolutePath` 守卫的 `sidebar.right.tab.document.actions`。
- **继续在 `PanelFrame` 伪造 `useTabInfo().floating` 切换「收回」按钮**：经独立盲审核对 `vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-info.ts` 证实 `SidebarRightTabInfo` 不暴露 `.floating`（该契约无效会导致「收回」按钮与 `pointerup` 永远不可达）；保留合法的 `floatTab` 入口，浮窗收回/拖拽由 DSH 原生 `<DockLayout>` 接管。
- **继续修补自写 `CultivationChatPanel` + CSS 隐藏原生输入框 / `Guide` 传 `replaceTab: true`**：前者阻碍 DSH 会话/Markdown/工具卡能力继承，后者会在真机多页签走查中顶掉 `Start` 回切入口；分别改为原生 `main` 内嵌会话与 `tab.actions.openTab(kind)`。

## 状态事实与载体

| 事实 | 唯一入口 | 读载体 / 写载体 |
|---|---|---|
| Wave S1–S4 装配与服务注入边界 | [`client/index.ts`](../../packages/company-pack/src/client/index.ts) + `register-s[1-4]-ux.ts` | [`package.json`](../../packages/company-pack/package.json) `dsh.client.inject`；各自 `ctx.inject([...])` 独立装配 |
| 签字双语展示与结构化回读 | [`signoff.ts`](../../packages/company-pack/src/lib/accounting/signoff.ts) + [`signoff-tool.ts`](../../packages/company-pack/src/host/commands/signoff-tool.ts) | Host `displayReason: { en, zh }`；Client `SignoffToolView` / `SignoffComposerCard` |
| 右栏三合一集成页签目录与子视图态 | [`company-tab-registration.ts`](../../packages/company-pack/src/client/tabs/company-tab-registration.ts) + [`hub-subview-store.ts`](../../packages/company-pack/src/client/tabs/hub-subview-store.ts) | `tabs` / `slots` 注册 + [`ui.expected.json`](../../snapshots/visual/company-shell/ui.expected.json) 3 页签金样 |
| 全局 HQ 与内嵌培养会话 | [`company-hq.tsx`](../../packages/company-pack/src/client/ux/company-hq.tsx) | `sidebar.panellist` / `main` / `company.hq.cultivation.conversation`；会话 id 按 lead 缓存于 `localStorage` |
| `web-styling` 与零脆债守卫 | [`client-css.spec.ts`](../../tests/client/ui/client-css.spec.ts) | 扫描 [`styles.ts`](../../packages/company-pack/src/client/ui/styles.ts) 与 `src/client/` 禁用 token |

## 落地证据

- **主要改动面**：[`packages/company-pack/package.json`](../../packages/company-pack/package.json)、[`pnpm-lock.yaml`](../../pnpm-lock.yaml)、[`packages/company-pack/src/host/commands/signoff-tool.ts`](../../packages/company-pack/src/host/commands/signoff-tool.ts)、[`packages/company-pack/src/lib/accounting/signoff.ts`](../../packages/company-pack/src/lib/accounting/signoff.ts)、[`packages/company-pack/src/client/`](../../packages/company-pack/src/client/index.ts)（含 `ux/` 12 个模块、`tabs/company-hub-tabs.tsx`、`tabs/hub-subview-store.ts`、`startup/startup-handlers.ts`）、[`packages/company-pack/src/README.md`](../../packages/company-pack/src/README.md)、[`checks/lib/ui-expected.mjs`](../../checks/lib/ui-expected.mjs)、[`probes/lib/probe-window.mjs`](../../probes/lib/probe-window.mjs)、[`probes/browser-visual/attention-panel-probe.mjs`](../../probes/browser-visual/attention-panel-probe.mjs)、[`snapshots/visual/company-shell/ui.expected.json`](../../snapshots/visual/company-shell/ui.expected.json)、[`checks/lib/coverage-baseline.json`](../../checks/lib/coverage-baseline.json)、[`tests/client/`](../../tests/client/company-client-composition.spec.ts)、[`tests/host/index/signoff-tool.spec.ts`](../../tests/host/index/signoff-tool.spec.ts)、[`tests/ui/ui-expected.spec.ts`](../../tests/ui/ui-expected.spec.ts) 等。
- **反回归机械断言**：`rg` 验证 `data-composer-seat|data-dsh-cultivation-view|dockkit-float|#16111f` 在 `src/client/` 0 命中，`useSyncExternalStore` 在 `cultivation/` 与 `startup/` 0 命中，L2/L3 禁用槽名在 `src/` 0 命中，`git diff --name-only vendor/dsh` 为空。

## 验证

- **负控 1（Guide 回切 `Start` 芯片保持）**：Wave S2 初版 `tab.actions.openTab(entry.kind, { replaceTab: true })` 触发真实浏览器 `ui-scene-smoke` 失败（打开第 1 个页签后 `Start` 芯片被替换，无法打开第 2 个页签）；移除 `{ replaceTab: true }` 并保留 [`CompanyGuideHub`](../../packages/company-pack/src/client/ux/company-guide.tsx) 后 `ui-scene.entry.mjs --isolated` 全部 3 页签打开成功。
- **负控 2（S3 令牌与 `BUG-348` / `BUG-308` 反回归）**：Wave S3 初版使用了未定义的 `--dsw-alias-bg-layer-0`，导致 [`client-css.spec.ts`](../../tests/client/ui/client-css.spec.ts) 失败；改为真实令牌 `--dsw-alias-bg-base` 后转绿。[`company-hq.spec.ts`](../../tests/client/ux/company-hq.spec.ts) 对 `BUG-308` 与 `BUG-348` 留存可复现红证。
- **负控 3（S4 影子契约、跨分钟金样漂移与 `coverage-ratchet`）**：`ui-scene` 初跑因聚合「档案」包入实时目录时间戳导致跨分钟金样失败，通过 [`ui-expected.mjs`](../../checks/lib/ui-expected.mjs) `<UTC>` 归一化后 `--expected` 与 `--lang en` 双双 `ALL PASS`；首轮盲审发现 `PanelFrame` 依赖上游不存在的 `useTabInfo().floating` 字段后已删除该影子契约，并补全 `MotionCommandDock` `inputActions.setDraft`、`signoff-tool` `displayReason`、`openCultivation` 上下文回传、`openMemberAside`/`quiet` 分栏与共享探针适配。归档后最终全量复跑全绿：build-client 指纹 6818f8c4823a、pnpm verify ALL PASS、pnpm typecheck 0 errors、pnpm lint 0 warnings/0 errors（静态审计 160 文件 0 违例）、pnpm dup 0 clones、pnpm notes:audit 全 0、pnpm test 303/303 文件 2820/2820 用例、pnpm coverage:ratchet PASS（236 文件）、pnpm test:checks 11/11 PASS、client-load-smoke ALL PASS、ui-scene --isolated --expected 与 --lang en 双双 ALL PASS、vendor/dsh 0 改动。

## 语义审阅

- **首轮盲审（`acae8b6a-0228-4a6e-858a-99dcec14bd87`，HOLD ARCHIVAL → 4 Blocker）**：核对 `vendor/dsh` 与全仓 diff 后指出 ① `PanelFrame` 使用不存在的 `useTabInfo().floating` 影子契约；② `MotionCommandDock` 仅发 toast 未调 `inputActions.setDraft`、`signoff-tool.ts` 未传 `displayReason`、`openCultivation` 丢弃上下文、`openSubagentAside` 与 `quiet` 分栏未接通及 `deliverables.file.actions` 缺失；③ `probes/browser-visual/` 4 支旧探针传退役单页签名；④ 本 Note 引用已删除旧单测路径、提前写终态结论且 `notes-link` 需归档后闭环。
- **二轮盲审与最终清零（`acae8b6a-0228-4a6e-858a-99dcec14bd87`）**：确认上述 4 项架构/功能阻断已全部真实清零（0 架构/契约/L2-L3/`PLATFORM_MODULES`/`vendor` 违例，450 项中英字典完全对称），仅指出二轮新补单测 `tests/client/tabs/company-tabs-body.spec.ts` 中 3 处 `async function*` 缺 `yield` 的 `oxlint(require-yield)` 告警及 3 个未用 `trigger.*` 字典键；已改用 `[Symbol.asyncIterator]` 异步错误迭代并清理未用键，随后完成归档迁出并重跑全量门禁与真浏览器复验全部通过。

## 未覆盖轴

- [covered] S1–S4 全量槽位契约与真 `inject()` 挂载（含 `request_signoff` 拦截与 `bash` 透传对照、Guide 透传、HQ `embedded` 会话、`MotionCommandDock` `setDraft` 与 `TurnTail`） → [`company-client-composition.spec.ts`](../../tests/client/company-client-composition.spec.ts)
- [covered] CSS 令牌真实性、`0.5px` hairline、`<= 500` 字重与禁用脆债反回归扫描 → [`client-css.spec.ts`](../../tests/client/ui/client-css.spec.ts)
- [covered] 真实 Chromium 浏览器挂载、3 页签中英文双语场景与零 runtime/console 错误环 → [`ui-scene.entry.mjs`](../../checks/lanes/ui-scene.entry.mjs)
- [policy] 上游 `deliverables.file.actions` 不提供路径标识、`ui-primitives` 无 `Select` 原语；保持 `sidebar.right.tab.document.actions` 路径守卫与受控原生 `<select>` → [`contextual-actions.tsx`](../../packages/company-pack/src/client/ux/contextual-actions.tsx)
- [environment-gap] 真实大模型在线会话中由 LLM 触发 `request_signoff` 暂停并由人工批准后同轮落稿及真会话 `@` 弹窗键鼠端到端交互（keyless 回归面不调外部 LLM API） → [`signoff-card.spec.ts`](../../tests/client/ux/signoff-card.spec.ts)
