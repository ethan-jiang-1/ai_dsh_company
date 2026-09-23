# 研究 · DSH 研发流程的真实形态与本仓对齐路线（可迁移文档）

> **性质与用途**：一份"论文"式研究记录——记录我们如何发现"以为在 follow DSH 研发流程、
> 实际部分走样"，DSH 的真实形态是什么（全部一手引证），以及纠正与防再犯的机制设计。
> 写给两类读者：① 本仓 R6「内容诊治」轮（对照基线 + 转型依据）；② **任何准备采纳 DSH
> 研发纪律的新项目**（可直接复用的枚举方法、对照框架与防漂移机制）。
> **问题出处**（2026-09-23，用户两条补充）：① 轮内没有可看的任务面，过程反馈只能等收尾，
> "听由 Agent 自己弄，等某一步结束才知道是怎么回事"；② 复盘疑问——"以为最早就知道 DSH 的
> 研发流程，跑下来感觉不太像；我们是靠 roadmap 跑的，有点 feature based（垂直切面）"。
> **方法**：vendor 树一手材料优先（包 README → 子系统文档 → 生成目录 → Agent Note →
> bundle 指引 → 根/子树 AGENTS.md → `.github/` 模板与配置 → postmortem），辅以一个子代理
> 全仓普查（产物 `dev/research-dsh-workflow-survey.md`，普查底稿随库存档）与外部研究树 FAQ
> （00-index 已登记）。普查引文进本文前经本轮会话逐条亲验。
> **证据分级**：**affordance**（机制在场）/ **documented**（DSH 文档规定这么用）/
> **observed**（DSH 自家实践留痕）。三级强度不同，随条标注；仅 affordance+documented 而
> 无 observed 的腿在 §九声明。
> **版本与自足性声明（给外部读者）**：本文所有 vendor 引证的版本基线 = 本仓钉住的
> `dsh-v0.1.5-rc.2`（submodule SHA `fb2c4b9e698e30edb738bca4cf0618587db7d203`）。
> **承重结论的引文均已内联——只读本文即可成立**；`dev/research-dsh-workflow-survey.md`
> （普查底稿，随库存档）与外部研究树 FAQ 仅是佐证来源，读不到不影响本文。你的 pin
> 若更新，vendor 文件路径可能漂移（机制本身较稳），以你的 vendor 树复核为准。

**术语速查（本仓内部记号；外部读者知道意思即可，无需查原文件）**：**D 号** = 本仓决策
台账编号（本文涉及：D11 = 立垂直轮制、D13 = 「整套继承 DSH 纪律」宣言、D19 = 拆轮先例、
D21 = 插整治轮、D23 = 本文记录的转型决定）；**「线 A / 线 B」** = 整治轮的两条工作线
（内容腐化诊治 / 流程对齐审计）；**「认证档」** = 需真模型或真浏览器的慢速检查档（与秒级
keyless 回归档相对）；**「轮」** = 本仓曾经的迭代单位（R0–R7 编号），即本文要退役的东西。

## 〇、摘要

DSH 的研发流程 = **连续的 issue→PR 流 + 严格的"文档只写现在"纪律**；过程可见性靠两个自带
机制（plan mode 呈批门禁 + `todo_write` 实时任务条），持久化哲学 = **会话日志即真相**，
repo 层没有 tasks/plan 文件这个物种（计划文件被设计否决："a plan directory creates a
second durable home"）。本仓（ai_dsh_company）五轮实践对照后确认：我们自创了"垂直轮 +
roadmap"治理层（D11 的引据是把单变更生命周期拉伸成项目级轮次），该层积累历史、违反
"docs=now"，是内容腐化的结构性病根；同时 DSH 的过程反馈面（todo/plan）一件都没用上——
机制在场、零纪律。**决定（D23，2026-09-23 用户拍板）**：R6 整治轮按原章程执行并在收尾落
转型（R6 = 最后一个轮号），此后**默认严格 DSH 套路、偏离必须登记 D 号附约束证据**；防再犯
= 五件套（全量纪律清单 / 偏离登记 / 机械门禁带反证 / 入口链探针 / 升 pin 重校）。

## 一、DSH 的轮内任务面：plan mode（开工门禁）+ todo_write（实施期活清单）

结论：DSH practice = **两层现成机制、严格分工**；第三层（任务/计划文件）不存在且被明确否决。

