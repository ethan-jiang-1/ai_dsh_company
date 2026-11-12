---
status: proposed
opened: 2026-11-12
---

> **2026-11-12 最终范围**：只做**界面呈现层** zh/en（Tab / Label / Button / 空态 / 错误）+ 默认 zh + 角色名混排。内部 content 存量 / 注释 / docs 的全量英文不在本 RFC 的验收；I2/I3 是独立债务。证据 = en 9 页签无中文、zh 金样一致、1669 tests、verify 全绿。

# 插件中英文双语（默认中文启动）

> 状态：proposed（已批；Phase 0/A1/A3a/A2-tab-shell 已实现，A2 其余/A3b/A4 未开始）｜ 批准：用户 2026-11-12「按流程推动落地」｜ 上游：[问题卡](../../_backlog/_archive/settled_issues/2026-11-12-bilingual-company.md) · [研究题](../../_backlog/_archive/research/bilingual-company/README.md)
>
> **2026-11-12 方向修正**：双语只在**表达层**；内部代码/提示/内容用**英文单份 canonical**；角色名也属于表达层。Phase B 从「中文正文 + 英文 overlay」改为「内部英文单份 canonicalization」；详见[表达层方向材料](../../_backlog/_archive/research/bilingual-company/2026-11-12-expression-layer-direction.md)。
>
> **2026-11-12 后续决策**：[内部全英文 canonical RFC](2026-11-12-internal-english-canonical.md) 接管内部语言方向；本 RFC 的 Phase B 被它取代，Phase 0/A1–A4 的表达层地基仍是现行。
>
> 本 RFC 把「插件中英文双语、默认中文」拆成 Phase 0 / A1–A4 / B / C；**本 RFC 的实施单元 = Phase 0 + Phase A1–A4**，Phase B/C 另卡。语言开关唯一源 = DSH `locale.preference`；默认 `zh` 由 bundle patch 落；客户端用 typed `company` 字典；host 用 `CompanyLanguage` + 动态 policy；content/persona/skill/docs 的全量英文不在本 RFC 内。

## 问题

当前插件是中文单语：Web UI、host 命令回执、agent 人设/手册/模板全部中文；英文用户只能看到中文界面与中文输出。DSH 已有完整的客户端 locale（typed zh/en 字典、Settings 语言行、host 持久化、浏览器回落），本包没有接；host 没有通用 locale 服务，但可按源码通过 `settings.describe()` 读到同一个 `locale.preference`。界面会持续调整，若没有可机械执行的纪律，新增文案会继续绕过 locale seat。

## 目标

1. **UI 双语**：所有 company 自有 Web UI 文案有 zh/en，可在 Settings → General 实时切换；缺省中文。
2. **输出双语**：agent 的回复、任务板、交付物跟随工作语言；缺省中文；用户明确换语言时跟随。
3. **Host 人可见面双语**：命令回执/错误、工具结果 note、签字提示；命令 description 随语言更新。
4. **纪律 day one**：任何新增/修改的界面文案从第一个 commit 就必须 zh+en；合同 + 门禁 + skill 三件套。
5. **表达层边界**：双语只做用户看得见的表达层（UI/角色名/回执/输出）；内部提示与内容用英文单份，不做中英双份；Phase B/C 另卡，不把「内部英文 canonical」冒充母语级英文内容。
6. **角色名表达层**：role id + 英文名是 canonical；UI/host 可见角色名用 `roles.*` 字典映射 zh/en；数据/preset id/日志不变。

## 范围与排除项

**在范围内（Phase 0 + Phase A1–A4）：**

- Phase 0：`.agents/skills/company-ui-change-definition/SKILL.md`；`packages/company-pack/src/README.md` 与 `tests/README.md` 的 UI 入口指针；RFC/问题卡记录。**不写** `docs/contracts/` 下的现时合同，也不加根 `AGENTS.md` 的合同/门禁指针——现有 501 条中文还没迁，写了就是假合同/dead pointer。
- A1：`packages/company-pack/cordis.patch.yml` 的 `locale.config.preference: zh`；client 入口接 `locale`；`packages/company-pack/src/client/` 下新增 `locales.ts` / `tab-copy.ts`；`company` typed namespace；`ctx.locale.register` effect；copy-bearing **组件**的 slot 加 `locale: NS`（label/title thunk 用 `ctx.locale.bind`）；文档/测试证明缺省中文与切换。
- A2：client/lib 文案迁移与展示事实 token 化（`packages/company-pack/src` 的 client + lib）；**表达层角色名目录**（`roles.*`：可见名/短标签/full/delegation）；数据/preset id 仍用英文 canonical。
- A3：host `CompanyLanguage`（`settings.describe()`、默认 zh、live update）；动态 `company:language` policy；6 个命令回执/错误、7 个工具 note、`blocked-text`、signoff 双语；command description 重注册；工具 description 英文。
- A4：11 个 preset 的 description 双语一行；`docs/contracts/` 下新增 `language.md` 现时合同；`checks/gates/` 下新增 `client-copy.mjs` 硬门禁 + 红→绿证据；根 `AGENTS.md` 纪律行；README/pack README 语言说明；安装手册模板语言段 + 重生成。

