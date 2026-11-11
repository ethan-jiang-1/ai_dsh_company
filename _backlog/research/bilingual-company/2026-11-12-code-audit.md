---
topic: 中英文双语的代码盘面与机制事实
intent: 给「插件中英文双语、默认中文启动」提供可复核的代码事实、机制落点、上游限制与风险；不替用户做范围裁决。
---

# 代码盘面与机制事实

## 1. 方法与口径

- 扫面：`packages/company-pack/src/{client,host,lib,index.ts}`，用 TypeScript AST 取 **字符串字面量 / 模板字面量 / JSX 文本**，保留含 CJK 的项；**注释不计**（AST 天然跳过）。
- 计数是「字面量条数」或「CJK 字符数」，不是行数，也不是「必须翻译的词条数」——同一句可能在多处出现，纯函数里的状态词还会被多个组件复用。content 一节只扫 `.md/.yml/.yaml`，`check-rules.json` 等 JSON 里的中文提示不在 2.48 万里，Phase B 要另算。
- 盘面复核日期 = 2026-11-12；vendor pin = `dsh-v0.2.1-rc.5`（`b830ec9`）。
- 「实测」只用于本轮真跑过的命令；其余是源码事实，标了文件与行号。

## 2. 体量：文案在哪、有多少

| 面 | 体量（本轮扫描） | 主要形态 | 现状 |
|---|---|---|---|
| client | **501** 条含 CJK 字面量 / 28 文件 | JSX 文本、`CULTIVATION_COPY` 文案表、tab 目录的 `description`、`TAB_IDENTITY` 的 label/tooltip、`ROLE_SHORT`、品牌 fallback、实例横幅、标题括号、工具卡状态词 | 全部硬编码中文；入口 `inject = ['slots', 'remote', 'sessions']`，**没有 `locale`** |
| host | **329** 条 / 26 文件 | 6 个命令的 description 与回执、7 个工具的 description 与结果 note、bootstrap/运行时告警、账本/目录写盘文案 | 中文；命令 description 只在注册时写一次 |
| lib（共享） | **215** 条 / 14 文件 | `STATUS_LABEL`、`TASK_STATUS_LABEL`、`UNASSIGNED_LABEL`、`budgetSummary` 行标签、`presence` 事件句、`attention` 完成句、`teamCardModel` / `delegationCardModel` 抬头、`deliverables-catalog` 领域词 | 纯函数直接返回中文；client 与 host 共用 |
| root index | **42** 条 / 1 文件 | 启动/迁移告警、日志 | 中文；多数是开发者面 |
| presets | **37** 文件 / 约 **3.13 万** CJK 字 | 11 个 `agent.cordis.yml`（persona 内联）+ 26 个 skill `.md` | 中文；persona 在 mount 时静态 |
| content | **73** 文件 / 约 **2.48 万** CJK 字（md/yml/yaml；JSON 规则里的中文提示未计） | 手册、charters、generic、contracts、templates、product-types、delivery-modes | 中文；host 在启动/建 agent 时读取 |
| docs | **39** 文件 / 约 **5.27 万** CJK 字 | README、安装手册、docs/ | 中文为主；门禁也按中文形态写 |

客户端热点文件（条数）：`cultivation-actions.ts` 88、`CultivationBoardSections.tsx` 83、`DeliverablesTab.tsx` 48、`CultivationChatPanel.tsx` 31、`CultivationInbox.tsx` 25、`company-tabs.tsx` 25、`CultivationBoard.tsx` 24、`TeamToolCard.tsx` 23、`company-panels.tsx` 19、`LedgerTab.tsx` 18、`tab-icons.tsx` 18、`TasksPanel.tsx` 16、`AttentionTab.tsx` 14、`DelegationCard.tsx` 14、`DelegationFlowPanel.tsx` 13。

host 热点：`cultivation.ts` 100、`bootstrap.ts` 31、`req-command.ts` 27、`runtime-guard.ts` 21、`delivery-command.ts` 16、`cultivation-context-read.ts` 16、`presented-domain.ts` 15、`presented-ledger.ts` 15。

lib 热点：`prd-check.ts` 57、`cultivation-context.ts` 50、`deliverables-catalog.ts` 23、`requirements-check.ts` 23、`presence.ts` 17、`attention.ts` 9、`board.ts` 8、`ledger.ts` 7、`presence-status.ts` 6、`budget.ts` 4、`signoff.ts` 4。

