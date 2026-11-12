---
topic: startup-settings
intent: 穷举并评估「落入 DSH、充分利用 DSH 现成载体」的启动 settings 落地可能（opener / pluginNavigation / settings.section / configForms volatile / profile patch / plugins.bundle.config / per-session 载体 / 注入面），给出 DSH 复用最大化的推荐形状与取舍
---

# 落入 DSH：启动 Settings 的原生载体穷举与推荐

> 姊妹材料：[机制取证](2026-11-12-startup-settings.md)（注入槽 / 自持 modal / 持久化候选 / 注入链）、[字段盘点](2026-11-12-settings-candidates.md)（A/B/C/D 58 行）、[核实锚点](2026-11-12-parent-handoff.md)。
> 本篇只答一件事：**这件事能不自己造的全交给 DSH 吗？交不了的那部分，最小自建量是多少？**
> 用户口径（2026-11-12）：「思考落入 DSH 的各种可能，充分利用 DSH」。
> 证据分级：【事实】= vendor pin 或本仓源码实读（file:line）；【推论】= 由事实推出；【建议】= 方案取向。pin = `dsh-v0.2.1-rc.5`。

## 0. 结论先行

**【事实】** DSH 有一条**现成的、第三方插件已在用的**「composer 控件 → DSH 自己的设置面」通道：`ctx.pluginNavigation.openBundle(<本 bundle>)` 打开 Plugins 主面板并定位到该 bundle 的配置卡，配置卡通过 `plugins.bundle.config` 槽渲染，值由 `configForms` 读写并落**当前 profile 的 Cordis patch**。官方 experimental 插件 `voice-input` 就是这么做的（composer 麦克风按钮的 `openSettings` 直接调它）。

**【事实】** 但这条通道有两处与用户原始设想不同：① 它打开的是**主面板**（Plugins 页），不是居中 modal；② 它持久化在 **profile 作用域**（本仓「一次安装 = 一个公司」⇒ 语义上等于**公司级**），不是 **workspace 级**。

**【事实】** 居中 settings modal **没有公共 opener**：壳 store 建在 `sidebar.settings` 注册闭包内、shortcut 的 run 闭包捕获实例、`Shortcuts` 服务无 execute-by-id。

**【建议·推荐】** **双轨**：DSH 原生承载「公司级默认值」（volatile 字段 + `plugins.bundle.config` 表单 + profile patch，零自建持久化/表单/审计），公司薄层承载「workspace 覆盖」（`.dsh-company/startup.json`），composer 按钮开公司 modal 显示**生效值 = 默认 ⊕ 覆盖**并提供「打开 DSH 公司设置卡」深链。DSH 原生独轨（无 workspace 覆盖）是更省的退化形态，取决于用户是否接受公司级一刀切。

## 1. opener 定论：settings modal 无公共入口

【事实】三处出口全部封死：

1. **壳 store 私有**：`ui-settings-general/src/client/index.ts:188-190` 在 `ctx.slots.inject('sidebar.settings', …)` 闭包内 `createSettingsShellStore()` 并 `create()`；实例只作为 `store` 座位随槽注册传出（`:211-225` 的 children 声明），未 `reflect.provide`。store 的 actions（open/close/select/openSection）见 `shell-store.ts:16-26`——定义在 vendor 内部，调用者只能是自己。
2. **shortcut 不可被第三方触发**：`index.ts:192-209` 注册 `settings.open`，`resolve` 闭包直接捕获 `shellInstance.actions.open()`。而 `Shortcuts` 服务接口（`shortcuts/src/client/types.ts:83-137`）只有 `register / registerFixed / observeFixedInput / describeBinding / edit / recording / closeWindow`——**没有按 id 执行命令的方法**。
3. **owner props 不外溢**：`openSettings` 只传给 `settings.launcher` 占据者（`SettingsRoot.tsx:217-224`），`openSection` 只传给 `settings.onboarding` 占据者（`:262`）。两者都是「占据者才拿到」的座位参数，不是可注入服务。

