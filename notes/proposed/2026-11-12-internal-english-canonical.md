---
status: proposed
opened: 2026-11-12
---

# 内部全英文 canonical + 表达层双语

> 状态：proposed（已批，未实施）｜ 批准：用户 2026-11-12「同意你的想法……要么就全英文」｜ 上游：[问题卡](../../_backlog/_archive/settled_issues/2026-11-12-internal-english-canonical.md)
>
> 本 RFC 接管 [表达层双语 RFC](2026-11-12-bilingual-company.md) 的**内部语言方向**：内部产品层全英文单份 canonical；表达层（UI/角色名/回执/输出）zh/en。旧 RFC 的 Phase B「中文正文 + `content/en` overlay」被本 RFC 取代；旧 RFC 的 Phase 0/A1–A4 表达层地基仍是现行。

## 问题

用户 2026-11-12 明确：中英文支持只做**表达层**；内部用英文；不能一半英文一半中文，「要么就全英文」。当前内部是混合态：

- 代码标识符/key/ID、preset id、角色 id 已是英文；
- 代码注释、日志、host 开发者诊断大量中文；
- `presets/**` persona/skills、`content/**` 手册/合同/charter/template 是中文；
- `meta.md` 的领域值（`决策` / `生产` / `已采纳` …）、账本表头、部分数据字段是中文；
- preset picker 的 `name` 是英文缩写，`description` 是中文；
- 表达层 UI 只迁了页签壳/品牌，角色名仍是英文缩写（部分中文括号），其余面板中文。

这种「有的全英文、有的全中文」正是用户点名的荒唐态。**目标不是再翻一份中文，而是内部只有英文一份，中文全部在表达层。**

## 目标与边界

| 层 | 语言 | 内容 |
|---|---|---|
| **表达层** | zh/en 可切 | Web UI 文案、角色显示名、命令回执、交付物/回复、preset picker（英文 name + 混排 description；见下） |
| **内部 canonical** | 英文单份 | 代码标识符/key/ID、preset id、角色 id、数据字段值、模型提示/内容（persona/skills/handbook/templates）、代码注释/日志/诊断 |
| **发行文档** | 另定 | README/安装手册/docs；用户可见部分 zh/en，开发者文档另阶段 |

**硬规则**：

1. **内部不允许中英双份**：不建 `content/zh` + `content/en`，不建两套 preset id。
2. **中文只允许出现在表达层字典/zh 内容测试夹具**；内部源文件（注释/日志/字符串/数据值）不得新增中文。
3. **preset picker 规则**：自定义 preset 没有 per-locale 机制；不搞按语言切换、不搞每语言一套 preset。picker 的 `name` 用英文缩写（品牌名）；六个公司角色的 `description` 用中英混排一行（`中文职能 / English function`），support preset 用英文；中文全称不单独进 picker。
4. **角色名**：canonical role id + 英文名；表达层 `roles.*` zh/en；数据/日志/API 用英文 canonical。
5. **数据迁移**：领域值/字段 canonical 改英文 ID；**兼容不是设计约束**——以新格式为准；旧盘可一次性迁移或重建，不保留长期双读。

## 翻译术语表（I1，持续补）

| 中文 | English | 备注 |
|---|---|---|
| 动议 | motion | 与 `kb/motion-ledger.md` 一致 |
| 台账 | ledger | motion ledger |
| 交付物 / 成品 | deliverable | 成品 = presented final |
| 角色 | role | preset id = role id |
| 培养 | cultivation | 培养回路 = cultivation loop |
| 方法层 | method layer | per-role methods |
| 采纳 / 拒绝 / 撤回 / 验证 | adopt / reject / revoke / verify | 人侧动作 |
| 提案 / 纠正 / 建议 | proposal / correction / suggestion | 记录类型 |
| 收口 | close-out | 动议收口 |
| 任务书 | task brief | 委派 brief |
| 署名 | signature | 交付物署名 |
| 三态 | tri-state | 交付物状态 |
| 红线 | red line | 不可越过的边界 |
| 交付模式 | delivery mode | productized / project-services / managed-service |
| 产品类型 | product type | business-software / hardware-software |
| 需求 / 验收 | requirement / acceptance | REQ / AC |
| 客户之声 | customer voice | pilot skill |
| 购买信号 / 拒绝理由 | buying signal / rejection reason | customer-voice |
| 表态 | claim | 与 behavior 对举 |
| 出处 | source | KB file + line |
| 样本不足 | insufficient sample | 不编造 |

