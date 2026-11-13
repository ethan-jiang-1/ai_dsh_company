---
topic: startup-settings
intent: 取证 composer 红框处的工具栏注入点、settings modal 架构、持久化作用域与公司 host 启动注入链，给出「启动总 settings（选 wiki / 强制产品类型 / 交付模式 / 方法）」的可行形状与取舍；不替用户做范围裁决。
---

# 启动 Settings：注入点 / modal / 持久化 / 启动注入链取证

> 需求来源（用户 2026-11-12 原话）：「启动的时候，我想要一个 setting 能改变，就比方说我上面那个 wiki，我要告诉他依赖哪个 wiki……我可能放到红框那儿比较好，就是这个按了之后，modal 就出一个 settings，总的 settings。settings 现在除了 wiki 之外，可能有些强行的选择就是……product type, service type……强行地告诉他，我这个这次的研究一定要用这种套路，而不是让模型随意发挥。」
> 红框 = composer 工具栏里 auto-continue「Follow default」下拉与模型选择器之间的空位。

## 0. 方法与基线

- **权威源码** = `vendor/dsh` 子模块。本轮实测：`git submodule status vendor/dsh` → `b830ec950faba0a46dda564be3e2d854afed94f1`（submodule status 原样输出，括号内 describe 含旧 tag：dsh-v0.2.1-alpha.2-1009-gb830ec950f）；`git -C vendor/dsh describe --tags` → `dsh-v0.2.1-rc.5`；`git -C vendor/dsh status --porcelain` 空（工作树零改动）。与题名页钉住一致。
- **运行态 GUI 与 pin 的版本对齐（本轮实测，非假设）**：
  - `lsof -nP -iTCP:3080 -sTCP:LISTEN` → node PID 58417 监听 127.0.0.1:3080；`lsof -p 58417 | grep txt` → 该进程加载 `$HOME/.nvm/versions/node/v22.23.1/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/node-addon-system-darwin-arm64/bin/system.node`，即**全局安装的 DSH**。
  - 全局 `@deepseek-ai/dsh` package.json version = `0.2.1-rc.5`；其内 `dsh-client-ui-conversation` / `dsh-client-ui-settings` / `dsh-client-ui-settings-plugins` / `dsh-settings` 均 = `0.2.1-rc.5`，与 pin 内同名包 version 逐一对上。
  - 结论（事实）：**运行中 GUI 与 pin 同版本（0.2.1-rc.5），本轮未发现版本漂移**。下文槽位仍以 pin 源码为准（任务纪律），并额外用 shipped bundle 交叉验证（§2.3）。
- **第三方插件活证据** = `$HOME/.dsh/profiles/web/node_modules/dsh-client-auto-continue`（v0.17.1，随包带 `src/` 源码，可直接读）。web profile 的 `package.json` dependencies 含 `"dsh-client-auto-continue": "^0.17.1"`，bundles 列表含同名条目（父会话锚点，本轮复核属实）。
- 证据分级：【事实】= 一手源码/实跑输出；【推论】= 由事实推出的判断；【建议】= 方案取向。负证据与获取限制集中在 §8。
- 本轮未写任何 vendor 文件；未建卡；未动题名页 README。

## 1. Q1 · composer 工具栏解剖（pin）

### 1.1 工具栏不住 ui-chat，住 ui-conversation

【事实】composer 的默认 body 是 `ui-conversation` 的 `InputBar`，注册为 `conversation.composer.bar` 槽的占据者：

> `vendor/dsh/packages/client/ui-conversation/src/client/skeleton/InputBar.tsx:1`：「The default composer body: the 'conversation.composer.bar' slot entry.」

`ui-chat/src/client/` 下无 toolbar 组件（本轮 grep `toolbar|Toolbar` 仅命中 markdown 代码块标签一处，与 composer 无关）。

### 1.2 控件顺序（InputBar.tsx 渲染树，行号为 pin）

【事实】`InputBar.tsx:439-518` 的 `.row` 内，左组 `.tools` 与右组 `.trailing` 顺序如下：

| 序 | 控件 | 来源 | 行号 |
|---|---|---|---|
| 1 | `+` 命令菜单按钮 | shell 自有 | `InputBar.tsx:441-454` |
| 2 | 隐藏 file input（附件拾取） | shell 自有 | `InputBar.tsx:455-462` |
| 3 | `.modes`：权限 preset 槽 → plan 槽 | `conversation.input.permission` / `conversation.input.plan` | `InputBar.tsx:463-466` |
| 4 | **左扩展位（list）** | `conversation.input.left` | `InputBar.tsx:467-469` |
| 5 | **右扩展位（list）** | `conversation.input.right` | `InputBar.tsx:473-475` |
| 6 | 模型选择器（single） | `conversation.input.model` | `InputBar.tsx:476` |
| 7 | activity（single，可展开） | `conversation.input.activity` | `InputBar.tsx:478-480` |
| 8 | stop / 发送按钮 | shell 自有 | `InputBar.tsx:481-516` |

关键原句（`InputBar.tsx:467-476`）：

```tsx
{input === undefined || sessionId === undefined
  ? null
  : renderSlot('conversation.input.left', {})}
...
{input === undefined || sessionId === undefined
  ? null
  : renderSlot('conversation.input.right', {})}
{sessionId === undefined ? null : renderSlot('conversation.input.model', { locked: modelSeatLocked })}
```

