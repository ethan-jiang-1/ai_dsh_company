---
status: 已结
opened: 2026-11-12
---

# 推敲：插件中英文双语（默认中文启动）

> 立卡：2026-11-12 ｜ 状态：已结 ｜ 类型：Feature ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：用户 — 2026-11-12「按流程推动落地」批准 Phase A 范围；agent — 结构门禁 + 语义审（授权逐条对照）
>
> **结论/去向**：rfc — [RFC](../../../notes/proposed/2026-11-12-bilingual-company.md)（已批，未实施；Phase 0/A1–A4 由 RFC 承载）
>
> 上游研究：[bilingual-company](../research/bilingual-company/README.md)（已定性：盘面 = [代码审计](../research/bilingual-company/2026-11-12-code-audit.md)，方案 = [架构取舍](../research/bilingual-company/2026-11-12-design-options.md)）。

## 原始意图（用户原话）

> 「我们这个插件应该支持中文和英文同时支持，你要彻底的审视了代码之后，提交一个issue，说把它变成中英文两个文字都支持。然后缺省的时候就用中文来启动它。先研究研究到底这个事儿怎么做，研究透彻了之后，再提交一个issue，我们准备落地它。」

> 「我看了一下，我们其实源代码上先天支持中英文，所以这个纪律我不知道写在docs里头还是写在哪儿。因为这个界面可能时不时会调整，要他day one就知道任何界面上出现的东西都是必须支持中英文。」

第二段是本轮新增的**纪律问题**：机制是现成的，但「任何界面文案从第一天就必须双语」不能只靠记忆。本卡把「规则住哪、怎么机械执行、agent 怎么 day one 知道」作为落地的一部分，不当作附属说明。

**问题与期望结果：** 当前插件是中文单语：Web UI、host 命令回执、agent 人设/手册/模板全部中文；英文用户只能看到中文界面与中文输出。DSH 本身有完整的客户端 locale（typed zh/en 字典、Settings 语言行、host 持久化、浏览器回落），本包没有接；host 没有通用 locale 服务，但能通过 `settings.describe()` 读到同一个 `locale.preference`。期望：在 **Phase A 一次落地**内做到——

1. **UI 双语**：所有 company 自有 Web UI 文案有 zh/en，可在 Settings → General 实时切换；缺省中文。
2. **输出双语**：agent 的回复、任务板、交付物跟随工作语言；缺省中文；用户明确换语言时跟随。
3. **Host 人可见面双语**：命令回执/错误、工具结果 note、签字提示；命令 description 随语言更新。
4. **纪律 day one**：任何新增/修改的界面文案，从第一个 commit 就必须 zh+en；有合同、有 skill、有门禁，不靠 review 记性。
5. **不伪造完成**：content/persona/skill/docs 的全量英文是 Phase B/C；Phase A 明确写边界，不用「内部中文 + 模型翻译」冒充母语级英文内容。

## 当前情况（摘要；全文见审计）

| 面 | 现状 | 关键事实 |
|---|---|---|
| client | 501 条含 CJK 字面量 / 28 文件 | 入口 `inject = ['slots', 'remote', 'sessions']`（`packages/company-pack/src/client/index.ts:37`），没有 `locale`；没有 `locales.ts`；文案在 JSX、`CULTIVATION_COPY`、tab 目录、`TAB_IDENTITY`、`ROLE_SHORT`、品牌 fallback、实例横幅、标题括号、工具卡里 |
| lib（共享） | 215 条 / 14 文件 | `STATUS_LABEL`、`TASK_STATUS_LABEL`、`UNASSIGNED_LABEL`、`budgetSummary` 行标签、`presence` 事件句、`attention` 完成句、`teamCardModel`/`delegationCardModel` 抬头——纯函数**直接返回中文**，不是组件文案 |
| host | 329 条 / 26 文件 | 6 个命令 + 7 个工具；command description 单字符串；`cultivation.ts` 一个文件 100 条；回执/错误大量人可见 |
| presets | 37 文件 / 约 3.13 万 CJK 字 | 11 个 `agent.cordis.yml` 的 persona 内联中文；26 个 skill 中文；`persona.prefix` mount 时静态 |
| content | 73 文件 / 约 2.48 万 CJK 字（md/yml/yaml；JSON 未计） | 手册/合同/charters/templates 中文；`readHandbook` 只读一份 |
| docs | 39 文件 / 约 5.27 万 CJK 字 | README/安装手册/docs 中文；门禁按中文形态写 |
| 默认语言 | 未设置 | `locale` Host Config 有 volatile `preference`；bundle patch 可写 `config.preference: zh`（本轮 `--dump-config --patch` 实测）；已有用户 override 优先 |

