---
status: 已定性
opened: 2026-11-16
---

# 维护面顶层分类法：checks / probes / tools 按什么切

> 问题：三个仓的维护面都是 3 个目录，但名字不同、内部混装不同——本仓 checks / probes / tools，bsimulation checks / probes / dev，deep_research probes / scripts / dev。能不能收敛出一套判据，让「新东西放哪」一句话可判、两个人给出同一答案，而不是靠读四份 README？
> 消费者：用户 2026-11-16 点名（本会话跨三仓比较；尚无卡）。
> 产出的卡：—（交接物 = 三份 reorg handoff，见材料表）
> 结论：维护面 = 两层（tests oracle / 真入口）× 三面（judge / show / operate）；operate 分 run/act 两种模式，`状态：已耗` 与管道件是非面。P0 只做面声明与例外表，不改名；根目录统一（checks/probes/tools）是**承诺方向**（2026-11-16 用户裁决，[D64](../../../notes/implemented/2026-11-16-surface-root-unification-direction.md)），先纯化后统一、独立迁移项目；每仓落地须写清每目录定位（面 + 装什么/不装什么 + 例外），共识随 handoff 携带、不含糊。**推荐终态根布局显式见各 handoff「目标根布局」节与 D64 Note**（canonical skeleton + 现状→目标映射 + 待裁选项）。三仓各按自己那份 reorg 执行。

## 材料

| 文件 | 作用 | 日期 |
|---|---|---|
| [2026-11-16-three-repo-taxonomies.md](2026-11-16-three-repo-taxonomies.md) | 三仓盘面事实、切法背后的三条轴、四种候选统一方案与反例 | 2026-11-16 |
| [2026-11-16-judge-show-operate.md](2026-11-16-judge-show-operate.md) | 三面判定程序、29 条真实条目压力测试、三仓体检与最小迁移面 | 2026-11-16 |
| [2026-11-16-full-classification.md](2026-11-16-full-classification.md) | 126 条全量判定（116/123）、7 个冲突、P2 探针棘轮碰撞与四个选项 | 2026-11-16 |
| [2026-11-16-full-classification.csv](2026-11-16-full-classification.csv) | 逐条分类数据（path / kind / face / 现址 / 是否一致 / 备注） | 2026-11-16 |
| [2026-11-16-cross-repo-group-pass.md](2026-11-16-cross-repo-group-pass.md) | 另两仓组级复跑、面纯度指标、「最大面吸收邻居」规律 | 2026-11-16 |
| [2026-11-16-migration-draft.md](2026-11-16-migration-draft.md) | 本仓最小迁移草案：逐文件 git mv、引用替换、红→绿验证、回滚 | 2026-11-16 |
| [2026-11-16-unified-surface-scheme.md](2026-11-16-unified-surface-scheme.md) | 推理稿（盲审前；改名建议已撤回，结论以 reorg 三份为准） | 2026-11-16 |
| [2026-11-16-p0-kit.md](2026-11-16-p0-kit.md) | P0 三仓插入包（v1；改名建议已被盲审修正，以 reorg 三份为准） | 2026-11-16 |
| [2026-11-16-blind-review.md](2026-11-16-blind-review.md) | 独立盲审 19 条发现、采纳/改写/驳回与规则修订 | 2026-11-16 |
| [2026-11-16-reorg-company.md](2026-11-16-reorg-company.md) | **本仓 handoff（自包含）**：决策上下文、规则 v2、逐条核实的现状、P0 精确插入文本、P1 撞墙点与引用清单、验收 | 2026-11-16 |
| [2026-11-16-reorg-bsimulation.md](2026-11-16-reorg-bsimulation.md) | **bsimulation handoff（自包含）**：决策上下文、checks 逐组明细、dom-replay CI judge 例外、P0 插入文本、P1 gate 输入清单 | 2026-11-16 |
| [2026-11-16-reorg-deep-research.md](2026-11-16-reorg-deep-research.md) | **deep_research handoff（自包含）**：决策上下文、run-ops 逐件判定、stream tee 口径差、P0 插入文本、P1 b-pack gate 输入清单 | 2026-11-16 |
