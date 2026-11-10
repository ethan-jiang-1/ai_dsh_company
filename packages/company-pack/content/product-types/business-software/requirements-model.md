# 产品文档链与编号合同（business-software）

> **编号合同唯一家**：哪一层由谁写、编号怎么排、怎么追溯、机器怎么判红。
> 编制 / 人 / 格式各有其家（org / owners / templates）；ID 只承载身份（种类 + 序号）。

## 三层与 owner

| 序 | 层 | 回答什么 | owner | 文件 | `definition` | 编号 |
|---|---|---|---|---|---|---|
| 1 | **MRD** 市场需求 | 该不该做、为谁做、凭什么赢 | CMO | `drafts/mrd.md` | `json-ledger` | `MR-###` |
| 2 | **StRS** 涉众需求 | 谁在乎、在乎什么、验收时谁点头 | CMO | `drafts/strs.md` | `headings` | `REQ-###` |
| 3 | **PRD** 产品需求 | 我们卖的到底是什么产品、怎么验收、怎么切片 | VP-Eng | `drafts/prd.md` | `json-ledger` | `REQ-###` / `AC-###-#` |

**没有 SyRS / IRS / V&V**。接口、系统边界、部署形态作为 PRD 的技术约束/风险写；若动议需要独立系统层，
改用 `hardware-software`。

## 编号规则

- 号形 `MR-###` / `REQ-###` / `AC-<REQ号>-<n>`；四种 append-only，动议内全局唯一。
- `REQ` 是**任一层**的号：StRS/PRD 共一条序列；号由 owner 登记条目时取 `max+1`。
- 层归文档头，状态归条目；旧前缀（`STR/SYR/IFR/VR/VP/V`）已退役，出现即红。
- 追溯：StRS → `traces: [MR-###]`；PRD → `source: [MR-###]` + `traces: [REQ-###]`（StRS）。
  缺上游 = 孤儿红；指向不存在的号 = 悬空红。
- 计数由索引派生；不写「N 条」区间断言；不收 `NFR` token，用 `kind: NFR` 字段。
- `/prd check` / `/req check` 都是操作员命令；角色只引用结果，不自己宣布通过。

## 与 hard-software 的边界

- 本类型不声明 SyRS/IRS/V&V；`check-rules.json` 的层只有 MRD/StRS/PRD。
- 一旦动议出现现场硬件、固件、电气/机械件、认证或独立验证计划，产品类型应改为
  `hardware-software`；不要在本类型里追加系统层。
