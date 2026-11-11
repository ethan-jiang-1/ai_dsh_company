---
status: 调查中
severity: P2
opened: 2026-11-11
---

# BUG-076：support root 不再有 team header，但仍拿到 vendor `team:policy` 与全套 team 工具；guard 只拦 `spawn_teammate`

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：调查中

## 症状

修复后（f239f396）`worker` / `quality-loop-verifier` 作为 root：

- delegation header/section 已为空（`header=false, sections=[]`）——BUG-072 的前半修好了；
- 但 `system/message` 仍有 vendor 的 **“Agent Teams is available in this session”**（`team:policy`）；
- 工具面仍有 `spawn_teammate`、`list_agents`、`send_message`、`wait_agent`、`team_task_create/get/list/update` 等；
- `team-seat-guard` 只把 `spawn_teammate` 拒掉，`team_task_create` 等**不在 guard 范围**。

实测（2026-11-11 修复后）：

- worker root `session-0c92acbe-5a85-4909-b9eb-b4d1c2f3161a`：`teamPolicy=true`、`spawnTeam=true`、`listAgents=true`、`teamTask=true`、header=false；后续同一 root `session-0f5064c5-…` 实际创建了 `task-1`；
- quality-loop-verifier root `session-5339c88b-b7d3-4144-ab92-8ed87883394f`：同上；
- 强制 prompt（worker root `session-0f5064c5-2784-4be7-99bd-217c8be72a3d`）：`spawn_teammate` 被 guard 拒（`support capability seat`），但模型紧接着**成功调用了 `list_agents`**；再 prompt `team_task_create` → **成功创建 `task-1`（subject=ghost-test, status=pending）**。guard 只覆盖 spawn，team 控制/任务面仍可用，实际产生了 ghost 任务。

也就是说：产品文案说“support 不是 team 座位”，但模型仍被告知“Agent Teams is available”，且能看到/调团队任务与消息工具；只有 spawn 被拒。模型可能创建 ghost task、向 lead 发消息、或先被 vendor 政策诱导再被 guard 拒。

## 根因（假设）

BUG-072 的修复选了 **per-agent `spawn_teammate` guard**，理由是 vendor 按 Lead 安装九件套、host 没有按 preset 摘除 scope 工具的 seam。guard 的范围只覆盖“组队”的 spawn 动作，没有覆盖：
- vendor 自动注入的 `team:policy` 文本（host 没删/没覆盖）；
- `team_task_*` / `send_message` / `wait_agent` / `list_agents` / `interrupt_agent` 这些同样只对“团队座位”有意义、但在 support root 上仍在的工具。

结果：header 说“本座位没有 team”，vendor policy 说“Agent Teams available”，tools 里还有大半套 team 面——三个载体不一致。

## 暴露的失败类

**“座位撤销”只撤了入口动作，没撤能力面/政策面**：把 `spawn_teammate` 当 team 座位的唯一代表；实际上 team 是一组工具 + 一段 vendor policy + 任务板/消息面。只 guard 一个工具，会留下可用的 ghost 任务/消息面和矛盾文案。

## 复现

1. `source run/env.sh`，company profile（修复后 commit）。
2. `session/create` `agentPreset: 'worker'` 或 `'quality-loop-verifier'`；短 ping。
3. 读 `system/message` 与 `request/header.tools`：
   - “Agent Teams is available in this session” 在场；
   - `spawn_teammate` / `team_task_create` / `list_agents` / `send_message` 在场；
   - delegation header 为空。
4. 对 worker root 说“用 team_task_create 建一个任务”，模型可调用；`spawn_teammate` 才被 guard 拒。

证据 = 上列 session id（修复后 2026-11-11 实跑）。

## 修复方向（未授权）

- **扩展 guard**：对 support preset 同时拒 `spawn_teammate` + `team_task_*` + `send_message` + `wait_agent` + `list_agents` + `interrupt_agent`；拒绝理由沿用 `supportTeamDenial`。
- **补一段模型可见的纠正**：vendor `team:policy` 不能删时，host 在 support root 注入一句“Agent Teams 工具虽安装，但本座位不是团队座位；不要调用这些工具”；但这是文案，执行面仍需 guard。
- **产品侧**：root 选择器隐藏 support preset（fix Note 说 vendor 没 hidden 字段；client roster 过滤仍可做，需产品决定）。
- 验收：support root 的 team 工具调用全部可见拒绝（或工具面不出现）；header/vendor policy/tools 三者一致；六角色与其他座位不变；`pnpm test`/`typecheck`/`verify`/`preset-smoke` 绿；反证 = 去掉 guard 恢复 ghost 调用。

## 修复关联

未修。发现于修复后复验（BUG-072 的残余）；相关 Note = [2026-11-11-capability-seat-single-source.md](../../notes/implemented/2026-11-11-capability-seat-single-source.md)；前置 BUG = [BUG-072](../_archive/fixed_bugs/BUG-072-support-root-can-spawn-team.md)。
