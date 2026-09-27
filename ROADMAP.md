# 队列 · 开发流（条目制，D23）

> 性质：**当前任务队列（D24）**。用户说“继续下一条”时查 §队列；只从**当前条目**取任务——§搁置池里的项**不是任务**（它不占轮、不研究，只在复活条件成立时才回队列）。
> **完成即离队**：验收通过后删除队列行，交付证据留 Note。任务入口、授权、实施和收尾唯一流程见 `docs/guides/dev-loop.md` §0.5/§1/§12。
> 条目默认由新对话上下文接手、用户明确任务优先——**规则正文唯一见 [开发环 §0.5](./docs/guides/dev-loop.md)**。
> **队列 = 有序索引，不是全文**：feature 条目配 `notes/proposed/` RFC；问题、取舍与验收留在 RFC。队列行 ≤3 行（主题 / 状态 / 链接 / 验收指针）。Plan Mode 条件唯一见[开发环 §0.5](./docs/guides/dev-loop.md)。卫生小修与触发型条目可不设 RFC。
> **历史不在本文件**：本文件只写 now。既往维护记录见 `notes/intents.md`（时序台账）与各 Note；2026-09-26 之前的 ROADMAP 历史段已删（全文在 git，末次 blob `d159b0228e2b`——那是删除前一刻的整文件版本，`git show d159b0228e2b` 可取回）。

## 队列

**三种状态**：**▶ = 当前在办**（同一时刻只应有一个）；**⏸ = 阻塞中**（等人裁决或等外部触发——轮到也不开工，按 dev-loop §0.5 报告阻塞、触发条件与复活方）；**无标记 = 已批准待办**（**范围**已在 RFC 里获批；轮到它时**是否还需 Plan Mode 呈批按 dev-loop §0.5 判**——用户已明确批准具体计划时不重复求批，否则默认先呈批。本节只管**次序**，不管授权）。**列表顺序 = 默认执行次序**，次序只在本列表定义（不另立计划/顺序文件——fresh Agent 从这里取次序：dev-loop §0.5 分支②）。用户指定任务优先于队列顺序；若只有 ⏸，逐项报告其阻塞/触发条件及谁或什么能复活，不从历史条目推断任务。


## 磨清单（低优先磨活；不占轮、可后台派活）

> 家规（notebook-hygiene 立，2026-09-25）：观察项与低优先磨活住这里，各带「谁来磨／何时磨」；从队列可见一跳到达。
> **升队条件（二者之一）**：① 该条目自己的触发条件成立；② 队列走空且用户点名。**别在此处写条目计数**（易腐常量，实况看列表）。

- ~~**同 slug 撞车无门禁**~~ **已磨（2026-09-26，技术债 ⑤）**：`deliverables-check` 新增**观察项档**
  `slug-collision`（同一 slug 的成品被多个 Lead 会话声明过 ⇒ 每次提醒，不判红——判红会让门禁
  永久带伤）＋ 回归；实测抓出 2 例（`renewal-y-2026`、**`agent-workflow`**）。手册同时立了
  「slug 唯一性」规矩（CEO 派活前先看同名）。

- **`owners.md` 与 `routing.ts` 的重复事实家**（2026-09-26 新观察）：`company-workspace/kb/owners.md`
  是"谁签得动"的事实家，而 `packages/company-pack/src/lib/routing.ts` 里有一份**硬编码的表副本**
  （`OWNERS_TABLE`，当前无生产消费者、只有测试用）——两边必须手工保持一致，多物理人进场后已出现过
  一次不一致风险。谁来磨 = 维护者；磨法候选 = 让 client 数据面读 `kb/owners.md`（**红线：要动 client
  数据层**，未批）；何时磨 = 用户点名，或注意力面板真要用这份路由时。
