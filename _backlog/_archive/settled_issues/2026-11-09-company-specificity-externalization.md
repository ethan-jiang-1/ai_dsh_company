---
status: 已结
opened: 2026-11-09
---

# 推敲：三层分工——通用能力 / 领域包 / 公司配置

> 立卡：2026-11-09 ｜ 状态：已结 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：是 ｜ 审查：agent — 矩阵逐项 + 红绿留证 + release-smoke；用户按 2026-11-09 授权执行
>
> **结论/去向**：note — [2026-11-09-generic-specific-separation.md](../../../notes/implemented/2026-11-09-generic-specific-separation.md)
>
> 上游研究：[公司/领域特殊性外置：盘点与分离契约](../research/company-specificity-externalization/README.md)；
> 逐条证据、原型实跑与归位表见[盘点材料](../research/company-specificity-externalization/2026-11-09-specificity-inventory.md)。
>
> **已拍板**（用户 2026-11-09）：三层——通用 / 领域 / 公司；领域层单位 = `productType`（不是行业）；
> `productType` 住 workspace `identity.md` frontmatter；类型包 v1 随包发布；顺序 `d → a+c → b`。
>
> 研究状态：**已定性**（2026-11-09；content 25/25、presets 30/30、测试资产到断言级）。本卡是**决策与验收的唯一家**；
> 逐文件证据、覆盖矩阵与测试影响图住上面两份链接，卡内不复述。

**问题与期望结果：** 这个虚拟公司产品把三类寿命不同的内容混在同一批载体里：跨公司通用的能力（职位骨架、协作纪律、通用 skill）、行业/领域知识（系统工程五层需求链、项目制交付、硬软一体 playbook、术语）、本部署的公司细节（名字、编制人数、部门数、政策数字、人员归属）。触发是换业务/换公司：今天要换，得在 25 份 content、30 份 presets（含 19 个 skill）、代码常量与 client 文案之间逐句判断"哪句是特殊的"；而手册是整篇注入、不可按公司替换的只读产品内容。期望结果：换公司 = 换公司配置，换行业 = 换领域包，能力层不动；每个文件的用途由名字即可读出，且只在需要时进入上下文。

**当前情况**（详见材料，此处只留判断依据）：

- 手册 19,641B 全文注入；三类内容不止混在手册里，也混在 persona、模板、章程与代码常量里。三处"声称可替换、保证只到口头或半边"：`company.md` 视图不读、`overrides/templates/` 只靠提醒、`references/<type>.md` 只对 product-definition 生效。
- 领域不是"硬件"，是**系统工程 V 模型 + 项目制交付**：五层链在 15 个内容文件 + 6 个代码/工具文件里被强制，纯软件词零命中。
- 原型实跑（`checkRequirements`）：不写 `需求层` 时默认要求 StRS 到场（纯软件队红）；显式 `需求层: MRD, PRD` 可豁免；`VR-001` 这类别家编号**无豁免**，直接判退役词。
- 需求链内部要再分档：**MRD/PRD 半通用**（概念跨行业存在，形态各异；敏捷 + AI 团队常写 User Story / OpenSpec）；**StRS/SyRS/IRS/V&V + 编号合同是特殊**。通用层只保留"该不该做 → 做什么 → 怎么验"的问题脊柱，不给文档名。
- **包的单位是产品类型，不是行业**：纯软件也不是一条路——2B 项目制、2B SaaS、2C、游戏、工具、服务的主干不同。所以第二个 fixture 选一个具体类型（`b2b-saas`），不建笼统的 `software` 包；每个类型一份自包含包，先不做继承。
- 与既有合同冲突：D17 只豁免 `content/state` 与 `charters`，手册不在内却装公司事实；`docs/contracts/presets.md:113` 又把职责边界与路由的唯一事实家指定为这份手册。
- 载体可行：`systemPrompt.section` 可多段注入；`skills.register/registerProvider` 可挂领域 skill；`checkRequirements` 已接受 `options.layers`。三层不需要新 DSL，唯一要改代码的是 checker 词表参数化。
- 二轮逐文件审计（[覆盖审计](../research/company-specificity-externalization/2026-11-09-coverage-audit.md)）补了 13 条漏项：`content/contracts/workflow.md` 是**机制/引擎事实**（随 DSH pin，按能力注入——T0 的现成范式）；`org.md:73` 引用具体部署交付物；4 份 charter 各写条线人数、违背 org 自称的"唯一事实家"；"AI 使用声明 + 复核层级"在 4 个模板里逐字复制；persona 是第二混合载体（0.8–1.9KB/人）；公司角色注入基线 21–25KB；client 有 15 类公司文案、显示名三份事实；tools 侧有独立角色名册（漏改不红但错判）。

