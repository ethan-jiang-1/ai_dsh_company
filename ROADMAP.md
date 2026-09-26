# 队列 · 开发流（条目制，D23）

> 性质：**当前任务队列（D24）**。用户说“继续下一条”时查 §队列；只从**当前条目**取任务——§搁置池里的项**不是任务**（它不占轮、不研究，只在复活条件成立时才回队列）。
> **完成即离队**：验收通过后删除队列行，交付证据留 Note。任务入口、授权、实施和收尾唯一流程见 `docs/guides/dev-loop.md` §0.5/§1/§12。
> 队列条目默认由新对话上下文接手（D23 本仓适配）；用户明确任务优先于队列顺序。
> **队列 = 有序索引，不是全文**：feature 条目配 `notes/proposed/` RFC；问题、取舍与验收留在 RFC。队列行 ≤3 行（主题 / 状态 / 链接 / 验收指针）。Plan Mode 条件唯一见[开发环 §0.5](./docs/guides/dev-loop.md)。卫生小修与触发型条目可不设 RFC。
> **历史不在本文件**：本文件只写 now。既往维护记录见 `notes/intents.md`（时序台账）与各 Note；2026-09-26 之前的 ROADMAP 历史段已删（全文在 git，末次 blob `d159b0228e2b`——那是删除前一刻的整文件版本，`git show d159b0228e2b` 可取回）。

## 队列

**三种状态**：**▶ = 当前在办**（同一时刻只应有一个）；**⏸ = 阻塞中**（等人裁决或等外部触发——轮到也不开工，按 dev-loop §0.5 报告阻塞、触发条件与复活方）；**无标记 = 已批准待办**（RFC 已批准，队列顺序轮到即开工，**不必再求批**）。**列表顺序 = 默认执行次序**，次序只在本列表定义（不另立计划/顺序文件——fresh Agent 从这里取次序：dev-loop §0.5 分支②）。用户指定任务优先于队列顺序；若只有 ⏸，逐项报告其阻塞/触发条件及谁或什么能复活，不从历史条目推断任务。

⏸ **① 多人协作：同一个工作目录，各自开自己的门**：RFC = [proposed/multi-human-role-routing](./notes/proposed/2026-09-26-multi-human-role-routing.md)。
  机制核实 = **DSH 单操作者设计**（无账号；路由键 = agent 不是"人"）⇒ 不造"人"这一层；方案三件全现成（文件约定／每角色一扇门／搬共享目录）。
  **待你裁一个 UX 点**（一人扮多角色用哪种形态）；等裁决才开工，不占队列次序。

▶ **② 门禁真相与探针补齐**（技术债清扫第 1 条——先修尺子）：RFC = [proposed/entry-execution-chain-debt](./notes/proposed/2026-09-26-entry-execution-chain-debt.md) §方案①。
  修 B1 假绿（solution root 上 `tsc -p` 静默编 0 文件）+ B6 门禁清单单一源 + 三道门禁扩面（裸路径/pin 常量/状态行盲区）+ entry-probe 扩到执行链。
  验收 = 每道新门禁**红→还原→绿**反证；entry-probe 基线分在案。

**③ 执行链收敛**：RFC 同文 §方案②。ROADMAP 历史段处置 + 状态标记 + §9.1 补 6 行 + AGENTS 五个断指针 + 收尾动作 owner 补齐（D27／intents 压缩规则／push 落点）。
  验收 = entry-probe 复跑 + §0.5 三分支人工复核。

**④ 腐化清扫（升 pin 的消费面）**：RFC 同文 §方案③、R1–R7。七批各一 commit：版本常量 → 机制三代 → 僵尸待办 → 死指针 → 矛盾对 → 枚举清单单一源 → 噪音。
  验收 = 每批可独立 revert；死指针 0。

**⑤ 共享盘归档（非删除）**：RFC 同文 §方案④。补台账两行 + 4 场 09-26 动议建快照 + 09-26 轮末收敛（23 篇 journal → CHARTER 历史纪要）+ 身份规则 9 条 + 两道防复发门禁。
  验收 = `deliverables-check` 实跑仍 0 违规；`company-workspace/` 108 → 约 56；13 份 `final.md` 一份不动。