布局（`InputBar.module.css:256-307`）：`.row { display:flex; justify-content:space-between; }`，`.trailing { margin-left:auto; }`。【推论】auto-continue 是 `.tools` 的最后一个控件（§2），模型选择器是 `.trailing` 的第一个控件，**红框空位 = 左组尾与右组首之间的 space-between 间隙**；往 `conversation.input.left` 追加一个 order 更大的条目，按钮就落在 auto-continue 右侧（红框内）；往 `conversation.input.right` 加条目则落在模型选择器左侧（同样红框内）。两个槽都能命中红框，差别只在贴左还是贴右。

### 1.3 槽合同（SlotMap 声明）

【事实】`vendor/dsh/packages/client/ui-conversation/src/client/contract/slots.ts:271-300`：

```ts
/** Full-width entries above the composer card. */
'conversation.input.dock': { kind: 'list'; scope: 'session'; owner: InputZone }
/** Floating entries rendered inside the resident composer card. */
'conversation.input.overlay': { kind: 'list'; scope: 'session' }
/** Ambient entries below the composer card. */
'conversation.composer.dock': { kind: 'list'; scope: 'session' }
/** Compact controls at the left of the composer tool row. */
'conversation.input.left': { kind: 'list'; scope: 'session' }
/** Compact controls before the composer submit action. */
'conversation.input.right': { kind: 'list'; scope: 'session' }
/** Compact action after the model selector; ... */
'conversation.input.activity': { kind: 'single'; scope: 'session'; owner: InputActivityOwnerProps }
/** Resident composer body, including the no-Session inert state. */
'conversation.composer.bar': { kind: 'single'; scope: 'session-maybe'; owner: ComposerBarOwnerProps }
...
'conversation.input.permission': { kind: 'single'; scope: 'session'; owner: InputControlOwnerProps }
'conversation.input.model': { kind: 'single'; scope: 'session'; owner: InputControlOwnerProps }
```

声明方（children 授权）= `conversation.composer.bar` 的注册处：`ui-conversation/src/client/apply.ts:456-469`（`registerComposerBar`，children 含 `conversation.input.left`/`right`/`permission`/`plan`/`model`/`activity`/`attachments`/`overlay`/`composer.dock`）。

### 1.4 注册 API 与排序语义（ui-slots / ui-renderer）

【事实】槽四型：`ui-slots/src/index.ts:100-104`：

```ts
/** Slot cardinality: single occupant, ordered list, key-dispatched, or selector-routed chain. */
export type SlotKind = 'single' | 'list' | 'keyed' | 'chain'
/** Slot data context: global, current-session-optional, or strict session-bound. */
export type SlotScope = 'root' | 'session-maybe' | 'session'
```

【事实】list 排序 = priority 升序 → order 升序 → 平手保持注册序（`ui-slots/src/index.ts:1282-1288`）：

```ts
// Stable sorts: priority ascending for every kind, ties keep registration
// ... List refines equal priorities by explicit `order` ...
? (a, b) => ((a.options.priority ?? 0) - (b.options.priority ?? 0)) || ((a.options.order ?? 0) - (b.options.order ?? 0))
```

single/keyed 槽 = priority 影子（lowest renders；同 key 同 priority 第二次注册 throw）：`index.ts:1215-1227`。

【事实】**第三方注入 API = `ctx.slots.inject(name, callback)`**，实现于 `ui-renderer/src/client/registry.ts:209-271`，JSDoc（194-208 行）原句：

> 「Install an effect for each declaration lifetime of a slot. The callback runs synchronously when the declaration already exists; otherwise it runs inside the declaring `register()` call after the declaration is committed. Collapse disposes the effect and a later declaration runs it again. ... The controller belongs to the caller's fiber, so plugin unload cancels a pending wait and removes any active contribution.」

【推论】公司 pack 用 `ctx.slots.inject('conversation.input.left', () => ctx.slots.register({...}, Button))` 即可：不依赖加载顺序、声明缺席时保持 PENDING 不崩、声明重建自动重注、随 fiber 卸载清理。这正是 vendor `packages/client/AGENTS.md`「Registering into another package's slot」条目的规定手法。

【事实·旁证】vendor 自己的插件创作参考 `packages/extensions/cordis-client-runner/src/client/slot-catalog.ts:1189` 给出的示例就是同款：`ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ name: 'conversation.input.left', id: 'my-entry', order: 100, label: 'My entry' }, ...))`。且 pin 内除声明方外**无其他核心包注册 input.left**（grep 仅命中该 catalog 文档）；shipped bundle 同然——运行态 GUI 里 auto-continue 是该槽唯一第三方占据者，公司按钮 order>0 即紧随其后。

### 1.5 备选注入面（ui-input-trigger / ui-entry-customization）

【事实】
- `ui-input-trigger`（`src/client/index.ts:1-6`）= 斜杠触发菜单，自注册进 `conversation.input.overlay`（浮层，不是工具行）：「the InputTriggerService (`ctx.inputTriggers`) owning trigger detection, the candidate menu, and the pick pipeline; MenuView self-registers into the conversation.input.overlay slot.」
- `ui-entry-customization`（`src/client/index.ts:1`）= 「Rows for the More menus of the left sidebar, Conversation View tabs, and right-sidebar guide.」——More 菜单行，不是工具栏。

【推论】两者都**不是红框的注入面**；红框唯一正解 = `conversation.input.left` / `conversation.input.right`。`conversation.input.dock`（卡片上方整宽行，GoalBar 用）与 `conversation.composer.dock`（卡片下方 ambient 行，stats pills 用）也不在红框位置。