## 目标形状

```
content/
  contracts/                    # 机制/引擎事实（随 DSH pin；按能力注入，不进通用层）
    workflow.md
  generic/                      # 跨公司、跨行业
    non-negotiables.md          # T0 写盘守卫/日期/present 归属/升级路径
    role-boundary/<role>.md     # T0 每角色一页，只写边界与例外
    product-definition-spine.md # T2 三个问题，不给文档名
    collaboration.md            # T2 星型/打回/问询
    deliverable-states.md       # T2 三态/命名/署名
    routing.md                  # T2 这事问谁
    human-interface.md          # T2 待办/审批/节流
  product-types/
    hardware-software/
      overview.md               # T1 何时用、多哪几个阶段
      requirements-model.md     # T2 五层链（人读）
      check-rules.json          # 机器读：层表/文件名/退役词
      glossary.md               # T2 术语
      templates/<doc>.md        # T3
      skills/<name>/SKILL.md    # T3
    b2b-saas/                   # 第二个 fixture：SaaS 路线图 → User Story → 发布
  company/                      # 出厂样例，首启 seed 到 workspace
    identity.md                 # T0 名字/产品名/productType 声明
    organization.md             # T1 编制/人数/部门数/业务构成
    policy-lines.md             # T1 毛利线/折扣线/预算线/并行上限
    people.md                   # T2 人侧归属与授权面
```

加载规则：**T0 常驻**（合计 ≤6KB，单文件 ≤2KB）/ **T1 摘要 + 指针**（合计 ≤4KB）/ **T2 触发时读全文**（单文件 ≤6KB）/
**T3 技能**（catalog 常驻 description，正文按需）。现状 19.6KB 全文常驻 → 目标 T0+T1 ≤10KB。

## 四条设计约束（本轮新增，验收要查）

1. **名即用场**：文件名 = 层 + 一个问题。禁止 `AGENTS.md`、`misc.md`、`notes.md`、`utils.md`、含糊的 `company.md`；
   正例 `policy-lines.md`、`organization.md`、`requirements-model.md`、`glossary.md`。
2. **渐进式披露**：一个文件只回答一个问题；超预算就拆，不许大而全。每份文件必须在 `content/manifest.md`
   登记 tier + 一句话用场，未登记即红。
3. **单一事实家 + 禁入**：通用层禁公司名/编制/政策阈值/行业术语；领域层禁公司名/编制/客户/政策；公司层只写
   `productType: <id>` 引用，不复述领域流程；经验层（workspace）只放当轮事实，规则回流到三层。
4. **机制事实随版本，不随公司**：`content/contracts/` 独立成层，按能力注入；它的门禁是"随 DSH pin 复核"，
   不进通用面的"零公司词"判据。否则换公司会把引擎合同一起误伤。

## 归位要点（全表见材料 §13.4）

| 现内容 | 去哪 | tier |
|---|---|---|
| 写盘守卫、日期、present 归属、升级路径 | `generic/non-negotiables.md` | T0 |
| 职位边界 / veto / 不碰什么 | `generic/role-boundary/<role>.md` | T0 |
| 协作细则、路由、三态、待人接口 | `generic/*.md`（拆四份） | T2 |
| 公司名、编制、部门数、政策线、人 | `company/identity|organization|policy-lines|people.md` | T0/T1/T2 |
| MRD/PRD 问题锚点 | `generic/product-definition-spine.md` | T2 |
| StRS/SyRS/IRS/V&V + 编号合同 | `product-types/<id>/requirements-model.md` + `check-rules.json` | T2 + checker |
| 领域模板、术语、playbook | `product-types/<id>/templates|glossary|*` | T2/T3 |
| AI 声明 / 具名复核 / 对外件闸门（现 4 个模板各一份） | `company/review-protocol.md`（一处，模板只引用） | T1 |
| 部署指针（`org.md:73` 引具体交付物） | 删除；content 不留部署路径 | — |
| client 品牌 / 显示名 / 15 类公司文案 | `company/identity.md`（host 读、client 取） | T0 |
| persona 内联的产品链 / 通道 | 移 `product-types/<id>/` 与 skill；persona 只留边界与触发 | T0/T2 |

