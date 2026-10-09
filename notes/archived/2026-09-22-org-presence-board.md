# 2026-09-22 · 组织在场板（物理人看得见谁在忙、忙什么）

状态：**已消化（2026-09-23，R5b 收尾毕业——条目全有归宿**：在场板 / 差分动态流 / 行可点入口 =
R5b 交付，见 implemented/2026-09-23-r5b-cockpit.md（已删，历史在 git）；消息级动态流 =
进 [roadmap 搁置池](../../_backlog/_archive/legacy/suspended.md)（stub codegen 归 vendor 管线；界面外推送 = 搁置池**，2026-09-28 整池退役迁入**）**
进轮：**R5b 驾驶舱**（2026-09-22 起，见 [roadmap](2026-09-28-roadmap-retirement.md)）
梳理（2026-09-22 晚）：R5 已按 D19 拆成 **R5a 门禁与发布 / R5b 驾驶舱**，本提案属 **R5b**
（正文旧 `R5` 已全部改指 R5b）。原"开工前必须先钉四个决定"（[index 待定
Q5–Q8](../../docs/index.md)，内容与选项见 r5-plus-readiness（原审计文件，已于 R6 删除——处置见 docs/plans/content-corruption-audit.md D1）
§9 P2）**已完成（2026-09-23）**：四条都已是下文 §四个定案 的现在时陈述，"风险与未决"对应
条目已删——提案 decision-complete，可进 Plan Mode。

## 背景

数字分身是实际公司职位的对应物，所以物理人必须能回答两个问题：**我的分身此刻在不在忙**、
**它在忙哪件事**。R1 已经暴露过一次同类失败——CEO 把活丢给 VP-Eng 后，人察觉不出 VP 是一个
独立空间（../implemented/2026-09-22-r2-ui-slice-replan.md（已删，历史在 git））：
机制上线了，人却看不见。R2 的任务板活面板解决了**一场动议之内**的可见性（成员状态 + 任务修订），
但回答不了"公司里四个分身此刻各自在干什么"。

本提案把这一问拆成两半，只承诺已定的一半：

- **界面内（本提案承诺）**：驾驶舱里的组织在场板——每个分身一行，显示 preset 显示名、忙闲、
  当前任务。
- **界面外（本提案明确不做，留未决）**：分身主动推送给物理人的通知渠道。
  （2026-09-22：已进 [roadmap 搁置池](../../_backlog/_archive/legacy/suspended.md)，复活条件 = 明确的物理人通知需求 + 选定部署面。）

## 提案

1. **落点**：R5b 驾驶舱（[ui-demo §5](../../docs/design/ui-demo.md)）增加"组织在场板"切片，与既定的
   "协作动态流"共用同一条拉取通道（`remote.agentTeams.view` RPC，D-b 定案），不新增机制。
   **v1 边界（2026-09-23 机制核实）**：消息级动态流（谁给谁发了什么）需要 host 侧自建
   Typert Remote 折事件——但它的**客户端 stub 由 vendor 的 codegen 管线生成**
   （`client-ui-agent-team` 的 `TypertRemoteContribution` 是构建产物），本 pack 无此接线；
   自建整套 codegen 不在本轮垂直切片内。故 v1 动态流 = 快照差分（成员/任务迁移，纯函数
   `diffActivity`），消息级留升级路径（host 侧 `sessionProjections.stateOf(session,
   'agentTeam')` 通道已核实存在，含 `messages: TeamMessageSnapshot[]`）。
2. **三列数据的来源**（全部是现成机制；Q5/Q6 定案后的最终形状）：
   - 身份：**team roster 的 `member.name`**。r2-motion / r3-delegation 两份录制实证：
     subagent child 的 `agentPreset` 恒为发起者的 `ceo`，`agent-preset/selected` 事件合计
     0 条——**preset 不随 child 走，不能当在场板的身份源**（原方案该条作废）。
     显示名映射：`member.name` 命中 preset id → `<公司名> <角色>`；`role === 'lead'` →
     CEO 显示名（本组织 lead 恒为 CEO）；未命中 → 原样显示 name（缺失/未知不崩）。
   - 忙闲 + 忙什么：`TeamView.members[].status` 与 `tasks[].subject / status / ownerName /
     revision`（`vendor/dsh/packages/experimental/agent-team/src/types.ts:58-97`）。
   - 拉取通道 = **`remote.agentTeams.view(leadSessionId)`**（RPC 拉式）——与 R2 任务板
     `TasksPanel` 的 `load`、官方 `client-ui-agent-team` 的 `load` 同构；不订阅
     `session/event`，不需要 `ctx.sessionQuery`（Q6 定案，依据见 §四个定案 D-b），
     仍**不需要加行**。