## 2. Q2 · 工具栏注入的活证据（dsh-client-auto-continue）

### 2.1 它用的槽与 API

【事实】`$HOME/.dsh/profiles/web/node_modules/dsh-client-auto-continue/src/client/index.ts:151-161`：

```ts
ctx.slots.inject('conversation.input.left', () =>
  ctx.slots.register(
    {
      name: 'conversation.input.left',
      id: 'auto-continue',
      locale: NS,
      inject: (sessionId) => controller.injectComposer(sessionId),
    },
    AutoContinueComposerToggle,
  ),
);
```

- 未设 `order`/`priority`（均默认 0）。【推论】公司按钮设 `order: 10`（或任何 >0）即排在它后面 → 红框位。
- 组件 = `composer-toggle.tsx:44-86` 的 `AutoContinueComposerToggle`：一个 switch + ModeMenu（default/off/recover/loop），「Follow default」文案来自 `composer.default` + 括号内默认模式（54-57 行）。它**自绘样式**（`dshAcComposer` 类名，styles.ts 注入），不依赖 ui-primitives 的控件——【推论】公司按钮同样可以自绘或复用 ui-primitives（公司已在用 Button/Tooltip 等）。
- 数据面：`inject: (sessionId) => controller.injectComposer(sessionId)` 返回 `hooks` 仓（`ComposerToggleFace`，composer-toggle.tsx:38-42）+ `setMode` 回调；组件经 `props.useAutoContinueComposer` 读快照——完全符合 vendor 的「inject 返回纯数据/回调，hooks 仓绑 use<Name>」纪律。

### 2.2 它的 settings 面（双 cohort 兼容写法）

【事实】同文件 `index.ts:89-95`：

```ts
ctx.inject(['settingsScope'], (settingsCtx) => {
  mountSettings(settingsCtx, settingsCtx.settingsScope.bind<AutoContinueSettings>({ namespace: SETTINGS_NS }));
});
ctx.inject(['configForms'], (settingsCtx) => {
  const forms = (settingsCtx as ConfigFormsContext).configForms;
  mountSettings(settingsCtx, forms.get<AutoContinueSettings>(SETTINGS_NS));
});
```

以及 `index.ts:165-186`：向 `settings.plugin.item`（keyed，key='auto-continue'）与 `plugins.bundle.config`（keyed，key='dsh-client-auto-continue'）各注册一张 settings 卡。

【事实 + 负证据】
- `settingsScope` 服务在 **pin 全文 0 命中**（本轮 `grep -rn "settingsScope" packages --include="*.ts" | grep -v node_modules | wc -l` → `0`）。它是旧 cohort 的服务名；在 0.2.1-rc.5 里这条 `ctx.inject(['settingsScope'])` 永远 PENDING（无害）。
- `settings.plugin.item` 在 pin 里**无 SlotMap 声明**（`grep -rn "'settings.plugin.item':" packages --include="*.ts"` 排除 node_modules/tests 后 0 命中），shipped 0.2.1-rc.5 各 client bundle 也 grep 不到（§2.3）。它是 0.1.7 时代的旧槽；auto-continue 的这张卡在运行态 GUI 里**不会渲染**。
- 运行态真正生效的是 `configForms`（pin 有：`ui-settings/src/client/config-form.ts:258` `super(ctx, 'configForms')`）+ `plugins.bundle.config`（pin 有：`ui-plugin-manager/src/client/slot-contract.ts:142`）。

【推论】auto-continue 是「跨 DSH cohort 防御性注册」的活标本：同一功能挂新旧两套服务/槽，活的那套生效，死的那套静默 PENDING。公司 pack 钉 peer ^0.2.1-rc.2 + compat-tags 台账，不需要背这种双份包袱，但**升 pin 时必须重校槽名**（这正是任务要求「槽以 pin 为准」的理由）。

### 2.3 pin 对照与 shipped bundle 交叉验证

【事实】
- pin 声明存在：`conversation.input.left` 在 `contract/slots.ts:278` 与 `apply.ts:463`（§1.3）。
- shipped bundle 存在：全局安装 `dsh-client-ui-conversation/lib/client.js` grep `conversation.input.left` 命中 2 处；`conversation.input.*` 全族（activity/attachments/dock/left/model/overlay/permission/plan/right）都在。
- `settings.plugin.item`：shipped 全部 `*/lib/client.js` grep -l **0 命中**；`plugins.bundle.config` 命中 `dsh-client-ui-plugin-manager`、`dsh-cordis-client-runner`、两个 experimental 包。

【结论·事实】红框槽 `conversation.input.left` 在 pin 与运行态 GUI 的 shipped 产物里**都存在**；公司 pack 复用 auto-continue 同款机制可行，无漂移风险（当前版本对齐）。

### 2.4 公司 pack 已经会用这套机制

【事实】`packages/company-pack/src/client/index.ts` 现有注册全部走同款 `slots.inject + register`：
- `conversation.view`（培养主视图，180-186 行，id + order: 20 + locale + label thunk）；
- `conversation.session.header.actions`（任务板按钮，275-284 行，order: 21 + inject 回调）；
- `tool.call.toolview`（委派/团队卡，225-232 行，keyed + priority: -1 影子）；
- `sidebar.brand.name` / `sidebar.session.row.leading`（238-252 行）。

且 `index.ts:10` 已 `import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'`（SlotMap 类型已在程序里），`ui-primitives`/`ui-slots` 已在 devDependencies，`dsh.client.inject` 已含 ui-conversation。**【推论】加一个工具栏按钮 + 自持 modal，零新增依赖。**

