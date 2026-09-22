# 2026-09-22 · 组织在场板（物理人看得见谁在忙、忙什么）

状态：proposed（2026-09-22）

## 背景

数字分身是实际公司职位的对应物，所以物理人必须能回答两个问题：**我的分身此刻在不在忙**、
**它在忙哪件事**。R1 已经暴露过一次同类失败——CEO 把活丢给 VP-Eng 后，人察觉不出 VP 是一个
独立空间（[../implemented/2026-09-22-r2-ui-slice-replan.md](../implemented/2026-09-22-r2-ui-slice-replan.md)）：
机制上线了，人却看不见。R2 的任务板活面板解决了**一场动议之内**的可见性（成员状态 + 任务修订），
但回答不了"公司里四个分身此刻各自在干什么"。

本提案把这一问拆成两半，只承诺已定的一半：

- **界面内（本提案承诺）**：驾驶舱里的组织在场板——每个分身一行，显示 preset 显示名、忙闲、
  当前任务。
- **界面外（本提案明确不做，留未决）**：分身主动推送给物理人的通知渠道。

## 提案

1. **落点**：R5 驾驶舱（[30 §5](../../docs/design/30-ui-demo.md)）增加"组织在场板"切片，与既定的
   "协作动态流"共用同一个 pack 自建 Remote，不新增机制。
2. **三列数据的来源**（全部是现成机制，已核实）：
   - 身份映射：`agent-preset/selected` 是 known session event
     （`vendor/dsh/packages/core/session/src/known-event-types.ts:23`），声明为服务事件
     `(sessionId, agentPreset)`（`vendor/dsh/packages/preset/agent-presets/src/types.ts:80`）；
     花名册读 `ctx.agentPresets`。
   - 忙闲：`TeamMemberView.status: 'running' | 'idle' | 'inactive' | 'provisioning' | 'failed'`
     （`vendor/dsh/packages/experimental/agent-team/src/types.ts:58-68`）。
   - 忙什么：`TeamTaskView.subject / status / ownerName / revision`
     （同文件 `:85-97`）。
   - 会话存活：`ctx.sessionQuery` 的 `SessionRecord { header, live, persisted }`
     （`vendor/dsh/packages/session-query/session-query/src/types.ts:27-34`），且 session-query
     已在 base / web-app bundle 行里，**不需要加行**。
3. **不做自由文本"活动流"**：team 读模型没有"当前活动"字段（`TeamView = { members, tasks }`，
   `:99-103`）。要更细的粒度就看各会话对话流（R2 已验收）。硬造要么改 team 包（撞 vendor
   铁律），要么重复挂载 remote（postmortem 0003 的坑）。
4. **不做界面外推送**：DSH 的 egress 只有两条——`ctx.sessionTelemetry`（OTel 出站，
   `vendor/dsh/docs/subsystems/session-telemetry.md`）与 hooks
   （`vendor/dsh/packages/hooks/README.md`）；webhook 是 **ingress**（外部投递 → 新 root session，
   `vendor/dsh/docs/subsystems/webhook.md`），方向相反。收件箱是谁、粒度多细属于部署选择，
   本提案不定。

## 依据（实际查过）

- `session/event` 是公开 scoped 服务事件：
  `'session/event'(this: Scoped<Session>, session: Session, event: SessionEvent)`
  ——`vendor/dsh/packages/core/session/src/index.ts:72`。R5 协作动态流的数据路径同此。
- `ctx.sessionQuery` 是 host 侧读面，`live` 字段即"当前存在于 `ctx.sessions`"。
- workspace 归属按 `SessionHeader.cwd`（`vendor/dsh/docs/subsystems/workspace.md`）。
- 第一方 client 面已有 `ui-session` / `ui-sidebar` / `ui-jobs` / `ui-goal` / `ui-agent-preset`
  等现成可视面（`vendor/dsh/packages/client/`）——本切片是**聚合与身份映射**，不是重造列表。

## 输掉的方案

- **与培养/学习/共享盘合成一篇大提案**：Agent Note 的生命周期按文件移动，proposed → implemented
  要整篇改骨架（`vendor/dsh/.agents/notes/README.md`），而四问毕业轮次不同，合篇会产生
  "半实现"的非法态。
- **自建活动流 / 重复挂载 team remote**：postmortem 0003（重复挂载砖全 UI）+ vendor 铁律
  （一个字节都不改 vendor）。
- **把 session-telemetry 当唯一答案**：它是给运维的日志管道，不是给人看的组织视图，且后端由
  部署方选。
- **给每个分身开一个常驻会话当"在线状态"**：DSH 的会话不是常驻进程，空会话没有"在线"语义，
  成本换不来信息。

## 验收判据

R5 切片完成时，以下都必须是**代理能自己跑**的检查（D15）：

1. host 侧 keyless 单测：给定 roster + 会话事件流，在场板读模型输出"四个分身 ×
   (显示名, status, 当前任务 subject)"，缺失/未知状态不崩（进 `pnpm test` 家族）。
2. `node scripts/client-load-smoke.mjs` 扩展：真页面加载后在场板槽在场、零插件挂载失败。
3. 端到端（真会话，四角色）：任一分身接活后 5s 内 status 转 `running` 且任务 subject 出现；
   任务完成转 `completed`。
4. 回放：`snapshots/r2-motion/` 的录制能喂给读模型产出非空在场板（不需要 API key）。

## 风险与未决

- **不在 TeamView 里的分身会漏**：CEO 直接起的 subagent、非 team 会话不进 roster。缓解：在场板
  以"会话 × preset"为主键、team 状态为增强列，缺失显示 `unknown` 而不是隐藏。
- **冷启动为空**：`session/event` 只在进程活着时订阅得到，历史态要靠 `sessionQuery` 补；两条
  路径的合并语义要在实现时定。
- **status 语义是 team 内的**（`running` / `idle` / …），不等于"这个人此刻在工作"。UI 文案要
  标明这是团队内状态，否则物理人会误读。
- **未决（本提案不承诺）**：界面外收件箱；是否为 CEO 单开一行"公司级"视图。