原则：术语表只定英文 canonical；中文表达仍按目标语言写，不把术语表当译文模板。

## 角色名（已由 agent 决定，不再请用户拍板）

原则：**视觉统一 + 一眼看懂**；canonical 英文，表达层混排；统一用 ` · ` 分隔。

| role id | canonical | zh 可见名 | en 可见名 | 短标签 | zh full | en full |
|---|---|---|---|---|---|---|
| ceo | CEO | CEO · 首席执行官 | CEO | CEO | 首席执行官 | Chief Executive Officer |
| vp-eng | VP-Eng | VP-Eng · 工程副总裁 | VP-Eng | VPE | 工程副总裁 | VP of Engineering |
| vp-sales | VP-Sales | VP-Sales · 销售副总裁 | VP-Sales | VPS | 销售副总裁 | VP of Sales |
| coo | COO | COO · 首席运营官 | COO | COO | 首席运营官 | Chief Operating Officer |
| cfo | CFO | CFO · 首席财务官 | CFO | CFO | 首席财务官 | Chief Financial Officer |
| cmo | CMO | CMO · 首席营销官 | CMO | CMO | 首席营销官 | Chief Marketing Officer |

- **徽标 / 窗口标题**：短标签（CEO/VPE/VPS…）两语言一致；tooltip 用 zh/en full。
- **在场行 / 任务板 / 委派卡 / 培养**：zh 用 `zh 可见名`，en 用 `en 可见名`；委派卡 zh 用 `VP-Eng · 工程`，en 用 `VP-Eng · Engineering`。
- **数据/日志/API/preset id**：canonical 英文，不随表达层变。
- **picker**：`name` 用 canonical 英文缩写；`description` 中英混排一行；中文全称不单独进 picker。
- **未知角色**：原样显示 id/name，不抛。

## 范围与阶段

### I1 — 内部产品层英文单份（本 RFC 的核心）

- `presets/**`：11 个 preset 的 persona、description、26 个 skill、`_shared` 全部翻成英文；中文原文不保留在树内（git 历史保留）。
- `content/**`：手册、contracts、generic、charters、templates、product-types、delivery-modes、JSON 规则提示全部英文；`manifest.json`/seed 同步。
- **领域值**：`meta.md` 的类型/结果、账本表头/状态、catalog 字段、task status 等 canonical 改英文 ID；zh 表达层提供中文标签；旧盘兼容不是验收条件（一次性迁移/重建即可）。
- **Host/model-facing strings**：工具 description、prompt section、system 文案英文；用户可见回执走表达层 zh/en 字典（英文 default）。
- **preset picker**：`name` 用英文缩写（`CEO`/`VP-Eng`，品牌名、视觉干净）；六个公司角色的 `description` 用**中英混排一行**（`中文职能 / English function`），support preset 用英文；不做 per-locale 切换、不做双语双行。混排只发生在表达层，内部仍是英文单份。
- **无中文内部内容**：I1 结束时，`presets/**`、`content/**` 的模型可读正文无中文；`content/**` 不建中文副本。

### I2 — 代码内部英文（注释/日志/诊断/测试名）

- `src/**` 与 `tests/**` 的注释、日志、诊断、`describe/it` 名称英文化；中文只允许在 `locales.ts` 的 zh 字典、明确的中文夹具、zh 断言里。
- 新增/修改代码的注释默认英文；存量中文注释一次性清理（按目录分批，避免与逻辑改动混在一起）。
- 机械门禁：`src-internal-cjk`（或扩展 `client-copy`）扫描内部源文件的注释/字符串；allowlist = 表达层 zh 字典/中文夹具；先红后绿。

### I3 — 开发者文档英文（另阶段，是否同批由用户定）

- `README.md`、`docs/**`、`AGENTS.md`、`packages/company-pack/README.md` 等开发者/仓库文档英文；用户安装手册保留 zh/en 表达层。
- 与 DSH 的 docs 分层/门禁一起做；不在 I1/I2 混入。

### E1 — 表达层（旧 RFC 继续）