**排除（Phase B/C）：**

- `content/**` 与 `presets/**` 的**英文 canonicalization**（由[内部全英文 RFC](2026-11-12-internal-english-canonical.md) 接管；旧 RFC 不建 `content/en/` 双语副本）。
- `presets/**` persona 与 26 个 skill 的英文 canonical 正文（由[内部全英文 RFC](2026-11-12-internal-english-canonical.md) 接管）；不建中英双份。
- 全量 README/docs/安装手册英文；文档配对/一致性门禁。
- 日志/telemetry/开发者诊断英文。
- 第三语言、RTL、复数规则、locale 数字/日期格式。
- 把 `.dsh-company` 的领域词/字段名改成英文；存量数据迁移。

## 方案

### 1. 单一语言源与默认中文

- 唯一源 = DSH `locale.preference`；不新增公司语言设置。
- `packages/company-pack/cordis.patch.yml` 替换 web-app 的 `locale` 行并写 `config.preference: zh`。
- 已有用户 override 优先；reset 回 zh；缺失/无 settings → Host 默认 zh；外部语言（ja/pt-BR…）→ en（与 DSH fallback 一致）。

### 2. Client：typed 字典 + 展示事实/文案分离

- `packages/company-pack/src/client/` 下新增 `locales.ts`：`NS = 'company'`；`zh` 为 key 源；`en: Record<CompanyKey, string>`；declaration merge 进 `LocaleNamespaceMap`。
- 入口 `inject` 加 `locale`；`ctx.effect(() => ctx.locale.register(NS, { zh, en }))`；所有 copy-bearing **组件**的 slot 注册加 `locale: NS`；纯 label/title thunk（如 `conversation.view`）用 `ctx.locale.bind`；嵌套组件 `t` prop 传递。
- `packages/company-pack/src/lib/` 新增无 client 依赖的 `CopyToken`/`CopyKey`；纯函数 view model 返回 token/enum，不返回中文：
  - `presence-status` 返回 status enum；`presence` 事件返回 token；
  - `board` 返回列 key / 未分配 token；`budget` 返回 label key；
  - `attention` 返回 token；`teamCardModel`/`delegationCardModel` 返回 token；
  - client 统一 `text(token) = t(token.key, token.params)`。
- `CULTIVATION_COPY` 改 key 表；函数值改 `{param}` 字典项；不保留第二份中文默认值。

### 3. Host：CompanyLanguage + 动态 policy

- `packages/company-pack/src/host/` 下新增 `language/`：`createCompanyLanguage(ctx)`；默认 zh；`ctx.inject(['settings'], ...)` 后读 `settings.describe()` 找 `ns === 'locale'`；监听 `settings/document-updated`；缺失 settings 不报错；`current()/text(zh,en)/subscribe(fn)`。
- `company:language` system section：公司 preset 的每个 agent 注入；order 紧跟 persona；`interpolate: false`；`text` 每次 assembly 读当前语言。
- 默认 zh；用户明确要求另一种语言时跟随；Phase A 是过渡态：现有中文手册/模板照常执行，产出时把人类可读标题/标签译成目标语言，机器可读字段名/ID 不变。Phase B 后内部内容为英文单份，policy 只负责表达层语言。
- 命令 description 在语言变化时 dispose + 重新注册；命令回执/错误、工具 note、`blocked-text`、signoff 走 `language.text`；工具 description 统一英文。
- 日志/telemetry 保持单语，不进合同。

### 3.5 Expression-layer role names

