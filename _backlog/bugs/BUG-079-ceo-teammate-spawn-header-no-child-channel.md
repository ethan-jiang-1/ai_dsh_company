---
status: 调查中
severity: P2
opened: 2026-11-11
---

# BUG-079：CEO teammate header 列 `spawn`，但它没有可用的 child 通道；`controlsChildren` 也与 vp-eng teammate 矛盾

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：调查中

## 症状

第二次修复后（5557d901）真 teammate 座位：

- **CEO teammate** `session e98ead5c-b583-4f38-a3a1-bf57ea2423f0`：
  - header = `Available channels: spawn, team collaboration.`
  - 工具面：`subagent=false`、`subagent_fork=false`、`workflow=false`；有 `spawn_teammate`（Lead-only）、命名行（`vp_eng` 等，`maxDepth:1`）、`team_task_create`；`list_subagents=false`。
  - teammate depth=1；命名行 `maxDepth:1` ⇒ 再派 depth 2 > 1，会抛；`spawn_teammate` 非 Lead，会拒；**没有任何可用的 child 通道**，但 header/`spawn` section 仍告诉它 spawn 可用。
- **VP-Eng teammate** `session 6f564bbf-5db2-4be7-9f58-8af618cf0d11`：
  - header = `spawn, fork, workflow, team collaboration, retry`；
  - `subagent=true`、`subagent_fork=true`、`workflow=true`；它真能起 child，控制面也保留（`list_subagents=true`）。
- `DelegationSeat.controlsChildren` 对 **所有** teammate 都是 `false`（`teamRole !== 'teammate'`），但 vp-eng teammate 的 control 实际被安装（`delegation-control` 用 `hasTool('subagent')` 另判）——同一座位模型里，字段与消费者相反。

## 根因（假设）

`delegation-contracts` 的 spawn 判据仍是 `caps.spawn`（preset 级），没有看“这个座位有没有**可用的通用 child 通道**”：

```ts
spawn: caps?.spawn === true,
```

`caps.spawn` 对 CEO/vp-eng 都是 true，但：
- CEO teammate 没有 generic `subagent`/`subagent_fork`，命名行又被 depth/Lead 限制；
- vp-eng teammate 有 generic `subagent`/fork，真能起 child。

`seat.controlsChildren` 用 `teamRole !== 'teammate'` 一刀切，也把 vp-eng teammate 判成 false；`delegation-control` 只好用 `hasTool` 再补一遍——同一个能力两处判，天然漂。

## 暴露的失败类

**preset 级能力覆盖了“座位可用性”**：`spawn` 是组合能力（caps），不是座位能力（有没有可用 child 通道、是否被 Lead/depth 限制）。同型：`fork`/`workflow` 在 teammate 上也应按工具面 + 座位判，而不是 caps + 工具在场两项各判一半。

## 复现

1. `source run/env.sh`，company profile（5557d901）。
2. CEO root / vp-eng root 各 `spawn_teammate` 一个成员，等首轮 `request/header`。
3. 读 header + tools：
   - CEO teammate：header 有 `spawn`；`subagent/fork/workflow` 均 false；`spawn_teammate` 在但非 Lead；命名行 depth 受限。
   - vp-eng teammate：header 有 `spawn/fork/workflow`；generic 工具在；`list_subagents` 在。
4. 对 CEO teammate 说“用 vp_eng 派一个 child”，会撞 depth 1 行；说“用 subagent”则工具不存在；`spawn_teammate` 被 Lead-only 拒。

证据 = 上列 session（2026-11-11 第二次修复后）。

## 修复方向（未授权）

- 把 `spawn`/`fork`/`workflow` 的可用性从 **caps + 工具在场** 收成 **座位可用 child 通道**：
  - `hasUsableChildChannel(seat, tools)` = 通用 `subagent`/`subagent_fork` 在场 ∧ 座位允许（root/命名 child/有 generic 的 teammate）∧ depth 预算 > 当前 depth；
  - CEO teammate = false；vp-eng teammate = true；roles/root 按现行为。
- 让 `controlsChildren` 派生同一个函数，`delegation-control` 不再用 `hasTool` 二次判；或把 `controlsChildren` 改成 `hasChildChannel` + `childDepthBudget`。
- 验收：CEO teammate header 不含 spawn/fork/workflow，`spawn` section 不注入；vp-eng teammate 仍含并可起 child；`list_subagents` 只有 vp-eng teammate 有；`pnpm test`/`typecheck`/`verify`/`preset-smoke` 绿；反证 = 把 CEO teammate 的 `subagent` 行临时加上即变绿/红。

## 修复关联

未修。发现于第二次修复后复验；相关 Note = [seat-matrix-team-collaboration](../../notes/implemented/2026-11-11-seat-matrix-team-collaboration.md)；前置 = [BUG-077](../_archive/fixed_bugs/BUG-077-teammate-header-omits-team-collaboration.md)（team 拆开了，spawn 还没拆）。