【推论】因此「按红框按钮 → 弹出 DSH 的 settings modal」在当前 pin 下**不可实现**，与姊妹材料 §3.2 一致。但 §1.3 的结论是「modal 打不开」，不等于「DSH 设置面到不了」——**下一节说明有另一条路**。

### 1.1 一个未写进姊妹材料的补充可能：占据 `settings.launcher`

【事实】`settings.launcher` 是 `single` 槽，带 `fallback`（默认齿轮按钮）；占据者收到 `{ wide, settingsOpen, openSettings, openOnboarding, settingsShortcut }`（`SettingsRoot.tsx:217-224`），渲染在侧栏设置触发器行内。

【推论】第三方**可以**占据它，从而在自己的按钮里拿到 `openSettings` 并打开 DSH 设置 modal。但代价：single 槽占据即**替换掉默认齿轮按钮**，而 `settings.trigger`（齿轮图标内容）是壳自己的注册、占据者拿不到它的 renderSlot，等于要自己重画入口。

【建议】**不采用**。侵入性高（一旦本包被禁用，用户失去设置入口）、与其它想挂设置入口的插件互斥、且解决的是「侧栏入口」而非「composer 红框入口」。记录在此仅为闭合可能性空间。

## 2. pluginNavigation：DSH 唯一公共的「打开某个设置面」

【事实·实现】`ui-plugin-manager/src/client/index.ts:138-149`：

```ts
const disposeNavigation = ctx.reflect.provide('pluginNavigation', {
  openList: () => { ctx.layout.selectPanel(PANEL_ID); instance.actions.setTab('installed'); instance.actions.setView({ kind: 'list' }) },
  openBundle: (packageName: string) => { ctx.layout.selectPanel(PANEL_ID); instance.actions.setTab('installed'); instance.actions.setView({ kind: 'package', name: packageName }) },
})
```

【事实·可注入性】它是 `reflect.provide` 的反射服务，任何插件可 `ctx.inject(['pluginNavigation'])` 或直接声明 `inject = [..., 'pluginNavigation']`。**vendor 内部有两个真实消费者**：

- `experimental/client-ui-voice-input/src/client/mount.ts:18,28`：`inject` 含 `pluginNavigation`；composer 控件的动作 `openSettings: () => ctx.pluginNavigation.openBundle('@deepseek-ai/dsh-experimental-voice-input-bundle')`。
- `client/ui-entry-customization/src/client/index.ts:22,35`：菜单项调 `openList()`。

【事实·落点】`openBundle` 落到 `PluginManagerPage.tsx:782` 的 `renderSlot('plugins.bundle.config', { view: 'page' }, { entryKey: pkg.name })`——即该 bundle 的「配置」区块，里面渲染各插件注册的设置卡。

【推论】`pluginNavigation.openBundle('dsh-company-pack')` 就是「点 composer 按钮 → 落到 DSH 自己的公司配置页」的**现成通道**，零自建导航。差别只在 UX：它是**主面板**（Plugins 页 + 包详情视图），不是居中 modal。

【建议】把它作为「打开公司设置」的一条腿。是否作为红框按钮的**唯一**目标，取决于用户接受 panel 还是坚持 modal（§10 决策点 D1）。

## 3. settings.section：贡献一整页 DSH 设置

【事实】槽合同 `ui-settings/src/client/contract/slots.ts:57`：`'settings.section': { kind: 'list'; scope: 'root'; owner: SettingsSectionOwnerProps }`——「一整页 settings，id/order/label 驱动导航」。兄弟槽：`settings.plugins.tab`（:66）、`settings.general.item`（:92）、`settings.onboarding`（:77）。

【事实·第三方先例】`ui-settings-plugins/src/client/index.ts:76-84` 注册 `id: 'plugins', order: 15, label: () => t('nav'), children: { 'settings.plugins.tab': … }`，页面组件 `PluginsSettingsSection`。