1. **todo_write 的设计意图就含"给人看进度"**（documented）：设计 Note §Problem——"A todo
   list serves **two co-equal purposes**: it steers the model to plan multi-step work…, and
   it **gives an interactive host a live progress checklist**"；且"Every reference coding
   agent surveyed (claude-code, opencode, codex, oh-my-pi, pi) ships some form of this;
   the harness had nothing"
   （`.agents/notes/archived/feature/2026-06-29-todo-write-tool.md`）。
   ——即：物理人"过程中看不见 agent 在干嘛"这个痛点，是 DSH 造这个工具的直接原因之一。
2. **模型使用纪律由工具描述自带**（documented；`packages/todo/tool-todo/src/index.ts`
   工具描述 = 生成目录 `docs/tool-catalog.md` 同文）：整表替换（每次发全量清单，无增量
   协议）、开工前逐条列好（one todo per concrete step *before you start*）、`in_progress`
   即时维护（完成即勾、不批量；有活时至少一条 in_progress）、琐碎单步任务跳过。
   **采纳方不需要另写 prompt**——纪律内建在喂给模型的 schema 里。
3. **Web 渲染两面**（affordance；`ui-conversation` 的 TodoPanel + `ui-tool` 的 todo-row）：
   `TodoPanel` = 输入框上方**常驻条**（挂 `conversation.input.dock` 槽、空时隐藏、可折叠、
   分状态计数），每次调用另有对话流工具卡行（N/M done 摘要）
   （`.agents/notes/archived/feature/2026-07-23-web-todo-display.md`）。生命周期 **turn 级**：
   `turn/start` 清空旧清单——人插话（steer）开启新 turn、agent 重排清单，清单变化即
   "反馈被吸收"的可见信号（2026-07-28 note 的设计句，普查引："Readers treat the strip as
   'what this turn is doing'"）。
4. **持久化 = 会话日志**（affordance）：`todo/write` 是 log-only SessionEvent
   （`docs/subsystems/todo.md`），跨轮次、重开会话可恢复；设计 Note 明确否决内存 service
   （"would reinvent durability, replay, and resume reconstruction the log gives for
   free"）。条目刻意最小：`{content, status}` 三态，无 id/priority/activeForm——整表替换
   不需要稳定身份，每个砍掉的字段都是模型每次调用少产出的东西。
5. **plan 与 todo 的分工线是 DSH 画死的**（documented；base bundle plan-mode 指引，
   `packages/bundle/base/cordis.patch.yml` 约 :309）："**Do not use todo_write to track
   this planning phase: it tracks implementation after an approved plan, while the plan
   itself belongs in exit_plan_mode.**" plan 侧机制（`docs/subsystems/plan.md`）：
   `plan/mode` 是 log-only 布尔事件（软引导，不限制工具面）；进入/退出 = **`/plan` 命令**
   （`/plan off` 退出；带消息则进 plan 并把该消息作为下一条 logged user message）；计划文本 = `exit_plan_mode`
   调用参数（完整 markdown、`#` 起头）经 user-questions seam 呈批；**批准 = 记录静默退出**，
   **打回 = 带用户反馈的失败调用**，模型修改后再呈——打回本身就是反馈通道。
6. **计划文件被明确否决**（documented）：
   `.agents/notes/implemented/simplification/2026-07-22-plan-specific-collaboration-state.md`
   :54 原文："Put flips in surface messages **or store plans in files**. Rejected because
   … **a plan directory creates a second durable home**."——one-home-per-fact 原则用到了
   计划上：计划的持久真相 = 会话日志里的工具调用参数，再给文件就出现第二持久家。
7. **接线成本 = 零**（affordance）：`tool-todo` 在 base bundle 行（`cordis.patch.yml`
   约 :401）。**任何跑在 DSH 上的部署默认就有这套反馈面**——本仓五轮的所有会话（含公司
   分身）本来就挂着，只是从未写进流程纪律。（给插件项目的一个坑：自己的 preset 若显式引
   `tool-todo` 行，`allowParallelInProgress` 是**必填 config、无默认**——base 出厂 `true`
   （允许多条 in_progress）；抄行不连 config 一起抄，**挂载时才炸且 UI 吞错误**——本仓
   R1 血泪：行校验发生在挂载时，roster/dump 都看不到。）
