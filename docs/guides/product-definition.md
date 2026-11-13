# 产品定义：MRD → StRS → PRD（新产品立项的交接与质量闸门）

> 什么时候读：新产品/新功能动议、写 MRD/StRS/PRD、或要校验结构时。
> 角色语义 = [presets.md](../contracts/presets.md)；公司级规矩 = [content/AGENTS.md](../../packages/company-pack/content/AGENTS.md)；
> 模板 = `content/templates/`；编号合同 = `content/product-types/<id>/requirements-model.md`；共享打法 = `presets/_shared/skills/product-definition/`。

## 谁做什么

- **CEO**：按问题选人（默认 **CMO + VP-Eng**；要外部事实才加 worker-researcher）；建 DAG；收口 `present`。
  **不默认叫全员**——动议没问的域不进屋（见 CEO skill `assembling-the-team`）。
- **CMO**：市场机会 → **MRD**（`drafts/mrd.md`，`MR-###`）；涉众诉求 → **StRS**（`drafts/strs.md`，`REQ-###`，证据标[fact/assumption]）。
- **VP-Eng**：接 MRD/StRS → **PRD**（`drafts/prd.md`，`REQ-###`、验收 `AC-###-#`、slice）。
- **VP-Sales / COO / CFO**：只有动议明确问到现有客户定价 / 交付承接 / 预算毛利才进屋。

## 交接（一条 DAG）

```text
CEO 建任务：CMO「市场机会与 MRD」→ drafts/mrd.md
        └─> VP-Eng「PRD」blockedBy CMO 任务；任务书写 MRD 路径
VP-Eng 写 drafts/prd.md；CMO 回看 PRD 的市场假设；VP-Eng 回看 MRD 的可行性
CEO 收口：final.md（产品决策/合并摘要，引用两份 draft）→ present
```

## 产物结构

- **MRD**：`json` 头（`mrd.opportunities[]` + `openQuestions`）+ 正文一页纸；`definition: json-ledger`。
- **StRS（及按需的 SyRS / IRS）**：`layer` + `definition: headings` 头 + `### <ID>` 条目（字段 = 合同「条目形态」）。
- **PRD**：`layer` + `definition: headings` 头；**每个 `### REQ-###` 小节是唯一定义点**（字段行：`userStory` / `acceptance` / `source` / `traces` / `slice` / `type` / `priority` / `status` / `verification` / `dependsOn` / `changeLog`），摘要与 Slices 表只引用号。旧动议的 `json-ledger` 只读兼容。
- 编号**只增不改**：`MR-###`、`REQ-###`、`IF-###`、`TC-###`、`AC-###-#`；撤销用状态，不重排、不复用。

## 编号与追溯（操作面；合同 = process-docs）

- 新动议：`meta.md` 写 `编号体系: identity`（可选 `需求层:` 声明本轮到哪层）；不写 = 旧动议只读豁免。
- 状态：草案 / 生效 / 作废；PRD 生命周期按合同映射（`draft`→草案，`ready`/`in-dev`/`accepted`→生效，`withdrawn`→作废）。
- 追溯：下游写行首 `traces:` / `covers:`；缺上游 = 孤儿红，指向空号 = 悬空红；矩阵由索引派生，不手写。
- 计数：由索引派生，不写「N 条」区间断言；发布/收口引用 `/req check` 输出的计数。

## 质量闸门

`/prd check <deliverables 目录名>`（host 命令，随 pack 发布）读 `drafts/{mrd,prd}.md`，机械校验：

- 编号唯一/格式合法；每条 REQ 至少一条 AC（given/when/then 齐全）；Slices 表列显式 REQ id（不用区间）；`type` ∈ functional/non-functional/constraint、`verification` ∈ test/demonstration/analysis/inspection；
- REQ 的来源 `MR-###` 必须在 MRD 里存在，且**来源判词守边界**（no-go 不得进 PRD；defer 不得进 P0）；slice 存在且列出该 REQ；依赖存在且无环；
- 状态合法、离开 `draft` 有 changeLog。

`/req check <deliverables 目录名>` 管**编号/层/追溯/退役词/计数**（默认链 + 可选层，含 StRS/SyRS/IRS/TC）；`/delivery check` 管交付模式文档（project-services / managed-service 按 rules 查文档与 section）；两者都是操作员命令，角色只能引用结果。**交付闸门**：`present` 前 host 对声明了 `numbering: identity` 的动议跑同一套 `/prd check`；红则拒绝交付（旧动议按编号标记豁免）。

它只挡结构性错误，**不判断需求好坏/市场真伪**；红就退回作者改，不进研发。

## 产品类型 playbook

先判断这次是哪种产品（决定 MRD/PRD 多出哪些字段）；**类型与 playbook 的唯一表** = 共享 skill 的「产品类型 → playbook」，可选值 = pack `content/product-types/<id>/` 的目录。
**第二轴 = 交付模式**（`meta.md` 的 `交付模式`）：`productized`（默认）/ `project-services`（SOW/UAT/驻场）/ `managed-service`（持续 SLA/值班/月报/续费）；它不是产品类型，规则与模板 = `content/delivery-modes/<id>/`，组合示例 `business-software × project-services`。新类型按同结构新增并随包发布，不改公共字段。**类型看动议**：`meta.md` 的 `产品类型` 优先，缺省回落 `company.md` 的 `productType`（回执会点名来源）；用户口头声明优先于默认，并写进 meta。
## 最小场景（3 人，不叫全员）

CEO 收到"要不要做对账产品" → 只叫 CMO + VP-Eng：
CMO 出 `drafts/mrd.md`（`MR-001`，go/no-go）→ VP-Eng 出 `drafts/prd.md`（S1 最小端到端）→
`/prd check` 绿 → CEO `present` 产品决策。VP-Sales/COO/CFO 不进屋（除非动议问到定价/交付/预算）。
