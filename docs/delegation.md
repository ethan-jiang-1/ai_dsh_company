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
| `subagent_research` | 通用研究员（一次性调研） | `provider: spawn` · `agentPreset: researcher`（只读工具面） |

- **activation 语义**：调用立刻返回回执 `{ kind: 'activation', subagentId }`（线上文本形如
  `started subagent <id>`）；子代理的**最终正文**作为父会话的完成通知送达
  （`source.kind='subagent-settled'`, `form:'notice'`），不再塞进工具结果。
- **人格只能由 `agentPreset` 给**：0.2.1 删除了 per-instance `persona` / `toolFilter` /
  `backgroundMode` / `enableRunInBackground`（Config 硬拒）。每个工具行钉一个角色 preset，
  于是 child 拿到的是**该角色的 skills 与工具面**，而不是 CEO 的继承面。
- **`maxDepth: 1`**：委托 child 不能再委托 `vp_eng`/`vp_sales`；通用 `subagent` 行的默认深度也是
  1（`subagent` 包 Config）。要嵌套需在行上显式写 `maxDepth`。
- **改稿方式**：再委派一次，把上一稿一起给它。CEO 会话的 `send_message` 是团队版（按成员名寻址），
  够不到 subagent child——所以命名委托不承担"反复追加意见"，那归 team。
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
- 职能 preset（vp-eng / vp-sales / coo / cfo）**要放**：它们的根会话不是团队成员，团队版不会装；
  缺了这两行，activation child 在职能会话里同样失联。
- 续驶/连续对话归 team（§3）。

证据：`snapshots/replay/r2-motion/sessions/lead.jsonl` 的第一帧 `request/header`（R2 归档即已如此）；
`checks/smoke/delegation-smoke.mjs` 在全新会话复现并把它变成回归守卫。

## 3. 团队（通道 B，主通道 D4）

- `spawn_teammate` 建具名成员；`send_message` 按成员名 Steer 投递；共享任务板（CAS 修订号 +
  `blockedBy` DAG + `writeScopes` 告警）；`fork` 把会议上下文下发给新成员。
- 成员是**持久**的：running 就近步边界投递、idle 开新轮、inactive 冷恢复、消息不丢不重——
  **这才是"跟 VP 连续对话"的载体**（Q1 的答案）。
- 代价：teammates **共享 Lead 的组合**（工具/skills 面是 CEO 的，角色差异靠
  name/description + `team:policy` + KB 目录约定做软隔离；上下文隔离仍是硬的）。

## 4. 能力边界（诚实记账，别假装没有）

1. **委托 child 现在按 `agentPreset` 组合**（0.2.1 的收益）：`vp_eng` 的 child 有自己的角色 skills
   （`eng-workflow` / `tech-feasibility-review`），不再继承 CEO 的 `chairing-staff-meeting`。
   `delegation-smoke --delegate` 的 [3] 守卫钉住两件事：child 日志首帧 `agentPreset = vp-eng`；
   child 工具目录**没有** Team 工具（0.2.1 起组合按 preset 解析，旧的"one-shot child 误见 Team
   工具"限制已不在本仓复现；若回归，先看 vendor `tool-agent-team` README 的 Known Limitations）。
2. **要自定义组合/多角色编排** ⇒ `subagent_fork`（可续跑的自身分叉）与 `tool-workflow`（JS 编排
   fan-out 子代理）；命名委托仍是**单职能快捷出稿**的主路。
3. **并行快捷派活**：多个工具调用可在同一轮并行发起；每个都是独立 activation，完成通知分别回来。
   要共享任务板/互审仍走 team。
4. **控制面现状**：四个职能 preset 声明 `tool-subagent-control` + `.../list-agents`（R4；上游成对
   形状——vendor 的 maybeInstall 只对 team 成员装团队版控制名，职能根会话不是成员）；CEO preset
   不放全局控制行（team-scoped 死行，有反向守卫）。

## 5. UI：委派工具卡

- 槽 `tool.call.toolview`（keyed），key = `vp_eng` / `vp_sales`；渲染"委派 · VP-Eng｜brief｜
  VP 交回的稿子"，状态 running/ok/error/stopped 只从 call/result 切片推导（可回放）。
- ⚠ **key 必须与 preset 的 `toolName` 逐字一致**：keyed key 域是开放的，拼错**不报错**、只是永不
  渲染。两边由共享常量 `packages/company-pack/src/client/delegation-keys.ts` 钉住，
  `pnpm test` 的 client-face 守卫比对 preset 的 `toolName`。
- 卡片只依赖 `slots` 服务（不读团队状态），单独 `ctx.inject(['slots'], …)` 注册——不被 team
  remote 的缺席拖住。

## 6. 验证（分层，只报告实际跑过的）

**分层原则（R3 立，guides/dev-loop §9.1）**：按"要不要模型"切，不按"重不重要"切。真模型/真浏览器
**不进回归**——它们分钟级且依赖模型配合；回归只跑秒级的 keyless 层。

| 层 | 手段 | 守什么 | 何时跑 |
|---|---|---|---|
| keyless 行为 | `pnpm test` → `tests/client/delegation-card.spec.ts`：纯函数视图模型（running/ok/error/stopped、brief 解析、截断 JSON 回退、未知工具名回退）+ `react-dom/server` 静态渲染 | 卡片**渲染语义**（不需要 DOM、不需要模型，毫秒级） | 每次改动 |
| keyless 装配 | `pnpm test` → `tests/client/client-face.spec.ts`：卡片 key ↔ preset `toolName` **逐字一致** + 注册走共享常量 + 单独 `inject(['slots'])` | keyed slot 的**静默失效**（key 拼错 = 永不渲染） | 每次改动 |
| 真页面挂载 | `node checks/smoke/client-load-smoke.mjs`：真浏览器加载真页面，零 loader 错误 + 品牌在场 | client 入口 apply 抛错（slot 名写错会在这里炸，postmortem 0003） | 客户端改动 |
| 机制 / 边界 | `node checks/smoke/delegation-smoke.mjs`（1 条 prompt ≈30s）：`vp_eng`/`vp_sales`/`subagent_research` 在模型可见目录 + 三个控制名仍是团队版；`--delegate` 真委派一次，断言收到 activation 回执（`started subagent <id>`）、child 日志首帧 `agentPreset = vp-eng`、child 目录无 Team 工具 | activation 语义回归（回执变正文 = 红）；preset 组合没落到 child；Team 工具误入 child 目录 | 该边界改动后 / **升 pin 时** |
| 挂载（上线前门禁） | `node checks/smoke/preset-smoke.mjs` | 行 config 校验（preset 挂载失败，postmortem 0001） | preset 组合或内容改动后 |
| 端到端（**已交付，R5a**） | 模型真调 `vp_eng` → 真 UI 对话流里的委派卡 | "模型→工具→卡片"全链路 | `replay-smoke --ui`（无 key 重放 + ariaSnapshot 金样） |

**为什么端到端走重放而非每轮真跑（R3 试过并否决）：**先做的是"真浏览器 + 真 composer 驱动模型"
的 e2e，240s 都等不到卡片——CEO persona 的开工仪式先烧 5–6 步模型往返，且**依赖模型配合**
（模型不调那个工具就永远绿不了）；改成"RPC 造证据 + 真浏览器只做渲染断言"后，又卡在侧栏
**会话列表成员/排序**（RPC 建的会话不在侧栏可见行里，属无关的 UI 细节）。结论：这条链的正确
形态是 replay harness（录制会话 → 无 key 重放；R5a 已交付），不是每轮真跑。
