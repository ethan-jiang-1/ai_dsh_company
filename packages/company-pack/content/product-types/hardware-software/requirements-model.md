# 产品文档链与编号合同（hardware-software）

> **编号合同唯一家**：哪一层由谁写、编号怎么排、怎么追溯、机器怎么判红。
> 编制 / 人 / 格式各有其家（org / owners / templates）；ID 只承载身份（种类 + 序号）。

## 五层与 owner

| 序 | 层 | 回答什么 | owner | 文件 | `definition` | 编号 |
|---|---|---|---|---|---|---|
| 1 | **MRD** 市场需求 | 该不该做、为谁做、凭什么赢 | CMO | `drafts/mrd.md` | `json-ledger` | `MR-###` |
| 2 | **StRS** 涉众需求 | 谁在乎、在乎什么、验收时谁点头 | CMO | `drafts/strs.md` | `headings` | `REQ-###` |
| 3 | **PRD** 产品需求 | 我们卖的到底是什么产品 | VP-Eng | `drafts/prd.md` | `json-ledger` | `REQ-###` / `AC-###-#` |
| 4 | **SyRS** 系统需求 | 系统作为黑盒必须满足什么、每条怎么验 | <assigned> | `drafts/syrs.md` | `headings` | `REQ-###` |
| 5 | **IRS** 接口需求 | 跨边界的接口长什么样 | <assigned> | `drafts/irs.md` | `headings` | `IF-###` |
| — | 分配附录 | 需求落到子系统 / 采购件 | <assigned> | IRS 附录 `allocation.md` | `none` | 不立号 |
| **V&V** 验证计划 | 怎么验证、谁执行 | <assigned> | `drafts/vv-plan.md` | `table-rows` | `TC-###` |

**默认链**：MRD → StRS → PRD。SyRS / IRS / V&V 是可选层，由 CEO 指派 owner 才做；做了仍按原顺序，下游不替上游做决定。
`final.md`、评审稿、任务书**不声明 `layer`**——它们只是引用面，不定义任何号。

## 编号规则（R1–R10）

| # | 规则 | 形态 |
|---|---|---|
| R1 | **身份** | `<KIND>-<NNN>`，`KIND ∈ {MR, REQ, IF, TC}`；四种各自一条 append-only 序列，**动议内全局唯一**；号只在 owner 登记条目时分配（索引取 max+1），提案方不预先发号 |
| R2 | **从属** | `AC-<REQ号>-<n>`；父号必须是存在的 REQ |
| R3 | **层** | 不进 ID；一份文档一层；文档头声明 `layer` 与 `definition` |
| R4 | **定义** | 只在声明的形态里成立（`json-ledger` / `headings` / `table-rows` / `none`）；正文出现 = 引用；一个号只能有一个定义点 |
| R5 | **状态** | 不进 ID；定义点上带状态（草案 / 生效 / 作废）；「建议新增」= 草案，ID 不变；作废留号，不复用 |
| R6 | **引用** | 本文档内裸 ID；跨动议 `<动议键>:<ID>`——v1 **未支持**：遇到冒号引用只标「未支持」，不解析、不判红 |
| R7 | **追溯** | 下游写行首字段（`traces:` / `covers:`）；索引与矩阵由 `/req check` 派生，不手写；缺上游、缺层 = 红 |
| R8 | **计数** | 由索引派生；作者不写死「N 条」；禁 `X-001~X-021 共 N 条` 式区间断言 |
| R9 | **词表** | 唯一权威；退役词见「退役词」节，出现即红；`NFR` 不作 token（用 `kind: NFR` 字段） |
| R10 | **强制点** | `/req check <deliverables 目录名>` 是**操作员命令**；角色不得在会话里自查自证 |

## 文档头

```yaml
---
layer: SyRS
definition: headings
---
```

- `layer` ∈ `MRD / StRS / PRD / SyRS / IRS`（验证计划另用 `V&V`）；`definition` 见上表。
- `V&V` 计划的表头必须带 `covers` 列（值 = `REQ-###` / `IF-###`），checker 按表头取覆盖。
- 文件名只是约定，**机器只认头**：同一份 IR 的摘要表 + 正文标题两种形态并存时，按声明的形态取定义，另一种算引用。
- 头缺失或被改：checker 报「缺层声明」，不猜。

## 条目形态与字段

- `json-ledger`：JSON 数组元素里的 `id` 是定义点；正文标题写成「需求说明：REQ-001」这类**引用**。
- `headings`：`### REQ-041` / `#### IF-014` 标题是定义点，紧随字段行：`kind:` / `status:` / `owner:` / `verifier:` / `traces:` / `covers:`。
- `table-rows`：表格首格 `<ID>` 是定义点；同一文档里的摘要表是引用表。
- 字段一律按**行首标签**解析（`- traces:` / `traces:`）——正文里「可追溯性」之类的散文不是字段。

## 追溯

- 下游写上游：StRS → `traces: [MR-###]`；PRD → `source: [MR-###]` + `traces: [REQ-###]`（StRS）；SyRS → `traces: [REQ-###]`（PRD）；IRS → `traces: [REQ-###]`（SyRS）；TC → `covers: [REQ-### / IF-###]`。
- 没写的边 = **孤儿**（红）；指向不存在的号 = **悬空**（红）。
- 矩阵由索引派生；不手写追溯表，不从正文聚集（聚集得到的是提及图，会造出像真的错边）。

## 状态

- 条目状态 = **草案 / 生效 / 作废**，写不进 ID。
- PRD 生命周期映射：`draft`→草案；`ready` / `in-dev` / `accepted`→生效；`deferred`→草案（不生效）；`withdrawn`→作废。
- 草案不计入「生效条数」；作废保留号。

## 范围与豁免

- 新动议在 `meta.md` 写 `编号体系: identity` 才进入编号检查；可另写 `需求层:` 声明本轮要到哪层，缺层按声明判红。
- 没有 `编号体系:` 标记的旧动议 = **只读豁免**：不回溯判红，checker 记 `skipped`。
- 豁免必须显式（marker 在场）、可复核；不得静默空过。

## 并发

- 号由 owner 登记条目时取 `max + 1`；Lead 串行分配，保持单写者。
- 两个会话同时写会撞号——**撞号 = 红**；v1 不加锁，靠撞号红兜底，并把「可能撞号」写进交付物待办。

## 校验

- `/prd check <目录>`：MRD/PRD 结构（no-go/defer 边界、AC、changeLog）。
- `/req check <目录>`：编号 / 层 / 追溯 / 退役词 / 计数，输出通过或失败 + 计数 + 派生索引。
- 两者都是操作员命令；角色只能引用结果，不能自己宣布通过。

## 退役词

- `STR-###` / `SYR-###` / `IFR-###`（旧层前缀）→ 层归文档头，条目用 `REQ-###` / `IF-###` 表达。
- `VP-###`（旧验证点前缀）→ 用 `TC-###` + `covers:`；SA 只列验证点引用，不发号。
- `V-###` / `VR-###`（旧验证 / 验证结果前缀）→ `TC-###`；旧动议按「范围与豁免」只读，不回溯改历史。
- 角色名 `VP-Eng` 不是编号词，不在此列。