- **canonical（内部，英文，不动）**：role id（`ceo` / `vp-eng` / …）+ 英文名（`CEO` / `VP-Eng` / …）；`PRESET_DISPLAY_NAMES` / `ROLE_LABEL` / org/owners 数据继续用它。
- **表达层**：`roles.<id>.name`（zh 首席执行官 / en CEO）、`roles.<id>.short`（CEO/VPE…）、`roles.<id>.full`（首席执行官 / Chief Executive Officer）、`roles.<id>.delegation`（工程副总裁（研发） / VP-Eng (Engineering)）。
- **消费**：在场行/任务板/委派卡/培养署名用 `name`；徽标/窗口标题用 `short`；tooltip/aria 用 `full`；数据/日志/API 用 canonical。
- **preset picker**：自定义 preset 的 `name`/`description` 无 per-locale 机制（上游只本地化 4 个内置 preset）。picker 继续显示英文缩写（品牌名）；中文全称只出现在公司 UI。若要 picker 也中文，只有双语一行 / 上游支持 / 每语言一套 preset（已否决）。
- **未知角色**：原样显示 id/name，不抛。

## 4. 纪律设施

| 用途 | 落点 | 内容 |
|---|---|---|
| 规则正文 | `docs/contracts/` 下新增 `language.md`（A4） | 默认 zh、唯一源、字典规则、Host 规则、阶段边界、例外 |
| 机械执行 | `checks/gates/` 下新增 `client-copy.mjs`（A4） | 扫 `packages/company-pack/src/client/` AST；中文/自然语言硬编码即红；排除 `locales.ts`；红→绿 |
| day-one | `.agents/skills/company-ui-change-definition/SKILL.md`（Phase 0） | 触发任何 UI 文案/面板/页签/卡片/空态/错误；首 commit 双语；跑 gate + i18n spec + 金样 |
| 路由 | `packages/company-pack/src/README.md` + `tests/README.md`（Phase 0）；根 `AGENTS.md` 一行（A4） | 改 UI → 读合同 + 加载 skill + 跑 gate |

**为什么不写进 `docs/content-charter.md`**：它管内容分层，不是运行时 UI 文案；没有门禁消费者。**为什么不写进 `packages/company-pack/content/AGENTS.md`**：那是注入公司角色的 system prompt，不是开发者规范。**为什么 Phase 0 不写合同/门禁**：现有文案未迁，写了就是描述未发生行为的假合同；门禁也会把 501 条存量打红。Phase 0 用 skill + 指针止住新增，A4 再转硬。

## 输掉的方案

- **只做 UI**：英文壳 + 中文角色，不满足「插件支持英文」。
- **产品全量改英文（连表达层）**：英文质量好，但放弃中文默认与中文表达；否。内部英文 canonical ≠ 表达层单语。
- **每 role 两套 preset**：roster 翻倍、会话身份分裂、方法层/历史分叉。
- **中英双份内容（`content/zh` + `content/en`）**：两本账、翻译/审校/门禁翻倍；与「内部英文单份」方向冲突，否。
- **用「中文正文 + 模型翻译」冒充母语级英文内容**：本 RFC 只承诺功能双语与输出语言，不承诺内容母语级；边界写在合同里。

## 验收

**验收原则**：机制面先写会红的检查；行为/UX 面先立场景；每个切片一红一绿；未跑如实标未执行。所有命令用 `set -o pipefail` 链。

### Phase 0 验收

- [ ] `.agents/skills/company-ui-change-definition/SKILL.md` 存在；description 覆盖「任何 company Web UI 文案/面板/页签/卡片/空态/错误」，步骤含 zh+en key、`t`/`locale: NS`、gate、i18n spec、zh/en 金样。
- [ ] `packages/company-pack/src/README.md` 与 `tests/README.md` 各有指针：改 UI 文案 → 加载该 skill；不指向尚不存在的合同/门禁。
- [ ] 走查：一个 fresh agent 只读 `src/README` 或 skill，能说出「新 UI 文案必须 zh+en」；`pnpm verify` ALL PASS。

### A1 验收（缺省中文 + 字典地基）