3. **不做自由文本"活动流"**：team 读模型没有"当前活动"字段（`TeamView = { members, tasks }`，
   `:99-103`）。要更细的粒度就看各会话对话流（R2 已验收）。硬造要么改 team 包（撞 vendor
   铁律），要么重复挂载 remote（postmortem 0003 的坑）。
4. **不做界面外推送**：DSH 的 egress 只有两条——`ctx.sessionTelemetry`（OTel 出站，
   `vendor/dsh/docs/subsystems/session-telemetry.md`）与 hooks
   （`vendor/dsh/packages/hooks/README.md`）；webhook 是 **ingress**（外部投递 → 新 root session，
   `vendor/dsh/docs/subsystems/webhook.md`），方向相反。收件箱是谁、粒度多细属于部署选择，
   本提案不定。

## 四个定案（Q5–Q8，2026-09-23 钉死）

证据 = `snapshots/r2-motion/`（五人动议）+ `snapshots/r3-delegation/`（委托通道）录制手算
+ vendor 源码核对（钉住 tag）。手算脚本口径：Option A 按 session header 的
`(id, agentPreset)` 建行；Option B 折 lead.jsonl 的 `team/member` + `team/task` 事件。

**D-a（Q5）在场板主键 = team roster。** 每行 = `TeamView.members` 的一项（lead 行 + teammate
行），不以"会话 × preset"为主键。手算：Option A 下 5 行的 `agentPreset` 全部 = `ceo`
（四个分身不可辨，身份源证伪）；Option B 下折出 4 分身（vp-sales / vp-eng / coo / cfo，
phase=active）+ lead + 7 任务（owner / status / revision 全可辨），与验收判据同构。
**CEO 不再单开"公司级"视图**（原未决随之关闭）：lead 行就是 CEO 的行——`roster.list()`
恒置顶 `role: 'lead'`（vendor `agent-team/src/roster.ts:127-141`）。**边界**：不在 team 里的
会话（CEO 直起的 one-shot 委托、普通根会话）不进场板——它们不是"组织在场"的实体，可见性归
官方 lineage 槽与侧栏（已有）。

**D-b（Q6）冷启动 = 拉式 RPC，无订阅、无合并。** 面板挂载/打开即拉
`remote.agentTeams.view(leadSessionId)`，打开期间轮询——与官方 `client-ui-agent-team`
的 `load`（`src/client/mount.ts:40-42`）和本 pack R2 `TasksPanel` 完全同构。刷新后面板
**非空**：视图由 host 侧 team journal 的 durable 态重建（`TeamMemberSnapshot` /
`TeamTaskSnapshot` 落在 lead 会话日志的 `team/*` 事件里）；live 缺席时成员显示 `inactive`
而不是行消失（`roster.list()`：`live?.status ?? 'inactive'`）。离线判据：r2-motion 纯事件
（无进程、无 sessionQuery）折出非空板——同一条折法就是回放验收（判据 4）的读模型。

**D-c（Q7）status 文案 = 中文映射 + 团队限定。** 状态列头标「团队内状态」，值不直显英文：
running→执行中、idle→待命、inactive→未上线、provisioning→启动中、failed→故障；板底一行
说明「状态 = 该分身在本场团队动议中的忙闲」。依据：`status` 是 agent driver 的 team 内忙闲，
不等于"这个人此刻在工作"（场景 B 实证过物理人会误读）。

**D-d（Q8）成员空间入口 = 在场板行可点。** teammate 行点击 = `refreshSubagents(lead)` →
`sessions.openSubagent({ parentSessionId: lead, childSessionId: member.id, mode:
'continuable' })`（照 vendor `openTeammate` 模式，`client-ui-agent-team/src/client/mount.ts:53-62`；
`member.id` 即 child 会话 id，r2-motion 的 `team/member` 事件实证）；lead 行点击 =
`sessions.open(leadId)`。**对非 team child 同样可达**：`openSubagent` 寻址按父会话的
subagent catalog——`SubagentListEntry` 含 `one-shot` 与 `continuable` 两态、与 team 无关
（`vendor/dsh/packages/subagent/subagent/src/control-types.ts:33-77`），`selectSubagent`
只校验 catalog 内 kind=child 且 mode 匹配（`session-controller/src/client/sessions/manager.ts:189-204`）；
将来若把 one-shot 委托工人列上板，同一入口换 catalog 的 mode 即可。侧栏分组不做（不动
shell 会话列表语义）；头部动作位已有官方名册（order 20）与本 pack 任务板（order 21），不重复加。

## 依据（实际查过）

- `session/event` 是公开 scoped 服务事件：
  `'session/event'(this: Scoped<Session>, session: Session, event: SessionEvent)`
  ——`vendor/dsh/packages/core/session/src/index.ts:72`。R5b 协作动态流的数据路径同此。
