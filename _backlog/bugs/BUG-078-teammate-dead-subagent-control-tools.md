---
status: 调查中
severity: P2
opened: 2026-11-11
---

# BUG-078：teammate 继承 Lead 组合后仍装 `list_subagents`/`send_to_subagent`，但没有 child 可用

> 严重级别：P2（次要）｜发现：2026-11-11｜状态：调查中

## 症状

CEO 的 teammate（`session f92037eb-54f5-4bc5-8528-61c157a13214`）工具面里有：

- `list_subagents`、`send_to_subagent`（还有 `list_agents`、`spawn_teammate`、`team_task_create`）。

但 teammate：

- 不能 `spawn_teammate`（Lead-only，`TEAM_LEAD_REQUIRED`）；
- 继承 CEO 组合，没有 generic `subagent`；CEO 的命名行（`vp_eng` 等）`maxDepth:1`，teammate 本身 depth=1，再派会 depth 2 > 1 被拒；
- 因此它**没有 child 会话**，`list_subagents` 永远空、`send_to_subagent` 没有合法目标。

这两个工具对 teammate 是**死工具**：占 token、诱导调用、调用后只能拿到空/错误。`docs/contracts/delegation.md` §4 的口径是“worker family 不装，full role/CEO 保留”——teammate 既不是 worker family 也不是 Lead，却没被覆盖。

## 根因（假设）

`registerDelegationControl` 的 per-agent 排除只按 `NON_ROLE_PRESETS`（worker/quality-loop）：

```ts
if (preset !== undefined && NON_ROLE_PRESETS.includes(preset)) return
```

teammate 的 `composedPresetOf` 是 `ceo`/`vp-eng`（继承 Lead 组合），不在 NON_ROLE 表，所以控制工具被装上。判据看的是 **preset**，不是 **这个座位能不能起 child**：root/命名 child 能；team member 不能。

## 暴露的失败类

**控制面按 preset 装，不按座位能力装**：precedence 同 BUG-052（worker leaf 的 control 面），但这次是 team member。凡是“继承父组合”的座位（teammate、workflow 分支、命名 child）都要问：它有没有 child？能不能用这个控制面？

## 复现

1. `source run/env.sh`，company profile。
2. CEO root → `spawn_teammate` 一个 teammate（任务只回复在岗），等首轮 `request/header`。
3. 读 teammate 的工具面：含 `list_subagents` / `send_to_subagent`。
4. 调 `list_subagents` → 空；调 `send_to_subagent` → 无合法 child id；`spawn_teammate` → `TEAM_LEAD_REQUIRED`。

证据 = `session f92037eb-54f5-4bc5-8528-61c157a13214`（2026-11-11 修复后）。

## 修复方向（未授权）

- `registerDelegationControl` 的安装判据加“运行时座位”：`agentTeams.tryMembership(agent)?.role === 'teammate'` → 不装；root/命名 child 仍装。
- 或把控制面按“能否起 child”统一判据：root（Lead）与命名 child 装；team member / leaf / support root 不装。
- 不要只按 preset 判：teammate 的 composed preset 是 Lead 的，和根会话完全相同。
- 验收：teammate 工具面无 `list_subagents`/`send_to_subagent`；CEO root 与命名 child 仍有；命名 child 的 child 控制仍可用；`pnpm test`/`typecheck`/`verify`/`preset-smoke` 绿；反证 = 放开判据后 teammate 工具面重新出现即红。

## 修复关联

未修。发现于修复后复验（teammate 座位面）；同型 = [BUG-052](../_archive/fixed_bugs/BUG-052-worker-leaf-control-surface.md)；相关合同 = [delegation.md §4](../../docs/contracts/delegation.md)。