【推论】公司**可以**注册 `settings.section`（如 `id: 'company', order: 20, label: '公司'`），在里面放启动设置的整页表单。但这解决的是「设置页里有公司一页」，**不解决红框按钮**——按钮仍然打不开 modal（§1）。用户得自己从侧栏齿轮进 Settings 再点「公司」页。

【建议】作为「深度入口」（用户主动找设置时的落点）有价值，但**单靠它无法兑现红框按钮的 UX 承诺**。若采用 §10 的双轨推荐，它的位置由 §4 的 `plugins.bundle.config` 卡替代（更省：不必自建页面路由，且 `openBundle` 能直达）。

## 4. configForms + volatile + 持久化：DSH 原生写入面

### 4.1 机制

【事实】`ui-settings/src/client/config-form.ts`：

- `get(entryId)`（约 :278-290）按 **Host 插件行 entry id** 取/建表单，`namespace = entryId`；
- `mutate(ops, expectedRevision)`（:120-145）→ `ctx.remote.settings.mutate(namespace, ops, revision)`，失败走 `recover()` 重读；带 revision 防 stale write。

【事实】`settings/settings/README.md:12`：「Edit fields that plugins declare with `.volatile()` … Forms identify each plugin by its profile entry id … Changes persist through the active profile's Cordis patch.」；`:33`：「Forms expose only volatile fields from active, uniquely addressed profile entries.」

【事实】legacy `settings.yaml` 只在启动时一次性导入后改名 `.imported`（`settings/src/index.ts:238-243`）——**不是**现行持久化家。

### 4.2 落点：公司 host 行的 entry id

【事实】`cordis.patch.yml:103-104`：`- id: company-client` / `name: 'dsh-company-pack'`。⇒ `configForms.get('company-client')` 对应的就是本包 host 的 Config。

### 4.3 硬成本：本包今天没有 Config schema，更没有 volatile 字段

【事实】`src/host/run-bundle/config.ts:1-6` 头注明言：

> 为什么不做 `export const Config` schema：`@deepseek-ai/schemastery` 不在本包 peer 面，为一个可选旋钮新增运行时 peer 不划算。

`HostConfig = CultivationHostConfig & { handbookSkipPresets? }`（`src/index.ts:63-66`），`validateHostConfig` 白名单只认 `cultivationRoot` / `handbookSkipPresets`，未知键 **fail-loud**（`config.ts:13-15`）。

【推论】走 DSH 设置表单，必须：① 引入 `@deepseek-ai/schemastery`（新 peer / 依赖面）；② 声明带 `.volatile()` 的 Config 字段；③ 让 host 从 `ctx` 读自身 Config 而非只在 `apply(config)` 时拿一次。**这不是零成本的「用现成」**，而是把本包从「无 schema 的极简 config」升级成「有 schema 的 settings-aware 插件」。

【事实】反过来，DSH 替你省掉的：表单渲染、字段级校验、revision 冲突、secret 保留、写盘（profile patch 的原子性与格式）、以及 Settings/Plugins 两处 UI 的导航。

### 4.4 作用域：profile 全局，而本仓「一次安装 = 一个公司」

【事实】`docs/contracts/profile.md:21`：「一个安装 = 一个公司；同一 home 可顺序服务多个 workspace；不同公司 = 不同 `DSH_HOME`。」

【推论·关键】**profile 全局 = 公司级**，这在语义上恰好等于「这家公司的默认设定」；而用户说的「这次的研究 / 这个项目」是 **workspace 级**。两层不是矛盾，是**两个不同的层**：

| 层 | DSH 原生载体 | 语义 |
|---|---|---|
| 公司级默认 | profile patch（volatile） | 这家公司一律用什么 wiki / 类型 / 模式 |
| workspace 覆盖 | **DSH 无原生载体** | 这个项目这次怎么跑 |

【负证据】包内 grep 无任何 workspace 作用域的 settings/state 服务；DSH `settings` 族只有 `settings`（`settings-file` 在 pin 内为空目录，`git ls-files` 无输出）。⇒ **workspace 级必须自建薄层**，这是 DSH 的真实空缺，不是设计偷懒。

