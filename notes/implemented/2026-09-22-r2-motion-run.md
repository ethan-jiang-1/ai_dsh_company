# 2026-09-22 · R2 动议实跑记录（机制验证 + 按轻任务纪律中止）

## 跑的是什么

动议：**把对账 / 票据核对能力产品化，卖给现有 9 家客户——做不做、怎么定价、接不接得住**
（口径预先写在 brief 里：产品形态 = 可复制交付包；不再向用户提问）。Lead = `ceo`，
session `session-37cc53ac-4a71-45bb-886d-8ee71e46ae0a`，跑在 web 观察窗（3086）上。

## 已证实的机制（从权威日志与工作区读出的证据）

| 面 | 证据 |
|---|---|
| 建队 | `spawn_teammate` ×4 → child 会话 vp-sales / vp-eng / coo / cfo（member.id 见 `team/member` 事件） |
| 任务板 DAG | `team_task_create` ×7，其中 **3 条带 `blocked_by`**；任务名含"互审①：CFO 审 VP-Sales 定价与毛利假设""互审②：COO 审 VP-Sales 的交付承诺与承接相容性" |
| 跨职能互审 | 互审任务被 claim → 出评审件 → `send_message` 发修订指令 → owner 改稿 + 任务板回执（消息流里能看到"修订指令 · 互审意见已到齐，请改稿 + 回执"） |
| 消息投递 | `team/message/queued` 25 / `team/message/delivered` 25（**不丢不重**：队列与投递计数一致） |
| 交付物 | `deliverables/reconcile-package*.md` 共 7 份（VP-Sales/VP-Eng/CFO/COO 稿 + 两份互审件 + 合稿） |
| M4 共享组合的实证 | teammate 会话 header `agentPreset: "ceo"`、`parentSessionId: null`、`delegationDepth: 1`——团队内成员共享 Lead 组合（design/20 §4 缺口的现场证据） |

归档：`snapshots/r2-motion/`（lead 451 行 + 4 个 child 会话 + `workspace.expected/`），
由新脚本 `scripts/snapshot-motion.mjs` 从 `$DSH_HOME/sessions/` 生成。

## 未完成 / 未验证（诚实记账）

- **CEO 合稿 `present` 未发生**：跑了几十步、96 条消息仍不见底（无预算、无刹车），按用户
  当轮定的纪律**中止**（先 `session/cancel` 掉 Lead，teammate 由 subagent 路由托管拒收取消，
  最终停掉观察窗进程收口）。分镜 v0 的"收口 + 交付卡片"两镜未走到。
- **UI 观演未进行**：用户未能在 3086 找到该会话（token URL / workspace 过滤），
  所以"全程 UI 可见 / 两空间镜头"的验收仍未由人观察过。
- 因此 R2 的 ④ **不是全部验收通过**，是"机制已被真跑证实 + 归档就位 + 收口镜未走"。

## 随之立的两条纪律（guides/60）

- **§9 门禁分层**：连通档（默认，≈6s）vs 内容档（`--full`，按需）。
- **§10 自动化只许是轻任务**：开跑前定三个上限（墙钟 / 轮次或工具调用 / 输出量），
  可中断（web 会话 `session/cancel`；teammate 逐个取消），**不无人值守跑多智能体**，
  产出关键证据后用"只做收口"的受限指令或人工接手。