**DSH 现成机制（不自造）：**

- web-app 在 `vendor/dsh/packages/bundle/web-app/cordis.patch.yml:257` 挂 `- id: locale`；`LocaleRuntime` 提供 typed 字典、`ctx.locale.bind`、slot `locale` seat、`setLocale` 持久化；fallback = en（`vendor/dsh/packages/client/locale/src/client/index.ts:109`）。
- Host 侧用 `ctx.settings.describe()` 读 `ns = 'locale'` 的 `value.preference`；`settings/document-updated` 可实时跟随（`vendor/dsh/packages/settings/settings/src/index.ts:302` / `:317`）。
- 上游限制：自定义 preset 的 name/description 不本地化（`vendor/dsh/packages/preset/agent-preset-registry/src/display.ts:63`）；命令 description 是单字符串（`vendor/dsh/packages/interaction/commands/src/types.ts:63`）；`persona.prefix` 静态；`skill-filesystem` 目录静态。

**Prior decision（被本轮覆盖）**：2026-11-08 的 README/手册卡把「同轮全站双语/英文」列为输掉的方案（「没有英文读者证据，维护翻倍」）。本轮用户明确要求双语，**旧取舍不再成立**；但旧卡的理由仍是 Phase C 成本的真实证据，不能假装不存在。

## 未决问题（建议已给；RFC 批准时确认，不阻塞本卡）

1. **范围**：Phase A 先落地（**推荐**），还是 content/persona/skill 英文（Phase B）必须同批？后者是数万汉字正文 + 双份维护 + 质量审，工期显著上升。
2. **agent 语言**：默认跟 UI 语言、用户明确用另一种语言时跟随（**推荐**）；还是硬跟 UI、永不变？前者对英文用户更自然，后者更可预测。
3. **preset 描述**：双语一行（**推荐**，临时形态）还是英文短句？上游没有 per-locale 机制，不要为此复制两套 preset id。
4. **文档**：Phase A 只做语言说明 + 英文 quick start（**推荐**），还是全量英文手册同批（Phase C）？
5. **领域词**：`meta.md` 的 `决策/生产/已采纳` 等机器可读值保持中文（**推荐**，兼容存量），UI 映射英文标签；还是引入英文别名并迁移？
6. **上游**：是否为「自定义 preset 本地化」「命令 description 本地化」提上游 issue/PR？建议提，但不阻塞本仓 Phase A。

## 范围与排除项

**在范围内（Phase A）：**

- `packages/company-pack/src/client/` 的 typed `company` 字典、`locale` 接入、全量 UI 文案迁移；`src/lib/` 展示事实 token 化。
- `packages/company-pack/cordis.patch.yml` 的 `locale.preference: zh` 缺省。
- Host `CompanyLanguage`（读 `settings.describe()`、默认 zh、live update）与动态 `company:language` policy。
- 6 个命令的回执/错误、7 个工具的 note、`blocked-text`、signoff 文案双语；command description 随语言重注册；工具 description 英文。
- 11 个 preset 的 description 双语一行。
- **纪律设施**：`docs/contracts/` 下 `language.md` 合同；`checks/gates/` 下 `client-copy.mjs` 门禁；`.agents/skills/company-ui-change-definition/SKILL.md`；`packages/company-pack/src/README.md` / `tests/README.md` 指针。
- README/pack README 语言说明；安装手册模板语言段 + 重生成；key/placeholder/默认 locale/host 桥/policy/切换/真页面 zh+en 测试。
- 兼容：已有 `preference: en` 不被覆盖；已有 `.dsh-company` 数据不改、不迁移。