## 方案与取舍

**A. 最小去重**：只把手里的政策数字/编制搬进状态文件，手册瘦身；不动 persona、模板、产品链。成本低、可一次交付；
不解决换行业/换产品类型，公司事实仍散在 charters、templates 与代码里。→ 不作为目标，只作为 B 的第一批。

**B. 三层 + T0–T3（选定）**：generic / product-types / company 三层，contracts 作版本轴；清单驱动加载；
测试用公司 fixture 矩阵。满足"换公司只改 company、换类型只换包、能力层不动"；代价是加载面与迁移成本。
DSH 载体已够（`systemPrompt.section` 多段、`skills.registerProvider`、`checkRequirements` 的 `options.layers`），
不发明新机制。

**C. 生成器**：一份 company 配置生成 handbook / persona / state。最彻底，但引入新机制与生成物漂移面，
且生成器本身会成为第三个事实源。→ 拒绝；B 稳定后再评估。

**为什么 B 不是 A+C**：A 只解决"重复"，不解决"领域锁死"；C 用生成器掩盖分层问题——生成物仍要回答
"哪份文件属于哪层"。B 先把层与家定死，生成器以后才有意义。

**排序理由**：d（止血，零风险）→ 测法先迁（否则改名先撞死现有 spec）→ a+c（公司事实单家）→ b（类型包）。
a 在 b 前，因为 b 要搬模板/术语，需要一个已稳定的 company 落点。

## 迁移顺序

0. **测法先迁**（与内容改动同一批）：清单驱动 + 旧名兼容映射 + 断言换向 + 两个公司 fixture 的矩阵；
   否则改文件名会先撞死现有 spec，"换公司"也无从证明。**前提**：现有 164 spec 可作为基线跑绿。
   **出口**：`pnpm test` 在新布局下全绿，两个 fixture 矩阵可跑，且新增文件/改名不再需要改测试。
   依据 = [测试资产影响图](../research/company-specificity-externalization/2026-11-09-test-asset-map.md) §0。
1. **d 先止血**（✅ 2026-11-09 已落地）：三处"口头承诺"撤成如实描述，零行为变更。
   证据：`content/state/company.md` 删掉"公司视图都读这里"；`content/README.md` 标注模板覆盖是"提示级"；
   `product-definition` 的 `references/<type>.md` 注明随包发布、workspace 覆盖暂不支持。
2. **a+c 公司事实单家化**：政策数字、编制、部门数、品牌、时区进 `company/*`；手册与 charters 去复述；
   代码常量改读 profile。出口：`grep` 政策数字只剩 `policy-lines.md` 一处；换公司名只改 `identity.md`。
3. **b 产品类型包**：抽出 `product-types/hardware-software/`（五层链 + 模板 + 术语 + check-rules），新增
   `product-types/b2b-saas/`（路线图 → User Story → 发布）作为 fixture；checker 读 `check-rules.json`。
   出口：keyless smoke 在 `productType: b2b-saas` 下绿，且 `hardware-software` 行为不变。

## 验收标准

按 [validation-design](../../methods/validation-design.md)：每个承载行为一行，含类、输入/状态、
通过信号、负例、证据 owner 与人判。**owner 尚未建的行标 blocked**，按迁移第 0 步先建/换向，再动内容。

