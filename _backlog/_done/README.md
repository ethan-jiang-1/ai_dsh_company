# _done/ · 归档（位置即状态；fresh agent 默认忽略，点名才读）

> 已毕业的推敲卡与已修复的缺陷卡住这里。`git mv` 迁入、文件名不变、内容不重写——
> 迁移时只在卡的状态行补去向指针。编号权威与两条索引都在本文件。
> 规矩手册 = [`../README.md`](../README.md)。

## 目录

- [_closed_plans/](_closed_plans/README.md) — 已毕业推敲卡（文件名带立卡日期 `YYMMDD-slug`，按日期流/slug 查）
- [_fixed_bugs/](_fixed_bugs/README.md) — 已修复缺陷卡（**Next BUG ID 权威源**）
- [_misc/](_misc/) — 整池退役的搁置池 [suspended.md](_misc/suspended.md) 与磨清单 [polish.md](_misc/polish.md)（2026-09-28 用户裁决；复活/触发条件仍在表内，点名才读）

## 已毕业推敲卡

| 卡 | 毕业门 | 去向 | 日期 |
|---|---|---|---|
| [260928-sidebar-split-budget.md](_closed_plans/260928-sidebar-split-budget.md) | 不做（维持 2 停靠 + N 浮出现状，不推 upstream） | 关闭迁本目录 `_closed_plans/` | 2026-09-28 |
| [suspended.md](_misc/suspended.md) | 整池退役（用户裁决；复活条件仍在表内，点名才读） | `git mv` 迁 `_misc/` | 2026-09-28 |
| [polish.md](_misc/polish.md) | 整池退役（用户裁决；余项触发条件仍在表内，点名才读） | `git mv` 迁 `_misc/` | 2026-09-28 |

## 已修复缺陷卡

| Bug | 标题 | 修复 commit | 日期 |
|---|---|---|---|
| [BUG-001-manual-truncation.md](_fixed_bugs/BUG-001-manual-truncation.md) | 公司手册超出 agent-instructions maxBytes——尾部在所有角色会话被截断（maxBytes 16384→32768 + verify `handbook-budget` 门禁；红→还原→绿） | 未单独 commit（随 2026-10-02 消化对账轮工作树） | 2026-10-02 |

**Next BUG ID: BUG-002**（新号 = 已分配最大号 + 1，活跃 ∪ 归档一起算）
