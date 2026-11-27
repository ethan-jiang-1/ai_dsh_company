# Client UI 与 DSH 原生扩展架构（`src/client/`）

> 什么时候读：理解或修改浏览器端（client）扩展架构、DSH 槽位注册、界面布局或文案/样式约束时。
> 上游总纲 = [architecture.md](../architecture.md)；模块与接线详情 = [src/README](../../packages/company-pack/src/README.md)；实施决策 = [2026-11-26-dsh-native-ux-upgrade](../../notes/implemented/2026-11-26-dsh-native-ux-upgrade.md)。

## 1. 总体装配与隔离边界

- **入口与模块组**：`src/client/index.ts`（导出 `apply` 与 `inject = ['slots', 'remote', 'sessions', 'locale']`）在 `apply` 闭包内初始化 `attention`、`hubStore`、`startupStore`（**严禁模块级可变单例**），再按服务可用性独立 `ctx.inject([...], ...)` 装配 `wiring/`、`data/`、`ui/`、`tabs/`、`ux/`、`cultivation/`、`startup/`、`presence/`（组清单 = `src/client/` 目录本身）。
- **自打包与平台白名单**：client 半经 `tsdown` 打包为 `lib/client.js`，`react` 与 `dsh-client-*`/`dsh-api-*` 走浏览器 `PLATFORM_MODULES` 与 `package.json` 的 `dsh.client.inject` 到达边（依赖语义见 [guides/debugging.md §3.9](../guides/debugging.md)）。
- **零 `vendor/dsh/` 修改**：全部交互与界面收敛在 DSH 官方 L0/L1 扩展契约面；禁止重复 `$mount` 官方 `ui-agent-team` 产生的 Team Remote。

## 2. DSH 原生扩展面（S1–S4 现行架构）

| 区域 | 挂载槽位 / API | 现行职责与实现载体 |
|---|---|---|
| **右侧边栏聚合页签** | `sidebarRightTabs.register` + `sidebar.right.pane.tab` / `.title` / `.guide.entry` | `tabs/company-tab-registration.ts` 注册右栏聚合页签：**作战板**（`dsh-company-pack/ops`：看板/依赖图/任务板/策略）、**团队**（`dsh-company-pack/team`：待办审批/团队在场/用量）、**档案**（`dsh-company-pack/archive`：成品目录/台账/培养）；内部用 `ui-primitives` `SegmentedControl` + `hub-subview-store.ts` 切换子视图；浮窗拖放与收回交由 DSH `<DockLayout>` |
| **Guide 透传与分栏** | `sidebar.right.tab.guide`（`priority: 0`） | `ux/company-guide.tsx` 消费 `sidebarRightTabs.guide()`，对非 `dsh-company-pack/` 上游条目（如 `files`）全量透传并调 `tab.actions.openTab(kind)` 保留 `Start` 入口；提供督战/审稿双分栏与 `quiet` 专注预设；在场行支持经 `openSubagentAside` 旁路打开成员子会话 |
| **全局「梦之队总部」HQ** | `sidebar.panellist` + `main`（key: `dsh-company-pack/hq`）+ `company.hq.cultivation.conversation` | `ux/register-s3-ux.ts` 与 `ux/company-hq.tsx` 注册左侧全局总部（总览/台账/策略/培养工坊），返回主会话统一 `layout.selectPanel(null)`；培养工坊通过 `sessions.retain` + `<SessionProvider>` + `renderFactorySlot('conversation.content', { variant: 'embedded' })` 复用 DSH 原生会话（`conversation.view` 保留入口卡片导向 HQ 培养工坊） |
| **会话流、签字与触发** | `tool.call.toolview` · `conversation.composer`（`priority: 0`）· `conversation.chat.turnTail` · `uiConversation.events` | `DelegationCard` / `TeamToolCard` / `SignoffToolView` 渲染工具卡（`priority: -1`）；`SignoffComposerCard` 以鸭子类型精确拦截 `request_signoff` 并消费双语 `displayReason`，非双签审批（如 `bash`）返回 `null` 透传上游 `ApprovalPanel`；`company-turn-tail.tsx` 展示回合收口条 |
| **周边增强与动作** | `shell.overlay` · `conversation.session.header.*` · `sidebar.footer.action` · `conversation.hero.options` · `conversation.input.dock` · `conversation.composer.dock` · `conversation.chat.commandview` · `conversation.chat.assistant-actions` · `sidebar.right.tab.document.actions` · `inputTriggers` · `shortcuts` | `ux/register-s1-ux.ts` 与 `ux/register-s2-ux.ts` 挂接原生 Toast、页头/底栏状态、命令草稿回填与命令视图（`req`/`prd`/`delivery`）、`@` 角色触发与 `Alt+Shift+1/2/3` 快捷键；`document.actions` 仅匹配 `.dsh-company/deliverables/**/final.md`，不劫持普通 Markdown |

## 3. 安全红线（L2/L3 禁区与脆弱债清零）

- **禁碰 L2/L3 独占面**：禁止注册 `uiConversation.groups.register('chat', ...)`（L3 独占抛错）、`conversation.approval.detail`、`sidebar.toggle.badge` 或无路径守卫的 `.md` `documentPreviews`。
- **零脆弱 DOM/CSS Hack**：禁止 `dockkit-float` DOM 穿透、禁止 CSS 隐藏原生输入框、禁止业务组件内 `useSyncExternalStore` 绕过槽 hooks、禁止裸十六进制色值（统一 `--dsw-alias-*` / `--dsw-static-*`）、`> 500` 字重与 `1px` 中性边框（改 `0.5px` hairline）。静态扫描由 `tests/client/ui/client-css.spec.ts` 与 `tests/client/company-client-composition.spec.ts` 强守。

## 4. 数据流、错误回传与双语表达

- **数据读写分离**：读盘经 `remote.workspaceFiles`（带字节上限与显式错误状态，禁止静默空态回退）；人侧动作经 `remote.commands.execute` 发 `/cultivation`、`/company-settings` 等命令，由 host 实施角色闸与持久化。
- **跨会话待办重建**：仅靠事件流对未打开会话零帧；`presence/attention-history.ts` 结合 `installAttentionObservers` 与 `remote.session.page` 投影重建跨会话挂起审批/问询（[D67](../reference/decisions.md#d67)）。
- **双语表达层**：所有公司 Web UI 文案必须 `zh`/`en` 对称（默认 `zh`），集中住 `src/client/locales.ts` typed `company` 字典，角色表达走 `src/client/roles.ts`，禁止组件内硬编码中文/英文标签（修改流程 = `company-ui-change-definition` skill）。
- **错误环回传**：客户端异常捕获进 `window.__DSH_COMPANY_ERRORS__`，由 `error-ring.ts` 节流经 `/company-diagnostics` 追加到 `$DSH_HOME/logs/company-client-errors.log`。
