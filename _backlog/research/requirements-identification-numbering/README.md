---
status: 已定性
opened: 2026-11-07
---

# 需求识别与编号：硬软一体场景下的多层需求文档

> 问题：在硬软一体、多 discipline 的研发体系里，SW/FW 已用 **OpenSpec**，原研发体系的需求文档规范不清；
> 要补 **MRD→PRD→StRS→SyRS→IRS** 的文档链，并要求一套需求识别/编号机制，让**人和 Agent 都能第一眼正确理解、
> 跨文档/跨组织可解析**，且 Agent 不困惑。
> 场景（2026-11-07 用户口述）：**硬软一体、多 discipline**（SW / FW / EE / ME / 系统测试等），不是纯软件开发；
> 目前 **SW/FW 已用 OpenSpec**，原研发体系**没有很清晰的需求文档规范**；拟走 **MRD→PRD→StRS→SyRS→IRS**；
> **人的 review 需要文档**，**IRS 是候选检查点**。最终要答：**这套体系用什么识别/编号机制（前缀是核心落点之一）**，
> 人和 Agent 都容易；Agent 不能困惑。
> 消费者：用户 2026-11-07 直接提出（CMO 产 MRD 需 StRS、VP-Eng 产 PRD 需 SyRS+IRS）；本仓
> [SA/SQA 子人格落地 Note](../../../notes/implemented/2026-11-06-sa-sqa-subpersonas.md) 与
> [成品评审材料](../sa-sqa-product-review/README.md) 是背景证据。
> 产出的卡：[程序伞卡](../../issues/2026-11-07-requirements-teaming-landing.md) + 8 张执行卡：
> [A1 合同](../../issues/2026-11-07-requirements-contract.md) / [A2 模板](../../issues/2026-11-07-requirements-templates.md) /
> [A3 CMO/VP-Eng](../../issues/2026-11-07-requirements-cmo-vpeng.md) / [A4a SA](../../issues/2026-11-07-requirements-sa.md) /
> [A4b SQA](../../issues/2026-11-07-requirements-sqa.md) / [A5 校验器](../../issues/2026-11-07-requirements-checker.md) /
> [A6 命令](../../issues/2026-11-07-requirements-command.md) / [A7 迁移](../../issues/2026-11-07-requirements-migration.md) /
> [A8 E2E](../../issues/2026-11-07-requirements-e2e.md)（B1/B2 见 [teaming 题](../vp-eng-teaming/README.md)）
> **硬前提**：第一消费者是 **Agent**——判据不是"人读得懂"，而是"Agent 不可能读错、没有判断题、机器能判红"。
> 结论：ID 只承载身份（种类 + 序号）；层归文档并声明、状态归条目、专业域与验证方归字段；追溯由作者写边、
> 索引派生、检查判红。**全文 = [2026-11-07-consensus.md](2026-11-07-consensus.md)**（自说明，只读这一份即可）。
> **边界**：结论不授权实施、不迁移、不改 pack；参数级未定项见共识 §6，验证项（V1/V2/V4/V11）未跑；实施需另起 issue 或 RFC。

## 阅读顺序

**要结论**：只读 [2026-11-07-consensus.md](2026-11-07-consensus.md)——自说明，含背景、推理、规则、未定项。
**要审过程**：按下面顺序走。

1. [2026-11-07-current-brief.md](research_topic/2026-11-07-current-brief.md) — 问题、场景、约束、用户已拍、未说清单（**过程材料入口**）。
2. [2026-11-07-space.md](research_topic/2026-11-07-space.md) — 16 个设计维度、12 个场景用例、先验风险、硬约束、27 个待探索问题。
3. [2026-11-07-candidates.md](research_topic/2026-11-07-candidates.md) — S1–S8 方案族、H1–H8 假说、评估维度；不排名。
4. [2026-11-07-validation.md](research_topic/2026-11-07-validation.md) — V1–V16 测试与下一步；不预设优先级。
5. [2026-11-07-evidence.md](research_topic/2026-11-07-evidence.md) — 盘面事实、21 vs 23 反转、两套规则、复核命令。
6. [`history/`](history/) — 三份轮次材料冻结快照（不再更新，只作 provenance）。