**读法**：真正的工作量不在「把 501 条替换成 `t(...)`」；难的是 lib 里那些**已经是展示文案**的纯函数产物（状态、列名、事件句、预算行、卡片抬头）。它们今天被测试直接断言中文；要双语，必须先把「展示事实」与「文案」分开，否则客户端只能拿到已经写死中文的字符串。

## 3. DSH 已经有什么（不需要自造）

### 3.1 客户端 locale 是现成的

- web-app 组合在 `vendor/dsh/packages/bundle/web-app/cordis.patch.yml:257` 插入 `- id: locale`，name = `@deepseek-ai/dsh-client-locale`。
- 该包提供：
  - `LocaleRuntime`：active locale、可选语言表、typed 字典、fallback 链；
  - `ctx.locale.register(ns, { zh, en })`：typed 形式要求两种内置语言的 key 集**完全一致**，缺 key/多 key 编译期报错；
  - `ctx.locale.bind(ns)`：绑定命名空间的 `t`；
  - slot 注册的 `locale: NS`：框架把 `t` 作为标准 seat 注入组件；
  - `setLocale(id)`：唯一写入入口，持久化到 Host settings 的 `locale.preference`；
  - `FALLBACK_LOCALE = 'en'`（`vendor/dsh/packages/client/locale/src/client/index.ts:109`）。
- 偏好解析：浏览器语言只作 **provisional**；Host 的 `preference` 到达后 `adopt` 覆盖（同文件 `:304`）；`setLocale` 无论当前值是否相同都会写（同文件 `:260`），这是为了让显式选择跨浏览器保留。
- 语言行在 Settings → General；`<html lang>` 由 locale runtime 同步（zh → `zh-CN`）。
- 大量 vendor 插件已经按这个模式写（`session-inspector`、`ui-commands`、`ui-sidebar-right`、`cot-translation` 等），可作范式。

### 3.2 默认中文有干净落点（本轮实测）

`locale` 的 Host Config 是：

```ts
// vendor/dsh/packages/client/locale/src/index.ts
export interface Config {
  /** Explicit locale; omission follows the browser. */
  preference: Volatile<string | undefined>
}
```

所以组合层可以直接给这个 entry 写 `config.preference`。本轮用 overlay 实测：

```sh
node vendor/dsh/apps/cli/lib/bin.js --profile company \
  --patch runtime/i18n-audit/locale-default.patch.yml --dump-config
```

overlay 内容：

```yaml
- id: locale
  config:
    preference: zh
```

合成结果（原话摘录）：

```yaml
- id: locale
  name: '@deepseek-ai/dsh-client-locale'
  config:
    preference: zh
```

结论：把同样的行放进 `packages/company-pack/cordis.patch.yml` 就能把 **profile 缺省** 设为中文；已有用户 override 的优先级更高，所以升级不会强制改掉英文用户的选择；Settings 里 reset 会回落到这个 bundle 缺省。

### 3.3 Host 侧没有通用 locale 服务，但能读到同一个偏好

- `ctx.settings.describe()`（`vendor/dsh/packages/settings/settings/src/index.ts:302`）会列出所有**活跃且有 volatile 字段**的 profile entry；`locale` 的 `preference` 是 volatile，所以 descriptor 里能读到 `ns = 'locale'`、`value.preference`。
- `settings/document-updated`（同文件 `:317`）在 entry 配置变化时发出；Host 可以据此实时更新公司工作语言。
- 这套读法在 vendor 已有先例（`packages/experimental/cua/src/index.ts:163-168`：`ctx.get('settings')` → `describe()` → 找自己的 entry）。
- 注意：`describe()` 是同步的，但服务可能比 `company-client` 的 `apply` 晚就绪；Host 侧应「缺 settings 就默认 zh，服务出现后再接管」，不能让启动失败。

### 3.4 内容 section 可以是动态的，persona 不行

- `systemPrompt.section({ text: () => ... })` 支持每次 assembly 重新求值（`vendor/dsh/packages/core/system-prompt/src/index.ts` 的 `PromptSection.text`）。
- 但 `@deepseek-ai/dsh-persona` 的 `prefix` 是 `z.string().required()`，在 mount 时注册成静态 section（`vendor/dsh/packages/preset/persona/src/index.ts:36` / `:63`）。所以 persona 不能随语言 live 切换；要切换只能重挂 preset 或把 persona 移到 Host 注入。
- 这决定了：**语言 policy 可以用动态 section 做；persona/skill 的英文版是另一个阶段。**

