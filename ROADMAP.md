# 队列 · 开发流（条目制，D23）

> 性质：**当前任务队列（D24）**。用户说“继续下一条”时查 §队列；只从**当前条目**取任务——§搁置池里的项**不是任务**（它不占轮、不研究，只在复活条件成立时才回队列）。
> **完成即离队**：验收通过后删除队列行，交付证据留 Note。任务入口、授权、实施和收尾唯一流程见 `docs/guides/dev-loop.md` §0.5/§1/§12。
> 条目默认由新对话上下文接手、用户明确任务优先——**规则正文唯一见 [开发环 §0.5](./docs/guides/dev-loop.md)**。
> **队列 = 有序索引，不是全文**：feature 条目配 `notes/proposed/` RFC；问题、取舍与验收留在 RFC。队列行 ≤3 行（主题 / 状态 / 链接 / 验收指针）。Plan Mode 条件唯一见[开发环 §0.5](./docs/guides/dev-loop.md)。卫生小修与触发型条目可不设 RFC。
> **历史不在本文件**：本文件只写 now。既往维护记录见 `notes/intents.md`（时序台账）与各 Note；更早的历史段已删（全文在 git，末次 blob `d159b0228e2b`）。

## 队列

**三种状态**：**▶ = 当前在办**（同一时刻只应有一个）；**⏸ = 阻塞中**（等人裁决或等外部触发——轮到也不开工，按 dev-loop §0.5 报告阻塞、触发条件与复活方）；**无标记 = 已批准待办**（**范围**已在 RFC 里获批；轮到它时**是否还需 Plan Mode 呈批按 dev-loop §0.5 判**——用户已明确批准具体计划时不重复求批，否则默认先呈批。本节只管**次序**，不管授权）。**列表顺序 = 默认执行次序**，次序只在本列表定义（不另立计划/顺序文件——fresh Agent 从这里取次序：dev-loop §0.5 分支②）。用户指定任务优先于队列顺序；若只有 ⏸，逐项报告其阻塞/触发条件及谁或什么能复活，不从历史条目推断任务。

## 磨清单（低优先磨活；不占轮、可后台派活）

> 家规（notebook-hygiene 立，2026-09-25）：观察项与低优先磨活住这里，各带「谁来磨／何时磨」；从队列可见一跳到达。**已磨即离队**（证据在 Note/脚本，不在此回堆）。
> **升队条件（二者之一）**：① 该条目自己的触发条件成立；② 队列走空且用户点名。**别在此处写条目计数**（易腐常量，实况看列表）。

- **`owners.md` 与 `routing.ts` 的重复事实家**：`company-workspace/kb/owners.md` 是"谁签得动"的事实家，
  而 `packages/company-pack/src/lib/routing.ts` 里有一份**硬编码的表副本**（`OWNERS_TABLE`，当前无生产消费者、
  只有测试用）——两边手工保持一致，已出现过一次不一致风险。谁来磨 = 维护者；磨法候选 = 让 client 数据面
  读 `kb/owners.md`（**红线：要动 client 数据层**，未批）；何时磨 = 用户点名，或注意力面板真要用这份路由时。
- **`renewal-y-2026` 两场动议的逐文件归属**：该目录混装两场（一场中途卡死、一场跑完）。逐份 drafts 归属
  哪一场**未核实**；谁来磨 = 维护者；何时磨 = 若将来要拿它当判据档，先分清再引。
- **dev home 的探针会话残留**（gitignored 运行态）：驾驶舱会话库留着多场证据会话与已退役的
  `company` profile。都是证据，留着无妨；谁来磨 = 维护者；何时磨 = 需要腾空间或做干净 demo 时
  （清法 = UI 里删会话 + 删 profile 目录）。

## 搁置池（suspended：不占轮、不研究、留复活条件）

> 判据：**只有"缺上游 seam"或"缺明确需求"才进这里**；**例外一类**：需求已出现但**用户裁定 demo 期不做**（按"用户裁定延后"记，复活条件写 MVP／用户点名）。被否决的方案不进（那归 D 号 / 复盘 / 各 Note 的「输掉的方案」节）。
> 升 pin（`sync-dsh`）时顺手回看一遍。条目一旦复活，按其性质回本表或写新提案。**别在此处写条目计数**（易腐常量，实况看表）。

