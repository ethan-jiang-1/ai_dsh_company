---
status: 调研中
opened: 2026-11-07
---

# 需求编号与多层需求文档：AI 时代该怎么编、编几套

> 问题：**多层需求文档是既定前提**（MRD→StRS→PRD→SyRS→IRS），SW/FW 已用 **OpenSpec** 作为实践、
> 且 OpenSpec 可自定义能承载我们的编号。剩下要答的是：**前缀集合编几套、与 OpenSpec 的接缝怎么落、
> 什么来守它**。
> 消费者：用户 2026-11-07 直接提出（CMO 产 MRD 需 StRS、VP-Eng 产 PRD 需 SyRS+IRS）；本仓
> [SA/SQA 子人格落地 Note](../../../notes/implemented/2026-11-06-sa-sqa-subpersonas.md) 与
> [成品评审材料](../sa-sqa-product-review/README.md) 是背景证据。
> 产出的卡：—
> 结论：（调研中；**已明确一件事：实施全部回滚，本阶段只推敲**）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-07-numbering-deliberation.md](2026-11-07-numbering-deliberation.md) | 第一轮：用户决策、失败证据、三家 AI 工具做法、硬软一体四约束、回滚清单与开放问题 | 2026-11-07 |
| [2026-11-07-openspec-seam.md](2026-11-07-openspec-seam.md) | 第二轮：三前提已定下的接缝设计（主键/外键、三种落法）、6 套 vs 3 套方案对比、剩 4 个未定问题 | 2026-11-07 |

## 当前状态（一句话）

前提已定三条（多层文档要、SW/FW 用 OpenSpec、OpenSpec 能承载编号）；待拍的是
**6 套还是 3 套前缀**、NFR 怎么防漏、检查器放哪、适用范围。此前实现**已全部 git reset 撤回**，只留材料。
