---
topic: 产品类型模型：b2b-saas 太窄之后，business-software / hardware-software 怎么分
intent: 把 b2b-saas 的语义问题、两种产品类型的文档链/检查器/角色 playbook、动议级路由与改动面收敛成可立卡的研究结论；不实施
---

# 产品类型：从 `b2b-saas` 到 `business-software`

> 本文是[组织协同拓扑](README.md)的产品类型分支材料。只做研究，不改代码。
> 触发：用户 2026-11-10 指出「b2b-saas 太窄」，并提议按动议声明「硬软一体 / 纯软」。

## 0. 一句话

`b2b-saas` 的问题不是名字窄，而是它把**交付模式（SaaS）**当成了**产品类型**：它的文档链是
`ROADMAP → US → RELEASE`，因此落在 `/prd check` 与 `/req check` 两条现有检查器之外；只改目录名
不能解决。建议把产品类型收敛为**工程学科**（`hardware-software` / `business-software`），两者共用
`MRD → StRS → PRD` 脊柱；`hardware-software` 多出可选的 SyRS/IRS/V&V，SaaS 降为 `business-software`
下的**交付模式**词表。动议级声明放 `meta.md` 的 `产品类型`，`/req check` 按「动议 meta > `company.md`」
解析。

## 1. 现状（盘上事实）

### 1.1 原 `b2b-saas` 包（2026-11-10 已改名 `business-software`）

- 改名前的 `check-rules.json`：`layers = [ROADMAP, US, RELEASE]`、`defaultLayers = [ROADMAP, US]`，
  `files = roadmap.md / user-story.md / release.md`；改名后已是 `MRD/StRS/PRD`
  （[`content/product-types/business-software/check-rules.json`](../../../packages/company-pack/content/product-types/business-software/check-rules.json)）。
- 改名前的 `overview.md`：订阅制、多租户、SLA/续约，明确写「没有 SyRS/IRS/采购件」；改名后已泛化为
  纯软/企业软件（[`overview.md`](../../../packages/company-pack/content/product-types/business-software/overview.md)）。
- 改名前的目录只有 `check-rules.json` / `overview.md` / `glossary.md`，**没有** `document-map.md` /
  `requirements-model.md`；改名后已补齐。
- `product-definition` 的品类表在改名后已加 `business-software` reference（原先只有
  `project-services` / `hardware-software`）。
  （[`product-definition/SKILL.md`](../../../packages/company-pack/presets/_shared/skills/product-definition/SKILL.md)）。

### 1.2 两条 checker 的入口

- `/prd check` 读 `drafts/mrd.md` + `drafts/prd.md`，校验 MRD/PRD 的 JSON 账本
  （[`prd-command.ts`](../../../packages/company-pack/src/host/commands/prd-command.ts)）；
  `b2b-saas` 的 `ROADMAP/US/RELEASE` 链没有 MRD/PRD，进不了这个检查。
- `/req check` 读 `company.md` 的 `productType`，再读 `product-types/<id>/check-rules.json`
  （[`req-command.ts:49-62`](../../../packages/company-pack/src/host/commands/req-command.ts)）。
  遇到 `ROADMAP/US/RELEASE` 这类非五层时，它返回一句「本产品类型不走五层编号体系，按 overview 自查」，
  **不做机械校验**（[`req-command.ts:100`](../../../packages/company-pack/src/host/commands/req-command.ts)）。
- 所以 `b2b-saas` 现在既没有 PRD 结构检查，也没有编号/追溯检查；它的「质量门」只有人读 overview。

### 1.3 `hardware-software` 包

- `check-rules.json`：`layers = [MRD, StRS, PRD, SyRS, IRS, V&V]`、
  `defaultLayers = [MRD, StRS, PRD]`，五层 checker 可直接跑
  （[`hardware-software/check-rules.json`](../../../packages/company-pack/content/product-types/hardware-software/check-rules.json)）。
- 有 `document-map.md` / `requirements-model.md` / SyRS/IRS/allocation 模板；
  `product-definition` 有 `hardware-software` reference
  （[`requirements-model.md`](../../../packages/company-pack/content/product-types/hardware-software/requirements-model.md)）。
- 这是目前唯一「文档链 + 检查器 + playbook + 模板」都闭合的类型。

### 1.4 第三类：`project-services`

- `product-definition` 有 `project-services` reference（SOW/UAT/里程碑），但
  `content/product-types/` 下**没有** `project-services` 包，也没有 check-rules。