## 5. plugins.bundle.config 卡：最省的自建量

【事实】槽由 `ui-plugin-manager` 的 `main` 面板声明（`ui-plugin-manager/src/client/index.ts:118-131` 的 children 含 `'plugins.bundle.config': { kind: 'keyed'; scope: 'root' }`），渲染点 `PluginManagerPage.tsx:782`，`entryKey = pkg.name`。

【事实·活先例】`dsh-client-auto-continue/src/client/index.ts:165-186` 向 `plugins.bundle.config`（key = 其 bundle 名）注册设置卡；`voice-input/src/client/mount.ts:49-55` 同款（key = `@deepseek-ai/dsh-experimental-voice-input-bundle`）。

【推论】公司注册一张卡（key = `dsh-company-pack`）即可获得：DSH 原生页面容器 + 从 `pluginNavigation` 直达 + 与 bundle 生命周期同生共死。**自建量 = 一个 React 表单组件 + 一个槽注册**，无路由、无 modal 壳、无持久化代码。

【事实·auto-continue 的跨 cohort 防御】它同时注册了 `settings.plugin.item`（旧槽，pin 内无 SlotMap 声明、shipped 0 命中）与 `plugins.bundle.config`（现行）——【推论】升 pin 时槽名必须重校，这是真实漂移史。

## 6. settings.general.item：更轻的一行

【事实】`slots.ts:92`：`'settings.general.item': { kind: 'list'; scope: 'root'; owner: SettingsGeneralItemOwnerProps }`——General 页内的「一行偏好」。

【推论】适合放**单值、低复杂度**偏好（如「缺省协作模式」下拉），不适合放 wiki/类型/方法这种需要说明与联动的启动绑定（一行塞不下解释与后果警示）。

【建议】若字段集 > 2，用 `plugins.bundle.config` 整卡；`general.item` 只用于「一眼可切换」的开关型偏好。

## 7. per-session / per-workspace 的原生载体盘点

【事实】DSH 没有 per-workspace settings 服务（§4.4 负证据）。业界在 DSH 上的实际做法是**把 per-session 值塞进插件自己的 Config**：

- auto-continue：`shared/core.ts:110,153,232` 定义 `sessionModes?: Record<string, SessionMode>`，`engine.ts:396,928` 按 sessionId 查；该 map 存在 profile patch 的 `config.sessionModes` 里（运行态实证见姊妹材料 §4.1）。

【推论】这个「profile patch 里放 map」的手法**可以**被公司复用做 per-workspace：`{ workspaces: { "<abs path>": {...} } }`。但缺点明显：① 无 workspace 生命周期清理（删项目留垃圾）；② 路径为键，迁移/改名即失效；③ 改一个 workspace 会重写整份公司配置（revision 冲突面变大）；④ 语义混淆（公司级文件里藏项目级数据）。

【建议】**不采用**。workspace 级数据住 workspace 自己的盘（`.dsh-company/`），与现有 `bundle.json` / `kb/` / `cultivation/` 同构，符合本仓「公司状态 = workspace 盘」的既有形状（profile.md:27-28）。

【事实·命名冲突】`<DSH_HOME>/company/settings.json` **已被占用**（workspace 最近选择登记，`workspace-resolution.ts:53`；内容 `{v, workspace, updatedAt}`）。拟议的 workspace 级文件若也叫 `settings.json` 会与它同名异所——【建议】workspace 级文件改名 `startup.json`（或 `startup-settings.json`），home 级保持不动。

## 8. onboarding / startup 面

【事实】`settings.onboarding`（`slots.ts:68-77`）是「root 作用域的 onboarding 步骤」，占位者收到 `{ stepId, explicit, complete, openSection }`（`SettingsRoot.tsx:258-266`）。

