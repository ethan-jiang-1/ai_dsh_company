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
| **2 一次性 worker** | 1–2 件并行调研/盘点/测算；不要持久协作 | `subagent`（fresh）或 `subagent_fork`（带上下文；**只带已完成轮**，本轮刚读的不在——2026-11-08 实测）；给清晰 brief；需要子层时把 `agent_preset` 设为 `worker-orchestrator`（它只能再带 leaf；件数由你的 brief 决定，别在 brief 里假设硬上限），默认 `worker` | worker 只回证据，判断仍署你 |
| **2.5 并行扇出（workflow）** | ≥3 个同构分支、要合并/交叉核对/只回异常，且不需要独立人格（**默认用 workflow，不是拉多次 subagent**） | `workflow` 写脚本：`parallel`/`pipeline` + 异常优先；**分支只回一行可解析 JSON，父脚本 `JSON.parse`**；分支只读或一分支一文件；返回聚合/异常 | 你合稿署名 |
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

## workflow 使用（2.5 档）

- 判据：**≥3 个同构分支**、要合并/交叉核对/只回异常，且分支不需要独立人格；默认用 workflow，不是拉多次 subagent。
- 分支是 fresh 克隆：每个 `agent()` 的 prompt 自包含；分支只回一行 JSON，父 `JSON.parse` 聚合；失败 `null` 计数/记 missing，不把 fatal 吞成 null。
- schema/截断/spill/重启/终态等**引擎事实**住 `company:workflow-contract` section；本 skill 不复述。
- 长跑用 `run_in_background`，用 run/job 视图收结果，不靠轮询文件；分支默认叶子，确需两层由父层显式开，深度是绝对量（分支 +1）。
- 触发：判据满足即属于大型多代理编排，不必等用户再点名；用户点名时直接照办。

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