| # | 行为 | 类 | 输入 / 状态 | 通过信号（期望值来源） | 负例 / 恢复 | 证据 owner（现状） | 人判 |
|---|---|---|---|---|---|---|---|
| 1 | 预算：T0 合计 ≤6KB、单文件 ≤2KB；T1 ≤4KB；T2 单文件 ≤6KB | 确定性 | `content/generic/**`、`content/company/**` | gate 汇总字节 ≤ 上限（上限写进清单） | 向任一 T0 文件加 1KB → gate 红 | **blocked**：`content-budget` 门待建 | 预算值是否接受（产品取舍）→ 用户 |
| 2 | 通用面零污染：公司名/编制/政策数字/产品链术语 = 0 | 确定性 | 通用 T0/T1/T2 + 角色边界 | grep 词表命中 = 0；词表来自 fixture 的公司名/数字 + 类型术语 | 写回「梦之队」或「30%」→ 红 | **blocked**：`generic-clean` 门待建 | 无 |
| 3 | 清单完整：每份 generic/product-type/company 文件有 tier + 用场 | 确定性 | `manifest` 与磁盘 | 双向差集为空 | 加文件不登记 → 红 | **blocked**：`manifest-shape` 门待建 | 无 |
| 4 | 换公司：只改 `identity.md` + `policy-lines.md`，显示名跟随 | 编排 + 渲染 | fixture Acme → Beta | `pnpm test tests/client` + `client-load-smoke` 的显示名 = fixture 值 | 品牌写回 tsx → 红 | 现成但需换向：`tests/client/ui/brand.spec.ts`、`node checks/lanes/client-load.entry.mjs` | 显示名是否符合预期 → 用户看一眼 |
| 5 | 换类型：`b2b-saas` 下不要求 StRS、`VR-*` 不误判、链为 roadmap→US→release | 确定性 | `productType: b2b-saas` fixture + `check-rules.json` | `pnpm test tests/lib/requirements-check.spec.ts` 以 fixture 期望为准 | `hardware-software` 仍要求 StRS（回归） | **blocked**：spec 在，fixture/规则未建 | SaaS 链路是否代表目标客户 → 用户 |
| 6 | 行为不丢：除公司事实断言外 1300 个 keyless 全绿 | 确定性 | 现有 164 spec | `pnpm test` 退出 0（基线已实测 164/1300） | 删一条 seed → `bootstrap.spec` 红 | `pnpm test`（现成） | 无 |
| 7 | 无部署指针：content 不含具体部署路径 | 确定性 | `content/**` | 扩 `base-clean` 扫 `.dsh-company/deliverables/<名字>` 类模式 | 把 `org.md:73` 路径写回 → 红 | 现成需扩：`checks/gates/base-clean.mjs` | 无 |
| 8 | 公司流程单家：AI 声明/具名复核/对外闸门只一处，模板只引用 | 确定性 | `company/review-protocol.md` + 4 模板 | 断言"引用 ∧ 协议含两栏 ∧ 全文只出现一次" | 复制第二份 → 红 | 现成但判据相反：`tests/content/templates.spec.ts` | 无 |
| 9 | persona 瘦身：≤2KB 且不含产品链术语 | 确定性 | 9 份 `agent.cordis.yml` | 字节上限 + 反向词表断言 | 把 MRD→PRD 链写回 → 红 | 现成需换向：`tests/presets/presets.spec.ts` | 无 |
| 10 | UI 零硬编码：品牌/显示名从 profile 读 | 编排 + 渲染 | fixture profile → client | `tests/client/ui/{brand,role-badge}` 两 fixture 全绿 | 硬编码品牌 → 红 | 现成需换向 + `client-load-smoke` | 视觉与命名接受度 → 用户 |
| 11 | 测法迁移：改名/加文件不改测试；tests 零公司字面量 | 确定性 | 新布局 + `tests/fixtures/**` | `pnpm test` 全绿 + `tests-literals` 门 = 0 | spec 里写「梦之队」→ 红；改名不改测试 → 绿 | 现成（`pnpm test`）+ **blocked**：字面量门待建 | 无 |
| 12 | 公司事实单家 + 名册单源 | 确定性 | 全仓（含 src/client/tools） | 政策/编制/部门数各一处；名册三处一致 | charter 写回 50 人 → 红；tools 名册漏改 → 红（非静默） | **blocked**：`single-home` / 名册一致性测试待建 | 无 |
| 13 | 反证：每条新门禁先红一次 | 过程 | 每条新 gate | 删除/写回 → 红；还原 → 绿 | 无红记录 = 未证 | Note 的"红绿表"（交付时） | 用户抽核 P0 面 |

