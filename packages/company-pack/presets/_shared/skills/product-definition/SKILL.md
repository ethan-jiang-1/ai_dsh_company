---
name: product-definition
description: 产品定义脊柱（CMO 与 VP-Eng 共用）：把市场机会变成可追溯、可验收、可分解的需求账本；按产品类型选 playbook；产出 MRD+StRS（CMO）与 PRD（VP-Eng）。
---
# 产品定义（共同能力）

新产品、新功能、新市场机会的立项与定义都用它。它只有一条脊柱；**产品类型决定 playbook**，
MRD / PRD 是这条脊柱的两种产物，不是两套模板。

## 什么时候用

- CMO：探索市场机会、判断"该不该做/做什么/为谁做"，写 MRD + StRS。
- VP-Eng：接住 MRD，写可研发、可验收的 PRD。
- CEO：新产品动议的组队与收口（默认只叫 CMO + VP-Eng；见 CEO 的 `assembling-the-team`）。

## 脊柱（七步，两类产物共用）

1. **问题/机会**：谁在什么场景下、因为什么限制而过不好？证据标【事实/假设】。
2. **用户与场景**：买单人、使用者、决策链；现在怎么凑合（不做的代价）。
3. **价值**：为什么是我们、凭什么赢；替代方案与竞品。
4. **成功判据**：可观测的业务结果（不是功能清单）。
5. **范围与非范围**：这一版做什么、明确不做什么。
6. **需求与验收**：每个需求一条编号、一组可判真假的验收标准。
7. **风险与未决**：最可能翻车的一件事 + 兜底；未决项单列，不许当结论用。

## 产品类型 × 交付模式（两轴）

先判断这次**造什么**、**怎么交付**，再读对应内容包。**类型看动议户口**：
`.dsh-company/deliverables/<slug>/meta.md` 的 `产品类型` 优先；没写才回落 `company.md` 的 `productType`；
用户口头声明与默认不一致时，以用户声明为准并写进 meta（别只记在对话里）。

**第一轴：产品类型（造什么）**

| 类型 | playbook | 典型问题 |
|---|---|---|
| 硬软一体产品 | `references/hardware-software.md` | BOM/供应链、认证、固件与软件联动、试产与售后 |
| 纯软 / 企业软件 | `references/business-software.md` | 交付模式（SaaS/私有化/永久）、升级/回滚、激活/留存/SLO、数据边界 |
| 新类型 | 还没有 → 按同结构新增 `content/product-types/<id>/`（**随包发布**；workspace 覆盖暂不支持）；**不要**把新类型塞进旧 playbook | 先写一页"这个类型多了哪几个字段/风险" |

**能力前置**：`hardware-software` 进入 PRD / 报价前先过 `content/product-types/hardware-software/capabilities.md`；
缺席位（硬件/固件/电气/机械/认证/供应链/试产/现场）报缺，不进入报价/对外承诺。

**可选值只有一处**：`content/product-types/<id>/` 下的类型包；上表与它一一对应。

**第二轴：交付模式（怎么交付）**——写在 `meta.md` 的 `交付模式`；不写 = `productized`。
**它不是产品类型，不要写进 `产品类型`。** 规则、文档映射与模板 = `content/delivery-modes/<id>/`：

| 交付模式 | 触发 | 追加文档 |
|---|---|---|
| `productized` | 标准产品售卖；无 SOW/UAT/SLA | 无 |
| `project-services` | SOW / UAT / 驻场 / 里程碑验收 | SOW / UAT / RACI / 里程碑 |
| `managed-service` | 持续 SLA / 值班 / 月报 / 续费 | SLA / 服务目录 / Runbook / 事件 / 月报 / 续约 |

动议组合示例：`产品类型: business-software` + `交付模式: project-services`——需求链仍走
business-software 的 MRD→StRS→PRD，另加 SOW/UAT/RACI/里程碑，不改需求层。

**生长方式**：pack 里的 playbook 随版本走；角色自己的打法（本行业话术、评估量表）经培养采纳进
`<DSH_HOME>/company/methods/<role>/`，不要改共享 playbook 的公共字段。

## 编号与层（合同 = pack `content/product-types/<id>/requirements-model.md`，`<id>` = `productType`）

- 号只承载身份：`MR-###`（市场机会）/ `REQ-###`（需求，**任一层**）/ `IF-###`（接口）/ `TC-###`（验证）；
  `AC-<REQ号>-<n>` 从属父 REQ。四种各自一条 append-only 序列，动议内全局唯一；号由 owner 登记时取 `max+1`。
- 层归文档头：每份需求文档写 `layer`（MRD/StRS/PRD/SyRS/IRS）+ `definition`
  （`json-ledger` / `headings` / `table-rows` / `none`）；层不进号，一份文档一层。
  `business-software` 只到 PRD，不写 SyRS/IRS/V&V；`hardware-software` 可按需扩系统层。
- 状态归条目：草案 / 生效 / 作废；「建议新增」= 草案，ID 不变；作废留号，不复用。
- 追溯：下游写行首 `traces:`（PRD 另写 `source:` 指 MR）；矩阵由 `/req check` 派生，不手写；
  缺上游 = 孤儿红，指向不存在的号 = 悬空红。
- 计数由索引派生，不写「N 条」区间断言。旧层前缀（`STR/SYR/IFR`）与旧验证前缀（`VP/V/VR`）已退役，出现即红。
- 每条 REQ 必带：来源、slice、优先级、状态、可判真假的 AC、依赖、验证方式。
- 切片（slice）：先给**最小端到端**（S1）；一条 REQ 只属于一个 slice。
- 状态机：`draft → ready → in-dev → accepted`（旁路 `deferred / withdrawn`）。
  `ready` 前过 DoR：字段齐、AC 可判、来源可追、依赖已声明；`accepted` 前过 DoD：全部 AC 验证。
- **一 REQ 一任务**：进研发任务板时标题带 `REQ-###`，`blockedBy` 照 REQ 依赖；验收按 AC 号核。
- 质量闸门：`/prd check <slug>` 管 MRD/PRD 结构；`/req check <slug>` 管编号/层/追溯/退役词/计数
  （操作员命令，角色不自证）。它不替代判断，只挡结构性错误。

## 三种产物

- **MRD（CMO 主笔）**：机会编号、细分与买单人、现有替代、竞品、买点、规模【事实/假设】、
  成功判据、go/no-go 建议。落 `deliverables/<slug>/drafts/mrd.md`（`layer: MRD`、`definition: json-ledger`）。
- **StRS（CMO 主笔）**：涉众诉求——谁在乎、在乎什么、验收时谁点头；每条 `REQ-###` 带
  `traces: [MR-###]`。落 `deliverables/<slug>/drafts/strs.md`（`layer: StRS`、`definition: headings`）。
- **PRD（VP-Eng 主笔）**：产品层需求账本、验收、技术约束、可行性与里程碑；落
  `deliverables/<slug>/drafts/prd.md`（`layer: PRD`、`definition: json-ledger`）；每条 REQ 用
  `source` 指回 MR、`traces` 指回 StRS 的 REQ。下游系统/接口/验证文档若由 CEO 指派他人主笔，不越权代笔。

## 边界与反模式

- 不写"功能清单"冒充需求；不写无法验收的形容词；不写没有来源的需求；不在 `ready` 后静默改范围。
- CMO 不替研发定技术方案；VP-Eng 不替市场判断"有没有人买"；定价归 VP-Sales，交付归 COO，
  预算/毛利归 CFO。
- 分歧保留：MRD 的市场假设与 PRD 的可行性冲突时，写明双方结论与证据，交 CEO 拍板。