**⑥ 最终收敛验收**：RFC 同文 §方案⑤。地图最终形态 + entry-probe 全绿且 `conflicts` 空 + 收尾 Note + 中立体清扫。
  验收 = 全绿 + 清扫 findings 零悬空。


## 磨清单（低优先磨活；不占轮、可后台派活）

> 家规（notebook-hygiene 立，2026-09-25）：观察项与低优先磨活住这里，各带「谁来磨／何时磨」；从队列可见一跳到达。
> **升队条件（二者之一）**：① 该条目自己的触发条件成立；② 队列走空且用户点名。**别在此处写条目计数**（易腐常量，实况看列表）。

- **同 slug 撞车无门禁**（2026-09-26 实测）：两场动议共用 slug `renewal-y-2026` ⇒ 产物在共享盘上互相覆盖，
  而 `deliverables-check` 仍报 0 违规（只追溯 present 背书，不区分哪场动议）。谁来磨 = 机制面轮；
  磨法候选 = 让 `deliverables-check` 按"slug 的产物是否来自同一场 Lead 会话"报警（多来源 ⇒ 红或标存疑）；
  何时磨 = 下次门禁轮顺带，或多人协作条目开工时（它是那条的**第一号风险**）。

## 搁置池（suspended：不占轮、不研究、留复活条件）

> 判据：**只有"缺上游 seam"或"缺明确需求"才进这里**；**例外一类**：需求已出现但**用户裁定 demo 期不做**（按"用户裁定延后"记，复活条件写 MVP／用户点名）。被否决的方案不进（那归 D 号 / 复盘 / 各 Note 的「输掉的方案」节）。
> 升 pin（`sync-dsh`）时顺手回看一遍。条目一旦复活，按其性质回本表或写新提案。**别在此处写条目计数**（易腐常量，实况看表）。