8. 外部研究材料同口径（FAQ 11 user-experience-audit，外部研究树）：把使用者分三类——
   (A) 通过 Web/CLI 指挥 DSH 的人、(B) 仓库内干活的 coding agent、(C) 手动编码的贡献者；
   (A) 的观察面 = 工具卡 + "**todo + plan 骨架**" + 偶尔 ask_user + 最终报告；
   "todo 列表和 plan-mode 门禁使 agent 的工作**可见且可步进**，无需人驱动每一步"。

**给人的操作面总结**（本会话实测演示过）：开工对着 Plan Mode 的计划**批/打回**（反馈门①）；
实施期盯输入框上方 TodoPanel，想改**直接发消息 steer**（反馈门②）——插话开启新 turn，
agent 重排清单，你看得见自己的反馈被吸收。

## 二、DSH 迭代模型的真实形态（本仓以为在学、实际长这样）

- **工作单元 = PR**（连续流）：`kind/*` + `area/*` 标签 + native Issue Type；stack 式分支
  （merge-forward / rebase、`--force-with-lease`）（根 AGENTS.md Conventions）。
- **任务的持久家 = GitHub Issues + "DSH Issue Management" Project**：状态 Inbox / Backlog /
  Ready / In progress / In review / Done，由 PR webhook 事件驱动
  （`.github/issue-management/config.json` + `policy.mjs`，在盘亲验；普查引 Agent Note
  2026-08-10、2026-09-02）。**不是文件。**任务关闭即离开活跃视图——队列不积累历史。
- **决策的持久家 = Agent Notes**："Every non-trivial change MUST add or update at least one
  Agent Note **in the same PR**"（`.agents/notes/README.md` §When to write one，亲验）；
  新 Note 触发 supersession check；实现后的英文/中文/sidecar triplet 归档冻结，密封后
  永不改（`.agents/notes/AGENTS.md` + archived/AGENTS.md）。`implemented/` 按类分子目录：
  architecture / bug-fix / feature / process / simplification / testing（亲验）。
- **没有 roadmap 物种**（缺席实证）：`docs/` = architecture / subsystems / cookbook /
  postmortem / user / 生成目录，**无 plans/ 层**（ls 亲验）；前瞻 = Issues backlog +
  `.agents/notes/proposed/`（RFC 流，现 5 篇）。
- **没有 tasks/checklist 文件约定**（普查显式确认缺失），且文档标准**明文禁止**
  acceptance-task checklist 进 Note 层（`docs/AGENTS.md` tier 表："Migration plans,
  acceptance-task checklists … once the decision has shipped" 不属于 Note 层）。
- **文档只写 now**（documented + 机械门禁强制）："Document current state, not change
  history"；**词数预算**（root AGENTS.md ≤1,950、architecture ≤2,400 等，
  `scripts/doc-budgets.manifest.json` + `verify-doc-budgets` 门禁）；slop checklist 禁
  历史叙事（"previously / now / no longer / renamed"）、实现状态注记（"implemented!"）、
  同一规则多 home、推理转录。文档分层 tier 表：一个事实一个家，别处链接。
- **测试纪律**：本地窄证据 + CI 穷举（"Never default to the full suite"）；非平凡改动
  same-PR 更新快照（根 AGENTS.md + `docs/testing.md`）。
- **observed 中途反馈证据**：`docs/postmortem/0003-web-agent-gui-feedback-loop.md` = 真
  GUI 会话（:3081）的事故复盘，时间线取自持久事件日志的 seq（含用户侧交接事件；普查称
  人于 turn 5 插话）——DSH 自己的开发流里"轮中人插话/交接"是留痕的现实，且复盘用日志
  seq 而非事后报告重建时间线（"Verity the world, not the self-report"的同款纪律）。

- **agent 自验技能**（observed/documented）：DSH 根 AGENTS.md 要求 "Run checks before
  pushes via dsh-pre-push-checks… **report only commands run**"，并把这条证据循环做成自带
  skill（`.agents/skills/dsh-pre-push-checks`、`dsh-code-review` 等）——"只报告实跑过的
  检查"的纪律有可复用载体，agent 侧不需要人转述。

**为什么 DSH 可以没有 roadmap**：仓库状态本身即交接文档——docs 被 same-PR 纪律强制永远
now，任务态在 Issues（队列视角，关闭即出文档），历史在 git + archived notes。新上下文
（人或 agent）读入口链即得全部"现在"；计划不落文件（"second durable home" 否决，§一之 6）。
**roadmap 在 DSH 的分层里没有职责空位。**

