---
topic: dsh-native-ux-feasibility
intent: Record empirical runtime findings from isolated DSH live browser experiments (E1, E3) and headless chain slot verification (E2), including exact observed gotchas and Go/Constraint verdicts.
---

# E1–E3 真机与无头实验实证报告

> 本材料记录在**零改动 `vendor/dsh/` 与 `packages/company-pack/`**的前提下，基于隔离研究插件（`runtime/tmp/ux-lab/`）挂载真实 `dsh --profile company`（Web 观察窗 + Chromium）以及无头真实 `SlotCore` + `PendingApproval` 跑通 E1–E3 的全量实证结果。

## 1. 实验装置与基线

- **隔离沙盒**：`DSH_HOME`、`DSH_COMPANY_HOME`、`dsh-ux-lab` 测试插件与 `report.json` 均限制在 gitignored `runtime/tmp/ux-lab/`，未修改仓库受控代码。
- **双插件真实挂载**：通过 `dsh plugin --profile company add` 同时加载 `packages/company-pack` 与 `runtime/tmp/ux-lab/plugin`，`dsh --profile company` 启动后实测 `booted: true`、`consoleErrors: []`、`companyErrors: {}`（`lab.errors: []`，全部 9 项 inject 模块 `locale`、`shell.overlay`、`main+panellist`、`sidebarRight`、`conversation-slots`、`inputTriggers`、`shortcuts`、`remote.commands`、`theme` 均 `{ ok: true, detail: null }`）。

---

## 2. E1 & E3：真机浏览器实证结果（Chromium + 真实 DSH Web）

| 实验项 | 目标扩展面 / API | 实测观测结果 | 判定与工程约束 |
|---|---|---|---|
| **E1.1 全局 HQ + 内嵌原语** | `sidebar.panellist` (`list`) + `main` (`keyed`) + `@deepseek-ai/dsh-client-ui-primitives` (`SegmentedControl`, `Button`, `Tag`) | `hqVisible: true`、`segResult: true`，点击返回 `ctx.layout.selectPanel(null)` 后 `backToChatMounted: 1` | **Go**：切换 conversation 面板必须传 **`selectPanel(null)`**（传 `'conversation'` 无效/被拒绝）。`Tag` 组件仅接受 `{ tone, className, children }` 并会丢弃自定义 `data-*` 属性，需外层元素承担测试属性。 |
| **E1.2 右栏 Guide 链式透传** | `sidebar.right.tab.guide` (`chain`, `priority: 0`, reading `sidebarRightTabs.guide()`) | `guideHubCount: 1`，读取到非公司条目 `passthroughKinds: ["files"]`，点击透传按钮成功打开文件树（`filesOpened: true`） | **Go with Constraint**：右栏默认启动时可能未展开；透传入口必须按 `providerId` 过滤保留上游非公司条目，且不应劫持用户主动切换出的其他 Tab。 |
| **E1.3 阶段感知扩展槽与脚手栏** | `conversation.hero.options`, `conversation.input.dock`, `conversation.composer.dock`, `conversation.session.header.utilities`, `sidebar.footer.action` | 冷启动 Hero 态：`heroOptions: 1, inputDock: 1, footerAction: 1, composerDock: 0, headerUtility: 0`；经 `/uxlab seed` 转入 `active` 态后：`inputDock: 1, composerDock: 1, headerUtility: 1` | **Go with Constraint**：`conversation.composer.dock` 与 `conversation.session.header.utilities` **只在 `phase === 'active'` 渲染**（Hero 态隐藏）；且上游 `ui-open-in-app` (`order: -10`) 与 `ui-schedule` (`order: 0`) 已占用 `header.utilities`，公司条目应避让 `order` 冲突（如 `order: 10+`）。 |
| **E1.4 跨面板全局通知** | `shell.overlay` (`list`) + `Toast` | 触发通知后切换至 `main` 面板，切前 `toastBeforeSwitch: true`、切后 `toastAfterSwitch: true` | **Go**：`Toast` 通过 Portal 挂载在 `document.body` 上，可跨越 `main` 面板切换持续显示，但局部面板内断言不到、需在全局根查询。 |
| **E1.5 结构化指令卡片** | `conversation.chat.commandview` (`keyed`, `key: 'uxlab'`) | 执行命令转入 `active` 后 `commandViewDomCount: 1`，正确收到 `node.outcome.text`（`UX Lab CommandView [uxlab]: {"ok":true,...}`） | **Go with Constraint**：1) 当会话处于无工作区或无模型阻断态时（`contenteditable="false"`），经 `remote.commands.execute` 执行会返回 `ok: true`；2) 同归因补丁中若手工构造合成 `assistant/message` 事件，**必须携带 `stream` 数组**，否则 `ConversationNodeAssembler` 计算 `lastAssistantStreamChunk` 会抛 `TypeError: Cannot read properties of undefined (reading 'length')`。 |
| **E1.6 轮次纠偏与收口** | `conversation.chat.assistant-actions` (`list`) + `conversation.chat.turnTail` (`list`) + `tool.call.toolview` (`request_signoff`) | Turn 完整结束后：`assistantActionsDom: 1`（`assistantActionsRendered: ["msg-uxlab-4"]`）、`turnTailsDom: 1`（`turnTailsRendered: [1]`）、`signoffToolViewsDom: 1` | **Go**：三者均在真实 Turn 渲染树中零报错触发；`assistant-actions` 内的 `Button` 同样建议由外层容器持有语义/测试属性。 |
| **E1.7 `@` 输入触发器 & 快捷键** | `ctx.inputTriggers.registerSource({ trigger: '@' })` + `ctx.shortcuts.register` | `@` 弹窗同时出现公司条目与上游条目（`mentionMenuHasVpEng: true, mentionMenuHasReq001: true, mentionMenuHasReadme: true`）；`shortcuts`: **`shortcutInCatalog: false, shortcutHits: 0`** | **`@` Go / `shortcuts` 需遵循上游注册契约**：`@` 触发器完整可用且与上游文件引用无冲突；而 `shortcuts` 虽然服务注入返回 `ok: true`，但 `shortcuts.register` 未进入目录且按键未命中（`ui-approval` 等使用 `shortcuts.registerFixed` + `package.json` `dsh.client.inject` 需对齐 `@deepseek-ai/dsh-client-ui-shortcuts` 与 `@deepseek-ai/dsh-client-shortcuts` 契约），S2 实施前需按 `ui-theme` / `ui-approval` 的 `registerFixed` 或标准 registration 字段对齐后再验收。 |
| **E1.8 交付物上下文动作** | `sidebar.right.tab.document.actions` (`list`) | 打开普通 `README.md` 时 `onReadme: 0`；打开 `.dsh-company/deliverables/.../final.md` 时 `onFinal: 1` | **Go**：完美替代会劫持全局 Markdown 预览的 `documentPreviews.register('md')`（L2 禁区）。 |
| **E3.1 全局 HQ 内嵌真实对话（去黑魔法核心证据）** | `SessionProvider` + `renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false }, { slots: { views: FixedChatView } })` | 在无任何 `[data-composer-seat]` 隐藏规则和 `100dvh - 76px` 硬编码前提下，HQ 面板内成功渲染真实对话与输入座：**`readyCount: 1, errorText: null, embeddedConvState: "rendered", composerSeatsInDom: 1, commandViewInsideEmbedded: 1`** | **Go（强烈推荐）**：彻底证实 S3 可以删除 `styles.ts` 中的 `[data-composer-seat]` DOM 劫持与 `CultivationChatPanel` 手搓聊天 UI，直接复用 DSH 原生嵌入模式。 |
| **E3.2 右栏分栏与响应式退化** | `sidebarRight.split()` + `openResource('dsh-resource://subagentchat/...')` | 1440px 视口：`splitWide: "pane4"`；850px 窄屏视口：`splitNarrow: null`（优雅退让）；`subagentchat`：`e3_subagentchat.ok: true, sidebarChatCount: 1` | **Go with Constraint**：**当 `main` 处于非 Conversation 全局面板时，调用 `sidebarRight.openResource` 会显式抛出 `Error: sidebarRight: no session surface is mounted`**，全局面板按钮若需跳转会话文件应先切回主对话（`selectPanel(null)`）。 |