| 项 | 出处 | 搁置理由（已核实） | 复活条件 |
|---|---|---|---|
| **自主节律**（分身定期复盘） | [implemented/twin-cultivation](./notes/implemented/2026-09-22-twin-cultivation-and-self-learning.md) §四 | 机制不闭合：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在 live 会话投递且默认没装；webhook 起的会话进不了 goal 循环；全树无 cron | 上游补"外部触发 ↔ 会话内自主续跑"的 seam——**提 seam，不自建调度器**（D9/D13） |
| **并行快捷派活**（同时开几个 VP） | [delegation.md](./docs/delegation.md) §4.4 | 本组合无干净解法：缺 per-child composition 与不撞名的控制面 | 上游 seam |
| **可重放叙事场景**（原拟名「场景 D」，与 [demo.md](./docs/demo.md) 现行场景 D=季度经营会撞名 ⇒ 2026-09-26 改名） | [implemented/presentation-narrative](./notes/implemented/2026-09-24-presentation-narrative.md) §切片二 | 需求未出现：无放映场合；素材（新动议类型场景）已备 | demo／放映需求出现 |
| **注意力中心「带假设走的」条目类别**（人机合一 B3） | [implemented/human-agent-integration](./notes/implemented/2026-09-25-human-agent-integration.md) B3 | 证伪：假设只写稿件未决项，无机器事件可折；造事件 = 发明假设工具（D13 边缘） | 多物理人进场，或假设事件源（上游 seam/假设工具）出现 |
| **注意力面板/台账「决策来源显示」**（人机合一 B4） | 同上 B4 | client 红线（用户 2026-09-25 裁决退化）；审批成对审计 + journal 留痕已覆盖回看 | 用户点名做 client 增强 |
| RemoteStream 双工流（client→host 流内推 item） | [harvest-ledger #2](./notes/research/2026-09-25-harvest-ledger.md) | 无交互式面板需求 | 交互式面板（插话/追加油）立项 |
| subagent 上限 Web 设置页 | 同上 #6 | 改 patch 一行即可调，无频调需求 | 多动议并行频撞上限 |
| job-controller + terminal-controller | 同上 #7 | demo 运维线 | demo 需求出现 |
| remote-mock 测试支撑 | 同上 #12 | 现有 keyless 链够用 | client 测试需要 mock remote |
| 新工具族（ssh/browser-use/voice/PTC/auto-review/skill-office） | 同上 #14 | demo 储备不预挂（D13） | demo 卖点需求逐项点名 |
| OTLP 产品遥测 | 同上 #15 | 默认不挂载 | 运营侧使用数据需求 |
| **M2 自定义 provider** | [index](./docs/index.md) 待定 Q1（已闭合） | 只在需要**组合隔离**时才有价值；"跟 VP 连续对话"的需求已由 team 持久成员满足 | 出现必须隔离组合的具体需求 |
| **界面外推送 / 收件箱** | [org-presence-board（已毕业）](./notes/implemented/2026-09-22-org-presence-board.md) §背景 | egress 只有 `sessionTelemetry`（OTel）与 hooks（命令型、拦截式），webhook 是 ingress；**2026-09-26 需求已出现**（真动议的问询卡只在"当时连着的人"那里出现，人离台即丢）——但**用户裁定 demo 阶段不做**：约定 = "人在台面前"成立即可，不上通知/收件箱（避免 demo 期复杂度）。**核过两件事**：① 钉住的 DSH 核心**没有 mobile**（`apps/` 只有 cli/desktop/desktop-host/web，docs/website 零 "mobile"、无 PWA manifest）；② 但**生态有现成做法**——[web-push 通知（tasks/approvals/questions）](https://github.com/blauerberg/dsh-web-push-notification)、[手机寻呼机 + 通知栏直接审批](https://github.com/wg5759/dsh-pager)、[移动端 Web shell 插件](https://github.com/jasondu/dsh-ui-mobile)、[dispatch 锁屏审批](https://github.com/alextangson/dsh-dispatch)。MVP 时按依赖门槛（成熟/采用/可审计）评估，**demo 期借设计不装**（同 2026-09-23 看板插件的裁决） | 到 MVP 阶段，或明确要求"人不在台面前也要收到"时 |
| **委派会话的人机审批路由** | [proposed/multi-human-role-routing](./notes/proposed/2026-09-26-multi-human-role-routing.md) §机制结论（2026-09-26 实测） | 机制边界：子会话 `approval/policy` 硬编码 `never`（`child-agent.ts:254`）⇒ **分身发起的签字审批自动被拒、到不了人**；人机审批实际是 Lead 专属。双签线因此只能落到 CEO 一扇门 | 上游任一 seam：① 委派会话的 `approvalPolicy` 可配置；② 审批按授权面路由（而非按发起 agent） |
| **消息级协作动态流**（在场板 v1 的动态流只含成员/任务迁移差分） | R5b 机制核实（[implemented/2026-09-23-r5b-cockpit](./notes/implemented/2026-09-23-r5b-cockpit.md)） | 消息内容要 host 侧折 lead 会话 team 事件（`sessionProjections.stateOf(…, 'agentTeam')` 通道已核实存在）→ 自建 Typert Remote——但其**客户端 stub 由 vendor codegen 管线生成**，本 pack 无接线；自建 codegen 不值一轮 | 上游提供 pack 侧 remote stub 生成，或公开 host-only 投影的客户端读 RPC |

## 维护规则

- 顺序、范围或阻塞变化：改 §队列并更新相关 Note；验收完成即删除队列项。当前任务与交接规则唯一见 [guides/dev-loop §0.5/§1/§12](./docs/guides/dev-loop.md)。
- **本文件不记历史**（2026-09-26 立，D26）：进展写 `notes/intents.md` 与各 Note，**不往本文件回堆**。
  2026-09-26 之前的「历史维护记录」段（358 行 / 50 条，占当时全文 86%）已删——理由：与 `intents.md`
  同事实双写、且段内两处互斥的"历史边界"声明把最新条目留在模糊区（fresh agent 会读到 5 次"队列清空"
  与现行队列冲突）。全文在 git：`git show d159b0228e2b`（删除前一刻的整文件版本）。
