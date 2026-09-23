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
| R5b 驾驶舱 | ▶ 下一轮 | [30-ui-demo](../design/30-ui-demo.md) §5 v1 驾驶舱页签（pack 自建 Remote 读模型 + **协作动态流** + **组织在场板**（[proposed/org-presence-board](../../notes/proposed/2026-09-22-org-presence-board.md)）：每个分身一行 = preset 显示名 + `TeamMemberView.status` + 当前 `TeamTaskView.subject`，数据源 `agent-preset/selected` + `ctx.sessionQuery`，均已在 bundle 行内）；**成员空间入口**（场景 B 反馈：teammate 会话不作为顶层会话出现——侧栏分组 / 头部动作 / 名册行可点，三选一再写进验收）；v2 委派工具卡已于 R3 交付 | 在场板读模型 keyless 单测（含缺失/未知状态不崩）；**开工前先把 00-index 待定 Q5–Q8 钉进提案**（在场板主键 / 冷启动补历史 / `status` 文案 / 成员空间入口，内容见 [r5-plus-readiness](./r5-plus-readiness.md) §9 P2——判据是四条都变成提案里的现在时陈述才进 Plan Mode）；`client-load-smoke` 扩展为断言槽在场 + 零插件挂载失败；**回放断言**：`snapshots/r2-motion/` 的录制喂给读模型产出**非空**在场板（无 key；该提案验收判据 4，与 R5a 的 replay harness 共用录制——harness 已就绪，喂法见 replay-smoke `--scenario`） | 驾驶舱一屏流动（含在场板：分身接活 5s 内转 `running`）；**不靠讲解能点进某位成员的空间** | 无（[30 §5](../design/30-ui-demo.md) 随轮更新） |
| R6 内容诊治 | ⏸ 待命（**排在 R5b 之后**；2026-09-23 插入，原 R6 后移为 R7——原因见维护规则同日条） | **内容诊治**（不交付新功能；两条线，同一目标 = **让今后的开发更舒适**）。**线 A · 内容腐化诊治**，四面：① **docs/ 全层**（计划层躺已 ✅ 的历史段、已闭合待定 Q 挂着、过期指代、r5-plus §5 型语义漂移）；② **AGENTS.md 入口链**（「当前状态」沉积五轮收尾快照、与 roadmap 轮间待办整段双写——违反「一处事实一个家，只写 now」）；③ **company-workspace**（公司手册 + kb 审计；**R4「journal 不压」决定默认不重开**，重开须带新证据提案）；④ **notes/ 指针核对**（状态行 / 归属 / 引用可达；**历史记录不重写**）。**线 B · 流程对齐审计**：本仓是 DSH 研发纪律（D13）的**头一次实际使用**——对照 AGENTS.md 纪律表逐条核对已闭轮实践（届时 R0–R5b；**权威在 vendor 树**，不认本仓转述），抓两类偏差：没严格遵循的、把「灵活性」理解错的（哪些是允许的规模裁剪、哪些是违规偏离——弹性边界写清）；修正 = 改实践 / 改落点映射。**审计先行**：先落两份清单——「腐化点清单」（线 A，逐文件逐类）与「流程偏离清单」（线 B，逐条纪律），诊断件本身是产物，细化琢磨都在清单上；量若超一轮按 D11 拆轮（R5→R5a/b 先例）。**定位 = 首次全量 + 把「磨」制度化，不承诺一次扫净**（卫生要磨几轮：本轮建防回堆机制，此后每轮收尾按机制磨） | 两份清单先行落盘（先诊断后动手）；防回堆机械门禁**有反证**（故意造一处腐化 → `pnpm verify` 红、还原即绿）；入口链探针进**认证档**（真模型不进回归，guides/60 §9.1） | **入口链探针**：全新上下文 Agent 只读 AGENTS.md → 00-index → 本表，答 N 个「现在」问题（当前轮 / 下一步 / 某事实的家在哪等，题单轮内定）**零过期、零自相矛盾**，归档进 snapshots；**两份清单逐条销账**（修掉 / 转待办 / 明确不做，各有归宿）；**防回堆门禁进 pnpm verify** 且带反证记录 | 文档卫生合同（名字与落点轮内定：guides/60 / 00-index / 顶层新合同）；线 B 弹性边界结论落 AGENTS.md 纪律表 / guides；若收尾清单因此增「卫生项」则改本表收尾清单 |
| R7 分身成长 | ⏸ 待命（**前置全清**：接线两条已落地、U1 探针并入轮间待办 ①；**排在 R6 内容诊治之后**；2026-09-23 前为 R6） | **培养回路**：改 `presets/<role>/` 即培养动作，生效边界 = 新会话，验收 = 三道门禁 + 该角色入戏探针；**学习载体**：journal 唯一，人审提升进 skills（照 DSH `human-review-skill-maintenance` 取舍），**否决分身运行时自改 skill**（隔离后已是机制事实）；**不做自主节律**（提 upstream seam，不自建调度器）（[proposed/twin-cultivation-and-self-learning](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md)） | U1 活体探针（✅ 已随轮间待办①完成：结论 = 三档之②「只有新会话变」，见 research/digital-twin §5.5）；培养回归：改一次角色 skill → 三道门禁 + 该角色探针全绿、**旧会话不受影响** | 一次完整回路：动议结束 → journal 有教训 → 人提升进 pack skill → 三道门禁 + 探针全绿，且旧会话不受影响 | 培养/学习合同（名字待定） |

