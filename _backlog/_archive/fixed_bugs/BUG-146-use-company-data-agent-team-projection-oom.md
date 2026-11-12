---
status: 已修
severity: P1
opened: 2026-11-13
---

# BUG-146：`useCompanyData` 新增 `useProjection('agentTeam')` 兜底后，client 生命周期 spec OOM（4GB heap，worker 退出）

> 严重级别：P1（重要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（撤销 OOM 兜底）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 客户端读模型）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

A 为 BUG-140（已撤回）在 `useCompanyData` 加了 fallback：

```ts
const projection = useSessions(state => state.projectionsBySession[lead]?.values.agentTeam)
const directProjection = useProjection('agentTeam') as TeamViewLike | undefined
const team = projection ?? directProjection ?? null
```

随后聚焦跑 `tests/client/data/company-data-lifecycle.spec.ts`：

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Mark-Compact 4057MB … → 4043MB
Test Files (1) / Tests (6) / Errors 1 error
Worker exited unexpectedly (~60s)
```

测试 worker 直接 OOM，0 条测试真正跑完；之前是 5 failed / 1 passed（partial view 崩溃）。

## 根因（假设）

- 测试里的 `useProjection` 是常量替身：`agentTeam` 不是 tokenUsage/sessionStats 时返回 **新 stats 对象**；`directProjection` 因此每次 render 都是新对象，且形状不是 `TeamViewLike`。
- `useCompanyData` 的 `team` 每帧 identity 变化 → `namesRef` effect（依赖 `[team, stream]`）每帧重跑 → `refreshActivity()` setState → 再 render → 再新对象 → **无限循环**，最终 OOM。
- 即使真实 `useProjection('agentTeam')` 是稳定的，这个 fallback 也把「非 team 投影」当 team，缺 members/tasks 时下游 partial crash（BUG-145）。
- BUG-140 已撤回（当时是新空会话，不是产品 bug），这个 fallback 本来就不该加。

## 暴露的失败类

**用错误服务的 projection 兜底 team 态**：`useProjection` 是单会话投影读钩子，key/shape 不匹配时会返回别的投影；把返回值当 TeamView 既有形状风险，又会引入每帧新对象驱动 effect 循环。team 态的唯一来源应是 `useSessions`/明确的 session projection，且必须稳定 identity。

## 复现

```sh
npx vitest run tests/client/data/company-data-lifecycle.spec.ts
```

2026-11-13 输出（节选）：

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
Test Files (1)
Tests (6)
Errors 1 error
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 撤销 `useProjection('agentTeam')` fallback；BUG-140 已撤回，不需要它。
- 若确实需要跨源兜底：用 `useSessions` 按 session id 取 projection；对返回值做 `members/tasks` 形状校验；只在 id 变化时更新，不要用不稳定 projection 对象驱动 effect。
- 测试替身 `useProjection` 支持 agentTeam 或返回稳定常量；加回归：focused lifecycle spec 不 OOM、5/6 场景恢复。
- 与 BUG-145 一起：所有 view 消费方数组兜底 + 稳定 identity。

## 修复关联

- 发现于 BUG-140 撤回后的 C5 回归；与 [BUG-145](BUG-145-team-with-event-tasks-partial-view-crash.md)（partial view）和 BUG-140（撤回）同面。
- 相关：`src/client/data/use-company-data.ts` 的 `useProjection('agentTeam')`；`tests/client/data/company-data-lifecycle.spec.ts` 的 `useProjection` 替身。

## 已修判定

修成：撤销 `useProjection('agentTeam')` 兜底（BUG-140 已撤回，不是产品 bug）；`team` 唯一来源恢复为 sessions store 的 `agentTeam`，不再让不稳定投影对象驱动 `namesRef` effect。
- keyless：`tests/client/data/company-data-lifecycle.spec.ts` 6 passed，无 OOM；红证：加回 fallback → OOM 4GB（本卡复现）。