- UI 全量 zh/en、角色名 `roles.*`、host 回执、命令 description、默认 zh、语言切换、真页面金样。
- 旧 RFC 的 A2/A3b/A4 仍是表达层执行面；本 RFC 只接管“内部英文”。

## I1 进度（pilot + 棘轮）

- **pilot**：`presets/vp-sales/skills/customer-voice/SKILL.md` 已翻成英文单份；frontmatter description 英文；方法契约标记用 `**Method contract**` / `applicable product types =` / `required facts =`。
- **棘轮**：`tests/presets/internal-english.spec.ts` 扫全部 `presets/**/SKILL.md`；`PENDING` 之外的正文不得含中文。当前已翻 19 个（`customer-voice`、`tech-feasibility-review`、`pricing`、`managed-service-pricing`、`market-sizing`、`managed-service-ops`、`budget-check`、`finance-compliance`、`ops-workflow`、`cfo-workflow`、`managed-service-economics`、`eng-workflow`、`sales-workflow`、`delegation-policy`、`ops-feasibility`、`project-economics`、`mrd-playbook`、`prd-playbook`、`eng-teaming`），其余 5 个在 PENDING。每翻完一个删一行，最终 PENDING 为空 = 硬门禁。
- **门禁红证据**：临时给 pilot 追加中文 → 棘轮 2 条红；还原 → 绿。
- **第二批**：`tech-feasibility-review`、`pricing`、`managed-service-pricing` 翻成英文；`two-axis-applicability` / `delivery-mode-coverage` 的契约解析改为中英双认。
- **第三批**：`market-sizing`、`managed-service-ops`、`budget-check` 翻成英文；method-contract / delivery-mode 门禁继续绿。
- **第四批**：`finance-compliance`、`ops-workflow`、`cfo-workflow` 翻成英文；workflow 的 `delivery mode` 分派 / fail-closed 仍被门禁覆盖。
- **第五批**：`managed-service-economics`、`eng-workflow`、`sales-workflow` 翻成英文；三个经营角色 workflow 已全部英文，method-contract 仍绿。
- **第六批**：`delegation-policy`、`ops-feasibility`、`project-economics` 翻成英文；共享委派政策降到 8192 字符阈值内，delegation-contract 测试改中英双认。
- **第七批**：`mrd-playbook`、`prd-playbook` 翻成英文；`fact-finding-playbook` **暂缓**——含机器可读的 `待补料·<slug>·<T号>` schedule title 与 `【事实】/【假设】` 审计锚，必须先做 token 英文化 + 消费方改造，不能盲翻。
- **第八批**：`eng-teaming` 翻成英文；五档决策树/控制面/硬规则保留。CEO 组队与主持会议仍暂缓，原因同 token 阻断。
- **测试/冒烟**：`pnpm test tests/presets` 132 passed；`pnpm test` 207 files / 1630 tests；`preset-smoke` ALL PASS（11 preset 可挂载）。
- **门禁**：`checks/gates/method-contract.mjs` 接受中英契约块（`**方法契约**` / `**Method contract**`；`适用产品类型` / `applicable product types`；`需要事实` / `required facts`；`无` / `none`）；中文契约块继续绿，英文 pilot 也绿。
- **门禁红证据**：把 pilot 的 `applicable product types` 改成 `nope` → 红（点名文件 + 没有类型包 + 未覆盖默认类型）；还原 → 绿。中文契约块两方向都跑过。
- **未做**：其余 5 个 skill（quality-loop + 4 个 token 阻断文件）、persona/agent.cordis.yml、content/**、领域值。pilot + 七批只证明翻译/棘轮/门禁流程，不宣称 I1 完成。

## I1b 机器可读中文 token（阻断项）

I1 不能靠“继续翻文案”完成。以下 token 是机器/审计消费的，盲翻会静默破坏运行时：

| token | 消费方 | 处理方向 |
|---|---|---|
| `产品类型` / `交付模式`（meta 字段） | `req-command` / `delivery-command` / bootstrap / `meta.md` 模板 / `/req check` / `/delivery check` | canonical 改 `productType` / `deliveryMode`；解析器只认英文；中文只留表达层标签 |
| `派活｜T1｜…｜状态：待办`（成员任务书行） | 任务板/brief 读取侧、`board.ts` 纸面号映射 | 改英文行格式（如 `ASSIGN｜T1｜…｜status: todo`）；解析器 + 模板 + 测试同步 |
| `待补料·<slug>·<T号>`（schedule title 审计锚） | schedule 审计/检查、fact-finding、chairing | 改英文锚（如 `pending-sources·<slug>·<T#>`）；schedule/audit 消费方同步 |
| `【待澄清】` | `attention.ts` `ESCALATION_MARK` | 改 `[NEEDS-CLARIFICATION]`；attention 测试 + 手册 |
| `日期待核`（journal 文件名 fallback） | CEO journal 日期闸门/检查 | 改 `date-pending`；检查/手册同步 |
| `【事实】` / `【假设】` | 内容/审计人工约定（无代码解析，需确认） | 改 `[fact]` / `[assumption]`；模板/文档同步 |
| 状态枚举 `待办/已出稿/完成/取消/待补料` | 派活行消费侧/任务板 | 与派活行一起改英文枚举 |

**I1b 已做（2026-11-12，产品/交付字段）**：

- `meta.md` 模板、content 示例、`company.md` 字段引用改 `productType:` / `deliveryMode:`。
- `req-command` / `delivery-command` / bootstrap 解析器只认英文 canonical；旧中文字段不再解析。
- 测试：中文-only `产品类型:` 回落 company 默认（红→绿），中文-only `交付模式:` 回落 productized（红→绿）；`delivery-mode-sources` 门禁改查 `deliveryMode:`，把模板改回中文 → 红，还原 → 绿。
- `presets.spec` / `product-type-coverage` / `requirements-contract` 的字段断言同步。
- `【待澄清】` → `[NEEDS-CLARIFICATION]`：`attention.ts` `ESCALATION_MARK`、AttentionTab 注释、generic collaboration、assembling 词面同步；attention spec 用字面量验证，改回中文 → 红，还原 → 绿。
- `日期待核` → `date-pending`：work-handoff、chairing、ledger/converge 测试、deliverables audit、base-clean 门禁与 negative smoke、两份指南同步；把 `date-pending` 注入 charter → base-clean 红，还原 → 绿。

**I1b 第四片（派活行 + 待补料锚）**：

- canonical 行：`ASSIGN｜T1｜role｜text｜deps: none｜status: todo`；状态 = `todo / drafted / done / cancelled / pending-sources`；可选 `｜assumption: ...`。
- schedule 锚：`pending-sources·<slug>·<T#>`。
- 同步 `candidate-scan.mjs`、`deliverables-audit.mjs`、`deliverables-check.mjs`、content generic、chairing/assembling/fact-finding、candidate-scan/deliverables-audit/orient 测试。
- 红→绿：把 parser 回退到旧中文格式 → candidate-scan spec **17 条红**；还原 → 27 passed。
- 仍保留中文金标准标注状态（`GOLD_STATUSES`）作为独立仪器，不属于派活行。

**I1b 第五片（事实/假设标签）**：

- `【事实】/【假设】/【事实/假设】` → `[fact]/[assumption]/[fact/assumption]`；`【事实/假设/待验】` → `[fact/assumption/to-verify]`。
- 同步 templates（mrd/prd/decision-memo/meta/syrs）、cmo charter、product-definition、hardware reference、三份 docs；`prd-check` 消息去掉 token，改成普通中文句子。
- 新增 `tests/content/fact-labels.spec.ts` 固定内容面棘轮：中文标签回潮 → 红；还原 → 绿。
- I1b 机器 token 清单已清；`pnpm verify` **ALL PASS**。

**I1 第九批**：`fact-finding-playbook`、`product-definition` 翻成英文；I1 已翻 21/24。剩余 3 个：`assembling-the-team`、`chairing-staff-meeting`、`quality-loop`。

**剩余 I1**：3 个 skill 全文翻译；persona/agent.cordis.yml；content/**；领域值。这些完成前，4 个 token 阻断文件（`_shared/product-definition`、`ceo/assembling-the-team`、`ceo/chairing-staff-meeting`、`ceo/fact-finding-playbook`）保持 PENDING；`_shared/quality-loop` 无机器 token，可先翻。

## 输掉的方案

- **中英双份内部内容**（`content/zh` + `content/en`）：两本账、翻译/审校/门禁翻倍；用户明确否。
- **中文内部 canonical + 英文 overlay**（旧 RFC Phase B）：内部仍是中文，英文是第二套；用户明确否。
- **每语言一套 preset**：roster 翻倍、会话身份分裂；否。
- **picker 按语言双语双行/切换**：上游无 per-locale 机制；用户接受“统一形态”，否。采用英文 name + 混排一行 description。
- **保留中文注释/日志，只翻模型内容**：仍是混合态；用户明确“要么全英文”，否。

## 验收

**验收原则**：内部英文 = 单份 + 可机械检查；表达层 = zh/en 可切；不把“翻译了”当“验证了”。

### I1 验收

- [ ] `presets/**` 的 persona/description/skill 正文无中文（`grep -P '[\x{4e00}-\x{9fff}]'` 零命中；git 历史保留旧文）。
- [ ] `content/**` 的模型可读正文/JSON 提示无中文；`content/manifest.json` 与 seed 同步；不新增 `content/zh` 或 `content/en`。
- [ ] 领域值 canonical 英文 ID；新盘按新格式读写；旧盘兼容不作为验收条件（一次性迁移/重建即可）；zh 表达层显示中文标签。
- [ ] preset picker 的 `name` 用英文缩写；六个公司角色 `description` 中英混排一行；support preset 英文；无 per-locale 切换。
- [ ] 相关 keyless content/preset/spec 全绿；`preset-smoke` ALL PASS；真模型/回放按受影响面重跑或明确降档。

### I2 验收

- [ ] `src/**`、`tests/**` 的注释/日志/诊断/测试名无中文（allowlist：`locales.ts` zh 字典、`role-copy.ts` 角色表达、中文夹具/zh 断言）。
- [ ] `src-internal-cjk` 门禁：真实中文注释造红 → 还原绿；门禁头注写负例；`pnpm verify` 绿。
- [ ] 不改表达层 zh 字典/中文测试的前提通过；`pnpm test`/`typecheck`/`lint`/`dup` 全绿。

### I3 验收（若同批）

- [ ] README/docs/AGENTS 英文；用户安装手册 zh/en；`doc-budget`/`dist-manual`/`md-links` 同 diff 调整；`pnpm verify` 绿。

### E1 验收

- [ ] 旧 RFC 的 A2/A3b/A4 表达层验收继续有效；默认 zh、切 en、角色名/面板/回执 zh/en；真页面 zh/en 金样。
- [ ] 本 RFC 不以内部英文为理由降低表达层标准；中文输出由 policy 保证。

### 怎么测（可复现）

- 内部中文扫描：`rg -nP '[\x{4e00}-\x{9fff}]' presets content` → 0（I1）；`rg` 对 `src`/`tests` → 只剩 allowlist（I2）。
- 旧盘兼容：用 `snapshots/`/fixtures 的旧 `.dsh-company` 跑 `/req check`/`/prd check`/catalog；新写入英文；zh 标签在 UI/命令回执出现。
- picker：`name` 英文缩写；公司角色 `description` 混排、support 英文；公司 UI 角色名 zh/en；`roles.*` spec。
- 翻译质量：内容审读（人工/抽样）+ `preset-smoke` + 受影响 replay 场景；不把 grep 当语义通过。

## 实施顺序与关系

1. I1 内容翻译与领域值迁移（最大块；先 glossary/角色术语表，再逐包）。
2. I2 代码内部英文化（按目录分批；门禁先红后绿）。
3. I3 文档英文（若同批）。
4. E1 表达层继续（旧 RFC 的 A2/A3b/A4），与本 RFC 并行但不同 diff。
5. 收口：Note 记录决定/输掉的方案/真证据；RFC 毕业到 `notes/implemented/`；旧 RFC 的 Phase B 指针更新。

## 当前状态

- 2026-11-12：RFC 立项；I1 已开 pilot（customer-voice + 棘轮），其余未开始；E1 的 Phase 0/A1/A3a/A2-tab-shell 已实现（见旧 RFC）。角色名表达层方案已定（上表），不再请用户拍板；兼容不作为设计约束，按新格式做对。
- 未验证：所有 I1/I2/I3 项；本 RFC 不宣称内部已全英文。
