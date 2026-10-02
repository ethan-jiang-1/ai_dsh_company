# _fixed_bugs/ · 已修复缺陷卡（编号权威源）

> 从 [`../../bugs/`](../../bugs/README.md) `git mv` 迁入；文件名不变、内容不重写。
> **Next BUG ID = 已分配最大号 + 1（本目录 ∪ 活跃 bugs/ 一起算）**——总数与权威值看
> [`../README.md`](../README.md)，本表逐行登记。

| Bug | 标题 | 修复 commit | 日期 |
|---|---|---|---|
| [BUG-001-manual-truncation.md](BUG-001-manual-truncation.md) | 公司手册超出 agent-instructions maxBytes——尾部在所有角色会话被截断（maxBytes 16384→32768 + verify `handbook-budget` 门禁；红→还原→绿） | 未单独 commit（随 2026-10-02 消化对账轮工作树） | 2026-10-02 |