现状：第 1–3、5、11–12 行的 owner 尚未建（blocked）；第 4、7–10 行 owner 存在但判据要换向/扩面。
这两类都在迁移第 0 步处理，不靠"跑一遍绿"代替。

## 交付进度

- 2026-11-09 **测试资产**：`tests/fixtures/companies/{acme-hardware-software,beta-b2b-saas}` + `loadCompanyFixture`
  + 参数化 spec（5 tests，同一套 spec 换公司跑）。
- 2026-11-09 **测试零字面量门**：新增 `tests-literals`（166 个 spec；公司名/政策数字零命中，仅 4 条 allowlist
  且逐条注明"产品词标/负向守卫/安装手册标题"）。10 处测试字面量改为 fixture 派生或去数字；
  红→绿：往非 allowlist spec 写「梦之队」→ 红。
- 2026-11-09 **release-smoke 清单驱动**：安装副本按 `content/manifest.json` 校验，不再手抄 content 文件清单
  （加/改名只改 manifest，smoke 自动跟随）。
- 2026-11-09 **名册一致性门**：新增 `roster-consistency` 比对 8 份角色清单（含 tools 侧）；修好两份陈旧五角色清单
  （company-skeleton / rehearsal 缺 cmo）。红→绿：删 cmo → 红；还原 → 8 份一致。
- 2026-11-09 **领域模板入类型包**：SyRS / IRS / allocation 从 `content/templates/` 迁入
  `product-types/hardware-software/templates/`；base-clean、company-skeleton、requirements-templates.spec
  与 manifest 同步（spec 改为"先通用后类型包"解析）。
- 2026-11-09 **persona 去产品链**：CEO / VP-Eng / CMO / COO 的 persona 不再内联 MRD/StRS/PRD/REQ/AC/slice
  与 SOW/RACI；改为指向产品类型包的 `document-map`。3 条测试从"persona 必须含链"换向为"persona 必须指到
  document-map 且不得内联链"（红→绿）。
- 2026-11-09 **显示名去公司前缀**：9 个 preset `name` 与 `presence-status` 改为角色名；5 个测试与 docs 同步；
  D14/D41 收窄为"公司名只在品牌/身份面"（旧决定保留原文 + 本卡为收窄依据）。红→绿：把前缀写回一个 preset → 红。
- 2026-11-09 **产物重生成**：内容变更后 `release --prepare --force` 重打 tarball 与手册，manifest sha 同步。
- 2026-11-09 **编号合同入类型包**：`state/process-docs.md` → `product-types/hardware-software/requirements-model.md`
  （bootstrap / base-clean / company-skeleton / release-smoke / 两个 spec 同步；run bundle 的播种名不变）。
- 2026-11-09 **品牌读部署身份**：新增 client `company-identity` store；`Brand` 用 `useSyncExternalStore`
  读 `company.md` frontmatter 的 `productName`，读不到回退出厂词标；`brand.spec` 用两家公司 fixture 跑同一套断言。
- 2026-11-09 **产品类型包**：`product-types/hardware-software/`（overview/glossary/check-rules/document-map）与
  `product-types/b2b-saas/`（overview/glossary/check-rules）落地；`product-types.spec` 校验"自包含 + 规则自洽"
  （红→绿：删 files 里的一层 → 红）。
- 2026-11-09 **checker 参数化**：`checkRequirements` 接受 `defaultLayers` / `retiredPrefixes`；`/req check`
  读 `company.md` 的 `productType` 与类型包 `check-rules.json`——b2b-saas 不再要求五层、`VR-*` 不再误判
  （两条新测试 + 一条回归）。
- 2026-11-09 **复核协议单家 + 模板引用链**：新增 `content/company/review-protocol.md`；4 份模板改为引用；
  `templates.spec` 换向为"模板引用 ∧ 协议含两栏 ∧ 正文只出现一次"（红→绿：复制正文回模板 → 红）。
- 2026-11-09 **清单与预算门**：`content/manifest.json`（T0/T1/T2/legacy）；新增 `content-manifest` 门
  （未登记文件红、T1 合计超 4KB 红，两项均留证）；`collaboration` 拆出 `work-handoff` 使 T2 单文件 ≤6KB。