- `ctx.sessionQuery` 是 host 侧读面，`live` 字段即"当前存在于 `ctx.sessions`"。
- workspace 归属按 `SessionHeader.cwd`（`vendor/dsh/docs/subsystems/workspace.md`）。
- 第一方 client 面已有 `ui-session` / `ui-sidebar` / `ui-jobs` / `ui-goal` / `ui-agent-preset`
  等现成可视面（`vendor/dsh/packages/client/`）——本切片是**聚合与身份映射**，不是重造列表。

## 输掉的方案

- **与培养/学习/共享盘合成一篇大提案**：Agent Note 的生命周期按文件移动，proposed → implemented
  要整篇改骨架（`vendor/dsh/.agents/notes/README.md`），而四问毕业轮次不同，合篇会产生
  "半实现"的非法态。
- **自建活动流 / 重复挂载 team remote**：postmortem 0003（重复挂载砖全 UI）+ vendor 铁律
  （一个字节都不改 vendor）。
- **把 session-telemetry 当唯一答案**：它是给运维的日志管道，不是给人看的组织视图，且后端由
  部署方选。
- **给每个分身开一个常驻会话当"在线状态"**：DSH 的会话不是常驻进程，空会话没有"在线"语义，
  成本换不来信息。
- **host 自建 Typert Remote 做消息级动态流**：客户端 stub 由 vendor codegen 管线生成，本 pack
  无接线。v1 动态流 = 快照差分；消息级留到有现成 stub 再开。
- **用 `paceMs` 修 queued 差异**：vendor 写明 correctness must never depend on it。
- **注意力中心加态势条或主动推送成员进度**：进度面 = 在场板；注意力只留「需要你」。没人要「不点开就看总数」之前不加态势条。ETA 不做。

## 验收判据

R5b 切片完成时，以下都必须是**代理能自己跑**的检查（D15）：

1. host 侧 keyless 单测：给定 roster + 会话事件流，在场板读模型输出「lead + 四个分身」五行 ×
   (显示名, 团队内状态文案, 当前任务 subject)（D-a 主键 + D-c 文案），缺失/未知状态不崩
   （进 `pnpm test` 家族）。
2. `node scripts/client-load-smoke.mjs`：真页面加载后**零插件挂载失败**（驾驶舱的新注册
   走同一条健康路径，注册抛错会被它抓）；**页签在场 + 行可点**的真页断言由
   `replay-smoke --ui --scenario r2-motion` 承担（真会话真数据，验收 5 同流程）。
3. 端到端（真模型，排练场微动议 2 分身——窄证据：四角色走同一条 roster/状态/任务机制路径，
   全量验证归 demo 分镜）：任一分身接活后状态列转「执行中」，其 in_progress 任务 subject
   随后出现（窗口断言 ≤15s；R5b 实测 claim 晚于 spawn 约 6s = UI 5s 轮询下一拍，非同帧）；
   任务完成转「完成」。复跑入口 = `node scripts/presence-e2e-smoke.mjs`（认证档，真模型）。
4. 回放：`snapshots/r2-motion/` 的录制喂给读模型产出**非空**在场板（4 分身行 + lead 行 +
   7 任务；无 key）。r2 是 lead + 4 child 的**五会话形状**，按 `snapshots/<scenario>/replay/`
   约定建新场景（组合 patch + `DSH_SNAPSHOT_CHILD_FILES` 多 child 映射 + snapshot.yml），
   不套 r3-delegation 的两会话形状；驱动用 `replay-smoke --scenario`（harness 已就绪）。
   **落地（2026-09-23）**：场景建成并绿（`replayJudges: presence` 档——会话数 5 +
   member/task 事件集合逐条等价 + 在场板同形；queued 尾部 2 条投递差为重放时序固有边界，
   显式记录不判据，理由与实证见该 snapshot.yml 注释与 replay-smoke 头注）。
5. 成员空间入口（D-d）：真浏览器（认证档 `replay-smoke --ui` 扩展）断言在场板行可点、
   点击后该成员会话成为当前会话（判据口径 = 可访问名）。

## 现场反馈（2026-09-22，用户观演场景 B）

用户按"侧栏切到 VP-Eng 空间"找不到入口——**teammate 会话不作为顶层会话出现**，官方入口在
会话头部的 Team 名册（`sessions.openSubagent`）。反馈原话："这在哪我没看到界面上有吗"。
⇒ R5b 皮肤必须补一个**显式的"进入某位成员的空间"入口**（名册行可点 / 头部动作 / 侧栏分组），
否则"谁在哪个空间"只能靠讲解——这正是 R2 验收判据要消灭的东西。
