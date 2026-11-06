---
status: 调研中
opened: 2026-11-07
---

# 需求编号与多层需求文档：AI 时代该怎么编、编几套

> 问题：硬软一体（HW/ME/FW/SW 四方协作）的公司，要不要多层需求文档（MRD→StRS→PRD→SyRS→IRS）？
> 每层要不要自己的编号前缀？编号怎么才守得住？还是说 AI 时代压根不用编号？
> 消费者：用户 2026-11-07 直接提出（CMO 产 MRD 需 StRS、VP-Eng 产 PRD 需 SyRS+IRS）；本仓
> [SA/SQA 子人格落地 Note](../../../notes/implemented/2026-11-06-sa-sqa-subpersonas.md) 与
> [成品评审材料](../sa-sqa-product-review/README.md) 是背景证据。
> 产出的卡：—
> 结论：（调研中；**已明确一件事：实施全部回滚，本阶段只推敲**）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-07-numbering-deliberation.md](2026-11-07-numbering-deliberation.md) | 全程推敲记录：用户决策、失败证据、三家 AI 工具做法、硬软一体四约束、回滚清单与开放问题 | 2026-11-07 |

## 当前状态（一句话）

编号必须留（用户判定），但**层数、前缀集合、要不要校验器、专业域怎么表达**四件事都还没定；
此前做过的实现（五层链进 pack、requirements-check、专业域字段）**已全部 git reset 撤回**，只留本材料。