【推论】它是**首次运行引导**的载体（隐私声明、可观测性告知一类），不是「每次启动的配置入口」。把启动 settings 塞进 onboarding 会让它变成「每次都弹」或「只在首启可改」，两种都不符合「启动时能改」。

【建议】不用。若要「新 workspace 首次打开时提示配置」，那是**独立的** onboarding 场景，留给后续。

## 9. 注入面：哪个最 DSH 原生

| 载体 | 机制 | 每轮可见 | 成本 | 适合 |
|---|---|---|---|---|
| **`systemPrompt.section`（活 thunk）** | `core/system-prompt/src/index.ts:62-66` provider 每次 assembly 求值 | ✅ | 极低（已有 handbook 500 / language 1 两个先例） | **强制绑定的正文**——推荐 |
| skill（`skill-filesystem`） | catalog 常驻 name+desc，正文按需加载 | ❌ 需模型主动加载 | 低 | 方法论/协议，不是「强制值」 |
| kb 播种 | 首启 only-fill 写盘 | 取决于模型是否读 | 中 | 公司事实（company.md/CHARTER） |
| `agent-instructions` | 加载项目 AGENTS.md/CLAUDE.md | ✅ | 低 | 用户项目自己的指令，**不是本包的家** |

【事实】公司已用两个 section：手册（`handbook.ts:81-88`，order 500，skip = NON_ROLE_PRESETS）、语言（`language-policy.ts:52-66`，order 1，`text: () => languagePolicyText(language.current())` **活读**）。

【建议】启动 settings 新增 `company:startup-settings`，**order 501**（在手册之后，语义上「后文覆盖前文」），thunk 每次求值时读生效值（覆盖 ⊕ 默认），跳过集合与手册一致。语言 section 是本方案的**现成模板**：它已经证明「设置变化 → 下一轮 prompt 生效」的管道在本仓可跑。

## 10. 落地菜单与推荐

### 10.1 四条可达路径

| # | 路径 | 入口从红框可达 | 持久化载体 | 作用域 | 自建量 | 侵入性 |
|---|---|---|---|---|---|---|
| **N1** | composer 槽 → `pluginNavigation.openBundle('dsh-company-pack')` → Plugins 页 → `plugins.bundle.config` 卡 → `configForms` | ✅（DSH 原生面板） | profile patch（volatile） | 公司级 | 中（需 schemastery Config + 表单） | 低 |
| **N2** | composer 槽 → 公司自持 Modal → 写 `.dsh-company/startup.json` | ✅（居中 modal，符合原设） | 公司文件（自建原子写） | workspace | 中（modal + 写通道 + 读盘） | 低 |
| **N3** | **N1 + N2 双轨**：默认值住 DSH，覆盖住 workspace；modal 显示生效值 | ✅ | 分两处 | 公司 + workspace | 中高 | 低 |
| **C** | composer 槽 → 公司 modal 内「打开 DSH 设置」按钮 | ✅（二级） | 不适用 | — | 低 | 低 |

【说明】N2 在本轮已由姊妹材料取证过（写通道 = `remote.commands.execute`，`workspaceFiles` 只读）。C 不是独立形态，是所有形态里的一个按钮。

### 10.2 推荐：N3 双轨，分期落地

**【建议·形态】**
1. **公司级默认（DSH 原生）**：`company-client` 行声明 volatile 字段（`wiki` / `productType` / `deliveryMode` / `method` / `collaborationMode` / `timeZone`），表单注册进 `plugins.bundle.config`（key `dsh-company-pack`），值落 profile patch。用户从 composer 按钮或 Plugins 页都能改。
2. **workspace 覆盖（公司薄层）**：`.dsh-company/startup.json`（改名避撞车），原子写，与 `bundle.json` 同级。
3. **生效值 = 覆盖 ⊕ 默认**，由 host 统一解析；`company:startup-settings` section（order 501）thunk 活读。
4. **composer 按钮**：主路径开公司 modal（含覆盖编辑 + 显示继承来的公司默认 + 「打开 DSH 公司设置」深链）；若用户接受面板 UX，可退化为直接 `openBundle`。