## 三、本仓模型对照（线 B 审计的靶面，亦是其他项目的自查模板）

| 维度 | DSH | 本仓（轮制，R0–R7） | 判定 |
|---|---|---|---|
| 迭代单位 | issue → PR 连续流 | 垂直轮 R0–R7（feature 切片：两人公司→汇报线→驾驶舱…），每轮全新对话上下文 | **本仓自创**：D11 引 FAQ dev-loop 第 4/6 阶段，但那是**单变更生命周期**，被拉伸成项目级轮次——引据是拉伸 |
| 任务队列 | GitHub Issues + Project | roadmap 轮次行 + 轮间待办 | 合理裁剪候选：本地单人仓无 GitHub 协作面，队列需要个家 |
| 历史 | git + archived notes | roadmap 内联已 ✅ 段落 + AGENTS.md「当前状态」沉积 | **偏离**（线 A 病根）：计划层/入口链积累历史，违反 docs=now |
| 交接 | 不需要（docs 永远 now） | roadmap 轮次交接两清单 | 补偿机制：部分在补偿 docs 漂移——漂移治好后应瘦身 |
| 收尾程序 | cookbook（程序之家） | roadmap 收尾清单（计划层内联） | 错家候选：程序应住 guides/ |
| 决策记录 | Agent Notes same-PR | notes/intents→proposed→implemented | 对齐（形态一致） |
| 轮内任务面 | plan mode + todo_write + steer | plan mode（有仪式）+ todo（零纪律） | 缺习惯不缺机制（§一） |
| 轮号命名 | —（无轮） | R5a/R5b 拆号、R6→R7 改号已发生两次连锁 | 轮号 = **时间编码标识**，与 r5-plus-readiness 同病：名字编码时刻不编码主题 |

## 四、病根诊断：为什么"整套继承"变成了部分继承

（这节是给"下一个准备采纳 DSH 纪律的项目"的最重要一课——三种失败模式都是结构性的，不是
态度问题。）

1. **继承是从记忆声称的，从未枚举**。本仓 D13（2026-09-21）宣布"整套继承 DSH 纪律，只按
   规模裁剪"，但落在 AGENTS.md 的纪律表是凭对 vendor 文档的**印象**写的约十行。DSH 真实
   存在的实践不在表里的至少有：todo 工具纪律、plan mode 反馈门、文档词数预算与 slop
   checklist 机械门禁、"document current state, not change history"、Issue/PR 流与
   same-PR 快照政策。**你无法继承你从没清点过的东西**——"权威在 vendor 树"写在纸上，
   但没有任何动作去行使这个权威。
2. **适配不声明**。发明垂直轮（D11）时引 FAQ dev-loop 当血统——是拉伸——但没有机制逼问
   "DSH 真的这么干吗"。偏离是五轮后用户问"感觉不太像"才被发现的，不是被任何检查发现的。
   适配与偏离的边界模糊时，"灵活性"就会静默吞掉纪律。
3. **没有复查环**。纪律表写完一次，从未对照 vendor 重校；pin 也从未移动，所以"继承跟着
   pin 走"这件事从未被检验。
4. **在场的东西没人用**（最讽刺的一条）：todo_write 挂在每一个会话上（base bundle）、
   TodoPanel 渲染在 Web GUI、Plan Mode 在开工仪式里——流程文档里就是没有"实施期维护
   todo"这一行（本仓全仓 grep 仅 2 处顺带提到 tool-todo，均为抄 config）。用户的痛点
   （"等结束才知道怎么回事"）的解法**一直就在输入框上方**。

## 五、决定（D23）与转型设计

**决定**（2026-09-23 用户拍板，台账 D23）：R6 整治轮按原章程执行（审计先行不动），收尾
**新增转型落盘**——R6 = 最后一个轮号；R7「分身成长」转队列首条（范围与前置不变）；此后
**默认严格 DSH 套路，偏离必须登记 D 号 + 约束证据**（如"本地单人仓无 GitHub 协作面"），
不再默认"按规模裁剪"。

**转型后的形态**（DSH-aligned，按本仓约束缩编）：

