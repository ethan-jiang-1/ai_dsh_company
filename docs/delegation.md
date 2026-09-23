# delegation · 汇报线合同（R3：两条路与它们的机制边界）

> 顶层合同：CEO 的"派活"现在时语义——哪条路走什么、边界在哪、被什么检查守住。
> 机制依据 [design/10-architecture.md](./design/10-architecture.md) §3（通道 A/B）与
> [design/20-roles-isolation.md](./design/20-roles-isolation.md) §2–§3；R3 的实证记录在
> `notes/implemented/2026-09-22-r3-*.md`。台账 Q1 由本篇闭合。

## 0. 一句话

CEO 有两条派活路，**按"要不要协作面"分，不按"熟不熟"分**：

- **要协作面**（任务板、互审、会议上下文、能反复追加意见）→ `spawn_teammate`（Agent Teams，
  主通道 D4）。
- **只要一份稿**（单职能快捷出稿）→ `vp_eng` / `vp_sales`（命名委托工具，通道 A）。

## 1. 命名委托工具（通道 A）

| 工具 | 汇报对象 | 关键 config |
|---|---|---|
| `vp_eng` | VP-Eng（研发） | `provider: spawn` · `backgroundMode: one-shot` · `enableRunInBackground: false` · `maxDepth: 1` · per-instance `persona` |
| `vp_sales` | VP-Sales（销售） | 同上 |

- **前台一次出稿**：调用即等结果，child 的最终正文直接回到 CEO 的对话流。
- **per-instance persona**：`dsh-tool-subagent` 的教义——"another persona … requires another
  distinctly named tool"；两个工具各带自己的职能 persona（文案见 preset ④）。
- **`maxDepth: 1`**：委托 child 不能再委托 `vp_eng`/`vp_sales`（禁止 VP→VP 平级派活）；它仍可用
  `subagent` 生自己的 workers。
- **改稿方式**：再委派一次，把上一稿一起给它（one-shot 语义）。
- **工具行归属**：写在 `presets/ceo/agent.cordis.yml` 的 `delegation` 组内（preset 自包含，
  DSH 无 patch 继承——见 [presets.md](./presets.md) §工具面）。

## 2. 为什么不是 continuable（R3 实证，别改回去）

原设计是"continuable + `send_message` 追加意见"。真跑 + schema 取证否掉了它：

CEO 会话**从第一个请求起**就是 team-scoped——`tool-agent-team` 按成员作用域 shadow 掉全局控制名，
而 **Lead（CEO）自己也是 team member**：

| 名字 | CEO 会话里实际是谁 | 寻址方式 |
|---|---|---|
| `send_message` | 团队版 | `target` = "Team member **name**, or lead" |
| `list_agents` | 团队版 | 无参数（只列 Lead + teammates） |
| `interrupt_agent` | 团队版 | `target` = "Teammate name" |
| *（全局版对照）* | *被 shadow* | `agent_id` = "any exact live Agent may target its **direct continuable child**" |

subagent child 不在名册上 ⇒ **continuable child 在 CEO 会话里既发不了消息、也中断不了、也列不出来**。
所以：

- 命名委托必须是 **one-shot 前台**；`enableRunInBackground: false` 另外堵住一个坑——后台 one-shot
  要靠 `job_output` 收，而 CEO 的模型可见目录里**没有** `job_output`。
- CEO preset 里**不放** `tool-subagent-control` / `tool-subagent-control/list-agents`：在 CEO 会话里
  它们是被团队版盖掉的**死行**。`pnpm test` 有**反向守卫**，别"修"回来。
- 续驶/连续对话归 team（§3）。

证据：`snapshots/r2-motion/sessions/lead.jsonl` 的第一帧 `request/header`（R2 归档即已如此）；
`scripts/delegation-smoke.mjs` 在全新会话复现并把它变成回归守卫。

## 3. 团队（通道 B，主通道 D4）

- `spawn_teammate` 建具名成员；`send_message` 按成员名 Steer 投递；共享任务板（CAS 修订号 +
  `blockedBy` DAG + `writeScopes` 告警）；`fork` 把会议上下文下发给新成员。
- 成员是**持久**的：running 就近步边界投递、idle 开新轮、inactive 冷恢复、消息不丢不重——
  **这才是"跟 VP 连续对话"的载体**（Q1 的答案）。
- 代价：teammates **共享 Lead 的组合**（工具/skills 面是 CEO 的，角色差异靠
  name/description + `team:policy` + KB 目录约定做软隔离；上下文隔离仍是硬的）。

## 4. 能力边界（诚实记账，别假装没有）

1. **委托 child 继承 CEO 的组合** ⇒ 它拿到的是 **CEO 的 skills**（`chairing-staff-meeting`），
   **不是** vp-eng / vp-sales preset 的角色 skills。所以 per-instance persona 必须**自带方法论**
   （写清产出形态与判据），不能指路到 `tech-feasibility-review` 这类角色 skill——那不在它的
   catalog 里。
