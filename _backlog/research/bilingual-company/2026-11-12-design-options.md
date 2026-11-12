---
topic: 中英文双语的范围、架构取舍与纪律落点
intent: 在盘面事实之上给出可落地的方案、阶段边界、测试门禁，以及「任何界面文案必须自带中英文」这条纪律该住哪一层。
---

> **2026-11-12 方向修正**：用户明确「双语只在表达层，内部用英文」。本文件 §5 Phase B 的 `content/en/` overlay 方案已被取代；当前方案以 [题名页结论](README.md) + [表达层方向材料](2026-11-12-expression-layer-direction.md) 为准。以下保留当时的分析与取舍，作为历史证据。

> **2026-11-12 最终范围（覆盖前文 Phase B/C 的全量建议）**：用户最终只要求**界面呈现层**（TAB / Label / button / 空态 / 错误）zh/en + 默认 zh + 角色名混排。
> 本文件 §5 的 Phase B（内部内容英文）与 Phase C（docs）**不在本次落地验收**；I2/I3 是独立债务，不做全量迁移。
> 当前落地卡 = [2026-11-12-bilingual-landing.md](../../_archive/settled_issues/2026-11-12-bilingual-landing.md)。

# 范围、架构与纪律落点

## 1. 先把「支持双语」拆成三层

同一个「支持中英文」在不同层含义不同；不拆开就会用一句口号掩盖三种成本。

| 层 | 含义 | 谁消费 | 能不能 live 切 |
|---|---|---|---|
| **UI copy** | 页签、按钮、空态、错误、面板头、卡片、横幅、标题 | 人（浏览器） | 能；DSH `ctx.locale` 就是干这个的 |
| **Host copy** | 命令回执/错误、工具结果 note、签字提示 | 人 + 模型 | 能；但命令 description 要重注册，工具 description 不 live |
| **Company working language** | agent 回复、任务板、交付物、会议纪要的语言 | 模型 + 人 | 能；动态 system section 每次 assembly 读当前值 |
| **Content / persona / skill** | 手册、合同、角色人格、方法 skill、模板 | 模型 | **不能 live**；persona mount 时静态，skill 目录静态 |
| **Docs / manual** | README、安装手册、docs/ | 人（仓库/发行） | 不适用；发布物 |

**本方案把「双语」定义为**：UI copy、Host copy、Company working language 三层在同一个安装里可切换、默认中文；Content/persona/skill 层在 Phase A **保持中文正文**，由 working-language policy 让模型按目标语言产出；Content 的英文正文是 Phase B，Docs 是 Phase C。这个定义必须写进合同，否则「支持英文」会被误读成「所有内部语料都有英文版」。

## 2. 五条路线与取舍

| 路线 | 做法 | 结果 | 判断 |
|---|---|---|---|
| **A. 只做 UI** | 只接 `ctx.locale` 字典；Host/agent 不动 | 界面英文、角色仍说中文 | 不满足「插件支持英文」；否 |
| **B. 单一语言源 + 功能双语（推荐）** | `locale.preference` 同时驱动 UI + Host 工作语言；UI 字典；动态 language policy；Host 人可见文案双语；content 保持中文 | 界面与输出双语；内部语料暂中文；默认中文 | **推荐，Phase A** |
| **C. 全量双语内容** | B + content/persona/skills 全量英文版 | 母语级英文内容 | 质量最高；约 5.6 万汉字正文 + 维护双份；Phase B/C |
| **D. 全量改英文** | 所有系统提示/内容改英文，输出跟随用户 | 英文质量好；中文语料丢失 | 放弃中文资产与中文默认；否 |
| **E. 每个 role 两套 preset** | `ceo` / `ceo-en`，按语言选默认 | roster 翻倍、会话身份分裂、维护双份 | 否 |

**输掉的方案要留名**：A 会让英文用户看到「英文壳 + 中文角色」；D 会把「梦之队」的中文内容资产一次性丢掉；E 会让 preset picker 出现 22 个角色，且英文会话的 preset id 与中文不同，历史会话/培养/方法层都要分叉。B 是唯一能在一次落地内交付「界面 + 输出」双语、又不伪造内容翻译的路线。