- **`snapshots/` 层瘦身审计**（2026-09-26 新观察；**审计已出，见下**）：谁来磨 = 维护者；
  何时磨 = 用户点名或下次做 demo 资产清理时。**动它风险高**（回归资产），先审计再动手。
  **消费面盘点（2026-09-26 夜，证伪瘦身方案）**：`r2-motion/sessions/` 有三个功能消费面——
  `replay-smoke`（replay+ui 双 lane 按名读取）、`deliverables-check --sessions`、
  `tests/deliverables.spec.ts:170`（vitest **直读** `sessions/lead.jsonl`）⇒
  原拟"sessions/ 换指针"**不可行**（打断 vitest 与审计两个真消费面）；
  「内容逐字节相同 ≠ 可删」第二次实证（第一次 = raw/ 反证，见 `snapshots/r2-motion/README.md`）。
  瘦身挂起，直到真实存储压力出现且愿以录制保真度换空间。

  **审计结果（2026-09-26，只读测量）**：`snapshots/` = **34 MB / 547 追踪文件**（占全仓 818 文件的
  **67%**）。体积集中在一个目录：**`r2-motion/` 20 MB = 快照总量的 59%**；其余大头依次
  q3-business-review 3.3M / r4-motion 1.8M / emergency-x 1.4M / scenario-b 1.4M / attention-e2e 1.3M。

  **`r2-motion/` 内部同一批会话日志存了三次**（19 MB 装 6.4 MB 的原始日志）：

  | 副本 | 体积 | 角色 | 能不能动 |
  |---|---|---|---|
  | `sessions/*.jsonl`（原始名，child 带 uuid） | 6.4M | **历史归档**，也是 `replay-smoke --prepare` 的回退源（`replay-smoke.mjs:198` 明写"从 sessions/ 归档拷入"） | 与 raw 二选一 |
  | `replay/raw/*.jsonl`（改名） | 6.4M | `replay-smoke` 的**直接输入**（`:65,:83`） | **实测 5/5 哈希与 `sessions/` 全同 ⇒ 逐字节改名副本**，可从 `sessions/` 再生 ⇒ **最干净的 6.4M** |
  | `replay/session*.v3.jsonl` | 6.2M | `--prepare` 产出的**归一化 fixture**（重放真正读它） | **不能动**（功能性） |

  **结论（2026-09-26 修订——原判被反证证伪）**：
  - ❌ ~~`r2-motion/replay/raw/` 是零风险的一刀~~ **错了**。实测：删掉后跑完成定义
    `node scripts/replay-smoke.mjs --scenario r2-motion` ⇒ **3 处红**（`持久化会话数 = 1（lead + 0 child）`、
    member/task 集合等价、在场板同形）；还原后复跑 ⇒ ALL PASS。**根因**：`childRaws()`
    （`replay-smoke.mjs:83`，读 `replay/raw/`）**在重放路径里也用于发现子会话**，不是只服务 `--prepare`。
    ⇒ **`raw/` 是功能性资产，不是冗余副本**；「内容逐字节相同」**不等于**「可删」——同一份内容的两种
    命名，各自被不同代码路径**按名读取**。负知识写在 `snapshots/r2-motion/README.md`。
  - 仍然成立的两条：① 体积账没变（34 MB / 547 文件 / 占全仓 67%；`r2-motion` 20 MB = 59%），
    大头在**会话日志与归一化 fixture**，那是功能性的、动不了；② `r3-delegation` 的 `raw/` 与它的
    `sessions/` **哈希零交集**（另一次录制）⇒ 任何瘦身必须**逐场景实测**，不能类推。
  - **下一步该往哪找**（若真要瘦身）：不在"重复副本"，而在**会话日志本身**（`r2-motion` 6.4M 原始 +
    6.2M 归一化）——例如**归一化 fixture 是否能只留 `session*.v3.jsonl` 而把 `sessions/` 换成
    指针**（但 `deliverables-check --sessions` 读 `sessions/`，要先查消费面）。**动手前先列消费面。**

- ~~**B12 的行为面**~~ **已磨（2026-09-26，触发条件 = 动真盘行为规矩时）**：认证档 = `scripts/budget-signoff-probe.mjs`
  （真模型 ≈$0.1–0.2、排练场、可复跑）。**一正一负双向判据**（只测负例会假绿——模型可能压根不会用那个工具）：
  负例 $800/月 固定支出 ⇒ **不得**发 `request_signoff`（实测 false ✓）；正例 8.5 折报价 ⇒ **必须**发
  （实测 true ✓）。⇒ 手册那条规矩**文本面 + 行为面都闭合**。

- **`renewal-y-2026` 两场动议的逐文件归属**（2026-09-26 新观察）：该目录混装两场（一场中途卡死、
  一场跑完），归档按"整目录 + README 说明"处理。逐份 drafts 归属哪一场**未核实**；谁来磨 = 维护者；
  何时磨 = 若将来要拿它当判据档，先分清再引。

- ~~**`kb/owners.md` 与 `kb/motion-ledger.md` 未进排练场镜像**~~ **已磨（2026-09-26，触发条件 = 动排练场时）**：
  `rehearsal.mjs` 现镜像 **kb 根三件事实家**（org / owners / motion-ledger），并补了**回归**
  （纯夹具 + 红→还原→绿反证）。原观察：`rehearsal.mjs`
  只镜像 `org.md` / CHARTER / `templates/` ⇒ 排练场里的角色**看不到授权面与经营台账**。疑似缺口
  （排练动议若要按 owners.md 路由就会缺料）。谁来磨 = 维护者；磨法候选 = 把这两件加进镜像清单；
  何时磨 = 下次动排练场时。

- **dev home 的探针会话残留**（2026-09-26，gitignored 运行态）：驾驶舱会话库里留着
  `动议观察 · 23684`、`两门实测 8590`、`门路由测试 ×2`、`DAG 中途形态 · 长链动议 81160` 等证据场，
  另有**已退役的 `company` profile**（`file:` 装法 + web-app 钉在 0.1.5-rc.2）。都是证据，留着无妨；
  要清就在 UI 里删会话 + 删 profile 目录。谁来磨 = 维护者；何时磨 = 需要腾空间或做干净 demo 时。

