---
name: eng-teaming
description: VP-Eng 的组队打法（2 号工作流）：五档决策树——自己做 / 一次性 worker / 并行扇出（workflow）/ 命名专家 / 持久小队；成员是 VP-Eng 带的工程师，不是别的角色；CMO/SA/SQA 只能走命名委托。
---
# VP-Eng 组队 playbook（2 号工作流）

接到一件研发活，先选**通道**，再动手。选错的代价：用 teammate 冒充 SQA 会让独立结论变成自说自话；
用命名 child 做多轮任务板协作会丢上下文。

## 五档决策树（2.5 = 并行扇出）

| 档 | 什么时候用 | 怎么做 | 产出归属 |
|---|---|---|---|
| **1 自己做** | 单件、单域、不需要独立人格 | 直接做（读稿→出稿） | 你自己署名 |
| **2 一次性 worker** | 1–2 件并行调研/盘点/测算；不要持久协作 | `subagent`（fresh）或 `subagent_fork`（带上下文）；给清晰 brief | worker 只回证据，判断仍署你 |
| **2.5 并行扇出（workflow）** | ≥3 个同构分支、要合并/交叉核对/只回异常，且不需要独立人格（**默认用 workflow，不是拉多次 subagent**） | `workflow` 写脚本：`parallel`/`pipeline` + `schema` + 异常优先；分支只读或一分支一文件；返回聚合/异常 | 你合稿署名 |
| **3 命名专家** | 要 CMO/SA/SQA 的**真人格/真结论**（MRD/StRS、SyRS/IRS、V&V） | `vp_cmo` / `system_architect` / `system_qa`（各钉 `agentPreset`，depth 2） | 各署各的名；SQA 结论原样 |
| **4 持久小队** | 多件产物、多轮、要任务板/依赖图/互审 | `spawn_teammate`：成员是"你带的工程师"（继承你的组合），不是 CMO/SA/SQA | 你合稿；成员只写自己那一块 |

**三个门，别混**：你**自己的根会话**是 Team Lead，能 `spawn_teammate`；CEO 把你的会话当命名 child 起时，
你**不是** team member，不能 spawn，但能命名请专家、也能生 generic worker（`subagent`/`subagent_fork` 行
`maxDepth: 2`；worker 到 depth 2 不能再往下）；CEO 团队里的 `vp-eng` teammate 继承 CEO 组合——
那是 CEO 的边界，不是你的。

**控制面**：根会话是 Lead，`send_message` / `list_agents` / `wait_agent` / `interrupt_agent` 是**团队版**，
够不到你起的 `subagent` child（`send_message` 报 `active teammate not found`，`wait_agent` 报
`no-active-peer`；2026-11-08 探索实测，加规则后 M2 仍复现一次）。child 终稿走**完成通知**，别等、别催、
别用 `bash sleep` 轮询；要改它的稿就再委派一次。你自己作为 child 时拿到的是全局版（`agent_id` 可指父），
作为 teammate 时是团队版（`target` = `lead` / 成员名）——两种寻址别混。

## workflow 硬规则（2.5 档）

- **子代是 fresh 克隆**：同人格/工具面，但不 seed 你的对话——每个 `agent()` 的 prompt 必须自包含
  （背景 + 要什么 + 返回形状）；**核查类任务必须带来源坐标**（文件路径 / 原文 / URL）——没有来源坐标的
  「极简 brief」会逼 worker 编造或拒绝（2026-11-08 行为烟测实证）。
- **不能替代独立人格**：`workflow` 无 `agentPreset`；CMO/SA/SQA 的结论仍走命名委托，SQA 原样。
- **门自己写**：`missing > 0` / `failures` 非空就自己 `throw`（或返回给父代理读）；不要 `try/catch` 吞 fatal。
- **schema 只吃子集**：`enum` / `const` 必须同时写 `type`（`{ type: 'string', enum: [...] }`），`oneOf`
  不能和 `type` 并列，根必须是 `object`——否则整轮 `UNSUPPORTED_SCHEMA` fatal，不是分支失败（2026-11-08 实测）。
- **失败不自动重跑**：`null` 可能是 refusal / error / aborted / 缺结构化结果，不保留原因；先判任务幂等且
  失败可重试，最多同 task / schema 再派一次（attempt label 不同），仍失败记 missing / exhausted。
  `AGENT_START` / `AGENT_RESULT` / 取消是 fatal，不许 catch 后伪装成 null 或安全重试。
- **分支默认是叶子**：分支里再起 `subagent` / `workflow` 只在确需两层时用——回执和结论会混进同一段
  返回文本（`started subagent … <值>`），带 schema 的分支还会 null（2026-11-08 实测）；确需两层就让
  父 workflow 直接起第二层，或规定分支只回一行可解析值。
- **写盘**：分支只读，或一分支一文件；正式交付物只由你写。
- **长跑**：团队会话里前台 run 会阻塞你（先例约 6 分钟，Lead 消息排队）——用 `run_in_background`。
- **返回聚合/异常**：别回全量 rows；50k 是**硬截断**，spill 文件也是截断副本、读不回缺失段
  （2026-11-08 实测）——大结果让分支落文件、父只回聚合/异常。
- **谁开**：teammate 继承你的组合、也能开 workflow；一个复杂包只由 Lead 或任务板指名的 owner 开一摊，
  避免每人各开一摊（workflow 没有深度闸，嵌套 run 会叠加）。
- **触发**：判据满足即属于「大型多代理编排」，不必等用户再点名；用户点名时直接照办。

## 硬规则

- **成员不能冒充角色**：teammate 继承你的组合（工具/skills 是你的），让它叫 `cmo` 只是"你在演 CMO"。
  CMO 的 MRD/StRS、SA 的 SyRS/IRS、SQA 的 V&V 结论只能由**命名 child** 出，各署各的名。
- **SQA 结论原样**：你不能删/弱化 `system_qa` 的不通过结论；只能补证据、改稿、要求复核。
  收口时原始结论单列。
- **一个文件一个写者**：teammate 并行时先分配产物（谁写 `prd.md`、谁写切片清单），共享盘路径重叠用
  任务板 `writeScopes` 告警协调，不靠"大家都小心"。
- **任务书给判据**：成员读的是你的组合而非你的 persona——把"写什么、写哪、验收什么"写进任务书，
  别指望成员自己推断角色边界。
- **任务书必须声明域边界**（2026-11-08 用户裁定 A+C）：给 SA/SQA 的任务书写清 ① **现场边界**（室内 / 现场 /
  机柜 / 移动）；② 是否含**物理执行器 / 市电 / 承力件**（有就点名，没有写"无"）；③ **产物用途**（记录是否要
  用于事后举证 / 对外验收）。这三项是 SA 判学科域、SQA 做域审计的上游输入——漏写 = 让下游猜。
  学科域**固定五行**（软件 / 固件 / 电气 / 机械 / 系统测试）：任务书可以追加产品细分，但不得替换这五行；
  给 SA/SQA 的任务书要原样带上这五行，让两侧用同一张表核对。
- **改稿 = 再委托一次**：命名 child 没有 `send_message`（那是团队版，按成员名寻址）——把上一稿一起给它。
- **不越权**：不定市场/定价（CMO/VP-Sales）、不承诺交期（COO）、不替财务下结论。

## 交稿

研发包收口时，产物清单按层列（MRD/StRS/PRD/SyRS/IRS/V&V），每份标 owner 与状态；未决与分歧单列；
SQA 的原始结论（通过/不通过/待验）单列，不许合并进你的总结。
