---
name: eng-teaming
description: VP-Eng 的组队打法（2 号工作流）：五档决策树——自己做 / 一次性 worker / 并行扇出（workflow）/ 命名专家 / 持久小队；成员是 VP-Eng 带的工程师，不是别的角色；CMO 只能走命名委托。
---
# VP-Eng 组队 playbook（2 号工作流）

接到一件研发活，先选**通道**，再动手。选错的代价：用 teammate 冒充 CMO 会让独立结论变成自说自话；
用命名 child 做多轮任务板协作会丢上下文。

## 五档决策树（2.5 = 并行扇出）

| 档 | 什么时候用 | 怎么做 | 产出归属 |
|---|---|---|---|
| **1 自己做** | 单件、单域、不需要独立人格 | 直接做（读稿→出稿） | 你自己署名 |
| **2 一次性 worker** | 1–2 件并行调研/盘点/测算；不要持久协作 | `subagent`（fresh）或 `subagent_fork`（带上下文；**只带已完成轮**，本轮刚读的不在——2026-11-08 实测）；给清晰 brief；需要子层时把 `agent_preset` 设为 `worker-orchestrator`（它只能再带 leaf），默认 `worker` | worker 只回证据，判断仍署你 |
| **2.5 并行扇出（workflow）** | ≥3 个同构分支、要合并/交叉核对/只回异常，且不需要独立人格（**默认用 workflow，不是拉多次 subagent**） | `workflow` 写脚本：`parallel`/`pipeline` + 异常优先；**分支不传 schema，只回一行 JSON，父脚本 `JSON.parse`**；分支只读或一分支一文件；返回聚合/异常 | 你合稿署名 |
| **3 命名专家** | 要 CMO 的**真人格/真结论**（MRD/StRS） | `vp_cmo`（钉 `agentPreset`，depth 2） | 署 CMO 的名 |
| **4 持久小队** | 多件产物、多轮、要任务板/依赖图/互审 | `spawn_teammate`：成员是"你带的工程师"（继承你的组合），不是 CMO | 你合稿；成员只写自己那一块 |

**三个门，别混**：你**自己的根会话**是 Team Lead，能 `spawn_teammate`；CEO 把你的会话当命名 child 起时，
你**不是** team member，不能 spawn，但能命名请专家、也能生 generic worker（`subagent`/`subagent_fork` 行
`maxDepth: 3`；CEO→你（1）→workflow 分支（2）→worker（3）放行；你根门（0）→分支（1）→worker（2）仍有余量）；CEO 团队里的 `vp-eng` teammate 继承 CEO 组合——
那是 CEO 的边界，不是你的。

**控制面**：根会话是 Lead，`send_message` / `list_agents` / `wait_agent` / `interrupt_agent` 是**团队版**，
只认名册成员，够不到你起的 `subagent` child（`send_message` 报 `active teammate not found`，`wait_agent` 报
`no-active-peer`）。根门控制 child 用 **`list_subagents`**（父会话 durable catalog，宿主重启后仍可查）与
**`send_to_subagent`**（续驶/催稿）；每行带 **`role` / `address`**——`teammate` 用 team `send_message` 按
`address`（队名）寻址，`subagent` 用 `send_to_subagent` 按 `address`（session id）寻址，两套别混。
child 终稿仍走**完成通知**，别等、别催、别用 `bash sleep` 轮询；要改它的稿
就 `send_to_subagent` 续同一个 child（带上一稿），不可续再委派。你自己作为 child 时拿到的是全局版（`agent_id` 可指父），作为 teammate 时是团队版
（`target` = `lead` / 成员名）——两种寻址别混。

## workflow 硬规则（2.5 档）

- **子代是 fresh 克隆**：同人格/工具面，但不 seed 你的对话——每个 `agent()` 的 prompt 必须自包含
  （背景 + 要什么 + 返回形状）；**核查类任务必须带来源坐标**（文件路径 / 原文 / URL）——没有来源坐标的
  「极简 brief」会逼 worker 编造或拒绝（2026-11-08 行为烟测实证）。
- **不能替代独立人格**：`workflow` 无 `agentPreset`；CMO 的结论仍走命名委托。
- **门自己写**：`missing > 0` / `failures` 非空就自己 `throw`（或返回给父代理读）；不要 `try/catch` 吞 fatal。
- **schema 只吃子集**：`enum` / `const` 必须同时写 `type`（`{ type: 'string', enum: [...] }`），`oneOf`
  不能和 `type` 并列，根必须是 `object`——否则整轮 `UNSUPPORTED_SCHEMA` fatal，不是分支失败（2026-11-08 实测）。
  `type` 只接受单个字符串（`['string','null']` 用 `oneOf`）。
