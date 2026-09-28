# proposed/ · 待实施 feature 的 RFC 层

> 一文件一条目：问题 / 方案 / **输掉的方案留尸** / 验收。文件名 = `YYYY-MM-DD-<主题>.md`
> （日期 = 登记时点，时间层约定）。
>
> **没成熟到能写齐三件的思考不进这里**——那是 [`_backlog/plans/`](../../_backlog/plans/README.md)
> 推敲卡的事（D31）：卡可以只有问题没有方案，RFC 必须有问题/方案/验收。
>
> **排序与状态不在这里**：唯一事实家 = [ROADMAP.md §队列](../../ROADMAP.md)（有序索引）。
> 机械门禁：`proposal-scheduled`（每个 RFC 必须在队列有索引行）/ `proposal-graduated`
> （该毕业的不许赖在 proposed/）。发现方式 = 浏览本文件夹 + 文件名（DSH 纪律：
> "the lifecycle/class filesystem tree is the inventory"；不建集中索引——共享文件必漂移，
> rationale 见 vendor 的 `packages/` 侧说明（原文引的 `implemented/process/…-remove-generated-agent-note-index.md` 在钉住 tag 里**已不存在**，2026-09-26 核实；结论不受影响：不建集中索引）。
>
> 条目开工 = 读 RFC → Plan Mode 呈批（反馈门①）→ 实施（todo_write 实时面，反馈门②）→
> 同 diff 收尾：RFC 毕业到 `notes/implemented/`（状态行「已消化」）+ 队列行删除（完成即离队）。
> 毕业 ≠ 全部实现，而是每一条都有归宿。
