---
layer: StRS
definition: headings
---

# StRS（涉众需求 · 谁在乎、在乎什么、验收时谁点头）

> 主笔 = **CMO**；输入 = 同目录 `drafts/mrd.md`；落 `drafts/strs.md`。
> 回答"谁在乎、在乎什么、验收时谁点头"；**不写口径与阈值**（那是 PRD/SyRS），**不写定价**（归 VP-Sales/CFO）。
> 定义点 = `### REQ-###` 标题（`definition: headings`）；正文里出现的号是引用；每条必须带行首 `traces: [MR-###]`。

## 一分钟摘要

<结论 ≤3 条：几条涉众诉求、哪条最有争议、下一步>

### REQ-001 <一句话涉众诉求>

- kind: FR
- status: 草案
- owner: cmo
- verifier: <谁点头——客户 / 法务 / 交付>
- traces: [MR-001]
- 诉求：…
- 验收方式：<谁、怎么算满足；不写精度等级>
- 优先级：P0

## 覆盖与缺口

- 每条 MR 至少被一条 REQ 兑现；故意不覆盖的写明理由。
- 未决（谁拍板、缺什么证据）：…