## 3. Q3 · settings modal 架构

### 3.1 壳与页的分工

【事实】settings 域的基础槽合同在 `ui-settings/src/client/contract/slots.ts`（1-10 行 JSDoc：「A feature owns its own settings pages — adding a setting never means editing the shell」）。可贡献的槽：

| 槽 | kind/scope | 用途 | 行号 |
|---|---|---|---|
| `settings.section` | list / root | **一整页 settings**（id/order/label 驱动导航） | `contract/slots.ts:57` |
| `settings.plugins.tab` | list / root | Plugins 页内的一个 tab | `contract/slots.ts:66` |
| `settings.general.item` | list / root | General 页内的一行偏好 | `contract/slots.ts:92` |
| `settings.launcher` / `trigger` / `header` / `action` / `close` | single/list / root | 壳 chrome 文案位 | `contract/slots.ts:17-45` |

壳 = `ui-settings-general` 占据 `sidebar.settings`，声明上述 children（`ui-settings-general/src/client/index.ts:211-225`），渲染 `SettingsRoot`。导航行 = `settings.section` ledger 投影（index.ts:142-168）。第三方贡献整页的先例 = `ui-settings-plugins/src/client/index.ts:76-84`（注册 id='plugins'、order: 15 的 section，再在其 children 里挂 `settings.plugins.tab`）。

### 3.2 modal 如何打开 —— 没有公共 opener

【事实】
- 开合状态住壳私有 store：`ui-settings-general/src/client/shell-store.ts:16-26`（`createSettingsShellStore`，actions: open/close/select/openSection），在 `sidebar.settings` 注册闭包内创建（index.ts:188-191），**只作为该注册的 store 座位共享**，不导出服务。
- 键盘入口 = 壳注册的 shortcut 命令 `settings.open`（index.ts:192-209，web 默认 Cmd/Ctrl+Alt+,）。`shortcuts` 服务**没有按 id 执行命令的公共 API**（`packages/client/shortcuts/src/client/types.ts:83-137` 的 `Shortcuts` 接口只有 register/registerFixed/observeFixedInput/describeBinding/edit/recording/closeWindow + catalog 快照）。
- `openSettings` 只作为 owner props 传给 `settings.launcher` 占据者（`SettingsRoot.tsx:218`）；`openSection` 只传给 `settings.onboarding` 占据者（`SettingsRoot.tsx:262`）。两者都不是任意插件可调的服务。

【结论·事实】**公司插件无法从 composer 按钮程序化打开 DSH settings modal**（pin 内无公共 opener；壳 store 私有；shortcuts 无 execute-by-id）。要「按了红框按钮 → modal 出来」，modal 必须公司自持。

### 3.3 公司自持 modal 的先例与材料

【事实】
- 公司现有浮窗/页签先例：`src/client/tabs/`（右栏页签，经 `sidebarRightTabs` 注册）+ `sidebarRight.float(tabId, rect)`（index.ts:132）；培养主视图走 `conversation.view`。这些是**页签/视图**，不是居中 modal。
- 平台有现成 `Modal` 原语：`ui-primitives/README.md:59`：「`Modal` | Centered dialog over a page mask. ...」；28 行：「`Modal` and the settings shell share top-layer Escape and Tab handling through `useModalLayer`, restoring the previous focus on close.」公司已依赖 ui-primitives（Button/Tooltip/Input/Pill 在用）。
- 插件管理器页是另一条导航：`ui-plugin-manager/src/client/index.ts:113-150` 注册 `main` keyed 面板，并 `ctx.reflect.provide('pluginNavigation', { openList, openBundle })`——**这是 pin 里唯一公共的「打开某设置面」服务**，但它打开的是插件管理面板（auto-continue 的 `plugins.bundle.config` 卡在那里渲染，`PluginManagerPage.tsx:782`），不是 settings modal，也不适合放公司启动 settings。

【推论】公司自持 modal = `ui-primitives.Modal` + 公司 typed 字典 + 自己的开合 state（组件本地或声明 store），从红框按钮 onClick 打开。依赖成本 ≈ 0（原语已在用）；不碰 vendor 壳；不受「无公共 opener」限制。

### 3.4 向 DSH settings 贡献页的依赖成本（方案 b 的账）

【事实】贡献 `settings.section` 本身可行（槽存在、第三方先例存在），但：
1. 持久化要走 `configForms.get(entryId)` → `remote.settings.mutate(namespace, ops, revision)`（`config-form.ts:134, 284-288`）→ host `dsh-settings` 服务 → **active profile 的 Cordis patch**（§4.1）。公司 host 行的 entry id = `company-client`（`cordis.patch.yml:103-104`），settings 会写进 profile patch 的该行 config——**profile 作用域，不是 workspace 作用域**。
2. host 侧要把启动 settings 声明为 entry Config 的 `.volatile()` 字段（`packages/settings/settings/README.md`：「Forms expose only volatile fields from active, uniquely addressed profile entries」），公司 host 读自己的 Config 引用。
3. 按钮仍然打不开那个 modal（§3.2）——用户得自己去侧栏点 Settings。红框按钮的 UX 承诺落空。

【推论】方案 b 适合「全局默认值」的二级面（可选），不适合做红框按钮的主 modal。

## 4. Q4 · 持久化

### 4.1 DSH settings（packages/settings）= profile 作用域的插件 Config 表单