- [ ] `node vendor/dsh/apps/cli/lib/bin.js --profile company --dump-config` 的合成树里 `locale` 行有 `config.preference: zh`。
- [ ] 隔离 profile 首启 UI 为中文、`<html lang="zh-CN">`；英文 locale 浏览器首屏稳定后中文（若闪英文可见，先修）。
- [ ] 已有 `preference: en` 的用户升级后仍英文；reset 回中文；第二浏览器共享同一 home 同一选择。
- [ ] `company` namespace 注册成功；zh/en key 集与 `{placeholder}` 一致；en 无 CJK；`ctx.locale.register` 在 effect 里；所有 copy-bearing **组件**的 slot 注册带 `locale: NS`；label/title thunk 用 `ctx.locale.bind`。
- [ ] 红→绿：新增一个空 `en` 字典/少 key → typecheck 或 i18n spec 红；补 key → 绿。

### A2 验收（client/lib 文案迁移）

- [ ] `packages/company-pack/src/client/` 下 `locales.ts` 之外的 JSX/copy-bearing 字面量零中文（gate 预演或临时脚本）；`src/lib` 展示事实不再返回中文。
- [ ] `pnpm test tests/client tests/lib` 全绿；新增 zh/en 两态 spec 覆盖状态、列名、事件句、预算行、卡片抬头、**角色名**（`roles.*`：可见名/短标签/full/delegation）。
- [ ] 角色数据防漂移：`ROLE_NAME_EN` / `PRESET_DISPLAY_NAMES` 仍等于 preset `config.name`；表达层映射不修改 canonical id/数据。
- [ ] 真页面切换 English 后 company 自有 UI 无中文残留（允许：用户数据、canonical 领域词、日志/诊断）；切回中文不需刷新。
- [ ] 红→绿：把一个组件文案改回中文 → gate（A4 前用临时扫描/走查）红；还原 → 绿。

### A3 验收（host 语言桥 + policy + host copy）

- [ ] fake settings spec：无 settings → zh；`preference: en` → en；`settings/document-updated` live 更新；外部语言 → en。
- [ ] 每个公司 preset（含 worker/support）的 agent 都有动态 `company:language`；zh/en 文本；切换 UI 后下一轮生效。
- [ ] 6 个命令回执/错误、7 个工具 note、`blocked-text`、signoff 有 zh/en；命令 description 切换后更新；工具 description 英文。
- [ ] `pnpm test tests/host tests/presets` 全绿；红→绿：删掉 policy 注入 → 对应 spec 红；还原 → 绿。

### A4 验收（纪律设施 + 文档 + 全量收口）

- [ ] `docs/contracts/` 下 `language.md` 存在，写明默认 zh、唯一源、字典规则、Host 规则、preset/content/docs 阶段边界、外部语言回落、例外。
- [ ] `checks/gates/` 下 `client-copy.mjs` 在迁移后的 `packages/company-pack/src/client/` 全绿；真实中文硬编码造红→还原→绿，红原话写进门禁注释「负例留证」。
- [ ] 根 `AGENTS.md` 纪律行指向合同 + gate + skill；`packages/company-pack/src/README.md` / `tests/README.md` 指针更新到现行合同。
- [ ] 11 个 preset 的 description 不是纯中文（双语一行或英文短句）；picker 不出现纯中文描述；role name 不变。
- [ ] 根 README / pack README 语言说明（默认中文、Settings 切换、英文输出跟随）；`tools/lib/install-manual.mjs` 语言段 + `_dist/安装手册.md` 重生成；`dist-manual` 绿。
- [ ] `pnpm verify` ALL PASS；`pnpm test` 全绿；`pnpm typecheck` 0；`pnpm lint` + `pnpm dup`（涉 src）绿；`client-load-smoke` ALL PASS；`ui-scene-smoke --isolated --golden` zh 与 en 都绿；`preset-smoke` ALL PASS。
- [ ] 已有 `.dsh-company` 数据兼容**不再作为约束**：内部全英文 RFC 以新格式为准，旧盘一次性迁移/重建；表达层不要求旧盘可读。

### 验收怎么测（可复现命令与红形态）