- `content/templates/mrd.md` 的 JSON 示例还写着 `"productType": "project-services"`
  （[`mrd.md:17`](../../../packages/company-pack/content/templates/mrd.md)），这是一个悬空示例。
- 公司 `org.md` 有三条业务线（软件 / 服务 / 系统集成），所以「两种类型」只覆盖前两条；
  服务/集成要不要第三个类型，是后续缺口，不在本轮两个类型里硬塞。

## 2. 语义拆分：产品类型 ≠ 交付模式

当前 `productType` 一个字段同时承担了三件事：

| 轴 | 例子 | 应该回答 |
|---|---|---|
| 工程学科（产品类型） | 硬软一体 / 纯软 / 服务集成 | 要不要 SyRS/IRS/V&V？用哪套 playbook？ |
| 交付模式 | SaaS / 私有化 / 项目制 | 验收看激活留存，还是 SOW/UAT？ |
| 编号体系 | 五层 / ROADMAP-US-RELEASE | `/req check` 该跑哪套？ |

把三者压进一个 `productType`，就会出现「`b2b-saas` 这个名字既是产品类型又是交付模式还是编号体系」的
耦合。建议拆成：

- **`productType` = 工程学科**：`hardware-software` | `business-software`（+ 未来的 `project-services`）。
- **交付模式**：`business-software` 的 `overview.md` 里列 `saas` / `on-prem` / `perpetual` 子类；
  它影响验收口径，但不另立文档链。
- **`requirementsModel`**：两种类型都用 `MRD → StRS → PRD`；`hardware-software` 的
  `需求层:` 可扩到 SyRS/IRS/V&V，`business-software` 默认到 PRD 为止。

这样 `/prd check` 和 `/req check` 对两种类型都能工作；区别只在 `hardware-software` 多出可选的系统层。

> 用户 2026-11-10 已定：名字用 `business-software`；`software` 太宽泛，不现在使用，保留给未来的其他软件类型。

## 3. 两种类型的目标形状

### 3.1 `business-software`（替代 `b2b-saas`）

| 件 | 内容 |
|---|---|
| `check-rules.json` | `productType: business-software`；`layers: [MRD, StRS, PRD]`；`defaultLayers: [MRD, StRS, PRD]`；`files` = mrd/strs/prd；`retiredPrefixes` 可按需；`notes` 写「纯软/企业软件；无系统层」 |
| `overview.md` | 通用企业软件；SaaS / 私有化 / 永久授权作为**交付模式**小节；不再把 tenant/SLA 当类型定义 |
| `glossary.md` | 通用词 + SaaS 子类词（tenant/SLA/activation/retention/release train 降为子类） |
| `document-map.md` | 指向 `content/templates/{mrd,strs,prd}.md`；明确「无 SyRS/IRS/V&V」 |
| `requirements-model.md` | 可选；三层的编号/追溯规则可复用五层合同，只列 MRD/StRS/PRD |
| `product-definition` reference | 新增 `references/business-software.md`：市场/买单人/替代/买点/规模 + 纯软验收（激活/留存/SLO/发布回滚），不套硬件条目 |

### 3.2 `hardware-software`（保持）

| 件 | 内容 |
|---|---|
| `check-rules.json` | 保持五层 + 默认到 PRD；`需求层:` 可扩 SyRS/IRS/V&V |
| `document-map.md` / `requirements-model.md` | 保持 |
| `product-definition` reference | 保持 `references/hardware-software.md` |
| 质量环方法 | 可选 `system-architecture` + `vv-plan` 方法包；见 [SA/SQA 方法包研究](2026-11-10-sa-sqa-method-packs.md)（若该材料尚未落，见组织拓扑 §4/§7.3） |

### 3.3 `project-services`（后续）

- 若要覆盖服务/集成，补 `content/product-types/project-services/`：check-rules 仍可走 MRD/StRS/PRD，
  加 SOW/UAT 字段；`product-definition` reference 已有。
- 本轮不把它塞进「两个类型」；在 issue 里作为开放项。

## 4. 动议级路由：`meta.md` 的 `产品类型`

### 4.1 目标