【事实】
- `packages/settings/settings/README.md`：「Edit fields that plugins declare with `.volatile()` ... Forms identify each plugin by its profile entry id ... Changes persist through the active profile's Cordis patch.」
- namespace = profile entry id：`settings/src/index.ts:300`（「Forms keyed by unique profile entry ids」）、315 行（`ns: entry.options.id as SettingsNamespace`）。
- 旧 `settings.yaml` 一次性导入：`settings/src/index.ts:238-243`（`join(profile.home, 'settings.yaml')` → 按 entry id 写进 profile → 改名 `settings.yaml.imported`）。**settings.yaml 是遗留物，不是现行持久化家。**
- 活证据（运行态 web profile）：`$HOME/.dsh/profiles/web/cordis.patch.yml:534-539`：

```yaml
- id: auto-continue
  name: dsh-client-auto-continue
  config:
    locale: en
    sessionModes:
      session-e684309e-2d3c-40dc-8e9f-068529e04db6: default
```

auto-continue 的 host 半读自己的 Loader Config（其 `src/index.ts:1-12` 头注：「Configuration is this entry's own Loader config」），浏览器卡经 configForms 写同一份值；per-session 覆盖 = config 里的 `sessionModes` map（仍住 profile patch）。

【负证据·纠正父锚点】`packages/settings/settings-file` 在 pin 里是**空目录**（仅 node_modules 残留，`git ls-files packages/settings/settings-file/` 空）。pin 的 settings 族只有 `settings` 一个实包。「settings / settings-file 两子包」的锚点不成立。

### 4.2 公司自持存储 = workspace 作用域的 `.dsh-company/`

【事实】
- 路径唯一家：`src/lib/run-bundle-paths.ts`（`RUN_BUNDLE_DIR = '.dsh-company'`；manifest=`bundle.json`、company=`kb/company.md`、cultivation=`cultivation/`、overrides=`overrides/` 等）。
- 首启播种只补缺不覆盖：`src/host/run-bundle/bootstrap.ts:1-8` 头注 + `planBootstrap`（121-146 行，exists→skip）；seed 清单 `content/kb-setup/seed.json`（mode 恒 only-fill，wx）。
- 原子写先例：`src/host/cultivation/cultivation-storage.ts:188-193`（tmp + `wx` + linkSync 的 writeNewFile）；培养记录住 `.dsh-company/cultivation/records/`。
- 活证据（dev workspace）：`company-workspace/.dsh-company/bundle.json` = `{ "v": 3, "id": "bundle-a7074ce6-...", "pack": { "name": "dsh-company-pack", "version": "0.6.0" }, "runBundle": { "schema": 1 } }`。

### 4.3 client 写盘通道：workspaceFiles 只读，写走 host 命令

【事实】
- `workspaceFiles` remote 的全部方法（shipped `dsh-api-workspace-files/lib/typert.remote-client.js` grep）= `changes / list / read / readBytes / stat`——**无 write**。公司 client 现在用它读 company.md/ledger/catalog（`src/client/index.ts:264`、data plane）。
- client → host 的写通道 = `remote.commands.execute(sessionId, '/<command> …', [])`；公司已在用（`src/client/index.ts:89` 的 `/company-diagnostics`；培养面板按钮发 `/cultivation …`，index.ts:126-128 注释）。host 命令执行面 = `packages/interaction/commands/src/index.ts:360-388`（`@Remote execute`，记 `command/run`+`command/done`，`source: { kind: 'user' }`，**不进模型**）。

【推论】公司 settings modal 的持久化路径 = modal → `remote.commands.execute('/company-settings set …')` → host 命令 handler 写 `<workspace>/.dsh-company/settings.json`（原子写，复用 cultivation-storage 手法）。读路径 = `workspaceFiles.read` 或命令回执。全程不新增 remote、不碰 vendor。

### 4.4 哪种适合「每个 workspace 启动时可改」

【结论·推论】**.dsh-company/settings.json（workspace 作用域）是正确形状**：
- 需求语义 = 每个 workspace 自己的启动配置（换 workspace 换套路）；DSH settings 是 profile 全局，一个 profile 下所有 workspace 共享一份，语义不符。
- 公司已有 workspace 状态盘、原子写先例、client 读盘通道、host 命令写通道——四样齐全。
- DSH settings 可作**可选二级面**（profile 级出厂默认），但主存储不应是它。

## 5. Q5 · 公司 host 启动注入链与精确消费点

### 5.1 现有链（host apply → agent 创建 → system prompt）

【事实】`packages/company-pack/src/index.ts`：
- 60 行：`inject = ['tools', 'approval', 'commands', 'workspaceRegistry']`；72 行 `apply(ctx, config)`；80-82 行 workspace 经 `prepareCompanyRuntime(ctx)` 在 boot 解析（env/cwd/saved）。
- 126-129 行：`registerHandbook(ctx, contentDir, hasWorkspace ? workspace : undefined, ...)`。
- 176-180 行：`ensureRunBundle(...)` → `planBootstrap` + `applyBootstrap`（首启播种）+ bundle manifest。
- 141-144 行：`/deliverables` `/prd` `/req` `/delivery` 命令注册（带 workspace + contentDir）。

【事实】`src/host/prompt/handbook.ts`：
- 34-51 行 `readHandbook`：workspace `.dsh-company/overrides/AGENTS.md` 优先，否则 pack `content/AGENTS.md`；前导 4 行给 content 绝对路径 + override 规则。
- 65-98 行 `registerHandbook`：**71 行读一次手册**；91 行 `ctx.on('agent/created', ...)`；81-88 行对每个角色 agent（跳过 `NON_ROLE_PRESETS`）注册 system prompt section：