## 4. 上游限制（绕不开，必须显式处理）

| 限制 | 证据 | 影响 | 可行绕法 |
|---|---|---|---|
| 自定义 preset 的 `name`/`description` 不本地化 | `vendor/dsh/packages/preset/agent-preset-registry/src/display.ts:40-67`：只有 `standard/ptc/minimal/cordis` 四个内置 id 有字典 key；自定义 preset 直接返回声明的字符串 | preset picker 里 11 个 role 的 description 只能是一种字符串 | 双语一行（中/英同串）或英文短句；不伪造 per-locale 切换 |
| Host 命令 `description` 是单字符串 | `vendor/dsh/packages/interaction/commands/src/types.ts:63` | 命令菜单里自定义命令的 description 不随客户端 locale 变 | 语言变化时 dispose + 重新注册（registry 支持 disposer + `commands/change`）；或双语一行 |
| 工具 description 是单字符串 | `dsh-tools` 的 `defineTool` 声明 | 模型侧工具说明只能一种语言 | 统一英文（模型对英文最稳）；结果 note 走 Host 语言表 |
| `persona.prefix` 静态 | 见上 | 不能在会话中途切 persona 语言 | Phase A 用动态 language policy 纠正输出语言；Phase B 再考虑 Host 注入 persona |
| `skill-filesystem` 的 `customSkillDirs` 是静态目录 | `vendor/dsh/packages/skill/skill-filesystem/src/index.ts:58` / `:80` / `:253` | 不能按语言选 skill 正文 | Phase A 保持中文 skill；Phase B 用语言目录/provider 或双语内容 |
| 文档门禁按中文形态写 | `checks/gates/doc-budget.mjs`、`dist-manual.mjs`、`tests-literals.mjs`、`dev-product-parity.mjs` | 加英文文档不是「多一个 md」；要动预算/必含句/词表 | 英文文档另起阶段，先做契约+门禁设计 |

## 5. 现有代码的具体缺口

### 5.1 client 入口没有接 locale

`packages/company-pack/src/client/index.ts:37`：

```ts
export const inject = ['slots', 'remote', 'sessions']
```

没有 `locale`；`src/client/` 下没有 `locales.ts`，也没有 `LocaleNamespaceMap` 的 declaration merge。所有文案都是直接字面量或组件内表。

### 5.2 文案被写进了纯函数 view model

这不是「组件文案」，是**读模型输出**：

- `src/lib/presence-status.ts:21`：`STATUS_LABEL`（执行中/待命/…），`statusLabelFor()` 直接返回中文；`presence.ts:160,189` 把它写进行数据与事件句。
- `src/lib/board.ts:17`：`TASK_STATUS_LABEL`（待办/进行中/完成/已删），`UNASSIGNED_LABEL = '未分配'`。
- `src/lib/budget.ts:66`：`UsageRow.label` 直接是「未缓存输入 / 缓存读 / …」。
- `src/lib/attention.ts`：`presentLabel()` 返回「交付物」，完成句是 `交付完成：…`。
- `src/client/ui/DelegationCard.tsx`：`ROLE_LABEL`、`STATE_LABEL`、`delegationCardModel()` 返回中文；`TeamToolCard.tsx` 的 `teamCardModel()` 同理。
- `src/client/cultivation/cultivation-actions.ts:26`：`CULTIVATION_COPY` 是一整张中文文案表（含函数值），被校验逻辑直接引用；组件不得另写文案的约定很好，但它现在是单语言。
- `src/client/tabs/company-tab-registration.ts:64`：9 个 tab 的 `description` 中文；`tab-icons.tsx` 的 `TAB_IDENTITY` 含 label/tooltip。
- `src/client/wiring/title-state.ts:26`：`【${short}】${title}`；`instance-guard.ts:21`：多实例横幅；`ui/Brand.tsx:14`：`'DSH 梦之队'` fallback。

**含义**：如果只在组件里包 `t()`，这些 view model 仍然把中文送进组件；必须先把它们改成 key/token（或接受 `t` 参数），否则会得到「组件翻译了，数据没翻译」的半成品。

### 5.3 Host 用户可见文案散落在命令/工具处理器里

