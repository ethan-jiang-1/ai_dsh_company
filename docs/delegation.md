# delegation · 汇报线合同（0.2.1：activation 世界里的两条路）

> 什么时候读：CEO 派活方式要改、或委派行为不符预期时。路线 = 通道表（A/B）→ 边界节。
> 顶层合同：CEO 的"派活"现在时语义——哪条路走什么、边界在哪、被什么检查守住。
> 机制依据 [design/architecture.md](./design/architecture.md) §3（通道 A/B）与
> [design/roles-isolation.md](./design/roles-isolation.md) §2–§3；0.2.1 的激活模型见
> vendor `docs/upgrade-guide/v0.2.1-alpha.1/subagent-activations/guide.md`。

## 0. 一句话

CEO 有两条派活路，**按"要不要协作面"分，不按"熟不熟"分**：

- **要协作面**（任务板、互审、会议上下文、能反复追加意见）→ `spawn_teammate`（Agent Teams，
  主通道 D4）。
- **只要一份稿**（单职能快捷出稿）→ `vp_eng` / `vp_sales` / `subagent_research`（命名委托工具，
  通道 A；0.2.1 起每次调用都是一次 **activation**）。

## 1. 命名委托工具（通道 A）

| 工具 | 汇报对象 | 关键 config |
|---|---|---|
| `vp_eng` | VP-Eng（研发） | `provider: spawn` · `maxDepth: 1` · `agentPreset: vp-eng` |
| `vp_sales` | VP-Sales（销售） | `provider: spawn` · `maxDepth: 1` · `agentPreset: vp-sales` |
| `subagent_research` | 只读调研执行手（一次性调研） | `provider: spawn` · `agentPreset: worker-researcher`（只读工具面） |
| `vp_cmo` | CMO（命名专家：MRD/StRS；**只在 vp-eng preset**，CEO 的 vp_cmo 仍 maxDepth 1） | `provider: spawn` · `maxDepth: 2` · `agentPreset: cmo` |

- **activation 语义**：调用立刻返回回执 `{ kind: 'activation', subagentId }`（线上文本形如
  `started subagent <id>`）；子代理的**最终正文**作为父会话的完成通知送达
  （`source.kind='subagent-settled'`, `form:'notice'`），不再塞进工具结果。
- **人格只能由 `agentPreset` 给**：0.2.1 删除了 per-instance `persona` / `toolFilter` /
  `backgroundMode` / `enableRunInBackground`（Config 硬拒）。每个工具行钉一个角色 preset，
  于是 child 拿到的是**该角色的 skills 与工具面**，而不是 CEO 的继承面。
- **深度**：`maxDepth` 是绝对深度上限（`0` 禁止、`1` 只允许直接子代；行上不写则读 Host 默认 1）。
  `vp_eng`/`vp_sales` 行是 1——VP-Eng 可能是团队成员
  （depth 1，见 §3），他起的子代落在 depth 2。团队成员加人只能走命名委托：`spawn_teammate` 仅 Lead 可调。
- **改稿方式**：优先 `send_to_subagent` 续同一个 named child（root/命名 child 都可用；带上一稿原文）；
  不可续或需要新上下文才再委派一次。CEO 团队的反复追加/互审仍归 team（`send_message` 按名）。
- **工具行归属**：写在 `presets/ceo/agent.cordis.yml` 的 `delegation` 组内（preset 自包含，
  DSH 无 patch 继承——见 [presets.md](./presets.md) §工具面）。

## 2. 为什么 CEO 不放续驶控制行（R3 实证，0.2.1 仍成立）

CEO 会话**从第一个请求起**就是 team-scoped——`tool-agent-team` 按成员作用域 shadow 掉全局控制名，
而 **Lead（CEO）自己也是 team member**：

| 名字 | CEO 会话里实际是谁 | 寻址方式 |
|---|---|---|
| `send_message` | 团队版 | `target` = "Team member **name**, or lead" |
| `list_agents` | 团队版 | 无参数（只列 Lead + teammates） |
| `interrupt_agent` | 团队版 | `target` = "Teammate name" |
| *（全局版对照）* | *被 shadow* | `agent_id` = "any exact live Agent may target its **direct continuable child**" |

subagent child 不在团队名册上 ⇒ 在 CEO 会话里**既发不了消息、也中断不了、也列不出来**。所以：

- CEO preset 里**不放** `tool-subagent-control` / `tool-subagent-list-agents`：在 CEO 会话里它们
  是被团队版盖掉的**死行**。`pnpm test` 有**反向守卫**，别"修"回来。
- 职能 preset（vp-eng / vp-sales / coo / cfo）**要放**：根门虽是 Lead（团队版会装、这几行被 shadow），
  但**命名 child 不是 team member**——它加载该职能 preset 时只有全局行可用；缺了就是 activation child 失联。
- 续驶/连续对话归 team（§3）。

证据：`snapshots/replay/foundation-workspace/replay/session.v3.jsonl` 的第一帧 `request/header`（R2 归档即已如此）；
`checks/smoke/delegation-smoke.mjs` 在全新会话复现并把它变成回归守卫。

### 2.1 根门 = Team Lead（B1 机制事实）

任何没有 `parentSession` 的根会话都是 Lead（`agentTeam` 投影 = 单成员 `lead`）⇒ **VP-Eng 根门可以
`spawn_teammate` 带研发小队**（成员继承 VP-Eng 组合，是"VP-Eng 带的工程师"，不是别的角色）。
三种门的能力不同，别用一个门承诺另一个：① VP-Eng 根门 = Lead，能组 team、能命名请 CMO；
② CEO 命名 `vp_eng` child = 不是 member，不能 spawn，但能请专家（depth 2）；③ CEO teammate `vp-eng`
= 继承 CEO 组合，受 CEO 的 `vp_cmo maxDepth 1` 限制。root=Lead 的 keyless 证据 =
`probes/team/vp-eng-root-lead-probe.mjs`。