- 公司默认仍是 `company.md` 的 `productType`（向后兼容；出厂 `hardware-software`）；
- 每个动议在 `meta.md` 写 `产品类型: hardware-software | business-software`；
- 用户明确说「硬软一体」/「纯软」时，CEO 按声明写；没说时问一句，或用公司默认并标假设；
- `/req check` 解析顺序 = 动议 `meta.md` > `company.md`；
- `company.md` 不被逐动议改写（它是公司身份，不是动议属性；client 也读它显示公司信息
  [`company-identity.ts`](../../../packages/company-pack/src/client/data/company-identity.ts)）。

### 4.2 为什么不能只改角色提示

如果只在 persona/skill 里说「按动议类型选 playbook」，`/req check` 仍读 `company.md`，检查器会和
角色说的类型不一致。所以 `产品类型` 必须进入**动议户口**（`meta.md`）并被 checker 消费。

### 4.3 改动面（若实施）

| 面 | 文件 | 改动 |
|---|---|---|
| 模板 | `content/templates/meta.md` | 加 `产品类型:` 字段与说明 |
| checker | `src/host/commands/req-command.ts` | 先读 `deliverables/<slug>/meta.md` 的 `产品类型`，回落 `company.md`；按类型读 check-rules |
| 测试 | `tests/host/commands/req-command.spec.ts` | 覆盖 meta 优先、回落、未知类型、business-software 三层 |
| 角色 | CEO `assembling-the-team` / `chairing-staff-meeting`、CMO/VP-Eng `product-definition` | 开局记录/询问类型；加载对应 playbook |
| 内容 | `content/product-types/business-software/*`、`manifest.json`、`product-definition/references/*` | 新类型包 |
| 文档 | `content/AGENTS.md`、产品定义指南、requirements-model | 「产品类型 = 工程学科；交付模式在 overview」 |
| UI（可选） | 交付物卡片 | 显示动议类型；不改公司身份 |

## 5. 选项与取舍

名字已定 **`business-software`**；`software` 太宽泛，保留为未来的上位命名空间，不现在使用。
剩下的是**文档链**：

| 选项 | 做法 | 优点 | 代价 |
|---|---|---|---|
| A 收窄链 | `business-software`；链改 `MRD/StRS/PRD` | 进入现有 checker；和硬软共脊柱；最小语义修复 | 要重写 overview/glossary/manifest/tests；SaaS 词表降为子类 |
| B 保留 SaaS 链 | `business-software`；链仍 `ROADMAP/US/RELEASE` | 保留现有 SaaS 文档习惯 | 仍进不了两条 checker；名不副实；不推荐 |
| C 主链 + SaaS 交付附录 | 主链 `MRD/StRS/PRD`；SaaS 的 roadmap/release 作为交付模式附录，不进 `/req check` | 兼顾 SaaS 交付语义与机械检查 | 要定附录边界，避免第二套编号；复杂度中 |
| D 只改名 | `business-software`；链不动 | 改动最小 | 与 B 同类问题；不推荐 |

**建议 A**；如果 SaaS 交付文档确实要保留，选 C（附录不算需求层，不立 REQ/IF/TC）。

**SaaS 怎么办**：把 `saas` 作为 `business-software/overview.md` 的交付模式小节；`check-rules` 不再为它
单独开链。若将来 SaaS 需要独立的验收指标（激活/留存/SLO），可在 `meta.md` 加 `交付模式: saas`，
由角色 playbook/模板消费，而不是再开一个 productType。

## 6. 未决问题

1. `business-software` 的 `check-rules` 是否只到 PRD，还是允许 `需求层: StRS` 等裁剪？默认建议到 PRD。
2. `project-services` 是否本轮补第三个类型，还是等真实服务动议出现再补？
3. `meta.md` 的 `产品类型` 是必填还是可选（缺省回落）？建议可选 + 回落，避免旧动议红。
4. 纯软是否需要独立的 `document-map.md`/`requirements-model.md`，还是复用共享模板 + 一份短 overview？
5. `/prd check` 是否也要读 `产品类型`（当前它只认 MRD/PRD，两种类型都可以不读；但未来项目制可能不同）。
6. 旧 `b2b-saas` 部署的迁移：保留 alias，还是启动时报错提示改名？

## 7. 证据与边界

- 本材料只读：`content/product-types/*`、`content/templates/*`、`product-definition` skill、
  `req-command.ts`、`prd-command.ts`、`requirements-check.ts`、`company-identity.ts`、tests。
- 没有跑 `/req check` / `/prd check` 真命令，也没有真模型；结论来自静态代码/内容。
- 没验证 `b2b-saas` 动议在真实会话里的行为；若需要，开 issue 后跑一次 keyless fixture + 一次真会话。