2. **要"child 拿到角色完整 skills/工具面"** ⇒ 那是 M2（自定义 provider 在 child 创建窗口 mount
   角色 preset，[design/20](./design/20-roles-isolation.md) §3），本仓未做。触发条件 = 出现
   "必须隔离组合"的委派。
3. **并行快捷派活**（同时开几个 VP 不等结果）在本组合里没有干净解法：continuable 管不了、
   one-shot 前台串行。要它得等上游 seam（per-child composition / 不撞名的控制面），
   **本仓不自建**（D13）。
4. **控制面现状**：四个职能 preset 已补 `tool-subagent-control` + `.../list-agents`（R4；上游成对形状——vendor 的 maybeInstall 只对 team 成员装团队版控制名，职能根会话不是成员）；CEO preset 不放全局控制行（team-scoped 死行，有反向守卫）。**残留**：teammate 共享 CEO preset，其 `subagent` 与 team shadow 相冲——随升 pin 处理（`scripts/sync-dsh.mjs --pin`）。

## 5. UI：委派工具卡

- 槽 `tool.call.toolview`（keyed），key = `vp_eng` / `vp_sales`；渲染"委派 · VP-Eng｜brief｜
  VP 交回的稿子"，状态 running/ok/error/stopped 只从 call/result 切片推导（可回放）。
- ⚠ **key 必须与 preset 的 `toolName` 逐字一致**：keyed key 域是开放的，拼错**不报错**、只是永不
  渲染。两边由共享常量 `packages/company-pack/src/client/delegation-keys.ts` 钉住，
  `pnpm test` 的 client-face 守卫比对 preset 的 `toolName`。
- 卡片只依赖 `slots` 服务（不读团队状态），单独 `ctx.inject(['slots'], …)` 注册——不被 team
  remote 的缺席拖住。

## 6. 验证（分层，只报告实际跑过的）

**分层原则（R3 立，guides/60 §9.1）**：按"要不要模型"切，不按"重不重要"切。真模型/真浏览器
**不进回归**——它们分钟级且依赖模型配合；回归只跑秒级的 keyless 层。

| 层 | 手段 | 守什么 | 何时跑 |
|---|---|---|---|
| keyless 行为 | `pnpm test` → `tests/delegation-card.spec.ts`：纯函数视图模型（running/ok/error/stopped、brief 解析、截断 JSON 回退、未知工具名回退）+ `react-dom/server` 静态渲染 | 卡片**渲染语义**（不需要 DOM、不需要模型，毫秒级） | 每次改动 |
| keyless 装配 | `pnpm test` → `tests/client-face.spec.ts`：卡片 key ↔ preset `toolName` **逐字一致** + 注册走共享常量 + 单独 `inject(['slots'])` | keyed slot 的**静默失效**（key 拼错 = 永不渲染） | 每次改动 |
| 真页面挂载 | `node scripts/client-load-smoke.mjs`：真浏览器加载真页面，零 loader 错误 + 品牌在场 | client 入口 apply 抛错（slot 名写错会在这里炸，postmortem 0003） | 客户端改动 |
| 机制 / 边界 | `node scripts/delegation-smoke.mjs`（1 条 prompt ≈30s）：`vp_eng`/`vp_sales` 在模型可见目录 + 三个控制名仍是团队版；`--delegate` 多 1 条 prompt **真委派一次**，断言前台拿到 child 正文（不是 `started subagent`） | shadow 边界变了就红（提示重评 one-shot 决定）；委派出稿的**前台语义** | 轮末 / **升 pin 时** |
| 挂载（上线前门禁） | `node scripts/preset-smoke.mjs` | 行 config 校验（preset 挂载失败，postmortem 0001） | 轮末 |
| 端到端（**已交付，R5a**） | 模型真调 `vp_eng` → 真 UI 对话流里的委派卡 | "模型→工具→卡片"全链路 | `replay-smoke --ui`（无 key 重放 + ariaSnapshot 金样） |

**为什么端到端走重放而非每轮真跑（R3 试过并否决）：**先做的是"真浏览器 + 真 composer 驱动模型"
的 e2e，240s 都等不到卡片——CEO persona 的开工仪式先烧 5–6 步模型往返，且**依赖模型配合**
（模型不调那个工具就永远绿不了）；改成"RPC 造证据 + 真浏览器只做渲染断言"后，又卡在侧栏
**会话列表成员/排序**（RPC 建的会话不在侧栏可见行里，属无关的 UI 细节）。结论：这条链的正确
形态是 replay harness（录制会话 → 无 key 重放；R5a 已交付），不是每轮真跑。