主通道不变（D4）：demo 主循环走团队（M4/通道 B）；通道 A 命名委托 R3 加入；M2（自定义
provider）可选增强（触发条件见 [20-roles-isolation.md](../design/20-roles-isolation.md) §3）
——**现进搁置池，见下**。
UI 侧：v0（现成团队 UI）＝ R1 观察窗起、R2 进验收；委派工具卡（v2 薄片）提前至 R3，驾驶舱 v1 ＝ R5b（[30-ui-demo.md](../design/30-ui-demo.md) §5）；组织在场板是 R5b 的一个切片。

轮间待办（不占轮，R2 收尾后立刻做）：**接线修复两条**——① 五个 preset 显式关
`includeDefaultRoots`，把角色私有 skills 与共享 skill 根隔离（今天仓库内无 `.dsh/`，陷阱是潜伏的：
一旦有人往 `<repo>/.dsh/skills/` 放同名 skill，会以 rank 100 盖掉角色 skill 并对全公司生效）；
② 补 `agent-instructions` 接线（D7 的"公司手册 → project root"载体目前是空的，先跑 U4 实证再定）。
两条都不改变今天的可见行为，出处见
[proposed/2026-09-22-twin-cultivation-and-self-learning.md](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md)。
（这两条 R2 后已做：`includeDefaultRoots: false` 见
[implemented/2026-09-22-skill-root-isolation.md](../../notes/implemented/2026-09-22-skill-root-isolation.md)；
`agent-instructions` 接线见 `notes/implemented/2026-09-22-r2-roles-alive.md` + `scripts/handbook-smoke.mjs`。）

轮间待办（R3 → R4）：**一条**——CEO preset 的 `subagent` 行仍是 `continuable`，而 VP 根会话没有
控制行 ⇒ 那些 child 同样管不了（与 R3 否掉 continuable 命名委托是同一个 footgun）。统一处理
（改 one-shot，或给非 team 会话补控制行），**前提是不动 teammate 的 worker 行为**。出处
[delegation.md](../../docs/delegation.md) §4.4 + [R3 Note](../../notes/implemented/2026-09-22-r3-reporting-line.md)「未做 / 移出本轮」。

轮间待办（R4 → R5a）：**两条，均已落地 ✅（2026-09-22，见
[implemented/2026-09-22-team-assembly-and-rehearsal-split.md](../../notes/implemented/2026-09-22-team-assembly-and-rehearsal-split.md)）**。
① **按问题组队（CEO 的团队成型方法）✅**——双向对照两场全过（两职能不超编 / 四职能不漏人），
兼作的 U1 活体探针已完成（三档之②"只有新会话变"）⇒ **R7「分身成长」前置全清**；提案已毕业。
原提案：[dynamic-team-assembly](../../notes/implemented/2026-09-22-dynamic-team-assembly.md)。
用户观察经查证属实：
CEO 只有 1 个 skill（`design/40` §1 计划 3 个），而现有那个从"DAG 拆解分派"开始 ⇒ **默认已经
决定要开会**；实测四场动议的名单来源——R2 / 场景 B / R4 场景 C 全是**人在指定**（场景 C 的 prompt
里直接写着"只要这两位"），而 `invest-mobile-complement` 那场**没人指定时是 4/4 全员**。
⇒ "团队随问题成形"这个默认要修。交付 = 新 skill `assembling-the-team` + persona 加挂钩
（**排在 `chairing-staff-meeting` 之前**）+ 把职能归属从旧 skill **搬走**（不并存）；验收 =
**双向行为对照**（两职能动议不许超编、四职能动议不许漏人）+ 产物过三态判据 0 违规。
**它同时就是下一条 U1 活体探针的实操**（改 `SKILL.md` → 新会话是否生效），做完 R7 的前置即全清。
出处 [dynamic-team-assembly](../../notes/implemented/2026-09-22-dynamic-team-assembly.md)（已毕业）。