```ts
const fiber = agent.ctx.inject(['systemPrompt'], (scope) => {
  scope.systemPrompt.section({
    name: HANDBOOK_SECTION,        // 'company:handbook'
    order: 500,
    text: () => handbook.text,
    interpolate: false,
  })
})
```

【事实】section text 是**每次 prompt assembly 求值的 provider**：`vendor/dsh/packages/core/system-prompt/src/index.ts:62-66`：

> 「Static text or a provider evaluated at each assembly with that assembly's AssembleContext.」

【推论·关键】现有手册 section 的 thunk 返回的是 **boot 时冻结的快照**（71 行读一次）。但 thunk 机制本身支持活读——**startup settings 的注入只要让 thunk 在求值时读 settings.json，改动就在下一次 prompt assembly（下一轮）生效，无需重启 host**。这是「启动配置」消费点的最重要机制事实。

### 5.2 productType 解析链（/req check）

【事实】`src/host/commands/req-command.ts:148-169` `resolveProductType`：

```ts
const motionType = parseProductType(readIfExists(join(root, 'meta.md')))        // 150
const companyType = parseProductType(readIfExists(join(workspace, RUN_BUNDLE_PATHS.company)))  // 151
const id = motionType ?? companyType                                            // 152
const source = motionType !== null ? 'motion' : companyType !== null ? 'company' : null  // 153
if (id === null) return { rules: null, ... }                                    // 154 → 五层默认
const rulesText = readIfExists(join(contentDir, 'product-types', id, 'check-rules.json'))  // 155
// 未知类型 → 显式 error，不静默回落（156-164）
```

优先级 = **动议 meta.md > workspace company.md > 五层默认**；`parseProductType`（63-70 行）把 `<...>` 占位符视为未声明。

【事实】首启播种侧：`bootstrap.ts:108-114` `resolveCompanyProductType` = workspace `kb/company.md` 优先，无则 pack `content/state/company.md`（出厂 frontmatter `productType: business-software`）；183-213 行用 `{productType}` 占位解析 kb seed（缺/未知 → warning 跳过该条，不猜，BUG-063）。

### 5.3 交付模式解析链

【事实】
- `req-command.ts:72-79` `parseDeliveryMode`：读 meta.md `交付模式:`/`deliveryMode:`；**缺省/占位 = `productized`**。
- `delivery-command.ts:50-53` 同款（`/delivery check`）。
- `req-command.ts:223-237`：非 productized 模式校验目录存在 + 回执点名模式文档；250-252 行按 delivery-rules 的 v1Reminder 查缺文档。
- `content/delivery-modes/` 实际只有 **2 个目录**：`project-services`、`managed-service`；`productized` 是**隐式默认，不建包**（`req-command.ts:132` 注释原话：「productized 是默认，不建包」）。父锚点「三模式」应理解为「2 个内容包 + 1 个隐式默认」。

### 5.4 手册现规矩（要被「强制」覆盖的行为）

【事实】`content/AGENTS.md:16-17`：

> 「**动议的产品类型**：写在 …meta.md 的 `产品类型`；缺省回落 `company.md` 的 `productType`。具体类型 id 见产品类型包；**不要按习惯猜，用户没说就问一句或标假设**。」
> 「**动议的交付模式**：写在 meta.md 的 `交付模式`；不写 = `productized`；有 SOW/UAT/驻场/里程碑验收 = `project-services`；有持续 SLA/值班/月报/续费 = `managed-service`。…」

【推论】「强行选套路」= 把这两行的「问一句/标假设/按特征猜」变成「启动配置已给定，直接用」。注入的 settings section 必须显式声明给定值与「不再问/猜」的语义，否则模型仍会按手册 16 行去问。

### 5.5 startup settings 对象的精确消费点（汇总）

【建议】settings 对象形状（v1）：

```json
{
  "v": 1,
  "wiki": "<pointer：路径/URL，格式待 wiki-knowledge-map 研究定>",
  "productType": "business-software | hardware-software | null",
  "deliveryMode": "productized | project-services | managed-service | null",
  "method": "<pack>@<version> | null"
}
```

| 字段 | 消费点 | 现状行号 | 覆盖方式 |
|---|---|---|---|
| 全体 | **新 system prompt section**（如 `company:startup-settings`，order 501，紧随手册） | handbook.ts:81-88 同款注册；text thunk 活读 settings.json（system-prompt index.ts:62-66 支持） | 注入「本次研究启动配置：wiki=…；产品类型=…（给定，不再问/猜）；交付模式=…；方法=…」 |
| productType | `/req check` 类型解析 | req-command.ts:150-152 | 在 `motionType ?? companyType` 前插一层 `settingsType ??`（settings > motion > company）；或仅经 prompt 让模型写 meta.md（弱强制） |
| productType | 首启 kb 播种 | bootstrap.ts:108-114, 183-213 | 播种时读 settings（仅首启；只补缺不覆盖，改 settings 不重播） |
| deliveryMode | `/req check` `/delivery check` | req-command.ts:72-79；delivery-command.ts:50-53 | 缺省回落从 `productized` 改为 `settings.deliveryMode ?? 'productized'`；或仅 prompt 注入 |
| wiki | **无现有机制**（vendor 0 wiki 命中；公司 host/content 0 wiki 命中） | — | 新造：prompt section 注入指针 + 按需读取约定；是否落 kb 指针文件待定 |
| method | 质量环任务书 `method: <pack>@<version>` | presets/quality-loop-producer/agent.cordis.yml:28（fail-closed） | settings 给定 → 注入 prompt 要求任务书点名该方法；方法包本体住 `<DSH_HOME>/company/methods/`（公司级，非 workspace 级——作用域注意） |

