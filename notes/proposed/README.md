# proposed/ · 待实施 feature 的 RFC 层

> 一文件一条目：问题 / 方案 / **输掉的方案留尸** / 验收（**验收必须先行点名「怎么测」，且可执行**——哪条命令、
> 断言什么、红长什么样，**实施者不看对话就能复现**；机制面 = 实现前先红的检查；行为/UX 面 = Given/When/Then
> 场景判据；文档/流程面 = 走查判据。写不出可执行验收 = 提案未成熟，回
> [_backlog/issues/](../../_backlog/issues/README.md) 推敲，不进实施。分层判据唯一家 =
> [docs/testing.md](../../docs/testing.md) §3.7/§3.8，此处不复述）。文件名 = `YYYY-MM-DD-<主题>.md`
> （日期 = 登记时点，时间层约定）。
>
> **没成熟到能写齐三件的思考不进这里**——那是 [`_backlog/issues/`](../../_backlog/issues/README.md)
> 推敲卡的事（D31）：卡可以只有问题没有方案，RFC 必须有问题/方案/验收。
>
> **批准与状态都在 RFC 自己的状态行**（「批准：」标记 = 机械门禁 `proposal-scheduled` 查；
> 未批准的思考住 [`_backlog/issues/`](../../_backlog/issues/README.md) 推敲卡）。实施次序 = 用户逐条给
> （D32，无中心排序文件）。
> 机械门禁：`proposal-scheduled`（每个 RFC 状态行带「批准：」标记——D32 起查标记不查队列；+「## 验收」节
> 在场——2026-10-05 TDD 环立，反证 = [implemented/rfc-tdd-loop](../archived/2026-10-05-rfc-tdd-loop.md)）/
> `proposal-graduated`
> （该毕业的不许赖在 proposed/）。发现方式 = 浏览本文件夹 + 文件名（DSH 纪律：
> "the lifecycle/class filesystem tree is the inventory"；不建集中索引——共享文件必漂移，
> rationale 见 vendor 的 `packages/` 侧说明（原文引的 `implemented/process/…-remove-generated-agent-note-index.md` 在钉住 tag 里**已不存在**，2026-09-26 核实；结论不受影响：不建集中索引）。
>
> 条目开工 = **TDD 式红绿环**（2026-10-05 用户令内化：先想怎么测 → 实现 → 验证 → 反复做对；全程带证据，不随性发挥）：
>
> 1. **读 RFC → Plan Mode 呈批**（反馈门①）——呈批必须含验收节的「怎么测」（检查面/seam/判据）；判据未先行约定不写测试。
> 2. **红（判据先行）**：机制面 = 最窄检查先落并实跑见红（红收据 = 证据①——实现前已有红，才证明测的是本条要的东西）；行为/UX 面 = 场景先立；文档/流程面 = 走查判据先立。分层判据唯一家 = [docs/testing.md](../../docs/testing.md) §3.8。
> 3. **绿（最窄实施）**：只写让红转绿的代码，复跑同一检查见绿（绿收据 = 证据②）。
> 4. **不绿不收口，反复做对**：一个切片一个循环（一检查 → 一实现 → 复验；不整批先写全部检查再写全部实现）；判据本身错了就改判据并明说——弱化断言凑绿不是修法（testing.md §3.5）。todo_write 实时面（反馈门②）。
> 5. **同 diff 收尾**：实跑命令与红/绿收据写进毕业 Note 的验证节（内容要求 = [notes/README](../README.md)——分类 owner；收尾动作清单 = [dev-loop §12](../../docs/guides/dev-loop.md)）→ RFC 毕业到 `notes/implemented/`（状态行「已消化」）+ `_backlog` 关联行/卡离场（按 [章程](../../_backlog/README.md) 自身关闭条件离场，不等实施验收）。毕业 ≠ 全部实现，而是每一条都有归宿；「## 验收」节在场是机器底线，证据真实性由 prove-it-red（testing.md §3.7）与人审兜。
