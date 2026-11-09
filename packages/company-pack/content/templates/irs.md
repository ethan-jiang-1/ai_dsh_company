---
layer: IRS
definition: headings
---

# IRS（接口需求 · 跨边界的接口长什么样）

> 主笔 = **<assigned>**；输入 = 同目录 `drafts/syrs.md`；落 `drafts/irs.md`。
> 写**接口双方**（两端 owner）、类型、方向、格式与字段语义、频率与时限、异常与降级；**不写内部数据结构与算法**。
> 定义点 = `### IF-###` 标题（`definition: headings`）；每条必须带行首 `traces: [REQ-###]`（上游 SyRS）。
> 分配（需求落到子系统 / 采购件）见 `allocation.md` 附录——附录不立号。

## 一分钟摘要

<结论 ≤3 条：几个接口、哪个最脆、下一步>

### IF-001 <接口名>

- status: 草案
- owners: [firmware, electronics]
- traces: [REQ-003]
- 接口双方：<A 侧 / B 侧>
- 类型：数据 / 物理 / 人机 / 协议
- 方向：…
- 格式与字段语义：…
- 频率与时限：…
- 异常与降级：…
- 验证方法：…

## 覆盖与缺口

- 每条 SyR 至少被一条 IF 兑现或被验证覆盖；故意不覆盖的写明理由。
- 未决（谁拍板、缺什么证据）：…