> **节号地图**：本目录沿用 2026-11-07 第三份材料的全局节号；一份文件只包含其中一部分节，跨文件按 § 号查找。
> `current-brief` = §0.5 / §1 / §1.5 / §1.6 / §2 / §8.5；`evidence` = §3 / §10；`space` = §4 / §5 / §7 / §8；
> `candidates` = §6；`validation` = §9 / §11。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-07-consensus.md](2026-11-07-consensus.md) | **结论**：自说明的共识（背景 / 盘面 / 推理 / 规则 / 未定项）；只读这一份即可 | 2026-11-07 |
| [2026-11-07-landing-plan.md](2026-11-07-landing-plan.md) | **落地拆法**：四个落地冲突、落地面清单、结果级 C1–C4 / 执行级 A1–A8 卡边界、V1/V2/V4/V11 验证门；不授予实施 | 2026-11-07 |
| [2026-11-07-issue-set-audit.md](2026-11-07-issue-set-audit.md) | **卡集审计**：结构/依赖/一致性/方法合规、21 项问题与修正、剩余风险；不授予实施 | 2026-11-07 |
| [2026-11-07-validation-trial.md](2026-11-07-validation-trial.md) | **V1/V2/V4/V11 验证**：盲测、lab 重键、负例、22 IFR trial；原型结果与对 A1/A2/A5 的要求 | 2026-11-07 |
| [2026-11-07-probe-specs.md](2026-11-07-probe-specs.md) | **A8/B2/B1 探针规格**：prompt/断言/成本；实现时照此落 `probes/team/`，未跑 | 2026-11-07 |
| [2026-11-07-execution-plan.md](2026-11-07-execution-plan.md) | **完整执行计划**：W0–W5 波次、每卡红先行/证据/收口、质量保障与落地证明；等用户批准 | 2026-11-07 |
| [2026-11-07-current-brief.md](research_topic/2026-11-07-current-brief.md) | 当前 brief：问题、场景、约束、用户已拍、未说清单；唯一入口 | 2026-11-07 |
| [2026-11-07-space.md](research_topic/2026-11-07-space.md) | 探索空间：16 个设计维度、12 个场景用例、先验风险、硬约束、27 个待探索问题 | 2026-11-07 |
| [2026-11-07-candidates.md](research_topic/2026-11-07-candidates.md) | 候选方案族 S1–S8、假说 H1–H8、评估维度；不排名 | 2026-11-07 |
| [2026-11-07-validation.md](research_topic/2026-11-07-validation.md) | 验证计划 V1–V16 与下一步 | 2026-11-07 |
| [2026-11-07-evidence.md](research_topic/2026-11-07-evidence.md) | 证据审计：盘面事实、21 vs 23 反转、两套规则、复核命令 | 2026-11-07 |
| [2026-11-07_recommendation_claude.md](2026-11-07_recommendation_claude.md) | Claude 的第一直觉与候选推荐；不替用户定案 | 2026-11-07 |
| [2026-11-07_recommendation_gpt.md](2026-11-07_recommendation_gpt.md) | GPT-6.1-terra 的第一直觉、候选方向与偏向推荐；不替用户定案 | 2026-11-07 |
| [2026-11-07_recommendation_deepseek.md](2026-11-07_recommendation_deepseek.md) | DeepSeek 的第一直觉、偏向方案（五词种类轴 + 派生索引）、对照方案、判红规则与可证伪预测；不替用户定案 | 2026-11-07 |
| [history/](history/) | 轮次快照（冻结，不再更新）：[第一轮](history/2026-11-07-numbering-deliberation.md) / [第二轮](history/2026-11-07-openspec-seam.md) / [第三轮](history/2026-11-07-agent-first-numbering.md) | 2026-11-07 |

## 当前状态（一句话）

前提已定三条（多层文档要、SW/FW 用 OpenSpec、OpenSpec 能承载编号）；当前 brief 把「第一消费者是 Agent」
立为硬前提，并 capture 了硬软一体/多 discipline/人的 review/IRS 检查点的场景；探索空间已按功能拆成
current-brief / space / candidates / validation / evidence 五份，另有独立的 Claude / GPT / DeepSeek 三份判断材料，历史三轮冻结在 `history/`。
**2026-11-07 收敛成 [共识](2026-11-07-consensus.md)**：ID 只承载身份（种类 + 序号），层归文档并声明、状态归条目、专业域与验证方归字段；追溯由作者写边、索引派生、检查判红。参数级未定项（状态位落点、层数层序、IRS 闸、跨动议键、词表盲测 V1）见共识 §6；**未授权实施**；此前实现已全部 git reset 撤回，只留材料。
**2026-11-07 另出[落地拆法材料](2026-11-07-landing-plan.md)**：把共识翻成 A1–A8 的面清单与卡边界；拆法评审 = [程序伞卡](../../issues/2026-11-07-requirements-teaming-landing.md)；11 张执行卡已建（A1–A8 + B1/B2）；卡集审计 = [审计](2026-11-07-issue-set-audit.md)；V1/V2/V4/V11 = [验证记录](2026-11-07-validation-trial.md)；执行计划 = [计划](2026-11-07-execution-plan.md)。