## 3. 推荐架构

### 3.1 单一语言源

```
DSH locale.preference (zh default)
  ├─ 浏览器 LocaleRuntime ──→ company 字典 ──→ 所有 company UI
  └─ Host CompanyLanguage ──→ 动态 language policy / 命令回执 / 工具 note
```

- **唯一源** = `locale.preference`，不新增公司自己的语言设置。
- **默认** = bundle patch 的 `locale.config.preference: zh`。
- **已有用户偏好优先**；reset 回 zh。
- **外部语言**（ja/pt-BR…）：公司只有 zh/en；建议非 zh/en → en（与 DSH fallback 一致），缺失 → zh。

### 3.2 Client：typed 字典 + 一个 namespace + 展示事实/文案分离

- `packages/company-pack/src/client/` 下新增 `locales.ts`：
  - `NS = 'company'`；
  - `zh` 为 key 源，`CompanyKey = keyof typeof zh`；
  - `en: Record<CompanyKey, string>`（编译期强制 key 完整）；
  - `declare module '@deepseek-ai/dsh-client-ui-slots'` 把 `company` 合进 `LocaleNamespaceMap`。
- 入口 `inject` 加 `locale`；`ctx.effect(() => ctx.locale.register(NS, { zh, en }))`。
- 所有 slot 注册（tab body/title/guide、toolview、brand、conversation view、role badge）加 `locale: NS`；组件拿 `t`；嵌套组件把 `t` 往下传。
- **纯函数 view model 不再返回中文**：
  - 在 `packages/company-pack/src/lib/` 新增一个**无 client 依赖**的 `CopyToken`（`{ key: CompanyCopyKey, params?: Record<string, string|number> }`）与 `CopyKey` 类型；
  - `presence-status` 返回 `status`（enum），不返回 `statusLabel`；
  - `board` 返回列 key / 未分配 token；
  - `budget` 返回 label key；
  - `attention` / `presence` 事件返回 token（或 `{kind, params}`）；
  - `teamCardModel` / `delegationCardModel` 返回 token；
  - client 侧统一 `const text = (token) => t(token.key, token.params)`。
- **为什么不接受 `t` 进 lib**：`src/lib` 是 host/client 共用、零 client import 的纯层；传 `t` 会把 client 类型拖进来。token 是语言中立的数据，测试直接断言 token，比断言中文更稳。
- **文案表**：`CULTIVATION_COPY` 改成 key 表；函数值（`selfNote(role)`）改成带 `{role}` 占位的字典项。**不保留**第二份中文默认值，否则又成两个 source of truth。

### 3.3 Host：CompanyLanguage + 动态 policy

- `packages/company-pack/src/host/` 下新增 `language/`：
  - `CompanyLanguage = 'zh' | 'en'`；
  - `createCompanyLanguage(ctx)`：默认 zh；`ctx.inject(['settings'], ...)` 后读 `settings.describe()` 找 `ns === 'locale'` 的 `value.preference`；监听 `settings/document-updated`；缺失 settings 不报错；
  - `current()`、`text(zh, en)`、`subscribe(fn)`。
- **默认中文不能等 settings**：先 zh，服务到达后接管；这样 headless/测试/慢启动都稳定。
- **动态 language policy**：`registerLanguagePolicy(ctx, language)` 给公司 preset 的每个 agent 注册 `company:language` section（order 紧跟 persona，`interpolate: false`，`text: () => ...`）：
  - 中文：默认用简体中文；用户明确用另一种语言时跟随用户；专有名词/字段名/ID/代码保持原样。
  - 英文：默认英文；用户明确要求时跟随；读取到的中文手册/模板照常执行，产出时把人类可读标题/标签译成英文，机器可读字段名/ID 不变。
  - 这段话必须**明确承认内部语料可能是中文**，否则模型会以为没有英文内容就是缺失。