- 默认：`node vendor/dsh/apps/cli/lib/bin.js --profile company --dump-config` → 断言 `locale` 行 `config: preference: zh`；把 patch 改成 `en` 或删行 → 断言红；还原 → 绿。
- 字典：`pnpm test tests/client` 的 i18n spec；把 `en` 的任一 key 删掉 → `pnpm typecheck` 红（typed 注册）或 spec 红；还原 → 绿。
- 切换：`tests/client` 的 LocaleRuntime + stub host spec；把 `setLocale` 写死 zh → spec 红；还原 → 绿。
- Host 桥：`tests/host` 的 fake settings spec；把 `describe()` 读值写死 zh → en case 红；还原 → 绿。
- Policy：`tests/host/prompt` 的 section spec；删 `registerLanguagePolicy` 调用 → spec 红；还原 → 绿。
- 命令：`tests/host/commands` 的 description 重注册 spec；去掉 dispose+重注册 → en description 仍中文 → 红；还原 → 绿。
- Gate：`checks/gates/` 的 `client-copy.mjs`；在 `packages/company-pack/src/client/` 的一个组件写回中文字面量 → `pnpm verify` 红并点名文件:行；还原 → 绿。
- 真页面：`source run/env.sh && node checks/smoke/ui-scene-smoke.mjs --isolated --golden`（zh）；en 用同一隔离 profile 写 `locale.preference: en` 或探针参数；两边都断言无中文残留/金样一致。首屏闪英文单独用英文 locale 浏览器验收。

## 实施顺序（TDD 红绿环）

1. Phase 0：skill + 指针 + 走查；`pnpm verify`。
2. A1：先加默认 patch 的断言（红）→ 加 patch/字典/入口 → 绿；再写切换 spec（红）→ 实现 → 绿。
3. A2：按「lib 展示事实 → client 组件」两批；每批先写/改 spec（红）→ 迁移 → 绿；不整批先写全部测试。
4. A3：host 桥（红）→ policy（红）→ host copy（红）→ 绿；命令 description 重注册单独红绿。
5. A4：合同/门禁/skill 指针/文档/金样；门禁先真实红→还原→绿；全量 verify/test/typecheck/lint/dup/冒烟。
6. 收口：Note 写决定/输掉的方案/验证真证据；RFC 毕业到 `notes/implemented/`；问题卡与研究题按 backlog 规则离场。

## 当前状态