> **U1 探针的最小步骤**（原「轮间待办 R5a → R6」，已并入本条 ①，不再另占一次动作）：改一次某角色
> `SKILL.md` 正文 → 新会话再 `skill({ name })` 看正文是否变。源码层已答"下一轮生效"
> （[skill-root-isolation](../../notes/implemented/2026-09-22-skill-root-isolation.md) 末节），此探针只为把 vendor
> 内部两条陈述的冲突钉死；要一次真会话 ⇒ **认证档，不进回归**。步骤见
> [r5-plus-readiness](./r5-plus-readiness.md) §9 P3 与研究笔记 §5。

② **练习场 ≠ 运行场 ✅ 已落地（2026-09-22，同上 Note）**——排练/探针默认 workspace 已换
`dev/rehearsal-workspace/`（四 smoke 脚本翻转 + rehearsal-init）；验收过两道：probe 后真盘零新增、
两场带 spawn 的真动议跑完真盘仍零新增。原缺口记录：
[implemented/workspace-hygiene](../../notes/implemented/2026-09-22-workspace-hygiene.md)
第 3 条）——R4 的"做什么"列了它，**但没实现**（R4 收尾核对提案条目时发现：全仓 scripts / tests /
packages / dev / 手册 / 指南**零痕迹**）。失败模式仍在，而且是判据**抓不到**的那一类：排练跑在真盘
时，过程稿不受约束（`drafts/` 本就不需要 `present`），产物会安静地积在 `company-workspace/` 里
——R4 W2 删掉的那 15 份污染文件正是探针跑在真盘的产物。交付 = 排练/探针的默认 workspace 换到独立
目录（workspace 归属按 `SessionHeader.cwd`，机制天然支持）+ 写进 guides/60 与公司手册；
**验收 = 用新默认跑一次探针后，真盘的 `deliverables/` 与 `kb/**` 零新增**（不是靠人记得不写）。

## 搁置池（suspended：不占轮、不研究、留复活条件）

> 判据：**只有"缺上游 seam"或"缺明确需求"才进这里**；被否决的方案不进（那归 D 号 / 复盘 / `rejected`）。
> 升 pin（`sync-dsh`）时顺手回看一遍。条目一旦复活，按其性质回本表或写新提案。

| 项 | 出处 | 搁置理由（已核实） | 复活条件 |
|---|---|---|---|
| **自主节律**（分身定期复盘） | [proposed/twin-cultivation](../../notes/proposed/2026-09-22-twin-cultivation-and-self-learning.md) §四 | 机制不闭合：`goal` 需人类授权且 session-start 一律 disarm；`schedule` 只在 live 会话投递且默认没装；webhook 起的会话进不了 goal 循环；全树无 cron | 上游补"外部触发 ↔ 会话内自主续跑"的 seam——**提 seam，不自建调度器**（D9/D13） |
| **并行快捷派活**（同时开几个 VP） | [delegation.md](../delegation.md) §4.4 | 本组合无干净解法：缺 per-child composition 与不撞名的控制面 | 上游 seam |
| **M2 自定义 provider** | [00-index](../00-index.md) 待定 Q1（已闭合） | 只在需要**组合隔离**时才有价值；"跟 VP 连续对话"的需求已由 team 持久成员满足 | 出现必须隔离组合的具体需求 |
| **界面外推送 / 收件箱** | [proposed/org-presence-board](../../notes/proposed/2026-09-22-org-presence-board.md) §背景 | egress 只有 `sessionTelemetry`（OTel）与 hooks，webhook 是 ingress；收件人是谁、粒度多细属部署选择 | 明确的物理人通知需求 + 选定部署面 |

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
  `docs/00-index.md` 待定 Q5–Q8**——原先只藏在 [r5-plus-readiness](./r5-plus-readiness.md) §9 P2，
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
  [plans/r5-plus-readiness.md](./r5-plus-readiness.md)；台账 D19。