**明确排除（Phase B/C，另卡）：**

- `content/**` 全量英文正文（手册、合同、charter、template、product-types、delivery-modes）。
- `presets/**` persona 与 26 个 skill 的英文版；persona/skill 英文的架构选型（Host 注入 / 语言 provider / 双语内容）。
- 全量 README/docs/安装手册英文；文档配对/一致性门禁。
- 日志/telemetry/开发者诊断的英文（无用户消费者；不进合同）。
- 第三种语言、RTL、复数规则、locale 数字/日期格式的完整工程。
- 把 `.dsh-company` 的领域词/字段名改成英文；存量数据迁移。

## 方案与取舍

| 路线 | 做法 | 结果 | 判断 |
|---|---|---|---|
| **A 只做 UI** | 只接 `ctx.locale`，Host/agent 不动 | 英文壳 + 中文角色 | 不满足「插件支持英文」；否 |
| **B 单一语言源 + 功能双语（采用）** | `locale.preference` 同时驱动 UI + Host 工作语言；UI typed 字典；动态 language policy；Host 人可见文案双语；content 保持中文 | 界面与输出双语；默认中文；内部语料 Phase B | **Phase A 采用** |
| **C 全量双语内容** | B + content/persona/skills 英文 | 母语级英文内容 | 质量最高；约 5.6 万汉字正文 + 双份维护；Phase B/C |
| **D 全量改英文** | 系统提示/内容全英文，输出跟随用户 | 英文质量好；中文资产丢失 | 放弃中文默认与内容资产；否 |
| **E 每 role 两套 preset** | `ceo` / `ceo-en` | roster 翻倍、会话身份分裂 | 否 |

**推荐架构一句话**：语言开关唯一源 = DSH `locale.preference`（默认 zh）；client 用 typed `company` 字典；host 用 `CompanyLanguage` + 动态 policy；content/persona/skill/docs 分阶段。详细架构、数据流与测试矩阵 = [设计取舍](../research/bilingual-company/2026-11-12-design-options.md) §3–§6。

## 纪律：写在哪、怎么 day one

**先纠正一个容易滑过去的点**：DSH 的 locale seat 是「先天有」，但「支持双语」不是自动的——只要有人在组件里写一个中文字面量，就绕过了 seat。React/TypeScript 不会阻止这件事；**规则必须可发现 + 可机械执行**。

**四个消费者，四个家（一处事实一个家）：**

| 消费者 | 落点 | 写什么 | 不写什么 |
|---|---|---|---|
| **规则权威** | Phase A 落成 `docs/contracts/` 下的 `language.md`（Phase 0 用 RFC/Note 记目标规则） | 默认 zh；唯一源 `locale.preference`；所有 company UI copy 必须走 typed `company` 字典；zh/en 同 diff；Host 人可见文案走 `CompanyLanguage`；preset/content/docs 阶段边界；外部语言回落 | 操作步骤（→ skill）、逐文件清单（→ 代码/门禁）、决策史（→ Note） |
| **机械执行** | `checks/gates/` 下新增 `client-copy.mjs` | 扫 `packages/company-pack/src/client/` 的 AST：JSX 文本、copy-bearing 属性、copy 命名的变量/返回值；排除 `locales.ts`；中文/自然语言硬编码即红；带红→绿负例 | 规则正文（→ 合同）；测试分层（→ `tests/README.md`） |
| **Agent day-one** | `.agents/skills/company-ui-change-definition/SKILL.md` | 触发：任何 company Web UI 文案/面板/页签/卡片/空态/错误；步骤：先加 zh+en key、用 `t` / `locale: NS`、跑 gate + i18n spec、刷 zh/en 金样；**首 commit 就双语，不留 TODO** | 规则理由（→ 合同）；门禁实现（→ gate） |
| **路由** | `packages/company-pack/src/README.md`（host/Web 代码 owner）+ `tests/README.md`（改动面→最窄检查）；根 `AGENTS.md` 在 Phase A 加一行纪律指针 | 「改 UI 文案 → 读 language 合同 + 加载 skill + 跑 client-copy」 | 规则正文、key 清单、操作步骤 |

