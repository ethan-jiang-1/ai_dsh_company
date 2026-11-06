---
status: 调研中
opened: 2026-11-07
---

# 需求编号与多层需求文档：AI 时代该怎么编、编几套

> 问题：**多层需求文档是既定前提**（MRD→StRS→PRD→SyRS→IRS），SW/FW 已用 **OpenSpec** 作为实践、
> 且 OpenSpec 可自定义能承载我们的编号。剩下要答的是：**前缀集合编几套、与 OpenSpec 的接缝怎么落、
> 什么来守它**。
> 场景（2026-11-07 用户口述）：**硬软一体、多 discipline**（SW / FW / EE / ME / 系统测试等），不是纯软件开发；
> 目前 **SW/FW 已用 OpenSpec**，原研发体系**没有很清晰的需求文档规范**；拟走 **MRD→PRD→StRS→SyRS→IRS**；
> **人的 review 需要文档**，**IRS 是候选检查点**。最终要答：**这套体系用什么前缀编号，人和 Agent 都容易**；
> Agent 不能困惑。
> 读者：下一个接手的 Agent——先读第三份材料的 §1.5/§1.6 理解问题，再补空间、生成多个候选方案；**不要提前选**。
> 消费者：用户 2026-11-07 直接提出（CMO 产 MRD 需 StRS、VP-Eng 产 PRD 需 SyRS+IRS）；本仓
> [SA/SQA 子人格落地 Note](../../../notes/implemented/2026-11-06-sa-sqa-subpersonas.md) 与
> [成品评审材料](../sa-sqa-product-review/README.md) 是背景证据。
> **2026-11-07 追加硬前提**：第一消费者是 **Agent**——判据不是"人读得懂"，而是"Agent 不可能读错、
> 没有判断题、机器能判红"；prefix 必须第一眼就对。研究只铺空间，不急着下结论。
> 产出的卡：—
> 本阶段只做问题澄清、探索空间与约束环境；**不写结论、不选方案**（多个候选可以并存）。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-07-numbering-deliberation.md](2026-11-07-numbering-deliberation.md) | 第一轮：用户决策、失败证据、三家 AI 工具做法、硬软一体四约束、回滚清单与开放问题 | 2026-11-07 |
| [2026-11-07-openspec-seam.md](2026-11-07-openspec-seam.md) | 第二轮：接缝候选（主键/外键三种、三种落法、候选组合）、6 套 vs 3 套两条路线并列、仍未定的问题；**不选方向** | 2026-11-07 |
| [2026-11-07-agent-first-numbering.md](2026-11-07-agent-first-numbering.md) | 第三轮：给下一个 Agent 的问题理解 brief——场景 capture（硬软一体/多 discipline/OpenSpec 现状/人的 review/IRS 检查点）、证据反转（21 vs 23）、两套规则并存、16 个设计维度、12 个场景用例、8 个方案族、验证计划；**不选方案** | 2026-11-07 |

## 当前状态（一句话）

前提已定三条（多层文档要、SW/FW 用 OpenSpec、OpenSpec 能承载编号）；第三份材料把「第一消费者是 Agent」
立为硬前提，并 capture 了硬软一体/多 discipline/人的 review/IRS 检查点的场景，铺开 16 个设计维度、
12 个场景用例、8 个并列方案族（含证据反转：v5 的 23 是建议新增，不是已定义）。
**空间尚未探索完，不选方案、不定前缀**；此前实现**已全部 git reset 撤回**，只留材料。
