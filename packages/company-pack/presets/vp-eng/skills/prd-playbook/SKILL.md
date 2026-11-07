---
name: prd-playbook
description: VP-Eng 的 PRD 打法：接 CMO 的 MRD+StRS，产出产品层可追溯、可验收、可分解的需求账本（REQ/AC/slice，source→MR、traces→StRS），过 DoR/DoD，过 /prd check + /req check；先读共享 product-definition 脊柱与品类 playbook。
---
# PRD playbook（VP-Eng）

先加载 `product-definition`（脊柱 + 品类 playbook）。PRD 是**需求账本**，不是一篇文章：
研发按 slice 一批一批吃，每条 REQ 都能独立进任务板。

## 输入

- `deliverables/<slug>/drafts/mrd.md`（CMO 的市场机会，编号 `MR-###`）与 `drafts/strs.md`（CMO 的涉众需求，`REQ-###`）。
- `.dsh-company/kb/vp-eng/CHARTER.md`（技术栈、人力、成本口径）与公司事实。
- 品类 playbook（项目制/系统集成 或 硬软一体）——决定 PRD 多出哪些字段。

## 步骤

1. **对齐机会**：逐条读 MR 与 StRS；PRD 的每条 REQ 用 `source` 指回至少一个 MR id、用 `traces` 指回
   StRS 的 REQ。MR 不成立就退回 CMO，不在 PRD 里替它补市场结论。
2. **切最小端到端**：先定 S1（能演示/能验收的最小闭环），再排后续 slice；
   一条 REQ 只属于一个 slice。
3. **拆需求**：每条 REQ 一个可独立验收的粒度；依赖写成 REQ id；不把两个需求塞进一条。
4. **写验收**：每条 REQ 至少一条 AC，格式 given/when/then，能判真假；写不出事实的删掉。
5. **补约束**：非功能（性能/安全/兼容/可维护）、技术前提、外部依赖、里程碑。
6. **可行性**：>2 人周、跨系统、或依赖未定的条目，标"待核实"并写验证方式；不把猜测写成结论。
7. **过 DoR/DoD**：`draft → ready` 前字段齐、AC 可判、来源可追、依赖已声明；
   `accepted` 前全部 AC 验证。状态变化写 changeLog。
8. **机械校验**：`/prd check <slug>`；红就改，别绕过。

## PRD 产出

按 `<company-content>/templates/prd.md` 写，落 `deliverables/<slug>/drafts/prd.md`（`layer: PRD`、`definition: json-ledger`）。
- **JSON 账本是唯一定义点**：每个 REQ 的 `id`/`source`/`traces`/`acceptance` 都在账本里；正文小节标题是引用
  （「需求说明：REQ-###」），不得再以裸 ID 开头。
- 正文：概述、范围与非范围、约束、依赖与风险、里程碑、每个 REQ 的说明。
- 编号：REQ-###、AC-<REQ号>-<n>；只增不改号；撤销用状态（`withdrawn`→作废），不重排、不复用。
- 机械校验：`/prd check <slug>`（结构）+ `/req check <slug>`（编号/层/追溯）；红就改。

## 边界

- 不替 CMO 判断"有没有人买"；不替 VP-Sales 定价；不替 COO 承诺交付日期。
- **只写产品层**：SyRS/IRS 归 system_architect（SA）、V&V 归 system_qa（SQA）——不代笔、不预填。
- 技术不可行 / 成本失控 / 风险不可接受 → veto + 一句话理由；MRD 与 PRD 冲突时保留双方结论，
  交 CEO 拍板。
- PRD 通过后，研发按"一 REQ 一任务"进任务板；验收按 AC 号核，不按"感觉做完了"。
