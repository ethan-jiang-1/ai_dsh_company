---
status: 待落地
opened: 2026-11-09
---

# 推敲：三层分工——通用能力 / 领域包 / 公司配置

> 立卡：2026-11-09 ｜ 状态：待落地 ｜ 类型：Task ｜ 毕业：做 ｜ 可关闭：否
>
> **结论/去向**：note — 交付时建 `2026-11-09-generic-specific-separation.md`（住 notes/implemented/）
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
- 与既有合同冲突：D17 只豁免 `content/state` 与 `charters`，手册不在内却装公司事实；`docs/presets.md:113` 又把职责边界与路由的唯一事实家指定为这份手册。
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

## 三条设计约束（本轮新增，验收要查）

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

## 迁移顺序

0. **测法先迁**（与内容改动同一批）：清单驱动 + 旧名兼容映射 + 断言换向 + 两个公司 fixture 的矩阵；
   否则改文件名会先撞死现有 spec，"换公司"也无从证明。
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

1. **预算**：`generic` T0 合计 ≤6KB、单文件 ≤2KB；`company` T1 合计 ≤4KB；T2 单文件 ≤6KB。
2. **零污染**：通用面（T0/T1/T2 + 角色边界）grep 公司词 / 领域词 / 政策数字 = 0。
3. **清单**：`content/generic/` 与 `product-types/<id>/` 每份文件在 `manifest.md` 有 tier + 用场；未登记红。
4. **换公司**：只改 `company/identity.md` 与 `policy-lines.md`，keyless smoke 绿、UI 显示名跟着变。
5. **换产品类型**：`productType: b2b-saas` fixture 下，`/req check` 不再要求 StRS、`VR-*` 不再误判；产物链为
   路线图 → User Story → 发布（而非五层链）。
6. **行为不丢**：现有 1300 个 keyless 测试除"公司事实断言"外全绿；后者改为从 fixture profile 生成期望值。
7. **无部署指针**：`content/` 内不出现具体部署路径（如 `.dsh-company/deliverables/<名字>/final.md`）；出现即红。
8. **公司流程单家**：AI 使用声明 / 具名复核 / 对外件闸门只在 `company/review-protocol.md` 一处；模板逐字复制即红。
9. **persona 瘦身**：每个 persona ≤2KB，且不含产品链术语（MRD/StRS/PRD/REQ/AC/slice），只留边界与触发。
10. **UI 零硬编码**：品牌与显示名从 profile 读；client 公司文案收敛到一处（或零公司词）。
11. **测法迁移**："这些文件必须在"类断言改为读 `manifest`；改名/新增文件只改清单，不改测试。
12. **单家化断言换向**：AI 声明/复核层级断言"模板引用协议 ∧ 协议含两栏 ∧ 全文只出现一次"；现 `templates.spec` 的"每份模板自带"必须换掉。
13. **测试参数化**：测试自带公司 fixture（Acme 硬软一体 / Beta b2b-saas），公司事实期望值从 fixture 读；
    **同一套 spec 在两个 fixture 下全绿**——"换公司"的证明是两遍绿，不是文档。`presets.spec` 的"禁止旧样本事实"改为"零公司词"。
14. **反证**：每条新门禁至少先红一次（删必需文件 / 把公司词写回通用面），红绿记录进 Note。
15. **测试零字面量**：`tests/` 除 `tests/fixtures/**` 外不出现公司名 / 政策数字 / 产品链术语；grep 即红。
16. **公司事实单家**：政策数字、编制人数、部门数在全仓只有一处（含代码常量与 client 文案）；第二处即红。
17. **名册单一事实源**：六角色/三 worker 的名册只有一份，tools 侧不另存副本；漏改必须红，而不是静默错判。

## 下一步

- **a+c（下一步）**：建 `content/company/{identity,organization,policy-lines,people}.md` 与对应 seed/迁移；
  手册与 charters 去复述；品牌/时区/政策常量改读 profile。先出变更清单再由我实施。
- **b（随后）**：抽 `product-types/hardware-software/`，落 `product-types/b2b-saas/` fixture，checker 读
  `check-rules.json`。

## 范围与排除项

- 含：`content/`（手册、contracts、state、charters、templates）、`presets/`（persona、skills、name/description/timeZone）、
  `src/` 公司常量、`src/client/` 与 `locale/` 的公司文案、`tools/` 角色名册、`checks/` 与 `tests/` 中把公司/领域
  事实当不变量断言的部分。
- 排除：vendor/dsh 机制（不发明新载体，只用 instructions / skills / KB / preset config）；六角色骨架（已定通用）；
  client UI 视觉；`.dsh-company/` 状态迁移工具（另立卡）；真模型验证（证据止于结构与 keyless 面）。

## 关闭条件

结论（做 / 以后做 / 不做 / 消化）+ 范围与排除 + 方案与理由 + 可执行验收标准 + 有值 `去向`；或不做给理由。
本卡已转 `待落地`；d 已落地，a+c 完成后按 `去向: note` 落 Note 并归档。
