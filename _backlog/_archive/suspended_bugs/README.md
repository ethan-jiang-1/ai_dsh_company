# suspended_bugs/ · 已查明但未修复的缺陷

难复现、依赖上游或明确决定暂不修的已确认缺陷留在这里。状态既非已修也非删除，编号仍占用；编号权威 = [`../fixed_bugs/README.md`](../fixed_bugs/README.md)。需要重新处理时，经新的明确优先级决定迁回 [`../../bugs/`](../../bugs/README.md) 并恢复活跃索引。归档索引 = [`../README.md`](../README.md)。

## 待修清单

| 卡 | 挂起原因 | 重新处理触发器 |
|---|---|---|
| [BUG-212](BUG-212-pre-push-and-release-tail-budget-overrun.md) | docs-only 收尾快速路径已修；pre-push 暖树 ~46s（coverage 22s + run-gates 11s）是成本-only，不是正确性缺口 | 连续两次 push >60s，或真实 push 阻塞投诉；届时单独设计并行/分档 |
