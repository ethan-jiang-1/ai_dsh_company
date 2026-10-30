# archived/receipts/ —— 历史运行证据（不是决定，不是否决）

> 为什么有这个子目录：演练场次、E2E 首检、批次流水、状态快照没有“持久决定”，按
> [notes/README §二](../../README.md) 的负例不该住 `implemented/`；但它们也不该进
> `archived/` 顶层——那一层只留“仍能阻止重开的冻结判定”。这里给它们一个**明确的证据层**：
> 与决定分离、与否决分离，检索得到、不被当现行 rationale。

## 规则

- **只收历史证据**：证明“某轮真跑过什么/当时读数是什么”，不承载现行决定。决定/否决住
  `implemented/` 或 `archived/` 顶层。
- **不做现行权威**：这里的内容过期是常态；引用它时必须写明“当时”。现行事实看
  `docs/`、代码、门禁与 `notes/implemented/`。
- **保留条件**：仍被 digest / 现行 Note / 事故复盘引用，或仍有复核价值。失效可删（git 留历史），
  但删除按 notes/README §五 需用户点头；不因“曾经被引用”而永久堆积。
- **不再续写**：新证据优先落 `snapshots/`、`_backlog/research/` 或部署仓；只有“叙事性收据”
  且确有复核价值时才放这里，并在 [收据 digest](../../../_backlog/_archive/research/notes-consistency/2026-10-30-receipts-digest.md) 登记一行。
- **索引**：本目录不建逐文件索引；digest 是证据入口，不是决定清单（一处事实一个家）。

## 与 archive 顶层的关系

`archived/` 顶层 = 冻结的**否决**（可阻止重开）；`archived/receipts/` = 冻结的**证据**
（只帮复核，不阻止任何决定）。两者都不回写、都不是现行 rationale。
