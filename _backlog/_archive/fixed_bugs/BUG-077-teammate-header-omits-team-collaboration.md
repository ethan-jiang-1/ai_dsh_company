---
status: 已修
severity: P2
opened: 2026-11-11
---

# BUG-077：teammate header 只列 spawn，却说“未列=本座位不可用”；team_task_*/消息协作面实际在场

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：已修
>
> **留痕**：Note [`notes/implemented/2026-11-11-seat-matrix-team-collaboration.md`](../../../notes/implemented/2026-11-11-seat-matrix-team-collaboration.md)
> **审查**：agent — teammate header/section spec 红→绿；pnpm test/typecheck/verify/preset-smoke 绿（真模型复跑未跑）

## 症状

修复后（f239f396）CEO 的 teammate（`session f92037eb-54f5-4bc5-8528-61c157a13214`）：

- `system/message` header：
  > Available channels: spawn.
  > Channels not listed are not available to this seat: do not call them, and do not ask downstream to try.
- 但 `request/header.tools` 里有：
  `spawn_teammate`、`list_agents`、`send_message`、`wait_agent`、`interrupt_agent`、`team_task_create/get/list/update`；
- vendor `team:policy` 也还在（“Agent Teams is available in this session”），`team:identity` 说“You are teammate …”。

也就是说：**team 协作面（任务板、消息、等待、中断）在 teammate 座位是可用的**，但 header 把 `team` 整体从“可用通道”里去掉，并用“未列 = 本座位不可用”把协作面也否定了。模型可能因此不建任务、不回 lead 消息，或把 `team_task_*` 当成未授权。

## 根因（假设）

`delegation-contracts` 的 `team` 通道判据是 `lead = isTeamLead(...)`，语义实际是“**能 spawn 队友**（Lead-only）”；但 header 的 `team` 标签和“未列 = 不可用”覆盖了**整个 team 协作面**。teammate 不是 Lead，所以不列 team；可它仍然是 team member，`team_task_*`/`send_message`/`wait_agent` 是它该用的协作工具。
修复把文案从“未安装”改成“本座位不可用”，让这个语义混淆更明显：工具确实**可用**，只是 `spawn_teammate` 不可用。

## 暴露的失败类

**一个通道名覆盖两种能力**：`team` 同时指“Lead 的 spawn 权”和“成员的协作面”。用同一个布尔量控制 header/section，必然在 member 座位误伤协作面；同型检查：`subagent`（spawn）与 `subagent_fork`、`workflow`（执行）与 `workflow_runs`（观测）是否也被一个通道名覆盖。

## 复现

1. `source run/env.sh`，company profile。
2. CEO root → `spawn_teammate` 起一个 teammate，等它首轮 `request/header`。
3. 读 teammate 的 `system/message` 与 `request/header.tools`：
   - header 只有 `spawn`；
   - tools 有 `team_task_*` / `send_message` / `wait_agent` / `list_agents`；
   - `team:policy` 说 Agent Teams available。

证据 = `session f92037eb-54f5-4bc5-8528-61c157a13214`（修复后）。

## 修复方向（未授权）

- header 把 team 拆成两条：`team spawn (Lead only)` 与 `team collaboration (member: send_message / team_task_* / wait_agent)`；teammate 列后者，不列 spawn。
- 或给 teammate 注入一段**member 版 team section**（协作规则、任务板、寻址），而不是 Lead 的 team section；同时保持 `spawn_teammate` 不列。
- 文案侧至少改成“未列的 **spawn 权**不可用；协作面以 tool description/team:policy 为准”，不要用“本座位不可用”一概而论。
- 验收：teammate header 含 team collaboration、无 team spawn；`team_task_*/send_message` 仍可用；CEO/命名 child/support root 的 header 不变；`pnpm test`/`typecheck`/`verify`/`preset-smoke` 绿；反证 = 把 member 协作面从 header 删掉 → spec/行为红。

## 已修判定

- header 把 team 拆成两个能力：`team collaboration`（Lead + teammate 共用）与 `team spawn (Lead only)`；teammate header 含前者、不含后者，不再用“未列 = 本座位不可用”否定它实际拥有的协作面。
- teammate 注入 member 版 `company:delegation-team`（寻址/任务板/`wait_agent`/writeScopes/“只有 Lead 能 spawn”），不再注入 Lead 版；Lead 仍同时拿到 collaboration 与 spawn 两段。
- CEO/命名 child/support root 的 header 不变（support 仍无 team，另有 seat note）；`team_task_*`/`send_message` 在 teammate 座位仍可用。
- keyless：teammate header/section spec（红→绿：把 team 只按 lead 判即红）；`pnpm test` / `pnpm typecheck` / `pnpm verify` / `preset-smoke` 绿。

## 修复关联

已修（2026-11-11）。发现于修复后复验（BUG-071 的 header 语义残余）；相关 Note = [2026-11-11-capability-seat-single-source.md](../../../notes/implemented/2026-11-11-capability-seat-single-source.md)；前置 BUG = [BUG-071](./BUG-071-capability-header-not-installed-wording.md)。
