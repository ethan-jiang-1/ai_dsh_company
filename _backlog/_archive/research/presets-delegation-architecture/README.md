---
status: 已定性
opened: 2026-11-09
---

# preset 委派架构：盘点与结构性研究

> 问题：六个角色 preset 的委派/控制行实际长什么样（工具行、persona 提及、skill 规模），哪些行重叠或成死行？
> **延伸**：这套“九份自包含装配”在 DSH 的 subagent / workflow / agent-team 三通道下是否存在系统性、
> 结构性设计问题？若有，优雅的调整方向是什么（组合形状、能力声明、合同归属、工作组合 vs 角色组合）？
> 消费者：[委派面合同修复 Note](../../../../notes/implemented/2026-11-08-delegation-contract-repair.md)；
> [BUG-037](../../../_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md)、
> [BUG-042](../../../_archive/fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md)、
> [BUG-043](../../../_archive/fixed_bugs/BUG-043-list-subagents-includes-teammates.md)、
> [BUG-044](../../../_archive/fixed_bugs/BUG-044-background-job-lost-on-restart.md) 修复轮；
> 用户 2026-11-09 研究请求（无卡）。
> 产出的卡：[presets 委派面的模型化重构（worker family + 链合同 + 图观测）](../../../_archive/settled_issues/2026-11-09-presets-delegation-architecture.md)（等人拍板；本卡不授权生产代码）。
> 归档：2026-11-10（末张活卡已结）；归档后仍可被活跃卡引用，引用不等于让研究「复活」。
> 结论：存在系统性结构问题（组合重复/能力隐晦、worker=角色克隆、合同角色局部、三通道缺统一模型与面级验证）；
> 推荐先做“合同单家 + worker profile + 能力清单 + keyless 声明面矩阵”，生成器为第二阶段，team 成员组合/通道统一属上游。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [inventory-presets.mjs](inventory-presets.mjs) | 盘点脚本（读六角色 preset 的 yml / persona / skill） | 2026-11-09 |
| [inventory.json](inventory.json) | 各角色工具行 / persona 提及 / skill 规模的计数快照 | 2026-11-09 |
| [2026-11-09-structural-analysis.md](2026-11-09-structural-analysis.md) | 从读数与 BUG-036..044 反推六个结构模式、目标结构候选与只读实验计划（推论稿） | 2026-11-09 |
| [2026-11-09-dsh-affordances.md](2026-11-09-dsh-affordances.md) | DSH 0.2.1 对 preset / subagent / workflow / team / skills 的真实能力与约束（源码依据） | 2026-11-09 |
| [2026-11-09-external-practices.md](2026-11-09-external-practices.md) | Anthropic / Claude Code / OpenAI 一手实践 survey，映射 S1–S6 与四层“优雅形状”初步 | 2026-11-09 |
| [2026-11-09-contract-duplication.md](2026-11-09-contract-duplication.md) | 合同/委派词在 persona、角色 skills、docs 的分布读数（只读词频；S4 证据） | 2026-11-09 |
| [2026-11-09-composition-experiments.md](2026-11-09-composition-experiments.md) | 两个只读实验：dump-config 声明面读数（H6 原型）+ 底座/delta 矩阵（H1/H2） | 2026-11-09 |
| [2026-11-09-options-and-conclusion.md](2026-11-09-options-and-conclusion.md) | 结论：四个结构缺口、目标四层、A/B/C 方案、推荐顺序与 5 个待裁决问题 | 2026-11-09 |
| [2026-11-09-awesome-dsh-patterns.md](2026-11-09-awesome-dsh-patterns.md) | 外部补遗：18 个协作样本的十个可迁移模式与对 A/B/C 的两条加强 | 2026-11-09 |
