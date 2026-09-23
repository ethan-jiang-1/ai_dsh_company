# Roadmap · 垂直轮迭代（每轮一场动议从 CEO 进出，系统先起来再逐轮加宽）

> 性质：**计划层**——被实现逐轮吞掉（验收进 docs/ 合同、决策进 notes/、过期即修订）。
> 2026-09-21 重切（D11）：原"先全角色（阶段 1）后团队（阶段 2）"的横切否决，改垂直轮——
> 交付按完整垂直切片、验证按最窄证据、打磨蛇形折回；原 M1 独立会话验证不丢，降为轮内
> 最窄验证。UI 归轮：现成团队 UI 在 R1 作观察窗、R2 进验收；自定义皮肤 R5b（30 §5）。
> **每轮换全新对话上下文执行**——交接不吃上下文，靠文末两份清单。

| 轮 | 状态 | 做什么（垂直：动议从 CEO 进、交付从 CEO 出） | 轮内最窄验证 | 验收（外部可观察） | 合同/内容随之出生 |
|---|---|---|---|---|---|
| R0 立环 | ✅ 完成 | 环境：submodule 钉 tag + workspace + AGENTS.md + 双 home | `pnpm verify` 结构门禁 | `pnpm dsh --profile headless "hi"` 从源码跑通；typecheck 解析到 DSH src | `profile.md` 骨架 |
| R1 两人公司 | ✅ 完成 | CEO + VP-Eng（骨架 persona + 各 1 个核心 skill）；pack 装进 web profile 作**观察窗**（零自定义 UI）；一条最小动议（Q4 已定：「给我们公司要不要自建知识库写一页技术评估」）：收动议 → spawn teammate → 派一任务 → VP 出稿 → CEO 收口 `present` | 两角色入戏探针：**Web 会话**分别选 CEO / VP-Eng preset（⚠ headless 不挂 preset，见 [10 §6](../design/10-architecture.md) 要点 6） | **Web 会话**里一场完整动议的会话日志 + `deliverables/` 第一份交付物（UI 是唯一载体，不是红利） | CEO/VP-Eng 的 40 号文案；`demo.md` 雏形 |
| R2 全员（五角色） | ✅ 完成（机制+门禁；UI 观演待下次开窗） | +VP-Sales +COO +CFO（文案+skills）；任务板 DAG 分派；VP 间至少一次互审（mailbox 跨层级）；fork teammate 下发会议上下文；pack 头部任务板升级为**活面板**（打开期间自动刷新，成员状态/任务修订双侧实时） | 新增两角色独立会话探针；task CAS 拒绝过期修订 | [30-ui-demo](../design/30-ui-demo.md) §3 分镜 v0 按「两空间镜头」走：**不讲解也能看懂谁在哪个空间、活怎么交接**；消息不丢不重 | `presets.md`（五角色语义合同）；40 号补全 |
| R3 汇报线 | ✅ 完成（2026-09-22） | **team 两包直插行**（R1 起就已直插，本轮只做"并存不互破"的验证）；CEO 加 `vp_eng`/`vp_sales` 命名委托工具（**one-shot 前台** + per-instance persona + `maxDepth: 1`——原计划的 continuable 被 team shadow 实证否掉，见 D18）；**委派工具卡**（`tool.call.toolview` 薄片，自 R5 v2 提前——机制与它的脸同轮交付） | shadow 边界真跑取证：CEO 会话的控制名归团队版、按成员**名字**寻址（`scripts/delegation-smoke.mjs`；`--delegate` 真委派一次断言前台拿到稿子） | 委派出稿（前台拿结果）→ 再委派一次带上一稿改稿；委派卡由 **keyless 行为层**守（`tests/delegation-card.spec.ts`）+ 真页面挂载冒烟；**端到端真 UI 留给 R5a replay**；边界有回归守卫 | `delegation.md`（D18）；`notes/implemented/2026-09-22-r3-reporting-line.md` |
| R4 成品流程 | ✅ 完成（2026-09-22） | templates + deliverables 流程全量接入；**共享盘卫生**（[implemented/workspace-hygiene](../../notes/implemented/2026-09-22-workspace-hygiene.md)）：交付物三态（成品 `deliverables/<slug>/final.md` 必须来自一次 `present`、过程稿进 `drafts/`、排练产物不进 deliverables）、练习场 ≠ 运行场（排练换 workspace 目录） | 模板即流程：写作类工作流第一版 = 模板 + skill 指引；keyless 交付物检查脚本 | 端到端写作流水线：brief → 分头出稿 → 互审 → 合稿落 `deliverables/`；**每份 `final.md` 可回溯到 `deliverables/presented` 事件**（oracle = `snapshots/r1-motion/session.jsonl`，加一份无 `present` 的文件即变红） | `demo.md` 定稿 |
| R5a 门禁与发布 | ✅ 完成（2026-09-23） | **无 key replay harness**（P1.1 窄研究 → P1.2 落地 → P1.3 委派卡端到端：`replay-smoke --ui` 真浏览器 + ariaSnapshot 金样 + sidecar×4，判据口径 = 可访问名）；`release-smoke`（构建 → `npm pack` → 干净 profile → `plugin add` → boot 冒烟）与 `sync-dsh`（检查 + `--pin` 升级环）；**发布欠账闭账**：`peerDependencies`（17 个，不钉死）+ `dsh.compatibility` 矩阵 + description 五角色 + `pnpm verify` 新门禁 `pack-compat`（升 pin 忘加列即红，已反证） | 双判据全过：replay **绿** = 无 key 11s 全绿（日志零 diff + sidecar 零 diff + 委派卡 ×1 + ui 金样零 diff）/**红** = 摘 `company-client` 行三连红还原复绿；release-smoke 干净 profile 全绿（开发中三次真实红 = 敏感度实证：tsdown shim 路径 / `plugin --profile` 位置 / web boot 语法）；layering 守卫扩（P1.4）双红证 | **委派卡端到端在 replay 里无 key 断言通过** ✅；`npm pack` → 干净 profile → `dsh plugin add` → 冒烟通过 ✅ | `release.md`（已出生）；[implemented/2026-09-23-r5a-gates-and-release.md](../../notes/implemented/2026-09-23-r5a-gates-and-release.md) |
| R5b 驾驶舱 | ✅ 完成（2026-09-23） | [30-ui-demo](../design/30-ui-demo.md) §5 v1 驾驶舱页签（Company 右栏 page 型 tab：**组织在场板**（[org-presence-board（已毕业）](../../notes/implemented/2026-09-22-org-presence-board.md)，Q5–Q8 开工前钉死 = 提案 §四个定案：主键 team roster / 拉式 RPC / 中文状态文案 / 行可点）+ **差分动态流**；数据 = `remote.agentTeams.view(lead)` 拉式 + 5s 轮询，纯读模型 `pack src/lib/presence.ts`（消息级动态流进搁置池：客户端 stub codegen 归 vendor 管线，host 投影通道已核实））；v2 委派工具卡已于 R3 交付 | 在场板读模型 keyless 单测 14 条（rows / diffActivity / 事件折算 / 防漂移）；r2-motion replay 场景（五会话形状，`replayJudges: presence`）默认档绿 + `--ui` 驾驶舱端到端绿（页签/5 行/列头/点行切会话，无 key 33s）；client-load-smoke + preset-smoke 绿；判据 3 真模型时间线（排练场 2 分身：22s running → 28s subject → 217s completed） | 驾驶舱一屏流动（含在场板：分身接活转「执行中」+ 任务 subject 出现 + completed 全程时间线）；**不靠讲解能点进某位成员的空间**（replay --ui 面包屑断言） | 无（[30 §5](../design/30-ui-demo.md) 已随轮更新；[implemented/2026-09-23-r5b-cockpit.md](../../notes/implemented/2026-09-23-r5b-cockpit.md)） |
| R6 内容诊治 | 🔄 进行中（2026-09-23 开工；插入原因与章程见维护规则，范围增补见 D23） | **内容诊治**（不交付新功能；两条线，同一目标 = **让今后的开发更舒适**）。**线 A · 内容腐化诊治**，五面：① **docs/ 全层**（计划层躺已 ✅ 的历史段、已闭合待定 Q 挂着、过期指代、r5-plus §5 型语义漂移）；② **AGENTS.md 入口链**（「当前状态」沉积五轮收尾快照、与 roadmap 轮间待办整段双写——违反「一处事实一个家，只写 now」）；③ **company-workspace**（公司手册 + kb 审计；**R4「journal 不压」决定默认不重开**，重开须带新证据提案）；④ **notes/ 指针核对**（状态行 / 归属 / 引用可达；**历史记录不重写**）；⑤ **docs/ 命名体系**（时间编码命名 → 主题命名，`r5-plus-readiness` 首案；命名规则进文档卫生合同）。**线 B · 流程对齐审计**：本仓是 DSH 研发纪律（D13）的**头一次实际使用**——对照**从 vendor 逐源枚举的全量纪律清单**逐条核对已闭轮实践（AGENTS.md 纪律表是记忆版，审计后替换；研究基线 = [research/2026-09-23-dsh-inround-task-surface](../../notes/research/2026-09-23-dsh-inround-task-surface.md) §二–§四）（届时 R0–R5b；**权威在 vendor 树**，不认本仓转述），抓两类偏差：没严格遵循的、把「灵活性」理解错的（哪些是允许的规模裁剪、哪些是违规偏离——弹性边界写清）；修正 = 改实践 / 改落点映射。新增两支：**过程可见性**（plan mode 呈批 + 实施期 todo_write——机制在场零纪律，落点候选 guides/60 §1 / AGENTS.md 纪律表）与**迭代模型**（垂直轮 vs DSH 连续流；D23 已定向 R6 后转 feature 流，审计定弹性边界与转型细节）。**审计先行**：先落两份清单——「腐化点清单」（线 A，逐文件逐类）与「流程偏离清单」（线 B，逐条纪律），诊断件本身是产物，细化琢磨都在清单上；量若超一轮按 D11 拆轮（R5→R5a/b 先例）。**定位 = 首次全量 + 把「磨」制度化，不承诺一次扫净**（卫生要磨几轮：本轮建防回堆机制，此后按机制磨）。**转型落盘（D23）**：R6 = 最后一个轮号——收尾交付 DSH 对齐 feature 流：plans 层队列化（条目按主题命名、**完成即离队**不标 ✅）、guides/60 改条目级开发环（含实施期 todo_write 纪律）、AGENTS.md 同步；R7「分身成长」转队列首条（范围与前置不变）；此后**默认严格 DSH 套路，偏离须登记 D 号 + 约束证据** | 两份清单先行落盘（先诊断后动手）；防回堆机械门禁**有反证**（故意造一处腐化 → `pnpm verify` 红、还原即绿）；入口链探针进**认证档**（真模型不进回归，guides/60 §9.1） | **入口链探针**：全新上下文 Agent 只读 AGENTS.md → 00-index → 本表，答 N 个「现在」问题（当前轮 / 下一步 / 某事实的家在哪等，题单轮内定）**零过期、零自相矛盾**，归档进 snapshots；**两份清单逐条销账**（修掉 / 转待办 / 明确不做，各有归宿）；**防回堆门禁进 pnpm verify** 且带反证记录（含 plans 层禁 ✅ 残留档）；**转型合同出生**（队列形态 + 条目生命周期 + todo 纪律落点 + 偏离登记制度） | 文档卫生合同（名字与落点轮内定：guides/60 / 00-index / 顶层新合同）；线 B 弹性边界结论落 AGENTS.md 纪律表 / guides；若收尾清单因此增「卫生项」则改本表收尾清单；流程合同（feature 流现在时，含防再犯五件套） |
| R7 分身成长 | ⏸ 待命（**前置全清**：接线两条已落地、U1 探针并入轮间待办 ①；**排在 R6 内容诊治之后**；2026-09-23 前为 R6） | **培养回路**：改 `presets/<role>/` 即培养动作，生效边界 = 新会话，验收 = 三道门禁 + 该角色入戏探针；**学习载体**：journal 唯一，人审提升进 skills（照 DSH `human-review-skill-maintenance` 取舍），**否决分身运行时自改 skill**（隔离后已是机制事实）；**不做自主节律**（提 upstream seam，不自建调度器）（[proposed/twin-cultivation-and-self-learning](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md)） | U1 活体探针（✅ 已随轮间待办①完成：结论 = 三档之②「只有新会话变」，见 research/digital-twin §5.5）；培养回归：改一次角色 skill → 三道门禁 + 该角色探针全绿、**旧会话不受影响** | 一次完整回路：动议结束 → journal 有教训 → 人提升进 pack skill → 三道门禁 + 探针全绿，且旧会话不受影响 | 培养/学习合同（名字待定） |

## 队列（D23 条目制过渡形态；结构随 R6 收尾定稿）

- **分身成长**（原 R7 条目，⏸ 队列首条——范围与前置不变，全文见轮次表 R7 行与 D21/D23）。
- **整治转待办**（R6 销账落入；低优先）：
  - notes/implemented 归档层评估（原 r5-plus §7.4 迁入）：候选 = repo-scaffolding / docs-layering / dev-loop-guide / wochen-naming / r0-loop-acceptance / r1-docs-sync；仍带活判据的六篇（r3-reporting-line、skill-root-isolation、client-remote-single-mount、r2-roles-alive、r2-motion-run、r1-deploy-findings）不要动。
  - COO 产出模板指认改齐（W3）：pack persona + 三 skill 从 `review-note.md` 改 `ops-review-note.md`（CHARTER 勘误已裁定）；改齐后 CHARTER 勘误行可移除。
  - invest-mobile-complement 两篇 journal 补记或登记豁免（W8）：手册「收工留痕」vs 实盘缺 vp-eng/vp-sales 纪要。
  - 互审稿命名钉一个系列（W9）：建议 `{role}-review`（与 reconcile-package 首例一致）；存量不动。
  - 五份 CHARTER「收工动作」三态措辞对齐（W11）：交付物写 `<slug>/drafts/<角色>.md`。

## 搁置池（suspended：不占轮、不研究、留复活条件）

> 判据：**只有"缺上游 seam"或"缺明确需求"才进这里**；被否决的方案不进（那归 D 号 / 复盘 / `rejected`）。
> 升 pin（`sync-dsh`）时顺手回看一遍。条目一旦复活，按其性质回本表或写新提案。

| 项 | 出处 | 搁置理由（已核实） | 复活条件 |
|---|---|---|---|
| **自主节律**（分身定期复盘） | [proposed/twin-cultivation](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md) §四 | 机制不闭合：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在 live 会话投递且默认没装；webhook 起的会话进不了 goal 循环；全树无 cron | 上游补"外部触发 ↔ 会话内自主续跑"的 seam——**提 seam，不自建调度器**（D9/D13） |
| **并行快捷派活**（同时开几个 VP） | [delegation.md](../delegation.md) §4.4 | 本组合无干净解法：缺 per-child composition 与不撞名的控制面 | 上游 seam |
| **M2 自定义 provider** | [00-index](../00-index.md) 待定 Q1（已闭合） | 只在需要**组合隔离**时才有价值；"跟 VP 连续对话"的需求已由 team 持久成员满足 | 出现必须隔离组合的具体需求 |
| **界面外推送 / 收件箱** | [org-presence-board（已毕业）](../../notes/implemented/2026-09-22-org-presence-board.md) §背景 | egress 只有 `sessionTelemetry`（OTel）与 hooks，webhook 是 ingress；收件人是谁、粒度多细属部署选择 | 明确的物理人通知需求 + 选定部署面 |
| **消息级协作动态流**（在场板 v1 的动态流只含成员/任务迁移差分） | R5b 机制核实（[implemented/2026-09-23-r5b-cockpit](../../notes/implemented/2026-09-23-r5b-cockpit.md)） | 消息内容要 host 侧折 lead 会话 team 事件（`sessionProjections.stateOf(…, 'agentTeam')` 通道已核实存在）→ 自建 Typert Remote——但其**客户端 stub 由 vendor codegen 管线生成**，本 pack 无接线；自建 codegen 不值一轮 | 上游提供 pack 侧 remote stub 生成，或公开 host-only 投影的客户端读 RPC |

## 轮次交接（每轮全新对话上下文，靠这两份清单不吃上下文）

**新会话开工动作**（guides/60 §0.5 的展开版；人只需说"继续下一轮"）：

```text
AGENTS.md（自动加载）→ docs/00-index.md（台账 + 待定 Q）→ 本表找当前轮
→ 有 ⛔ 先解阻塞 → Plan Mode 出 decision-complete 计划 → notes/intents.md 登记 → 开工
```

**轮次收尾清单**（同一 diff 内完成，缺一即未收尾）：

1. 本表状态列勾销（🔄 → ✅，下一轮标 ⛔ 或待命）；
2. `AGENTS.md` 当前状态行同步改写（"现在"的唯一权威）；
3. 验收中已成事实的部分迁入对应合同（00-index 合同出生地图）；
4. `notes/implemented/` 记本轮 Note——"实际跑过的验证 + 环境状态"必写（下轮会话判断
   "哪些已就绪"只读这里，不信记忆不信聊天记录）；
5. `notes/intents.md` 对应行改 implemented；
6. **上线前门禁全绿**，按两层跑（guides/60 §9.1 的分层纪律）：
   - **迭代环（秒级，每次都跑）**：`pnpm verify` + `pnpm test`（后者有机械门禁
     `tests/layering.spec.ts`：回归层出现模型/浏览器/子进程/网络即红）；
   - **认证档（分钟级，每轮一次）**：`node scripts/preset-smoke.mjs`（**唯一能抓"preset 挂载失败"**
     的检查——行 config 校验发生在挂载时，roster/dump 都看不到，UI 还会吞错误；R1 血泪教训，
     见 guides/60 §7 两道防线）+ `client-load-smoke`（客户端改动）+ **内容改动**另跑
     `node scripts/probe-smoke.mjs`（会话级：真 web + 真 preset + 真模型；R2 建）与
     `handbook-smoke` / `delegation-smoke`（各自面）。
   **认证档一律不进 `pnpm test`**（R3 立的规矩，别再混回去）。

## 维护规则

- 轮序调整或新增：直接改本表，并在 notes/ 记一行原因。
- 2026-09-23（**D23 · R6 后严格 DSH 研发流 + 防再犯机制，R6 = 最后轮号**，用户决定）：研究
  证实本仓对 D13「整套继承」实为**部分继承**——轮号制与 roadmap 历史沉积是本仓发明（D11 引据
  系把 FAQ dev-loop 的单变更生命周期拉伸成项目级轮次）、轮内 todo/plan 反馈面从未启用
  （机制在场、零纪律；依据与对照表 =
  [research/2026-09-23-dsh-inround-task-surface](../../notes/research/2026-09-23-dsh-inround-task-surface.md)）。
  决定：① **R6 按原章程执行**（审计先行不动），收尾**新增转型落盘**（见 R6 行）；② R6 后
  **默认严格 DSH 套路**，偏离必须登记 D 号并附约束证据（如本地单人仓无 GitHub 协作面），
  不再默认「按规模裁剪」；③ **防再犯五件套**：全量纪律清单（从 vendor 逐源枚举，替换记忆版
  纪律表）/ 偏离登记制度 / 可机械化项进 `pnpm verify`（带反证）/ 入口链探针进认证档 /
  **升 pin（`sync-dsh`）时流程合同对 vendor 重校**（继承跟 pin 走，不是一次性）。
- 2026-09-23（**R5b 收尾**）：R5b ✅。开工前四条 Q5–Q8 手算 + 源码核对后钉死（D22）——
  "会话 × preset"主键被两份录制**证伪**（child 的 `agentPreset` 恒 `ceo`、
  `agent-preset/selected` 0 条）改判 team roster；冷启动改拉式 RPC（原计划的
  `session/event` 订阅 + `sessionQuery` 合并整个不需要）；成员空间入口照官方
  `openTeammate` 模式（catalog 对非 team child 亦可达）。r2-motion replay 场景新增
  **presence 判据档**（`replayJudges: presence`）：历史录制（内容快照）的全量零 diff
  必然红（persona/手册/工具表演进 = 重放灵敏度证据），改断言 member/task 集合等价 +
  在场板同形；queued 尾部 2 条投递差为重放时序固有边界（显式记录不判据）。
  提案毕业（条目全有归宿：消息级动态流进搁置池）。台账 D22。
- 2026-09-23（**R6 内容诊治插轮，原 R6「分身成长」改号 R7**，用户决定）：动因 = 五轮堆叠后内容腐化
  已有实证——① AGENTS.md「当前状态」沉积五轮收尾快照并与本表轮间待办整段双写（违反 D10
  「一处事实一个家，只写 now」）；② 00-index 已闭合的待定 Q1 仍挂着；③ 本表计划层躺三段已 ✅ 的
  轮间待办历史；④ 原 R6 行「U1 只剩实证钉死」文字过期（探针已完成）——语义过期会复发
  （r5-plus §5 修过一次）。决定：插**纯整治轮 R6「内容诊治」**（不交付新功能），两条线：**线 A · 内容腐化诊治**（四面 =
  docs/ 全层 / AGENTS.md 入口链 / company-workspace（手册 + kb；R4「journal 不压」默认不重开，
  重开须带新证据）/ notes/ 指针核对（历史不重写））；**线 B · 流程对齐审计**（用户同日补充）：
  本仓是 DSH 研发纪律（D13）的**头一次实际使用**——对照 AGENTS.md 纪律表逐条核对已闭轮实践
  （届时 R0–R5b；权威在 vendor 树，不认本仓转述），抓两类偏差：没严格遵循的、把「灵活性」
  理解错的（哪些是允许的规模裁剪、哪些是违规偏离），弹性边界写清，目标 = **让今后的开发更舒适**；验收 = **入口链探针**（全新上下文只读入口链
  答「现在」问题）+ **防回堆机械门禁**进 `pnpm verify`（均带反证）；定位 = **首次全量 + 制度化
  「磨」**（用户原话：「打扫卫生要磨几次才可能磨好」），审计先行产两份清单（「腐化点清单」= 线 A 逐文件逐类；「流程偏离清单」= 线 B 逐条纪律），量超一轮按
  D11 拆轮。原 R6「分身成长」整体后移为 **R7**，范围与前置不变（行内过期的 U1 文字顺带改完成态）。
  **旧轮号处理**：本节 2026-09-22 各条与 `notes/intents.md`、`notes/implemented/` 旧行**保留旧轮号
  不改写**（历史就是历史——这正是诊治轮要立的榜样；映射以本条为准）。台账 D21。
- 2026-09-22（**立"提案消化"纪律**，用户要求"roadmap 一定要消化掉 `notes/proposed/` 里的东西"）：
  `notes/proposed/` 不是停车场，三条：
  ① **进 proposed/ 时就必须在本表有归宿**（某轮的行 / 轮间待办 / 搁置池）；
  ② **轮次收尾时逐条核对**它进的那一轮的提案——每条要么已交付、要么转轮间待办或搁置池、要么
     明确不做（逐条写进该提案的「条目去向」表）；
  ③ **消化完就毕业**：条目全有归宿后，文件从 `notes/proposed/` 搬到 `notes/implemented/`、状态行
     写「已消化」——**毕业 ≠ 全部实现**，而是"每一条都有归宿"。
  两条机械门禁已立（`pnpm verify`）：`proposal-scheduled`（提案必须在本表出现）、
  `proposal-graduated`（已消化的不许赖在 proposed/），均有反证。**门禁管不到的部分**：它只保证
  "有归宿且该毕业的毕业"，不保证"会实现"——那要靠在**验收列 / 轮内最窄验证列**里点名。
  首次执行：`workspace-hygiene` 已毕业（R4 ✅；1 条转轮间待办 ②、1 条按决定不做）。
- 2026-09-22（**R4 收尾后把 R5/R6 的排期理顺**，用户要求）：① **轮次顺序在表里显式化**——R5b 标
  `⏸ 待命（排在 R5a 之后）`、R6 标 `⏸ 待命（前置全清；排在 R5b 之后）`（原先一个 `—` 一个 ⏸，
  读不出先后）；② 原「轮间待办（R5a → R6）」的 U1 探针**已并入 R4 → R5a ①**，撤掉那节重复块
  （同一件事不占两处，最小步骤改作 ① 下的引用块）；③ **R5b 开工前必须钉的四条决策升为
  `docs/00-index.md` 待定 Q5–Q8**——原先只藏在 r5-plus-readiness §9 P2（文件已删，R6 D1），
  而新会话开工动作读的是「00-index 台账 + 待定 Q」，藏着的决策等于没有；④ `00-index` 的**合同出生
  地图**改 R5 → **R5a**，并补 R5b（不单独出生合同）与 R6（培养/学习合同，名字待定）；⑤ `AGENTS.md`
  命令表补上 R4 新增的两个脚本（`deliverables-check` / `snapshot-motion`），并把散落的 `R5` 旧指代
  统一到 `R5a`。
- 2026-09-22：**R3 收尾**——R3 ✅、R4 标 ▶ 下一轮。R3 的验收口径在本轮被实证改写两次：
  ① "team 两包改直插行"其实 R1 起就已直插（本轮只做验证）；② 原计划的 `continuable` 命名委托
  被"team shadow + 按成员名字寻址"三层证据否掉，改 one-shot 前台（D18）。同时立了
  **测试分层纪律**（guides/60 §9.1：真模型/真浏览器不进回归）——起因是用户当轮指出
  "这种测试如果是 regression 的话跑得这样慢完全受不了"。详见
  [implemented/2026-09-22-r3-reporting-line.md](../../notes/implemented/2026-09-22-r3-reporting-line.md)。
- 2026-09-22：三篇提案进轮（④ 共享盘卫生 → R4、① 组织在场板 → R5、②③ 分身成长 → 新增 R6 待命），
  R6 的阻塞项是轮间待办两条接线修复 + U1 实证；原因与验收判据见各自提案（`notes/proposed/`）。
- 2026-09-22：**R4 收尾**——R4 ✅、R5a 标 ▶ 下一轮。R4 的验收口径落地为**机器判据**：成品
  `deliverables/<slug>/final.md` 必须回溯到一次 **Lead（CEO）会话**的 `present`，判据同时守
  过程稿与"非 Lead 越权定稿"（`scripts/lib/deliverables.mjs` + `scripts/deliverables-check.mjs`
  + `tests/deliverables.spec.ts`，含反证）。三处判据设计决定与"成品归 Lead"的依据见
  [implemented/2026-09-22-r4-workshop-flow.md](../../notes/implemented/2026-09-22-r4-workshop-flow.md)；
  台账 D20。同轮：R3 留的 `subagent` continuable footgun 关掉（四职能 preset 补控制面，teammate
  侧残留留 R5a）；**journal 回溯压缩决定不做**（规则已立，理由见该 Note）。
- 2026-09-22（**R4 收尾后按用户要求逐条核对 `notes/proposed/` 的条目归属**）：4 个提案文件在本表都有
  引用，但**按条目**核出一条漏的——`workspace-hygiene` 第 3 条「练习场 ≠ 运行场」写进了 R4 的
  **"做什么"列**却从没实现（全仓 scripts/tests/packages/dev/手册/指南零痕迹），而 R4 已标 ✅。
  **教训（升为规则）**：本表的"做什么"列是**描述性**的；**只有进了"验收"列或"轮内最窄验证"列的
  东西才会在收尾时被逐条核对**——本轮实测：进了两列的 2/2 都交付了，只在"做什么"列的 1/1 漏了。
  故两笔：① 该条转轮间待办（R4 → R5a）②；② 加**机械门禁** `proposal-scheduled`（`pnpm verify`）：
  `notes/proposed/` 下每个文件都必须在 `plans/roadmap.md` 里被引用——提案被遗忘时门禁变红，不再
  依赖下一次有人想起来问。
- 2026-09-22：**轮间待办（R4 → R5a）新增"按问题组队"**——用户观察（"CEO 不需要每件事都让 4 个
  手下忙，我要的是团队随问题成形"）经查证属实：实测四场动议里三场是**人在指定名单**，没人指定
  的那场是 4/4 全员。归轮间（不占轮），且它就是 R6 那条 U1 活体探针的实操 ⇒ R6 前置全清。
- 2026-09-22（R4 轮内做的 R5+ 就绪度梳理）：**R6 的阻塞项已清、文字已过期**——两条接线修复 R2 后即已落地
  （`includeDefaultRoots: false` + `agent-instructions` 行），U1 已在源码层回答（skill 条目改动
  下一轮生效），U2/U3 随隔离作废。据此本轮同时做了三件事：① **R5 拆成 R5a（门禁与发布）/
  R5b（驾驶舱）**——原来 4–5 个面塞一轮，最不确定的 replay harness 会卡住皮肤；② 新增
  **搁置池**（自主节律 / 并行快捷派活 / M2 / 界面外推送，四条都是"缺 upstream seam 或明确需求"）；
  ③ 轮间待办加 U1 活体探针（R5a → R6）。判据、证据与打磨细节见
  台账 D19。（原依据 r5-plus-readiness.md 已删——R6 D1）
