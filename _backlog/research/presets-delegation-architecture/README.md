---
status: 调研中
opened: 2026-11-09
---

# preset 委派架构盘点

> 问题：六个角色 preset 的委派/控制行实际长什么样（工具行、persona 提及、skill 规模），哪些行重叠或成死行？
> 消费者：[委派面合同修复 Note](../../../notes/implemented/2026-11-08-delegation-contract-repair.md)；
> [BUG-037](../../_archive/fixed_bugs/BUG-037-root-team-tool-shadowing.md)、
> [BUG-042](../../_archive/fixed_bugs/BUG-042-list-subagents-lastturnend-missing.md)、
> [BUG-043](../../_archive/fixed_bugs/BUG-043-list-subagents-includes-teammates.md)、
> [BUG-044](../../_archive/fixed_bugs/BUG-044-background-job-lost-on-restart.md) 修复轮。
> 产出的卡：暂无（盘点中；发现的缺口按证据另行分诊）。
> 结论：（盘点中）

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [inventory-presets.mjs](inventory-presets.mjs) | 盘点脚本（读六角色 preset 的 yml / persona / skill） | 2026-11-09 |
| [inventory.json](inventory.json) | 各角色工具行 / persona 提及 / skill 规模的计数快照 | 2026-11-09 |