- 6 个命令：`company-diagnostics`、`deliverables`、`delivery`、`prd`、`req`、`cultivation`。
- 7 个工具：`request_signoff`、`cultivation_propose`、`workspace_doors`、`list_subagents`、`send_to_subagent`、`subagent_retry`、`workflow_runs`。
- 其中 `cultivation.ts` 一个文件 100 条含 CJK 字面量；`req-command.ts` 27 条；`delivery-command.ts` 16 条。大量是校验失败/回执正文，属于人可见面。
- `src/lib/signoff.ts` 的 `signoffDecisionNote()` 返回「已批准本次（一次性）…」等模型/人可见句；`request_signoff` 的 description 是英中混写。

### 5.4 preset / content 完全没有语言轴

- 11 个 preset 的 `persona.prefix` 是内联中文；`name` 是 CEO/VP-Eng 等英文短名，`description` 是中文。
- 26 个 skill 的正文与 frontmatter description 是中文；`skill-filesystem` 的 `customSkillDirs` 是静态路径。
- `content/AGENTS.md` 由 host 注册成 `systemPrompt.section`；`readHandbook()` 只读一份；`readWorkflowContract()` / `readDelegationSections()` 同理。没有 `content/<lang>/`，也没有语言选择。
- `content/manifest.json`、seed、product-types 的 JSON 规则都假定一套中文树。

### 5.5 文档/门禁是中文形态

- 根 README、pack README、`_dist/安装手册.md`、`docs/**` 都是中文；`doc-budget` 按中文行数设上限，`dist-manual` 用中文必含短语，`dev-product-parity` 禁旧词，`tests-literals` 禁公司名/政策数字。
- 2026-11-08 的 README/手册卡明确把「同轮全站双语/英文」列为**输掉的方案**，理由是「没有英文读者证据，维护翻倍」（`_backlog/_archive/settled_issues/2026-11-08-user-facing-readme-and-first-use.md`）。本轮用户明确要求双语，**这条旧取舍被覆盖**，但旧卡仍是有价值的「为什么当时没做」记录。

## 6. 默认中文的风险

1. **首屏闪英文**：`LocaleRuntime` 构造时先用品浏览器语言做 provisional；Host 的 `preference` 通过异步 settings mirror 到达后才 `adopt`（`src/client/index.ts:304`）。如果首屏渲染早于 mirror 的第一次 describe，英文浏览器理论上会先看到英文，再切中文。必须用真浏览器（英文 locale）验收「首屏稳定后是中文」；若闪得可见，需要补 bootstrap/预置，不能假装不存在。
2. **已有英文偏好不能被覆盖**：bundle 的 `preference: zh` 是**下层缺省**；用户已有 `preference: en` 时，profile patch 的 override 优先。验收要覆盖「升级后英文用户仍是英文」。
3. **Host 读偏好的时机**：`settings` 服务可能晚于 `company-client` 就绪；Host 默认 zh，服务到达后接管。若语言 pole 在首个 turn 前没到，首个 turn 可能按 zh 组装；这是可接受的窄竞态，但要写进合同。
4. **`locale.preference` 是 DSH 的用户设置，不是公司配置**：一个 home 下多个 profile 共享吗？按 DSH 的 settings scope 策略，偏好是 per Home 的 settings document（活跃 profile 的 patch），不是 per session。要确认「换浏览器/换 profile」的预期；不要把公司语言写成 per-session 字段。
5. **外部语言**：`preference` 可能是 `ja`、`pt-BR`（locale 包接受任意 BCP 47）。公司只有 zh/en 两套；合同要定义回落（建议：非 zh/en → en，与 DSH 的 fallback 一致；缺失 → zh 公司缺省）。

## 7. 本轮实测记录

| 检查 | 结果 |
|---|---|
| `--dump-config --patch` 合成 `locale.preference: zh` | 通过；输出见 §3.2 |
| AST 扫面（client/host/lib/presets/content/docs） | 通过；计数见 §2 |
| `pnpm verify` / `pnpm test` / `pnpm typecheck` | **本轮未跑**（研究卡不改代码；落地时按改动面跑，见测试宪法） |
| 真浏览器语言切换 | **未跑**；Phase A 验收必须补 |

## 8. 复核命令（研究可复现）

```sh
# 组合层默认值
node vendor/dsh/apps/cli/lib/bin.js --profile company \
  --patch runtime/i18n-audit/locale-default.patch.yml --dump-config

# 文案体量（AST；脚本在 runtime/i18n-audit/，gitignored）
node runtime/i18n-audit/scan.mjs
```

`runtime/` 是 gitignored 工具区；上面的 overlay 与扫描脚本是研究期临时件，不随卡提交。
