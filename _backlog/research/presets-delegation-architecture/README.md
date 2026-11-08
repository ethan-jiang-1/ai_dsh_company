---
status: 调研中
opened: 2026-11-09
---

# preset 委派架构：盘点与结构性研究

> 问题：六个角色 preset 的委派/控制行实际长什么样（工具行、persona 提及、skill 规模），哪些行重叠或成死行？
> **延伸**：这套“九份自包含装配”在 DSH 的 subagent / workflow / agent-team 三通道下是否存在系统性、
> 结构性设计问题？若有，优雅的调整方向是什么（组合形状、能力声明、合同归属、工作组合 vs 角色组合）？
> 消费者：[委派面合同修复 Note](../../../notes/implemented/2026-11-08-delegation-contract-repair.md)；
> [BUG-037](../../_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md)、
> [BUG-042](../../_archive/fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md)、
> [BUG-043](../../_archive/fixed_bugs/BUG-043-list-subagents-includes-teammates.md)、
> [BUG-044](../../_archive/fixed_bugs/BUG-044-background-job-lost-on-restart.md) 修复轮；
> 用户 2026-11-09 研究请求（无卡）。
> 产出的卡：暂无（盘点与结构性研究进行中；发现的缺口按证据另行分诊）。
> 结论：（调研中）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [inventory-presets.mjs](inventory-presets.mjs) | 盘点脚本（读六角色 preset 的 yml / persona / skill） | 2026-11-09 |
| [inventory.json](inventory.json) | 各角色工具行 / persona 提及 / skill 规模的计数快照 | 2026-11-09 |
| [2026-11-09-structural-analysis.md](2026-11-09-structural-analysis.md) | 从读数与 BUG-036..044 反推六个结构模式、目标结构候选与只读实验计划（推论稿） | 2026-11-09 |
| [2026-11-09-dsh-affordances.md](2026-11-09-dsh-affordances.md) | DSH 0.2.1 对 preset / subagent / workflow / team / skills 的真实能力与约束（源码依据） | 2026-11-09 |