【推论】强制有两档：**软强制**（只注入 prompt section，模型照办但解析链不变）与**硬强制**（解析链加 settings 层，命令校验也按给定值）。软强制零代码风险、一天可落；硬强制要改 req/delivery 命令的解析函数 + 测试。建议先软后硬（§6）。

## 6. Q6 · 方案比较与推荐

### 方案 a（推荐）：公司自持工具栏按钮 + 公司 modal + .dsh-company/settings.json + host 启动注入

- **可行性证据**：槽 `conversation.input.left` 在 pin 与 shipped 都在（§1.3/§2.3）；auto-continue 活证据同款注册（§2.1）；公司已有同款注册多处（§2.4）；Modal 原语在用（§3.3）；写通道 commands.execute 在用（§4.3）；注入 thunk 支持活读（§5.1）。
- **依赖成本**：零新增依赖（ui-conversation 类型、ui-primitives、ui-slots、locale 全已在 manifest）。
- **pin 漂移风险**：低。槽是 vendor 公开合同（SlotMap + children 声明）；公司 peer 钉 ^0.2.1-rc.2 + compat-tags 台账；升 pin 重校槽名即可。auto-continue 的双 cohort 防御（§2.2）说明漂移真实存在，但当前版本对齐。
- **实现期约束**：company-ui-change-definition（skill 已加载）——所有新文案首 commit 起 zh+en 住 `src/client/locales.ts` typed 字典（`en` 完整 Record，无 CJK），组件经槽 `locale: NS` 的 `t` 座位取词，注册处 title/tooltip 用 `() => t(key)` thunk；host 命令回执走 `CompanyLanguage.text(zh, en)`；验证 = `pnpm test tests/client` + `pnpm typecheck` + 真页面 zh/en 金样。
- **形状**：按钮（order>0 排 auto-continue 后）→ onClick 开 Modal → 表单（wiki 指针 / productType 下拉 / deliveryMode 下拉 / method 可选）→ 保存经 `/company-settings set` 写 settings.json → host 新 section thunk 活读 → 下一轮生效。读现有值经 workspaceFiles.read。

### 方案 b：向 DSH settings modal 贡献页

- **可行性**：`settings.section` 槽存在且有第三方先例（§3.1）；持久化走 configForms → profile patch（§4.1）。
- **硬伤**：① 红框按钮**打不开** DSH modal（无公共 opener，§3.2）——UX 承诺落空；② profile 作用域 ≠ 「每个 workspace」（§4.4）；③ host 要加 volatile Config 字段 + 依赖 settings 服务面。
- **定位**：可选二级面（profile 级出厂默认），不做主形状。

### 方案 c：/command 兜底（无槽时）

- **可行性**：`ctx.commands.register` 公司已有 6+ 命令（req-command.ts:184 等）；client 可经 commands.execute 调；命令面永远在（不依赖任何 UI 槽）。
- **定位**：不是红框 UX 的替代（无发现性），但**方案 a 的写通道本来就是一条命令**（`/company-settings`），顺带给人/agent 一个无 UI 入口。槽万一在升 pin 后消失，命令面兜底仍可用。

【建议·推荐形状】**a 为主 + c 作为 a 的内置写通道与兜底**；b 暂不做。先软强制（prompt section）落地，硬强制（解析链覆盖）作为后续增量。

## 7. Q7 · 「强行选套路」的 content 映射

### 7.1 三层 + 方法正交轴

【事实】`docs/content-charter.md:28-36`：三层 = 通用 / 产品类型 / 公司；**方法是正交轴**，不塞进三层。四槽（17-22 行）：人 / 流程 / 方法 / 政策。铁律 2（43 行）：「方法不进 persona：能力档只声明『需要方法』，不声明『用哪个方法』；方法必须是外部可替换的输入。」

【事实】content 现状（本轮 ls + manifest.json）：
- `content/product-types/`：`business-software`、`hardware-software`（各含 overview/glossary/requirements-model/document-map/check-rules.json；hardware-software 另有 templates/）。
- `content/delivery-modes/`：`project-services`、`managed-service`（各含 overview/glossary/document-map/delivery-rules.json/templates/）；productized 无目录（隐式默认）。
- `content/methods/`：`quality-loop-producer/{system-architecture,vv-plan}/SKILL.md`、`quality-loop-verifier/...`（pack 内方法样例）；运行态方法层住 `<DSH_HOME>/company/methods/<role>/<pack>/`（cordis.patch.yml:105-110 注释 + quality-loop preset 42-44 行）。
- 三层加载清单 = `content/manifest.json`（t0 常驻 / t1 摘要 / t2 按需）。

### 7.2 settings 强制 = 把「模型猜/问」变「启动配置给定」

【事实】当前「猜/问」发生处：
1. 手册规矩 `content/AGENTS.md:16`（「用户没说就问一句或标假设」）与 17 行（按 SOW/SLA 特征判模式）——模型行为层。
2. `req-command.ts:152`（`motionType ?? companyType`，都无 = 五层默认）与 73-79 行（模式缺省 productized）——命令解析层。
3. `bootstrap.ts:183-213`（缺类型跳过类型 seed，不猜）——播种层。