**【建议·为什么不是纯 N1】** 纯 N1 把启动绑定钉在**公司级**。用户原话「这次的研究」偏会话/项目粒度；一个 home 顺序服务多个 workspace 时，公司级一刀切会让第二个项目的类型/模式继承第一个的选择。N3 用最小代价补上这一层。
**【建议·为什么不是纯 N2】** 纯 N2 等于放弃 DSH 的表单、revision、secret、导航；这些都已在 vendor 里做好了，自建是重复劳动（也违反本仓「不发明」纪律）。

### 10.3 决策点（需用户拍板）

- **D1 · UX**：红框按钮开**居中 modal**（公司自建，N2/N3）还是 **DSH Plugins 面板**（DSH 原生，N1）？前者贴合原设，后者最省且是官方 experimental 插件同款。
- **D2 · 作用域**：是否要 workspace 覆盖？不要 ⇒ 纯 N1，砍掉 `.dsh-company/startup.json` 与自建 modal，代码量最小。
- **D3 · 依赖**：为用 DSH 原生表单而引入 `@deepseek-ai/schemastery`，可接受吗？（`config.ts` 头注当初明确避免它。）
- **D4 · 强制档位**：软（prompt section）先行，还是同时插命令解析链（硬）？姊妹材料 §5.5 建议先软后硬。
- **D5 · 文件命名**：workspace 级文件用 `startup.json`（避撞车）还是别的名字？

## 11. 负证据与限制

1. 【负证据】settings modal 无公共 opener：壳 store 私有（`ui-settings-general/src/client/index.ts:188-190`）、`Shortcuts` 无 execute-by-id（`shortcuts/src/client/types.ts:83-137`）、`openSettings`/`openSection` 仅 owner props（`SettingsRoot.tsx:217-224,262`）。
2. 【负证据】`packages/settings/settings-file` 在 pin 内为空目录（`git -C vendor/dsh ls-files` 无输出，目录只剩 `node_modules`）——「两子包」锚点不成立。
3. 【负证据】DSH 无 workspace 作用域 settings 服务（§4.4）；`workspaceFiles` remote 仅 read/readBytes/stat/list/changes（`api/workspace-files/src/index.ts:233,257,290,303,340`），无 write。
4. 【负证据】本包无 Config schema、零 volatile 字段（`src/host/run-bundle/config.ts:1-15`）。
5. 【限制】未实跑 `pluginNavigation.openBundle('dsh-company-pack')` 到真页面（未注册公司卡，无落点可看）；该结论由 vendor 源码 + voice-input 同款先例推出，属【推论】。实现期须真挂载验证。
6. 【限制】未验证「volatile 字段 + configForms」在本包 host 上的端到端读写（需先加 schema）；`settings/document-updated` 的实时跟随之于 startup-settings 未测。
7. 【限制】`settings.launcher` 占据的副作用（默认齿轮消失）由源码读出，未做视觉实证。
8. 【限制】本轮零代码改动、未跑 `pnpm test` / `pnpm verify`。

## 12. 开放问题

1. **D1–D5**（§10.3）= 落地前必须由用户拍板的五项。
2. **session 级覆盖**：若 D2 选「要 workspace」，是否再要 per-session（auto-continue 的 `sessionModes` 是先例，但成本上一档）？
3. **多 workspace 并发**：同一 home 顺序服务多 workspace 时，profile 全局默认是否需要「按 workspace 记忆上次选择」的便利层（类似 home 的 workspace 登记）？
4. **company.md 的 timeZone 回收**：若启用 `timeZone` 设置，`content/state/company.md:5` 与六个 preset 的钉值三处如何收敛到一处（姊妹盘点 §2.6 提出「company.md 立为唯一事实家、preset 降为出厂回落」）。
5. **DSH 原生表单的可见性**：`plugins.bundle.config` 卡在「公司包被禁用/未安装」时的表现（卡随 bundle 消失）是否符合预期？