| 项 | 出处 | 搁置理由（已核实） | 复活条件 |
|---|---|---|---|
| **每角色一色的分类色板令牌** | [role-identity-ux §七-2](./notes/implemented/2026-09-26-role-identity-ux.md)；用户活体证据 = [实验记录 §六](./notes/archived/2026-09-26-experiment-b-labels-and-d-mechanical.md) | 平台无分类色板令牌（182 令牌只有语义状态色），feature 包禁写字面色；用户实测同色药丸方向感"勉强能"。提案稿 = [survey §四](./notes/archived/2026-09-26-dsh-plugin-ecosystem-survey.md)，**裁定留本仓** | MVP 视觉打磨需要时，或未来决定与上游协作 |
| **审批载荷带稿件版本/哈希** | [experiment-c-quote-z](./notes/archived/2026-09-26-experiment-c-quote-z.md)（活体实证） | 审批→版本绑定只在自由文本，事件无结构化版本字段（源码核实）；实测 v2/v3 穿透错位。提案稿 = [survey §三](./notes/archived/2026-09-26-dsh-plugin-ecosystem-survey.md)，**裁定留本仓** | MVP 对账需求出现，或未来决定与上游协作 |
| **自主节律**（分身定期复盘） | [implemented/twin-cultivation](./notes/implemented/2026-09-22-twin-cultivation-and-self-learning.md) §四 | 机制不闭合：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在 live 会话投递且默认没装；全树无 cron | 上游补"外部触发 ↔ 会话内自主续跑"的 seam——**提 seam，不自建调度器**（D9/D13） |
| **并行快捷派活**（同时开几个 VP） | [delegation.md](./docs/delegation.md) §4.4 | 本组合无干净解法：缺 per-child composition 与不撞名的控制面 | 上游 seam |
| **可重放叙事场景**（原拟名「场景 D」，与 [demo.md](./docs/demo.md) 现行场景 D 撞名 ⇒ 已改名） | [implemented/presentation-narrative](./notes/implemented/2026-09-24-presentation-narrative.md) §切片二 | 需求未出现：无放映场合；素材已备 | demo／放映需求出现 |
| **注意力中心「带假设走的」条目类别**（人机合一 B3） | [implemented/human-agent-integration](./notes/implemented/2026-09-25-human-agent-integration.md) B3 | 证伪：假设只写稿件未决项，无机器事件可折；造事件 = 发明假设工具（D13 边缘） | 多物理人进场，或假设事件源出现 |
| **注意力面板「决策来源显示」**（人机合一 B4） | 同上 B4 | client 红线（用户 2026-09-25 裁决退化）；审批成对审计 + journal 留痕已覆盖回看 | 用户点名做 client 增强 |
| RemoteStream 双工流 | [harvest-ledger #2](./notes/archived/2026-09-25-harvest-ledger.md) | 无交互式面板需求 | 交互式面板（插话/追加油）立项 |
| subagent 上限 Web 设置页 | 同上 #6 | 改 patch 一行即可调，无频调需求 | 多动议并行频撞上限 |
| job-controller + terminal-controller | 同上 #7 | demo 运维线 | demo 需求出现 |
| remote-mock 测试支撑 | 同上 #12 | 现有 keyless 链够用 | client 测试需要 mock remote |
| 新工具族（ssh/browser-use/voice/PTC/auto-review/skill-office） | 同上 #14 | demo 储备不预挂（D13） | demo 卖点需求逐项点名 |
| OTLP 产品遥测 | 同上 #15 | 默认不挂载 | 运营侧使用数据需求 |
| **M2 自定义 provider** | [index](./docs/index.md) 待定 Q1（已闭合） | 只在需要**组合隔离**时才有价值；"跟 VP 连续对话"已由 team 持久成员满足 | 出现必须隔离组合的具体需求 |
| **界面外推送 / 收件箱** | [org-presence-board（已毕业）](./notes/implemented/2026-09-22-org-presence-board.md) §背景 | 需求已出现（实时卡人离台即丢）但**用户裁定 demo 期不做**——"人在台面前"成立即可；生态有现成做法（[web-push](https://github.com/blauerberg/dsh-web-push-notification) / [pager](https://github.com/wg5759/dsh-pager) / [ui-mobile](https://github.com/jasondu/dsh-ui-mobile) / [dispatch](https://github.com/alextangson/dsh-dispatch)），借设计不装 | 到 MVP 阶段按依赖门槛评估，或明确要求"人不在台面前也要收到" |
| **多人门的折中视图**（L1-E 激活：默认只见自己的门 + 一键切全局；实验 D 用户裁决「A、B 都不对，要折中」） | [multi-human-ux 毕业稿 §结论](./notes/implemented/2026-09-26-multi-human-ux.md) | **client 红线未解除**（demo 期不做 client 增强，2026-09-25 裁）；实验 D 两配置均已由用户本人否决（A 红线触发 / B 隔离过度） | 用户点名开工 client 增强时（届时先过 client 红线裁决） |
| **会话库共享文件系统后端**（S3 类；用户部署路径裁决：先本地调通，将来迁共享 FS，"只要是一个共享文件系统就行"） | [multi-human-ux 毕业稿 §结论](./notes/implemented/2026-09-26-multi-human-ux.md)（配置 B 人判腿 2026-09-26） | MVP 未到；DSH 会话库后端属上游能力（`dshHomePath`），本仓不自建（D13） | MVP 多人部署阶段；届时向上游提 seam 或评估部署架构 |
| **委派会话的人机审批路由** | [implemented/multi-human-role-routing](./notes/implemented/2026-09-26-multi-human-role-routing.md) §机制结论 | 子会话 `approval/policy` 硬编码 `never` ⇒ 分身发起的签字审批自动被拒、到不了人；人机审批实际是 Lead 专属 | 上游任一 seam：① 委派会话 `approvalPolicy` 可配置；② 审批按授权面路由 |
| **消息级协作动态流** | [implemented/r5b-cockpit](./notes/implemented/2026-09-23-r5b-cockpit.md) | host 侧 team 事件通道已核实，但客户端 stub 由 vendor codegen 生成、本 pack 无接线；自建 codegen 不值一轮 | 上游提供 pack 侧 stub 生成，或公开 host-only 投影读 RPC |

## 维护规则

- 顺序、范围或阻塞变化：改 §队列并更新相关 Note；验收完成即删除队列项。当前任务与交接规则唯一见 [guides/dev-loop §0.5/§1/§12](./docs/guides/dev-loop.md)。
- **本文件不记历史**（D26）：进展写 `notes/intents.md` 与各 Note，**不往本文件回堆**；已删历史全文在 git（`git show d159b0228e2b`）。
