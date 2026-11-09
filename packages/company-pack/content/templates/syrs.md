---
layer: SyRS
definition: headings
---

# SyRS（系统需求 · 系统作为黑盒必须满足什么、每条怎么验）

> 主笔 = **<assigned>**；输入 = 同目录 `drafts/prd.md`；落 `drafts/syrs.md`。
> `shall` 句式、单一可验证、带验证方法与追溯；**不写设计**（模块划分 / 代码结构归架构稿）。
> 定义点 = `### REQ-###` 标题（`definition: headings`）；每条必须带行首 `traces: [REQ-###]`（上游 PRD）。

## 一分钟摘要

<结论 ≤3 条：几条系统需求、哪条最难验、下一步>

### REQ-003 <一句话系统需求>

- kind: FR
- status: 草案
- owner: <assigned>
- verifier: <assigned / 第三方实验室 / 客户现场>
- traces: [REQ-002]
- 需求（shall）：系统应当…
- 验证方法：测试 / 分析 / 演示 / 检验（可组合）
- 验证判据：<可测句；不能量化就标【假设】+ 验证方式>
- 理由：…

## 覆盖与缺口

- 每条 PRD REQ 至少被一条 SyR 兑现；故意不覆盖的写明理由。
- 未决（谁拍板、缺什么证据）：…