## 搁置池（suspended：不占轮、不研究、留复活条件）

> 判据：**只有"缺上游 seam"或"缺明确需求"才进这里**；**例外一类**：需求已出现但**用户裁定 demo 期不做**（按"用户裁定延后"记，复活条件写 MVP／用户点名）。被否决的方案不进（那归 D 号 / 复盘 / 各 Note 的「输掉的方案」节）。
> 升 pin（`sync-dsh`）时顺手回看一遍。条目一旦复活，按其性质回本表或写新提案。**别在此处写条目计数**（易腐常量，实况看表）。

| 项 | 出处 | 搁置理由（已核实） | 复活条件 |
|---|---|---|---|
| **每角色一色的分类色板令牌** | [implemented/role-identity-ux §七-2](./notes/implemented/2026-09-26-role-identity-ux.md)；**用户活体证据（2026-09-26）**：方向感"勉强能"、五角色同色黑药丸区分全靠读字（[实验记录 §六](./notes/research/2026-09-26-experiment-b-labels-and-d-mechanical.md)） | 平台令牌盘点（design-platform.css 182 个）只有语义状态色（error/success/warn/business），挪给角色用会误导；feature 包禁写字面色（styling 纪律）⇒ 现状 = 全角色共用品牌色 + 文字缩写 | 提上游 seam（提案稿 = [plugin-ecosystem-survey §四](./notes/research/2026-09-26-dsh-plugin-ecosystem-survey.md)），或用户点名 |
| **审批载荷带稿件版本/哈希** | [research/experiment-c-quote-z](./notes/research/2026-09-26-experiment-c-quote-z.md)（活体实证） | 审批→版本的绑定只活在 `request_signoff` 的自由文本参数里，`approval/asked`/`decided` 事件无结构化版本字段（源码核实）⇒ 实证：两半审批钉 cfo v2、CFO 签字轮推稿到 v3 ⇒ 盘面/审批错位，靠 final 人工对账兜住 | 提上游 seam（提案稿 = [plugin-ecosystem-survey §三](./notes/research/2026-09-26-dsh-plugin-ecosystem-survey.md)）；或 MVP 阶段对账需求出现 |
| **结构化派活字段进手册**（CEO 任务书模板加机器可读派活行 + 各角色收工回写纪律；实验线结论 = **要，配两条前置纪律**：状态回写 + 双源核对矛盾即"待核实"） | [implemented/multi-human-ux §结论](./notes/implemented/2026-09-26-multi-human-ux.md) | **用户裁定待批**（实验 B 确认值：R2 60%/60% 显著优于 R1 的 40%/44%；但状态行不回写就漂——quote-z 关闭后三条过期待办实害）；审批/取消/无稿任务三类不进扫描 = 机制事实 | 用户点头 → 改手册/skill + candidate-scan 打分复跑；拒绝则记「输掉的方案」 |
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
| **委派会话的人机审批路由** | [implemented/multi-human-role-routing](./notes/implemented/2026-09-26-multi-human-role-routing.md) §机制结论（2026-09-26 实测） | 机制边界：子会话 `approval/policy` 硬编码 `never`（`child-agent.ts:254`）⇒ **分身发起的签字审批自动被拒、到不了人**；人机审批实际是 Lead 专属。双签线因此只能落到 CEO 一扇门 | 上游任一 seam：① 委派会话的 `approvalPolicy` 可配置；② 审批按授权面路由（而非按发起 agent） |
| **消息级协作动态流**（在场板 v1 的动态流只含成员/任务迁移差分） | R5b 机制核实（[implemented/2026-09-23-r5b-cockpit](./notes/implemented/2026-09-23-r5b-cockpit.md)） | 消息内容要 host 侧折 lead 会话 team 事件（`sessionProjections.stateOf(…, 'agentTeam')` 通道已核实存在）→ 自建 Typert Remote——但其**客户端 stub 由 vendor codegen 管线生成**，本 pack 无接线；自建 codegen 不值一轮 | 上游提供 pack 侧 remote stub 生成，或公开 host-only 投影的客户端读 RPC |

## 维护规则

- 顺序、范围或阻塞变化：改 §队列并更新相关 Note；验收完成即删除队列项。当前任务与交接规则唯一见 [guides/dev-loop §0.5/§1/§12](./docs/guides/dev-loop.md)。
- **本文件不记历史**（2026-09-26 立，D26）：进展写 `notes/intents.md` 与各 Note，**不往本文件回堆**。
  2026-09-26 之前的「历史维护记录」段（358 行 / 50 条，占当时全文 86%）已删——理由：与 `intents.md`
  同事实双写、且段内两处互斥的"历史边界"声明把最新条目留在模糊区（fresh agent 会读到 5 次"队列清空"
  与现行队列冲突）。全文在 git：`git show d159b0228e2b`（删除前一刻的整文件版本）。