- **Host 人可见文案**：
  - 命令 handler 用 `language.text(zh, en)`；命令 description 在语言变化时 dispose + 重新注册（`ctx.commands.register` 返回 disposer，registry 会发 `commands/change`）；
  - 工具 description 统一英文（模型面最稳），工具结果 note 走 `language.text`；
  - `blocked-text`、signoff note、workspace doors 文案走同一张表。
- **不改日志**：`ctx.logger`/stderr 的开发者日志保持中文或英文单语，不进 UI 文案合同；否则成本无限大且无消费者。

### 3.4 Preset 描述：双语一行，不伪装 per-locale

自定义 preset 的 `name`/`description` 没有本地化机制（见审计 §4）。Phase A 的做法：

- `name` 保持 CEO / VP-Eng 等短名（本来就语言中立）。
- `description` 写**中英双语一行**，例如：
  `动议的唯一入口与出口：澄清、拆解、组会、收口 / Sole intake and closure: clarify, decompose, chair, synthesize.`
- 这是**临时形态**；如果上游将来支持 `LocalizedText`，再改成真双语。不要为 11 个 preset 复制两套 id。

### 3.5 Content / persona / skill：Phase A 不翻译，但要把「为什么」写清

- Phase A 的 policy 明确说「内部手册/模板可能是中文；产出用目标语言；字段名/ID 不变」。模型可以读中文、写英文。
- Phase B 再决定：
  - **content 英文 overlay**：`content/` 下按语言分树或 `content/en/` 覆盖，host 的 handbook/workflow/delegation/charters/templates 读取按语言选；需要 `content/manifest` 与 content 门禁同 diff。
  - **persona/skill 英文**：要么 Host 注入 persona（把 persona 从 preset 移到 host，代价大），要么每个 preset 声明语言变体（roster 翻倍，已否），要么做一个语言感知的 skill provider（新机制，需另卡）。**这是 Phase B 的核心设计题，不在 Phase A 假装解决。**
- Phase B 不是「翻译一下」：质量审、双份维护、门禁、测试资产都要算。

### 3.6 Docs：Phase A 只做「发现 + 默认」，不做全量翻译

- 根 README / pack README 加**语言说明**（默认中文、Settings 切换、英文输出跟随）。
- `tools/lib/install-manual.mjs` 加一段语言说明并重新生成 `_dist/安装手册.md`；`dist-manual` 的必含句同 diff。
- 如果 README 预算已顶格（`doc-budget` 90，现 87），**不要硬塞**：可以把语言说明放到 pack README（更贴近安装者）或新增一页短的英文 quick start；新增文档的 owner 与链接要写清。
- 全量 docs 英文是 Phase C：需要配对/一致性门禁，不能只加 `.en.md` 文件。

## 4. 纪律写在哪：contract + gate + skill + 指针

用户的问题：「源代码先天支持中英文，这条纪律写 docs 还是写哪儿？界面常调整，要他 day one 就知道任何界面上的东西都必须中英文。」

**答案：不要只写在一个 docs 文件里。** 这条纪律有四个消费者，各住一层；一处事实一个家：

| 消费者 | 落点 | 写什么 | 不写什么 |
|---|---|---|---|
| **规则的权威（what/why）** | Phase A 落成 `docs/contracts/` 下的 `language.md`（Phase 0 用 RFC/Note 记目标规则） | 默认 zh；唯一源 `locale.preference`；所有 company UI copy 必须走 typed `company` 字典；zh/en 同 diff；Host 人可见文案走 `CompanyLanguage`；preset/content/docs 的阶段边界；外部语言回落 | 操作步骤（→ skill）、逐文件清单（→ 代码/门禁）、决策史（→ Note） |
| **机械执行（不能靠记性）** | `checks/gates/` 下新增 `client-copy.mjs` | 扫 `src/client` AST：JSX 文本、copy-bearing 属性、copy 命名的变量/返回值；排除 `locales.ts`；中文/自然语言硬编码即红；带红→绿负例 | 规则正文（→ contract）；测试分层（→ tests/README） |
| **Agent 的 day-one 定义（怎么做）** | `.agents/skills/company-ui-change-definition/SKILL.md` | 触发：任何 company Web UI 文案/面板/页签/卡片/空态/错误；步骤：先加 zh+en key、用 `t`/`locale: NS`、跑 gate + i18n spec、刷 zh/en 金样；**首 commit 就双语，不留 TODO** | 规则理由（→ contract）；门禁实现（→ gate） |
| **路由（从哪进）** | `packages/company-pack/src/README.md`（host/Web 代码 owner）+ `tests/README.md`（改动面→最窄检查）；根 `AGENTS.md` 在 Phase A 加一行纪律指针 | 一行指针：改 UI 文案 → 读 contract + 加载 skill + 跑 gate | 规则正文、key 清单、操作步骤 |

