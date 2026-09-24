# 研究 · DSH 研发流程基线与本仓适配

状态：**已落地（研究）**。D23 定开发流适配，D24 定队列 owner；当前操作规则见 `docs/guides/dev-loop.md`。2026-09-23 自 `notes/research/` 毕业。

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
> （index 已登记）。普查引文进本文前经本轮会话逐条亲验。
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

DSH 的研发流程 = **连续的 issue→PR 流 + 文档只写当前状态**；plan mode 与 `todo_write` 是可用反馈面，按其各自条件使用；会话日志承载过程，repo 内 Notes 记录决策。DSH 不使用项目级 roadmap / plan 文件。本仓曾将单变更流程扩为轮次制，并在 D23/D24 转为队列条目、将队列迁至根 `ROADMAP.md`。**本仓适配**：feature 队列条目默认先经 Plan Mode 呈批；多步任务用 todo；具体分支以[开发环 §0.5/§1](../../docs/guides/dev-loop.md) 为准。纪律来源、适配理由和当时审计证据见本 Note 后续章节；这些历史记录不是当前操作指令。

## 一、DSH 的轮内反馈面：Plan Mode 与 todo_write

结论：DSH practice = **两种现成反馈面、职责不同**；第三层（项目级任务/计划文件）不存在且被明确否决。

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

**决定（D23，2026-09-23）**：轮次流程退役，改按主题队列；默认遵循钉住的 DSH 纪律，本地适配按 D 号记录约束与证据。Feature 队列条目默认 Plan Mode 呈批是本仓适配；获批后按范围实施，明确授权的机械单步可直接做。当前规则唯一见[开发环 §0.5](../../docs/guides/dev-loop.md)。

**转型后的形态**（DSH-aligned，按本仓约束缩编）：

| 维度 | 轮次制（历史） | D23 决定（D24 后续定队列 owner） |
|---|---|---|
| 队列 | roadmap 按轮号排期 | 按主题调度；队列后来由 D24 迁至根 `ROADMAP.md` |
| 生命周期 | 轮首计划、实施、轮末清单收尾 | feature 队列项默认 Plan Mode 呈批；多步实施使用 todo；当前条件与授权边界见[开发环 §0.5/§1/§12](../../docs/guides/dev-loop.md) |
| 完成项 | 留在表内标完成 | 验收后离队；决定与证据留 Note |
| 条目类型 | 一切塞进轮次 | 区分 feature、卫生小修与研究，按适用流程处理 |
| 交接 | 轮次交接清单 | 入口链与相关 Note 支持新上下文接手 |
| 保留做法 | — | 完整切片、窄验证；认证按改动面选择 |

## 六、适配 DSH 纪律的原则

D23 的研究得到几条可复用原则：以钉住的 vendor 为机制权威；记录本地适配的约束与证据；机械可验证的不变量配反例进入门禁；语义一致性依靠阅读与审查；vendor 升 pin 时重校本地流程。当前仓内落点见根 `AGENTS.md` 与[开发环 §12](../../docs/guides/dev-loop.md)。这些原则不意味着 DSH 要求所有 feature 任务都先 Plan Mode；该默认是本仓适配。

## 七、给采纳 DSH 纪律的项目

- **先核机制，再定适配**：以目标项目钉住的 DSH 源为准，区分原生机制和本地政策。
- **适配写明约束与证据**：例如没有 GitHub 协作面时，需要明确本地队列的 owner、入口和生命周期。
- **用原生反馈面**：Plan Mode 与 `todo_write` 按各自适用条件使用；计划与实施清单不可混为一谈。
- **事实各有其家**：任务过程留会话记录，当前合同留 docs，持续有用的决策与依据留 Notes；已完成项从活动队列移除。
- **分层防漂移**：可机械判断的结构约束带反例验证；授权和语义边界由当前 owner 明确，升级 DSH pin 时复核适配。

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
- 本仓从轮次制转向队列是受本地协作约束驱动的适配，不代表 DSH 原生要求使用项目级队列；其他项目应按自身约束应用 §七原则。

## 十、落地证据

D23 转型的历史范围与验证记录见[R6 收尾 Note](./2026-09-23-r6-content-remediation.md)。D24 的队列位置裁决及当前路由见本节 §十二与[根队列](../../ROADMAP.md)。当前规则以 `AGENTS.md`、开发环和 `ROADMAP.md` 为准。

## 十一、入口文档的状态边界

根入口会在每次任务中加载，因此只放稳定路由与常设规则；会变化的队列、环境和实现事实由各自 owner 提供。这个边界避免入口重复状态后过期，也保留了用户要求按分支再读具体文档的路径。

## 十二、队列 owner：根部 ROADMAP.md（D24）

无 GitHub Issues 时，本仓需要一个本地队列。队列与合同的变更频率不同：队列随调度改变、完成即离队；`docs/` 记录当前合同；`notes/` 保留仍影响决策或复验的依据。因此 D24 将队列放在根 `ROADMAP.md`，而非 `docs/` 或累积型 `notes/`。

**当前路由**：`AGENTS.md` 提供常设入口；开发环 §0.5 先判断任务分支；只有用户要求继续队列时才读取 `ROADMAP.md`。队列的当前格式与状态只以该文件为准，历史迁移方案和条目状态不作为操作指令。

**可迁移原则**：按文件的变更频率和生命周期选择事实家；位置由当前职责决定，不由旧布局或“历史都要保存”决定。