- **但工作流分支不传 schema**：引擎在 schema 分支拿不到 structured output 时会把 child 已写好的文本丢掉、
  只给父脚本 null（BUG-040，无诊断）。分支改成“只回一行 JSON”，父脚本 `JSON.parse`；parse 失败或 null 时
  把**原文**记进 `missing`（数据不丢、父代理看得见）。schema 只留给单次 `agent()`，且 prompt 明确
  “调用 `structured_output`”。
- **失败不自动重跑**：`null` 可能是 refusal / error / aborted / 缺结构化结果，不保留原因；先判任务幂等且
  失败可重试，最多同 task / schema 再派一次（attempt label 不同），仍失败记 missing / exhausted。
  `AGENT_START` / `AGENT_RESULT` / 取消是 fatal，不许 catch 后伪装成 null 或安全重试。
- **分支默认是叶子**：分支里再起 `subagent` / `workflow` 只在确需两层时用——回执和自述会混进同一段
  返回文本（`started subagent … <值>`，2026-11-08 实测）；**schema 只约束输出形状，不保证分支拿到干净值**。
  确需两层就让父 workflow 直接起第二层，或规定分支只回一行可解析值。
- **写盘**：分支只读，或一分支一文件；正式交付物只由你写。
- **长跑**：团队会话里前台 run 会阻塞你（先例约 6 分钟，Lead 消息排队）——用 `run_in_background`。
  宿主重启会中断 in-flight child（child 记 interrupted、父收不到终态；2026-11-08 实测）——部署/重启前先收口，
  别跨重启等通知；重启后要确认就 `list_subagents`（inactive 可能是被中断），要结果就 `send_to_subagent` 冷恢复。
  **后台 job 也不跨重启**：`job_list` 空、`job_output` 报 unknown；重启后用 **`workflow_runs`** 查 run 的
  completed/cancelled/lost + children（`lost` = 原结果不可恢复），要当前事实就 `send_to_subagent` 冷恢复
  ——别把“job 起了”当“结果可恢复”（2026-11-08 C7 实测）。
- **返回聚合/异常**：优先让分支各写自己的文件、父只拿 path/行数（大结果首选形状）。返回值 >200k 会被
  **硬截断**（此时 spill 文件也是截断副本）；超过内联预算（约 12.5k tokens）的结果会落 spill 文件——
  头尾预览 + 全文路径；普通行可用 `read`/`grep`，超长单行（JSON rows）用 `bash tail -c`/`sed` 按字节取
  （`read` 按行截断 2000 字符；2026-11-08 P1 实测）。
  run/job `completed` ≠ 分支成功：分支失败只折成 `null`、不单独通知，验收看数组 `null`/`count`（R10）。
  分支自述的“是否截断/长度”不可信；父用指针 + `read`/`tail` 自己核（C11：分支说没截断，实际截了 10×）。
- **谁开**：teammate 继承你的组合、也能开 workflow；一个复杂包只由 Lead 或任务板指名的 owner 开一摊，
  避免每人各开一摊（workflow 没有深度闸，嵌套 run 会叠加）。
- **触发**：判据满足即属于「大型多代理编排」，不必等用户再点名；用户点名时直接照办。

## 硬规则

- **成员不能冒充角色**：teammate 继承你的组合（工具/skills 是你的），让它叫 `cmo` 只是"你在演 CMO"。
  CMO 的 MRD/StRS 只能由**命名 child** 出，署 CMO 的名。
- **一个文件一个写者**：teammate 并行时先分配产物（谁写 `prd.md`、谁写切片清单），共享盘路径重叠用
  任务板 `writeScopes` 告警协调，不靠"大家都小心"。
- **任务书给判据**：成员读的是你的组合而非你的 persona——把"写什么、写哪、验收什么"写进任务书，
  别指望成员自己推断角色边界。
- **改稿 = 续同一个 child**：用 `send_to_subagent`（按 id）把上一稿一起发；不要用团队版 `send_message`
  （按成员名，够不到 subagent child）。
- **不越权**：不定市场/定价（CMO/VP-Sales）、不承诺交期（COO）、不替财务下结论。

## 交稿

研发包收口时，产物清单按层列（MRD/StRS/PRD），每份标 owner 与状态；未决与分歧单列。