---

## 3. E2：无头 `conversation.composer` Chain 审批拦截实证（`runtime/tmp/ux-lab/e2-verify.ts`）

直接实例化真实 `SlotCore`（`vendor/dsh/packages/client/ui-slots/src/index.ts`）与真实 `PendingApproval`（`vendor/dsh/packages/client/ui-approval/src/client/contract/slots.ts`），运行 `node --import tsx/esm runtime/tmp/ux-lab/e2-verify.ts`：

- **Chain 排序验证**：`entriesOrder` 为 `[{ name: "CompanySignoffCard", priority: 0 }, { name: "UpstreamApprovalPanel", priority: 1 }]`。
- **命中分支 (`request_signoff`)**：`CompanySignoffCard` 命中胜出，调用 `matched.answer('allowed-once')` 后 `signoffPending.result` 解析为 `'allowed-once'`，且 `answerableAfter === false`。
- **透传分支 (`bash`)**：`CompanySignoffCard` 的鸭子类型 `select` 返回 `null`，自动透传至上游 `UpstreamApprovalPanel`（`priority: 1`），`answer('rejected')` 正常结算为 `'rejected'`。
- **L2 对照负例**：在 `conversation.approval.detail`（`single` 槽）按默认优先级二次注册立即抛出冲突错误（`single slot "conversation.approval.detail" already has a registration at priority 0...`），证实不可独占该 single 槽，而应走 `conversation.composer` chain（`priority: 0` + 鸭子类型 `select`）与 `tool.call.toolview`（`key: 'request_signoff'`）。

---

## 4. 真机踩坑清单（必须写入 `/goal` 实施约束）

1. **Cordis 顶层 `inject` 与 `package.json` 白名单双保险**：子回调调用 `ctx.inject(['remote.commands', ...])` 时，插件顶层 `export const inject` 必须包含 `'remote'`；所有用到的 `@deepseek-ai/dsh-client-*` 包必须在 `packages/company-pack/package.json` 的 `dsh.client.inject`（与 `devDependencies`）同步登记。
2. **`createSnapshotStore` API**：DSH `@deepseek-ai/dsh-client-store` 的写方法是 `.set(next)` / `.update(fn)`，不是 Zustand 的 `.setState()`。
3. **返回主会话的唯一参数**：`ctx.layout.selectPanel(null)` 切回 Conversation（不能传 `'conversation'`）。
4. **`sidebarRight` 依赖会话面挂载**：全局 `main` 面板激活期间，`sidebarRight.openResource(...)` 会报 `no session surface is mounted`；必须先切回会话或改由 `main` 面板自身展示。
5. **Hero vs Active 渲染时机**：`conversation.composer.dock` 与 `conversation.session.header.utilities` 只在 `phase === 'active'` 出现；`header.utilities` 需避让 `order: -10`（`open-in-app`）与 `order: 0`（`schedule`）。
6. **`ThemeRuntime` 与 `shortcuts` 契约细节**：在真实 Web 验证主题读取需读 `ThemeSnapshot` 的真实字段（`preference` / `resolvedColorScheme`，非 `colorScheme`），而快捷键绑定在 S2 中需按 `shortcuts` / `ui-shortcuts` 的真实注册接口在 `tests/client/` 中单测验证后再收口。