**为什么不是 `docs/content-charter.md`**：它管**内容分层**（人/流程/方法/政策；换公司/产品类型/做法时改哪层），不是运行时 UI 文案。塞进去会污染四槽三层判据，而且它没有门禁消费者——规则仍会漂。

**为什么不是 `packages/company-pack/content/AGENTS.md`**：那是 host 注入**公司角色**的 system prompt，读者是模型角色，不是插件开发者。写进去花每个成员会话的 token，还会让角色困惑「为什么要我管 UI 文案」。角色只需要知道「输出用什么语言」——那是 language policy 的事。

**为什么不是只写根 `AGENTS.md`**：它是入口链，不是规则的家；按本仓纪律，规则正文住合同，执行住门禁，工作步骤住 skill。根 `AGENTS.md` 只留一行指针。

**为什么不是只写 issue/RFC**：issue/RFC 是一次性决策载体；界面每天改，规则必须活在当前合同 + 门禁里。Note 记「为什么选 contract+gate+skill」，不承担规则正文。

**落地节奏：**

- **Phase 0（可以立刻做，不等全量迁移）**：先落 skill + RFC/Note + `packages/company-pack/src/README.md` / `tests/README.md` 两处指针；**不写** `language.md` 的现时正文（现有 501 条还没迁，写了就是假合同），也**不加**根 `AGENTS.md` 的合同/门禁指针（文件还不存在，`bare-path` 会红）。此时门禁还没转硬，靠 skill 与 review 阻止新增中文硬编码；**新界面从今天起就知道规则**，又不会被 501 条存量卡住。
- **Phase A 收口**：代码真双语后落 `language.md` 合同 + `client-copy` 门禁转硬 + 根 `AGENTS.md` 纪律行，必须有真实红→绿证据；之后任何新 UI 文案绕过字典都会红。
- **为什么门禁不能现在就硬**：现存 501 条会直接把 `pnpm verify` 打红；先迁移再转硬，是唯一不制造大面积假红的顺序。门禁的「红」证据在迁移后用真实违规造一次，不伪造。

**Day-one 的可发现性靠三处，不靠 docs 正文**：① skill 的 description（模型 catalog 可见，触发词覆盖任何 UI 文案/面板/页签/卡片/空态/错误）；② `packages/company-pack/src/README.md` 的 UI 入口行；③ `tests/README.md` 的改动面行。三者 Phase 0 就能落，且不指向尚不存在的合同/门禁；根 `AGENTS.md` 的纪律行随 Phase A 一起落，避免 dead pointer。

## 验收标准

**Phase A 的验收（Phase B/C 另卡）：**

