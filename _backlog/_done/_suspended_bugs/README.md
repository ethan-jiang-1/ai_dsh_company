# _suspended_bugs/ · 搁置缺陷卡（查实——修复未确认）

> 已查实但修复未确认的缺陷卡住这里（难复现 / 依赖上游 / 用户明确降级）。id 继续占用
> （编号权威 = [`../_fixed_bugs/README.md`](../_fixed_bugs/README.md)）；搁置既非修复也非删除。
> **本文件持契约，不持清单**——索引 = [`../README.md`](../README.md)；章程 = [`../../README.md`](../../README.md)。

## 流向

- **活跃 → 搁置**：`git mv` 进本目录，活跃索引行出去、`../README.md` 搁置行进来，id 保留。
- **搁置 → 修复**：`git mv` 到 [`../_fixed_bugs/`](../_fixed_bugs/README.md)，状态行追加修复判定。
- **搁置 → 活跃**：`git mv` 回 [`../../bugs/`](../../bugs/README.md) 并恢复活跃索引行
  （须新的明确优先级决定）。