【建议】覆盖映射：
- **模型行为层**：新 section 显式「产品类型 = X（启动给定，不必问/猜）；交付模式 = Y（给定）；依赖 wiki = Z；方法 = M（任务书必须点名）」——直接压过手册 16/17 行的问/猜语义（section order 501 > 手册 500，后文补前文）。
- **命令解析层（硬强制增量）**：`resolveProductType` 在 150-152 行前插 settings 层；`parseDeliveryMode` 的缺省回落读 settings。改动面 = 2 个函数 + 对应 keyless spec。
- **播种层**：首启读 settings.productType 决定 `{productType}` seed（只补缺；已有盘不动）。
- **方法层**：settings.method 给定 → prompt 要求质量环任务书点名 `method: <pack>@<version>`；preset 的 fail-closed 闸（agent.cordis.yml:28）不变——方法包缺失仍停下回报，不静默。

【推论】productType 回答「造什么」（需求链/编号/术语），deliveryMode 回答「怎么交付」（SOW/SLA/文档集），method 回答「怎么做」（检查表/判据）——三者正交，settings 是它们的**启动期绑定器**，不新增内容层，符合宪章「一个事实一个家」（settings 只存选择，不存规则正文）。

## 8. 负证据与获取限制

1. 【负证据】`settingsScope` 服务：pin 全文 0 命中（§2.2）——auto-continue 的该路在运行态 PENDING。
2. 【负证据】`settings.plugin.item` 槽：pin 无 SlotMap 声明、shipped bundle 0 命中（§2.2/§2.3）——旧 cohort 遗物。
3. 【负证据·纠正锚点】`packages/settings/settings-file`：pin 内空目录、git 未跟踪（§4.1）。
4. 【负证据】DSH settings modal 无公共 opener：壳 store 私有、shortcuts 无 execute-by-id、openSettings/openSection 仅 owner props（§3.2）。
5. 【负证据】`workspaceFiles` remote 无 write（5 方法枚举，§4.3）。
6. 【负证据】vendor pin 无 wiki 组件（`grep -rln wiki packages/*/*/src -i` 排除 node_modules 后 0 命中）；公司 host/content 亦无 wiki 机制——wiki 指针是新造面；姊妹研究 wiki-knowledge-map 材料已产出（[2026-11-12-wiki-knowledge-map.md](../wiki-knowledge-map/2026-11-12-wiki-knowledge-map.md)），推荐「wiki 根目录路径 + index.md 先行」指针格式（形状 A），落地时与本题 settings.wiki 字段合流。
7. 【负证据】`content/delivery-modes/` 只有 2 个目录；productized 是隐式默认（§5.3）。
8. 【限制】无 session 的纯空白 hero 没有公司可注入的 list 槽：`conversation.hero.options` 仅 sessionId 存在时渲染（`ConversationContent.tsx:133`），`input.left/right/model` 同样要 sessionId（InputBar.tsx:464-476）。红框按钮是 **session 作用域**——「启动配置」的编辑发生在会话已存在时；冷启动无会话态的入口需另议（§9）。
9. 【限制】`ps` 被沙箱拒（`/bin/ps: Operation not permitted`）；进程身份证据改用 `lsof`（PID 58417 的 txt 段指向全局 DSH，§0）。未做浏览器截图/DOM 取证——红框位置由源码布局推论（§1.2），未像素级验证。
10. 【限制】dev workspace 的 `company-workspace/.dsh-company/kb/company.md` 是无 productType 的旧样例（本轮 head 实测）——该盘的类型相关 seed 走的是「跳过 + warning」路径，不能用作「已声明类型」的活证据；出厂值证据取自 pack `content/state/company.md`。
11. 【未验证】settings 改动经 thunk 活读后「下一轮生效」的端到端时序未真跑（机制由 system-prompt index.ts:62-66 源码支持，属推论）；实现期需 keyless spec + 真页面验证。

## 9. 开放问题（需用户/后续研究拍板）

1. **作用域**：workspace 级默认（.dsh-company/settings.json）已定为主形状；是否还要 **per-session 覆盖**（用户原话「这次的研究」偏会话级）？auto-continue 的 sessionModes map 是先例，但公司若加会话级，需要会话→设置的存储与解析层，复杂度上一档。
2. **wiki 指针格式**：姊妹研究已推荐本地 wiki 根目录路径（index 先行，形状 A），llms.txt 站点 / DeepWiki 仅作可选外部源；settings 字段 = string 指针，本地路径 vs URL 的取舍待用户拍板（姊妹材料 §7.6）。
3. **强制档位**：先软强制（prompt）还是直接硬强制（解析链）？建议先软后硬，但「强行」二字的用户期望强度需确认。
4. **按钮贴左还是贴右**：`input.left`（auto-continue 右邻）vs `input.right`（模型左邻）都落红框；需视觉探针定夺（公司已有 probes/browser-visual 面）。
5. **method 的作用域错配**：方法包住 `<DSH_HOME>/company/methods/`（公司级），settings 住 workspace——workspace settings 引用的方法包可能不在本机。是否 settings 只存「方法名期望」、缺失时 fail-closed 回报（与 preset 闸一致）？
6. **冷启动入口**：无会话态要不要 settings 入口（hero 无 list 槽，§8.8）？若需要，只能走侧栏/命令面，或等会话创建后再编辑。