**为什么不是 `docs/content-charter.md`**：它管的是**内容分层**（人/流程/方法/政策，换公司/产品类型/做法时改哪层），不是运行时 UI 文案。把 UI copy 规则塞进去会污染「四槽三层」的判据，而且它没有门禁消费者——规则仍会漂。

**为什么不是 `packages/company-pack/content/AGENTS.md`**：那是 host 注入**公司角色**的 system prompt，读者是模型角色，不是插件开发者。写进去会花每个成员会话的 token，还会让角色困惑「为什么要我管 UI 文案」。公司角色只需要知道「输出用什么语言」，那是 language policy 的事。

**为什么不是只写根 `AGENTS.md`**：AGENTS.md 是入口链，不是规则的家；它会因为「薄」而只留指针。规则正文必须在 contract，执行必须在 gate，工作步骤必须在 skill。

**为什么不是只写在 issue/RFC**：issue/RFC 是一次性决策载体；界面每天改，规则必须活在当前合同 + 门禁里。Note 记「为什么选 contract+gate+skill」，不承担规则正文。

**Phase 0（可以立刻做，不等全量迁移）**：先落 skill + RFC/Note + `packages/company-pack/src/README.md` / `tests/README.md` 两处指针；**不写** `language.md` 的现时正文（现有 501 条还没迁，写了就是描述未发生行为的假合同），也**不加**根 `AGENTS.md` 的合同/门禁指针（文件还不存在，`bare-path` 会红）。此时门禁还没上，靠 skill 与 review 阻止新增中文硬编码；Phase A 迁移完、代码真双语后才落 `language.md` + `client-copy` 门禁 + `AGENTS.md` 纪律行。这样新界面从今天起就知道规则，又不会被 501 条存量卡住，也不违反 docs = now。
**Day-one 可发现性**：skill 的 description 是模型 catalog 的第一入口；`src/README.md` 与 `tests/README.md` 是 agent 开工读到的 owner/检查面；根 `AGENTS.md` 只做最后的纪律指针。三处不重复规则正文。
**Phase A 收口**：门禁必须绿，且有一个真实红→绿证据；之后任何新 UI 文案绕过字典都会红。

## 5. 阶段计划

### Phase 0 — 规则先立（docs-only，可独立落地）

- `docs/contracts/` 下新增 `language.md`（合同）。
- `.agents/skills/company-ui-change-definition/SKILL.md`（day-one 步骤）。
- `packages/company-pack/src/README.md` + `tests/README.md` 各一行指针；根 `AGENTS.md` 入口链可选一行。
- `docs/index.md` 的「改代码/改角色」行可加一句「改 UI 文案 → language 合同」。
- 不改代码、不改门禁；现有 501 条存量不阻塞。

### Phase A — 功能双语落地（本卡的落地单元）

1. Client 字典 + `locale` 接入 + 全量文案迁移（含 lib token 化）。
2. `cordis.patch.yml` 的 `locale.preference: zh`。
3. Host `CompanyLanguage` + 动态 language policy。
4. Host 命令回执/工具 note/命令 description 重注册。
5. Preset description 双语一行。
6. `client-copy` 门禁 + key/placeholder 校验 + 默认 locale 测试 + host 语言桥测试 + policy 测试 + zh/en 金样。
7. README/pack README 语言说明；安装手册模板语言段。
8. `pnpm verify` / `pnpm test` / `pnpm typecheck` / `client-load-smoke` / `ui-scene-smoke` / `preset-smoke` 全绿。