1. **默认中文**：`node vendor/dsh/apps/cli/lib/bin.js --profile company --dump-config` 的合成树里 `locale` 行有 `config.preference: zh`；隔离 profile 首启 UI 为中文、`<html lang="zh-CN">`、语言行为「中文」；英文 locale 的浏览器首屏稳定后仍是中文（若首屏闪英文可见，先修再算过）。
2. **已有偏好不被覆盖**：升级前 `preference: en` 的用户升级后仍英文；reset 后回中文；第二个浏览器共享同一 home 看到同一选择。
3. **UI 全量双语**：Settings → General 切到 English 后，company 自有 UI（全部公司页签、guide、面板头、空态、按钮、工具卡、横幅、窗口标题、品牌 fallback）无中文残留；允许的例外 = 用户数据、canonical 领域词（meta 的 `决策/生产/…`）、日志/诊断。切回中文同样成立且不需刷新。
4. **agent 输出**：每个公司 preset（含 worker/support）的 agent 都注入动态 `company:language`；zh 缺省中文、en 英文；用户明确要求另一种语言时跟随；切换 UI 语言后下一轮生效；任务板/交付物/会议纪要与回复同语言。
5. **Host 人可见面**：6 个命令的回执/错误、7 个工具的 note、`blocked-text`、signoff 文案有 zh/en；命令 description 随语言切换更新（dispose + 重注册），客户端菜单可见；工具 description 英文且不残留中文-only 句。
6. **字典机制**：`company` 一个 namespace；zh/en key 集与 `{placeholder}` 完全一致；en 字典无 CJK；`ctx.locale.register(NS, { zh, en })` 在 effect 里；所有 copy-bearing slot 注册带 `locale: NS`；嵌套组件通过 `t` prop 传递。
7. **无硬编码**：`checks/gates/` 的 `client-copy.mjs` 在迁移后的 `packages/company-pack/src/client/` 全绿；用一条真实中文硬编码造红→还原→绿，证据同 diff。
8. **lib 展示事实**：`statusLabel` / `taskStatus` / 未分配 / 预算行 / 事件句 / 卡片抬头不再由纯函数返回中文，而是 token/enum；对应 keyless spec 断言 token/zh/en 两态。
9. **纪律设施**：`docs/contracts/` 下 `language.md` 存在，写明默认 zh、唯一源、字典规则、Host 规则、阶段边界、例外；`packages/company-pack/src/README.md` 与 `tests/README.md` 有指针；`.agents/skills/company-ui-change-definition/SKILL.md` 的触发描述覆盖「任何 UI 文案/面板/页签/卡片/空态/错误」；根 `AGENTS.md` 若加行只加指针。
10. **preset 描述**：11 个 preset 的 description 不是纯中文（双语一行或英文短句，按 RFC 决定）；picker 不出现纯中文描述；role name 不变。
11. **文档/发行**：根 README 与 pack README 有语言说明（默认中文、Settings 切换、英文输出跟随）；`tools/lib/install-manual.mjs` 加语言段并重生成 `_dist/安装手册.md`；`dist-manual` 绿。
12. **检查**：`pnpm verify` ALL PASS；`pnpm test` 全绿（含新增 i18n spec）；`pnpm typecheck` 0；`client-load-smoke` ALL PASS；`ui-scene-smoke --isolated --golden` zh 与 en 都绿（en 金样新增或参数化）；`preset-smoke` ALL PASS。
13. **兼容**：已有 `.dsh-company` 数据可读；没有数据迁移；没有把领域词/字段名改成英文。

## 抽象度

- 换公司要改吗？→ **不会**。语言是部署/用户偏好，不是公司事实；公司名/产品名仍是用户数据，不翻译。
- 换产品类型要改吗？→ **不会**。语言轴与产品类型/交付模式正交；产品的领域词保持 canonical。
- 换做法要改吗？→ **会**。加第三种语言 = 新字典/语言包 + 默认策略 + 门禁扩展；改默认语言 = 改 bundle 缺省 + 文档 + 测试。
- 只有机制本身变才改吗？→ 字典/语言桥/门禁是机制层；角色内容、公司事实不因语言复制而改判据。Phase B 的翻译是内容对，不改语义。
- 第二消费者：中文默认用户 + 英文部署/读者；文档/市场读者是第二层。
- 搬家成本：客户端文案高（必须第一天抽象为字典/token，否则每次 UI 改动都加新硬编码）；内容翻译低（Phase B 可增量，按文件/角色搬）；文档最高（门禁+配对，Phase C）。

## 关闭条件

- 结论落卡：`毕业：做`、`## 验收标准` 非空、`去向 = rfc`（已满足）。
- RFC 已写入 `notes/proposed/` 并获用户批准（2026-11-12「按流程推动落地」）；RFC 含 Phase A 的详细设计、Phase B/C 的边界与触发条件。
- 本卡已在 RFC 成立的同一次变更里归档；实施由 RFC 承载，不以本卡代替授权。
- 实施授权记录：用户 2026-11-12「按流程推动落地」；本卡归档不替代 RFC 的验收与实施记录。

## 下一步（归档时点后的交接）

1. 按 [RFC](../../../notes/proposed/2026-11-12-bilingual-company.md) 的 Phase 0 / A1–A4 实施；红绿环与验收命令见 RFC。
2. Phase 0 = skill + 两处指针；A1 = 缺省中文 + 字典地基；A2 = client/lib 文案迁移；A3 = host 语言桥/policy/copy；A4 = 合同/门禁/文档/全量收口。
3. Phase B（content/persona/skill 英文）与 Phase C（docs/手册全量英文）另卡，不在本 RFC 内。