| 维度 | 现在（轮制） | 转型后（feature 流） |
|---|---|---|
| 队列 | roadmap 轮次表（R7、R8…排号） | plans 层瘦成**纯队列**：有序条目、按主题命名（"分身成长"），每条 = 目标 / 入口条件 / 验收判据 / 详链 |
| 条目生命周期 | 轮首 Plan Mode → 干 → 重仪式收尾（6 条清单） | **Plan Mode 呈批（反馈门①）→ 实施期 todo_write（反馈门②，steer 随时）→ 同 diff 收尾**：docs 只写 now + implemented Note + 门禁绿 |
| 完成的条目 | 留在表里标 ✅（积累历史） | **离开队列**——记录活在 notes/ + git，队列里看不见它 |
| 条目类型 | 一切塞进"轮" | 按性质三型：**feature / 卫生小修 / 研究**——卫生和研究不装轮子，轻量走同一条流 |
| 交接 | roadmap 轮次交接两清单 | 入口链（AGENTS → 00-index → 队列）**本身即交接**——前提是 R6 治出"docs 永远 now" |
| 保留物 | — | D11 竖切纪律（一条目一可观察行为、最窄验证）、每条目全新会话（上下文经济）、认证档按改动面选跑 |

**保留 / 死刑清单**：保留——竖切、最窄验证、fresh context、notes 三段流（intents→
proposed→implemented，对齐 Agent Notes）。死刑——轮号（时间编码标识）、roadmap 的历史
积累身份（队列/档案/交接三职合一）、重收尾仪式、"轮间待办"概念（转普通队列条目）。
**留给 R6 合同定的尾巴**：① 认证档"全量扫"的触发节奏（原"每轮一次"改按条目改动面 +
间隔触发）；② 条目大过一个会话时的拆分规则（D19 拆轮先例改写成拆条目）。

## 六、防再犯机制（五件套，缺一不可）

1. **全量纪律清单，不从记忆**：R6 线 B 第一交付 = 从 vendor 逐源枚举完整纪律清单（源头
   清单：根 AGENTS.md Conventions / `docs/AGENTS.md` / `docs/testing.md` /
   `docs/development.md` / `.agents/notes/README.md` / `.github/` 模板与 issue-management
   / postmortem 里的 observed 实践），每行 = DSH 做法 → 本仓落点 → 状态（照搬 / 带约束
   适配 + 证据 / 不适用 + 理由）。现在 AGENTS.md 那张记忆版纪律表审计后**替换**。
2. **默认翻转：严格，偏离必须登记**：流程合同写死默认 = 严格 DSH 套路；任何偏离 = 一个
   D 号 + 约束证据（镜像 DSH 自己的 "Require evidence for public choices" 规则）。**不再
   有默认的"按规模裁剪"**——裁剪是一种需要举证的偏离，不是一种缺省自由。
3. **能机械化的进门禁（带反证）**：`pnpm verify` 加可检子集——plans 层出现 ✅ 完成行即红
   （完成 = 离队，不是标 ✅）、文档词数预算、slop grep（历史叙事 / 状态注记 / "previously/
   no longer"类措辞）——每条照本仓规矩先造红再证绿（门禁必须有反证是本仓既有纪律）。
4. **语义漂移用探针**：门禁抓不住"读起来过期"。入口链探针（全新上下文 agent 只读
   AGENTS.md → 00-index → 队列，答 N 个"现在"问题，零过期零自相矛盾）进认证档，每条目
   收尾跑。**发现权在代理一侧**——这次靠用户问了"像不像 DSH"才发现走样，发现权不能
   寄望于下次再有人问。
5. **继承跟 pin 走**：每次 `sync-dsh` 升 pin 时，流程合同对照 vendor **重校一遍**——DSH
   的套路本身在演进（todo 指引改过四次、文档标准在加门禁），继承是一次性快照就会再烂。
   复用本仓搁置池"升 pin 顺手回看"的既有模式。

## 七、可迁移清单（给准备采纳 DSH 研发纪律的新项目）

1. **先枚举再继承**：纪律表必须从 §六之 1 列的源头逐源抄录，禁止凭印象写。枚举本身是
   一次性半天工作，本仓跳过它付出五轮漂移的代价。
2. **声明每一条适配**：约束 → 适配 → 证据，三件套缺一不可；没证据的"裁剪"就是走样的
   起点。典型已声明的合法适配（本仓案例）：无 GitHub 协作面 → plans 层队列替代 Issues；
   每条目全新会话 → 交接靠入口链而不是长活上下文。