### Phase B — 内容/角色英文（另卡）

- `content/` 英文 overlay（handbook/contracts/charters/templates 优先），host 按语言读，fallback 中文 + 可见告警。
- persona/skill 英文方案选型（Host 注入 persona / 语言感知 skill provider / 双语内容），单独设计。
- content 门禁、manifest、测试资产同 diff。

### Phase C — 文档/手册全量英文（另卡）

- 安装手册英文版、README/docs 配对或英文 quick start 扩展；配对/一致性门禁；doc-budget/dist-manual 改造。

## 6. 测试与门禁

| 面 | 检查 | 证明什么 |
|---|---|---|
| 字典 | key 集/占位符一致；en 无 CJK；zh/en 同时注册 | 不会漏 key、不会占位符错位 |
| 默认 | `--dump-config` 断言 `locale.config.preference: zh`；英文浏览器首屏稳定后中文 | 缺省中文真的落到了启动形态 |
| 客户端切换 | `LocaleRuntime` + stub host：zh→en→zh、持久化写、reset；slot label/组件文本跟着变 | 切换不是只换 Settings 行 |
| 无硬编码 | `client-copy` 门禁；红→绿负例 | 新界面不会再加中文-only 文案 |
| Host 桥 | fake settings：无 settings→zh、en、live update、外部语言→en | Host 语言不是猜的 |
| policy | 每个公司 preset 的 agent 都有一个动态 `company:language`；zh/en 文本；worker/support 也算 | 模型知道该说什么语言 |
| Host copy | 命令 description 随语言重注册；回执/工具 note zh/en | 人可见面不残留中文 |
| 真页面 | `ui-scene-smoke --isolated --golden` zh + en；`client-load-smoke`；`preset-smoke` | 组合/挂载/真页面不炸 |
| 兼容 | 已有 `preference: en` 升级后仍 en；已有 `.dsh-company` 数据可读 | 不强制改用户、不迁移数据 |

## 7. 成本与风险

- **Phase A 的真实成本**在 client/lib 的文案所有权重构，不在字典本身：28 个 client 文件 + 14 个 lib 文件；现有测试大量断言中文，需要改成 token/zh 适配器；这是数天级，不是一下午。
- **首屏闪英文**：provisional 浏览器语言 vs 异步 settings；必须真浏览器验收。若闪得可见，补 bootstrap/预置，不能靠「应该很快」。
- **命令 description 重注册**：要确认 `commands/change` 后的客户端目录刷新、在途命令不被取消；要有 keyless 证据。
- **preset 描述双语一行**会变长，picker 卡片可能截断；需要真页面看一眼，必要时压短。
- **Phase B 的 persona/skill 英文**是真正的架构题，不要低估；Phase A 的 policy 只是让输出语言正确，不是内容翻译。
- **文档门禁**：Phase C 不是加文件，是改 `doc-budget`/`dist-manual`/`dev-product-parity` 等中文形态门禁；另卡。

## 8. 仍要用户拍板的事（建议已给）

1. **范围**：Phase A 先落地（推荐），还是 Phase B 必须同批？后者工期与质量审成本显著上升。
2. **agent 语言**：默认跟 UI 语言、用户明确说另一种语言时跟随（推荐）；还是硬跟 UI、永不变？
3. **preset 描述**：双语一行（推荐，临时）还是英文短句？
4. **文档**：Phase A 只做语言说明 + 英文 quick start（推荐），还是全量英文手册同批？
5. **领域词**：`meta.md` 的 `决策/生产/已采纳` 等机器可读值保持中文（推荐，兼容存量），UI 映射英文标签；还是引入英文别名并迁移？
6. **上游**：是否为「自定义 preset 本地化」「命令 description 本地化」提上游 issue/PR？建议提，但不阻塞本仓 Phase A。
