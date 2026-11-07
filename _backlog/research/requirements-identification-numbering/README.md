---
status: 调研中
opened: 2026-11-07
---

# 需求识别与编号：硬软一体场景下的多层需求文档

> 问题：在硬软一体、多 discipline 的研发体系里，SW/FW 已用 **OpenSpec**，原研发体系的需求文档规范不清；
> 要补 **MRD→PRD→StRS→SyRS→IRS** 的文档链，并要求一套需求识别/编号机制，让**人和 Agent 都能第一眼正确理解、
> 跨文档/跨组织可解析**，且 Agent 不困惑。
> 目标（研究）：把这个问题整理到**可拍板**的程度——说清它要服务的目的与约束、列出候选识别机制、
> 给出能区分它们的证据与测试；**本阶段不选**。完成判据 = 一个没参与讨论的人/Agent 读完能复述问题、
> 复现候选、指出还缺什么证据。
> 决策问题（后面才答）：这套体系用什么识别/编号机制（**前缀只是候选形态之一**），使人和 Agent 都能
> 第一眼正确理解、跨文档/跨组织可解析、且不违反已拍约束。
> 非目标：不实现、不迁移、不改 pack、不替用户选、不设计完整研发流程、不替换 OpenSpec。
> 场景（2026-11-07 用户口述）：**硬软一体、多 discipline**（SW / FW / EE / ME / 系统测试等），不是纯软件开发；
> 目前 **SW/FW 已用 OpenSpec**，原研发体系**没有很清晰的需求文档规范**；拟走 **MRD→PRD→StRS→SyRS→IRS**；
> **人的 review 需要文档**，**IRS 是候选检查点**。最终要答：**这套体系用什么识别/编号机制（前缀是核心落点之一）**，
> 人和 Agent 都容易；Agent 不能困惑。
> 读者：下一个接手的 Agent——先读 [当前 brief](2026-11-07-current-brief.md)，再按 space → candidates →
> validation → evidence 走；**不要提前选**。
> 消费者：用户 2026-11-07 直接提出（CMO 产 MRD 需 StRS、VP-Eng 产 PRD 需 SyRS+IRS）；本仓
> [SA/SQA 子人格落地 Note](../../../notes/implemented/2026-11-06-sa-sqa-subpersonas.md) 与
> [成品评审材料](../sa-sqa-product-review/README.md) 是背景证据。
> **2026-11-07 追加硬前提**：第一消费者是 **Agent**——判据不是"人读得懂"，而是"Agent 不可能读错、
> 没有判断题、机器能判红"；prefix 必须第一眼就对。研究只铺空间，不急着下结论。
> 产出的卡：—
> 本阶段只做问题澄清、探索空间与约束环境；**不写结论、不选方案**（多个候选可以并存）。

## 阅读顺序

1. [2026-11-07-current-brief.md](2026-11-07-current-brief.md) — 问题、场景、约束、用户已拍、未说清单（**唯一入口**）。
2. [2026-11-07-space.md](2026-11-07-space.md) — 16 个设计维度、12 个场景用例、先验风险、硬约束、27 个待探索问题。
3. [2026-11-07-candidates.md](2026-11-07-candidates.md) — S1–S8 方案族、H1–H8 假说、评估维度；不排名。
4. [2026-11-07-validation.md](2026-11-07-validation.md) — V1–V16 测试与下一步；不预设优先级。
5. [2026-11-07-evidence.md](2026-11-07-evidence.md) — 盘面事实、21 vs 23 反转、两套规则、复核命令。
6. [`history/`](history/) — 三份轮次材料冻结快照（不再更新，只作 provenance）。

> **节号地图**：本目录沿用 2026-11-07 第三份材料的全局节号；一份文件只包含其中一部分节，跨文件按 § 号查找。
> `current-brief` = §0.5 / §1 / §1.5 / §1.6 / §2 / §8.5；`evidence` = §3 / §10；`space` = §4 / §5 / §7 / §8；
> `candidates` = §6；`validation` = §9 / §11。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-07-current-brief.md](2026-11-07-current-brief.md) | 当前 brief：问题、场景、约束、用户已拍、未说清单；唯一入口 | 2026-11-07 |
| [2026-11-07-space.md](2026-11-07-space.md) | 探索空间：16 个设计维度、12 个场景用例、先验风险、硬约束、27 个待探索问题 | 2026-11-07 |
| [2026-11-07-candidates.md](2026-11-07-candidates.md) | 候选方案族 S1–S8、假说 H1–H8、评估维度；不排名 | 2026-11-07 |
| [2026-11-07-validation.md](2026-11-07-validation.md) | 验证计划 V1–V16 与下一步 | 2026-11-07 |
| [2026-11-07-evidence.md](2026-11-07-evidence.md) | 证据审计：盘面事实、21 vs 23 反转、两套规则、复核命令 | 2026-11-07 |
| [history/](history/) | 轮次快照（冻结，不再更新）：[第一轮](history/2026-11-07-numbering-deliberation.md) / [第二轮](history/2026-11-07-openspec-seam.md) / [第三轮](history/2026-11-07-agent-first-numbering.md) | 2026-11-07 |

## 当前状态（一句话）

前提已定三条（多层文档要、SW/FW 用 OpenSpec、OpenSpec 能承载编号）；当前 brief 把「第一消费者是 Agent」
立为硬前提，并 capture 了硬软一体/多 discipline/人的 review/IRS 检查点的场景；空间已按功能拆成
current-brief / space / candidates / validation / evidence 五份，历史三轮冻结在 `history/`。
**空间尚未探索完，不选方案、不定前缀**；此前实现**已全部 git reset 撤回**，只留材料。