- 2026-11-09 **base-clean 扩部署指针**：`content` 里出现具体 `deliverables/<slug>/` 路径即红（红→绿留证）。
- 2026-11-09 **通用层拆分**：`content/AGENTS.md` 19.6KB → 2.9KB（T0 常驻）；细则拆到
  `content/generic/{deliverable-states,role-boundary,routing,collaboration,human-interface}.md`（T2 按需）。
  新增门禁 `generic-clean`（通用面零公司词/产品类型词）与 `handbook-budget` 的 T0 ≤6KB 判据，
  各带红→绿留证。`presets.spec` 改为读"手册面 = T0 + generic/"并新增指针断言（测试跟着文件系统走）。
- 2026-11-09 **company 层**：`policy-lines.md` 移入 `content/company/`；`state/company.md` 增 frontmatter
  （`productType` / `timeZone`），bootstrap seed 路径同步。
- 2026-11-09 **产品类型层起步**：`content/product-types/hardware-software/document-map.md`（需求文档链与校验
  从 generic 抽出）；`b2b-saas` 仍只有测试 fixture，内容包待建。
- 2026-11-09 **a.1 政策单家**：新增 `content/state/policy-lines.md`（唯一家）；bootstrap seed 到
  `kb/policy-lines.md`；手册 / CFO·COO·VP-Sales 章程 / org / project-economics 改指针；新增门禁
  `content-single-home`（红→绿留证：写回「毛利 < 30%」→ 红；还原 → 绿）；`org.md` 的部署指针一并删除。
  当时全绿：165 files / 1305 tests、`pnpm verify` ALL PASS。

## 下一步

- **a+c（下一步）**：建 `content/company/{identity,organization,policy-lines,people}.md` 与对应 seed/迁移；
  手册与 charters 去复述；品牌/时区/政策常量改读 profile。先出变更清单再由我实施。
- **b（随后）**：抽 `product-types/hardware-software/`，落 `product-types/b2b-saas/` fixture，checker 读
  `check-rules.json`。

## 交接

> **申请**：`note` ｜ **目的地**：`2026-11-09-generic-specific-separation.md`（住 notes/implemented/）
> **提交**：2026-11-09，在本轮回复中向用户提出（结论、范围、方案、矩阵齐）；用户已确认方向与顺序。
> **请求处理**：交付同 diff 落 Note；Note 是否需要由 notes/README §二 判定（真备选 + 长期取舍）。
> 若判定不需要 Note，回退 `implementation`（以提交/合同为记录）。
> **受理状态**：已提交，未落树；卡保持 `待落地` 直到交付。

## 范围与排除项

- 含：`content/`（手册、contracts、state、charters、templates）、`presets/`（persona、skills、name/description/timeZone）、
  `src/` 公司常量、`src/client/` 与 `locale/` 的公司文案、`tools/` 角色名册、`checks/` 与 `tests/` 中把公司/领域
  事实当不变量断言的部分。
- 排除：vendor/dsh 机制（不发明新载体，只用 instructions / skills / KB / preset config）；六角色骨架（已定通用）；
  client UI 视觉；`.dsh-company/` 状态迁移工具（另立卡）；真模型验证（证据止于结构与 keyless 面）。

## 已知与未决

**已知**：三层与单位（`productType`）已拍板；覆盖到文件级；DSH 载体可行；原型证明 checker 的领域默认与退役词锁死。
**未决（不阻塞交棒，实施时先解决）**：

1. 两 fixture 矩阵的机制（`describe.each` + 环境选择）未试跑；
2. `identity.md` frontmatter 的解析器未写（格式已定）；
3. `skills.registerProvider` 的 dispose 生命周期未做运行时实验；
4. T0/T1 预算（6/4KB）是设计值，需真实 token 测量校正。

真模型行为不属本卡验收面（见范围排除）。

## 关闭条件

验收矩阵逐项通过（人判项由用户确认）+ `去向: note` 的 Note 落树 + 归档同改；交接块的申请类型与目的地
必须可被另一个会话 reconstruct。未通过项留卡回 `推敲中`；不以"文档写完"或"跑一遍绿"代替矩阵；
下游受理不是关闭条件（backlog 规则）。