- 2026-11-12：RFC 立项；Phase 0 完成；A1 完成；A3a 完成；A2 第一片（页签壳）完成；A2 其余/A3b/A4 未开始。
- 2026-11-12 方向修正：双语只在表达层；内部英文 canonical；角色名进表达层（A2）；Phase B 改为英文单份 canonicalization，不做 `content/en/` 双语副本。详见[表达层方向材料](../../_backlog/_archive/research/bilingual-company/2026-11-12-expression-layer-direction.md)。
- Phase 0：`.agents/skills/company-ui-change-definition/SKILL.md` + `packages/company-pack/src/README.md` / `tests/README.md` 指针；`pnpm verify` ALL PASS。
- A1：`cordis.patch.yml` 的 `locale.config.preference: zh`；client `inject` 加 `locale`；`packages/company-pack/src/client/locales.ts`（`company` typed 字典）与 `ctx.locale.register`；`conversation.view` label 走 `t`；新增 key/placeholder 与 harness/repo 缺省 patch 结构 spec；`default-locale-runtime.spec.ts` 证 Host preference zh 覆盖英文浏览器 provisional；whole-client composition 证 locale 服务 + 字典切换（UI 组件由 tab/brand spec 覆盖）。
- A3a：`packages/company-pack/src/host/language/company-language.ts`（`settings.describe()` 读 `locale.preference`、默认 zh、live update、外部语言→en）；`packages/company-pack/src/host/prompt/language-policy.ts`（11 个公司 preset 的动态 `company:language` section，默认 zh，用户明确换语言时跟随）；`src/index.ts` 接线；新增 bridge/policy spec + `apply-lifecycle` 的 wiring spec。真红：临时注释 `registerLanguagePolicy(ctx, language)` → wiring spec 红；还原 → 绿。
- 证据：`pnpm test` **203 files / 1616 tests passed**；`pnpm typecheck` 0；`pnpm lint` 0；`pnpm dup` 0；`pnpm verify` **ALL PASS**；`--dump-config --patch packages/company-pack/cordis.patch.yml` 的 `locale` 行显示 `config.preference: zh`。
- 真页面：`ui-scene-smoke --isolated --golden` **ALL PASS**（9 个公司页签 + 浏览器错误环零命中；默认 zh 与现有金样一致）。为让隔离场景在中文界面下可跑，`probes/browser-visual/cdp-probe.mjs` 的模态/Start-chip 匹配补了中文 `预览版说明` / `开始使用` / `开始`（probe-only，非产品行为）。
- A2 第一片（页签壳）：9 个页签的 label/tooltip/guide description 住 `company` 字典；`TabTitle` / `GuideEntry` 的 title/guide 槽带 `locale: company`；`company-tab-catalog` 解析器改从 `locales.ts` 的 zh 取 label；新增 `tests/client/i18n/tab-copy.spec.ts` 对 9 个 face 断言 zh/en copy + 真实 `Title`/`GuideEntry` 组件静态渲染，`company-tab-registration.spec.ts` 断言槽 `locale === 'company'` 且注册处 title/guide thunks 随 locale 实时切换。`packages/company-pack/locale/README.md` 写清包元数据与运行时 UI 字典的分工。
- 真红证据：注册处曾把 `copy` 捕获在注册时；新增切换测试在旧实现下红 = `expected '待办' to be 'Inbox'`；改成 thunk 内 `copyOf(face)` 后绿。
- A2 角色第一片：`src/lib/role-copy.ts` 单源（canonical 英文 + zh/en 可见名/全称/短标签/委派），`src/client/roles.ts` 取用缝；`RoleBadge`、`DelegationCard`、`PresenceTab`、`TasksTab`、`BoardPanel`、`DagPanel`、`CultivationTab`/`CultivationView` 的 viewer 名、培养子块（Inbox/Compose/Mine/Adopted）的角色名已走表达层；`roles.*` 30 个 key 进 `company` 字典。测试 = `role-copy.spec`（6 角色 zh/en/未知/委派映射）+ RoleBadge/DelegationCard/Tasks/Board 静态渲染 + 培养壳；未做 = picker 的 name 之外的内部英文（I1）、preset 内容/领域值/注释日志。角色名主表面/培养子块/background picker/host `/cultivation` 回执均已走表达层；默认 zh 下混排，en 下英文。
- A1 补充：品牌 fallback 接 `brand.name` 字典（`FALLBACK_IDENTITY.productName = ''`，语言决定出厂词标）；`brand.spec.ts` 断言 zh/en；smoke 的品牌检查接受两种词标。新增 `default-locale-runtime.spec.ts`：英文浏览器 provisional=en + Host preference=zh → zh；无 preference → 保持 en。
- I1 第一片（pilot）：`customer-voice` skill 英文单份 + `tests/presets/internal-english.spec.ts` 棘轮（pilot 不在 PENDING；其余 23 个在）；`preset-smoke` ALL PASS。
- I1 第二片（picker 描述）：六个公司角色的 preset `description` 改成中英混排一行（`中文职能 / English function`），`name` 保持英文缩写；support preset 英文。`pnpm test tests/presets` 130 passed；`preset-smoke` ALL PASS（6 角色 + 5 support 可挂载）。
- 最终证据：`pnpm test` **207 files / 1630 tests passed**；`pnpm typecheck` 0；`pnpm lint` 0；`pnpm dup` 0；`ui-scene-smoke --isolated --golden` ALL PASS（金样因在场行角色名刻意更新）。`pnpm verify` 的代码/结构门禁通过；工作树另有两个**非本切片**的并行研究目录（`startup-settings` / `wiki-knowledge-map`）正在写材料，当前有 md-newline / md-links / bare-path 红——未触碰，不影响本切片文件集的结论。
- 未做：A2（client/lib 全量文案迁移与 token 化）、A3b（host 回执/工具 note/命令 description）、A4（`docs/contracts/` 合同 + `checks/gates/` 的 client-copy 硬门禁 + preset 描述 + 文档/金样全量收口）。UI 在 English 下仍有中文，这是已知未完成项，不在本切片宣称已交付。
- **未验证（本切片不宣称）**：英文 locale 浏览器首启稳定后中文、`<html lang="zh-CN">`、已有 `preference: en` 升级、reset、第二浏览器——**未执行**；English 真页面——**未跑**（页签壳只有 keyless 组件/注册 spec，zh 金样已跑）；真模型 prompt 里的 `company:language`——**未跑**（keyless + apply 接线）；角色名表达层——**主表面 + 培养子块 + context picker + host `/cultivation` 回执已实现；picker 内部英文未做**；`client-load-smoke` / `preset-smoke` / `release-smoke`——**未执行**。
- 真合成证据：`node vendor/dsh/apps/cli/lib/bin.js --profile company --patch packages/company-pack/cordis.patch.yml --dump-config` 输出 `- id: locale` / `config: preference: zh`；`tests/harness/repo/default-locale.spec.ts` 只是结构守卫，不替代这条命令。
