---
status: 已定性
opened: 2026-11-11
---

# DSH 原生编排对照：公司角色的通道、合同与能力面 GAP 盘点

> 问题：本仓公司角色的编排面（通道选择、能力收窄、合同载体、深度预算、观测）在哪些地方遵循 DSH 原生思路，哪些地方只是借了外形或与原生语义相反？这些差异里哪些是已确认的 GAP、哪些是有意取舍、哪些还需要真模型证据？
> 消费者：用户 2026-11-11 研究请求（无卡）；[delegation 合同](../../../../docs/contracts/delegation.md)、[presets 合同](../../../../docs/contracts/presets.md)、[architecture](../../../../docs/architecture.md)、[delegation-policy](../../../../packages/company-pack/presets/_shared/delegation/skills/delegation-policy/SKILL.md)、[delegation-model](../../../../tools/lib/delegation-model.mjs)、[CEO preset](../../../../packages/company-pack/presets/ceo/agent.cordis.yml)。
> 结论：机制层是 DSH 原生形状；合同/能力面层有 6 个已确认 GAP（G1 政策泛化、G2 maxDepth 文案、G3 team 上下文、G4 通道双轨、G5 引擎事实混政策、G6 workflow_runs 全局）+ 新 G13（support root 是 Lead 却无 team 政策）。B1/B2/B3/B5 四场行为样本（B5 partial）没有复现“模型误调不存在的通道”：COO 自己做、CEO 用 fresh+任务书、CEO 未自开 goal、CMO 用 4 个 subagent 替代缺失的 workflow；B4 未跑，A 的行为效果以落地后的单场 pilot 观察为准。两张卡已落地归档；G7/G8 仍留作产品决策。
> 产出的卡：[2026-11-11 委派合同事实纠偏](../../settled_issues/2026-11-11-delegation-contract-truth.md)、[2026-11-11 委派政策能力域化](../../settled_issues/2026-11-11-delegation-policy-capability-scoped.md)（2026-11-11 立卡；同日落地并归档）
> 归档：2026-11-11（随两张 issue 卡归档；材料冻结，不回填）
> 落地：[委派合同事实纠偏 Note](../../../../notes/implemented/2026-11-11-delegation-contract-truth.md)、[委派政策能力域化 Note](../../../../notes/implemented/2026-11-11-delegation-policy-capability-scoped.md)

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-11-native-baseline.md](2026-11-11-native-baseline.md) | DSH 原生编排基线：原语阶梯、四通道能力面、选择/合同分层、深度与证据（阅读摘录 + vendor 核对） | 2026-11-11 |
| [2026-11-11-repo-fit-gap-register.md](2026-11-11-repo-fit-gap-register.md) | 本仓需求映射、做对的地方、G1–G13 GAP 登记、优先级与待证边界 | 2026-11-11 |
| [2026-11-11-experiment-plan.md](2026-11-11-experiment-plan.md) | 从 GAP 到 issue 的实验计划：信心分布、A/B/C 目标形状、E1–E6 结构实验、B1–B5 行为实验、出卡信心门与预算 | 2026-11-11 |
| [2026-11-11-experiment-results.md](2026-11-11-experiment-results.md) | 第一轮实验结果：E1 能力审计、E2/E5 权限与工具面、E3 拆分原型、E4 vendor parity、B1/B2 行为观察、目标形状 A | 2026-11-11 |

## 结论摘要

机制层是原生形状——角色 = preset、命名委托 = spawn + `agentPreset`、team 任务板不自动派工、workflow 脚本扇出、观测只读投影、证据分层；**GAP 不在“自造调度器”，而在合同/能力面层**：共享政策描述了许多角色没有的通道，手写通道矩阵与 vendor 语义有一处相反，`maxDepth` 注释把“行上限”写成“链上限”，team 上下文被写成继承父对话，A/B/C/D 与原生四通道双轨，引擎事实混进政策，workflow 观测工具全局可见。结论与证据见主材料；本页只留名头，不复制正文。
