# 产品定义：MRD → PRD（新产品立项的交接与质量闸门）

> 什么时候读：新产品/新功能动议、写 MRD/PRD、或要校验 PRD 结构时。
> 角色语义 = [presets.md](../presets.md)；公司级规矩 = [content/AGENTS.md](../../packages/company-pack/content/AGENTS.md)；
> 模板 = `content/templates/mrd.md` / `prd.md`；共享打法 = `presets/_shared/skills/product-definition/`。

## 谁做什么

- **CEO**：按问题选人（默认 **CMO + VP-Eng**；要外部事实才加 researcher）；建 DAG；收口 `present`。
  **不默认叫全员**——动议没问的域不进屋（见 CEO skill `assembling-the-team`）。
- **CMO**：市场机会 → **MRD**（`drafts/mrd.md`，机会编号 `MR-###`，证据标【事实/假设】）。
- **VP-Eng**：接 MRD → **PRD**（`drafts/prd.md`，需求 `REQ-###`、验收 `AC-###-#`、slice）。
- **VP-Sales / COO / CFO**：只有动议明确问到现有客户定价 / 交付承接 / 预算毛利才进屋。

## 交接（一条 DAG）

```text
CEO 建任务：CMO「市场机会与 MRD」→ drafts/mrd.md
        └─> VP-Eng「PRD」blockedBy CMO 任务；任务书写 MRD 路径
VP-Eng 写 drafts/prd.md；CMO 回看 PRD 的市场假设；VP-Eng 回看 MRD 的可行性
CEO 收口：final.md（产品决策/合并摘要，引用两份 draft）→ present
```

## 产物结构

- **MRD**：`json` 头（`mrd.opportunities[]` + `openQuestions`）+ 正文一页纸。
- **PRD**：`json` 头（`prd.slices[]` + `prd.requirements[]`）+ 正文（范围/约束/风险/里程碑/逐 REQ 详述）。
- 编号**只增不改**：`MR-###`、`REQ-###`、`AC-###-#`；撤销用状态 `withdrawn`，不重排、不复用。
- 状态机：`draft → ready → in-dev → accepted`（旁路 `deferred / withdrawn`）；离开 `draft` 必须在
  `changeLog` 留痕。
- **DoR**（进研发前）：字段齐、AC 可判、来源可追、依赖已声明；**DoD**：全部 AC 验证 → `accepted`。
- **一 REQ 一任务**：任务板标题带 `REQ-###`，`blockedBy` 照 REQ 依赖；验收按 AC 号核。

## 质量闸门

`/prd check <deliverables 目录名>`（host 命令，随 pack 发布）读
`.dsh-company/deliverables/<目录名>/drafts/{mrd,prd}.md`，机械校验：

- 编号唯一/格式合法；每条 REQ 至少一条 AC（given/when/then 齐全）；
- REQ 的来源 `MR-###` 必须在 MRD 里存在，且**来源判词守边界**（no-go 不得进 PRD；defer 不得进 P0）；slice 存在且列出该 REQ；依赖存在且无环；
- 状态合法、离开 `draft` 有 changeLog。

它只挡结构性错误，**不判断需求好坏/市场真伪**；红就退回作者改，不进研发。

## 产品类型 playbook

先判断这次是哪种产品（决定 MRD/PRD 多出哪些字段），再读共享 skill 的 reference：

| 类型 | playbook |
|---|---|
| 项目制 / 系统集成 | `references/project-services.md`（SOW 边界、第三方依赖、UAT、实施里程碑） |
| 硬软一体产品 | `references/hardware-software.md`（BOM/供应链、认证、固件联动、试产与售后） |
| 新类型 | 按同结构新增 `references/<type>.md`；不改公共字段 |

## 最小场景（3 人，不叫全员）

CEO 收到"要不要做对账产品" → 只叫 CMO + VP-Eng：
CMO 出 `drafts/mrd.md`（`MR-001`，go/no-go）→ VP-Eng 出 `drafts/prd.md`（S1 最小端到端）→
`/prd check` 绿 → CEO `present` 产品决策。VP-Sales/COO/CFO 不进屋（除非动议问到定价/交付/预算）。