## 3. 团队（通道 B，主通道 D4）

- `spawn_teammate` 建具名成员；`send_message` 按成员名 Steer 投递；共享任务板（CAS 修订号 +
  `blockedBy` DAG + `writeScopes` 告警）；`fork` 把会议上下文下发给新成员。
- 成员是**持久**的：running 就近步边界投递、idle 开新轮、inactive 冷恢复、消息不丢不重——
  **这才是"跟 VP 连续对话"的载体**（Q1 的答案）。
- 代价：teammates **共享 Lead 的组合**（工具/skills 面是 CEO 的，角色差异靠
  name/description + `team:policy` + KB 目录约定做软隔离；上下文隔离仍是硬的）。
  所以 CEO 团队成员**没有** vp-eng 的 `workflow` / `subagent`；这两个只在 `vp_eng` 命名 child
  （vp-eng preset）里。要 workflow/subagent 的活走命名委托；团队里叫 "vp-eng" 的成员不是 vp-eng preset。

## 4. 能力边界（诚实记账，别假装没有）

1. **委托 child 现在按 `agentPreset` 组合**（0.2.1 的收益）：`vp_eng` 的 child 有自己的角色 skills
   （`eng-workflow` / `tech-feasibility-review`），不再继承 CEO 的 `chairing-staff-meeting`。
   `delegation-smoke --delegate` 的 [3] 守卫钉住两件事：child 日志首帧 `agentPreset = vp-eng`；
   child 工具目录**没有** Team 工具（0.2.1 起组合按 preset 解析，旧的"one-shot child 误见 Team
   工具"限制已不在本仓复现；若回归，先看 vendor `tool-agent-team` README 的 Known Limitations）。
2. **要自定义组合/多角色编排** ⇒ 四个职能角色的 `subagent_fork`（可续跑的自身分叉）+ 命名委托；
   `workflow` 是 vp-eng 的**同身份并行扇出**通道（`workflow-ptc` + `tool-workflow`，不能带 `agentPreset`，
   不能替代独立结论）；CEO 的编排面仍是 team + 命名委托；命名委托仍是**单职能快捷出稿**的主路。
3. **并行快捷派活**：多个工具调用可在同一轮并行发起；每个都是独立 activation，完成通知分别回来。
   要共享任务板/互审仍走 team。
4. **控制面现状**：根会话是 Lead，`send_message` / `list_agents` / `wait_agent` / `interrupt_agent` 是团队版、
   只认名册成员，够不到根起的 `subagent` child（`list_agents` 只回 `lead`、`send_message` 报
   `active teammate not found`；机制 = §2）。根门改用 `list_subagents`（父会话 durable catalog，重启后可查）
   与 `send_to_subagent`（官方 `ctx.subagents`，续驶/催稿），名字不被 shadow。`list_subagents` 的每行还带
   **引擎身份**：`agentPreset` / `delegationDepth`（十进制字符串，例 `"3"`）读 child durable header，
   读不到显式 `unavailable`（不默认 worker/0）——父代理据此核对 preset/深度是否真生效（BUG-046）。`subagent`/`subagent_fork` 行
   `maxDepth: 3`：CEO→VP（1）→workflow 分支（2）→worker（3）放行；VP 根门→分支→worker 仍有余量（2026-11-09 源码：分支/成员都是 activation 子代，深度 parent+1）。重试敏感的小活可用 `subagent_retry`（host 原语，仅五个有 generic subagent 的 full role；同步、最多 2 attempts、attempts/exhausted 可见；长/批量走 workflow）；**它的子代深度不另立预算**——上限 = 该 preset 通用 `subagent` 行的 `maxDepth`（vp-eng 3 / 其余四个 2），到预算底部返回 `stopReason: depth-exceeded` 且不起 child（BUG-045）；generic child 需要子层时 `agent_preset` 选 `worker-orchestrator`（它只带 leaf）。

## 5. UI：委派工具卡

- 槽 `tool.call.toolview`（keyed），key = `vp_eng` / `vp_sales`；渲染"委派 · VP-Eng｜brief｜
  VP 交回的稿子"，状态 running/ok/error/stopped 只从 call/result 切片推导（可回放）。
- ⚠ **key 必须与 preset 的 `toolName` 逐字一致**：keyed key 域是开放的，拼错**不报错**、只是永不
  渲染。两边由共享常量 `packages/company-pack/src/client/wiring/delegation-keys.ts` 钉住，
  `pnpm test` 的 client-face 守卫比对 preset 的 `toolName`。
- 卡片只依赖 `slots` 服务（不读团队状态），单独 `ctx.inject(['slots'], …)` 注册——不被 team
  remote 的缺席拖住。

## 6. 验证（分层，只报告实际跑过的）

**分层原则（R3 立）**：按"要不要模型"切，不按"重不重要"切；真模型/真浏览器不进回归。
**逐层命令、预算与触发条件 = [tests/README](../tests/README.md) 与各脚本头注**（本文件不复述，避免两处漂移）：
keyless（`pnpm test`：委派卡视图模型 + card key ↔ `toolName` 逐字一致）→ 真页面挂载
（`client-load-smoke`）→ 机制/边界（`delegation-smoke`：activation 回执、child 首帧 `agentPreset`、
child 无 Team 工具）→ 挂载（`preset-smoke`）→ 端到端（历史重放；现行真页面车道 = `ui-scene-smoke`）。