3. **过程反馈用 DSH 自带的面**：plan mode 批/打回 + todo_write 面板 + steer——零接线
   （base bundle 自带），物理人的观察面开箱即在。不要发明 tasks.md（DSH 明确否决过
   计划文件：second durable home）。
4. **会话日志即真相**：任务清单、计划文本、执行过程的持久层都是会话日志（event-sourced）；
   repo 层持久件只有两种——决策 Note（为什么）与现状文档（是什么）。
5. **队列不积累历史**：完成的条目离开队列；历史归 git + notes。任何"完成后标 ✅ 留在
   表里"的设计都在重蹈 roadmap 覆辙。
6. **机械门禁 + 语义探针双层防漂移**：可 grep 的进 CI/verify（带反证），不可 grep 的
   （语义过期、自相矛盾）用新上下文探针定期抓。
7. **升 pin 时重校继承**：vendor 在演进，你的继承必须跟着 pin 走。
8. **单人本地仓的等价物映射**（本仓解法，可直接抄）：GitHub Issues → plans 层有序队列；
   PR → 一次条目 diff；PR 模板（Motivation/Changes/Testing）→ 条目收尾 Note 的三段；
   Project 状态机 → 队列里的条目状态（只记"接下来"，不记"已完成"）。

## 八、给线 B 的审计问题（R6 内逐条回答，本文只立问题不预支结论）

1. **垂直轮模型**：允许的裁剪还是偏离？判据 = D13"只按本仓规模裁剪"。支撑它的真实约束 =
   每轮全新对话上下文 + demo 优先交付；DSH 无此约束。若判"适配"，D11 的引据文字应改写
   （不再声称轮次结构出自 FAQ dev-loop 阶段，那是一次拉伸）。
2. **roadmap 多重身份**（队列 / 历史 / 交接 / 收尾程序）违反 one-home-per-fact：历史剥离归
   notes/、收尾程序迁 guides/ 后，roadmap 是否瘦身为纯"接下来"（轮次队列 + 搁置池 + 维护
   规则）？（与线 A 同治，且与文档卫生合同互为表里。）
3. **轮内 todo 纪律落点**：guides/60 §1 六步闭环加"实施期维护 todo_write"一步，或
   AGENTS.md 纪律表加一行（改实践不改机制，零接线）。
4. **无 Issues 环境的等价物边界**：roadmap 当 backlog 用到什么程度算规模裁剪、到什么程度算
   自建流程（D13 红线"不发明"）？

> **定向（2026-09-23，用户决定，台账 D23）**：Q1/Q2 已有方向——R6 按原章程执行（审计
> 先行），收尾落转型：R6 = 最后轮号，R7「分身成长」转队列首条；R6 后**默认严格 DSH
> 套路，偏离须登记 D 号 + 约束证据**。防再犯五件套与转型细节见 §五 §六 及 roadmap 维护
> 规则同日条；本文对照表转作线 B 审计基线。

## 九、证据分级与 caveat

- §一 1–7、§二各条 = affordance / documented；引文路径与关键行号均本轮会话亲验
  （README §When to write one、issue-management 三件、implemented/ 子目录、
  postmortem 0003 头部、2026-07-22 note :54、base bundle :309/:401）。
- Issue Management 状态机的细节描述、PR 模板三段、"全仓无 tasks 约定"的缺失确认、
  TodoPanel/todo-row 组件路径，来自子代理普查（`dev/research-dsh-workflow-survey.md`），
  未逐行重放，但其引用的锚点文件均已核在盘。
- **observed 缺口**：没有 DSH 开发者在本仓开发中**使用** todo_write 的直接转录证据——
  该腿立在 affordance + documented 上（shipped 指引 + FAQ 框架）。postmortem 0003 证明
  的是"GUI 会话轮中人插话/交接"的实践，不是 todo 使用本身。
- 垂直轮 vs 连续流的差异**不必然是错**：线 B 要分清"约束驱动的适配"与"误解驱动的偏离"，
  §三对照表只提供事实基线。转型决定（§五）是用户基于本仓约束（单人本地仓、fresh
  context、demo 优先）做的定向，其他项目应按自身约束重走 §七之 2 的声明流程，不宜照抄。
