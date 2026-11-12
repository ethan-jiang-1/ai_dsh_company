---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-118：`agentTeam` 投影缺席时 `teamWithEventTasks` 仍只认 task 事件；`team/member` 已在线但「在场」空行

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（member 基座）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 在场与任务板）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

BUG-104 的修复让 `view === null` 且事件含 `team/task` 时建最小视图；但 **`team/member` 仍不建**：

```ts
teamWithEventTasks(null, [team/member m1 active]) → null
presenceFromEvents([same event]).rows → [lead, m1]
presenceFromEvents([same event]).activity → 「VP-Eng 上线」
```

`useCompanyData` 的 `team` 仍是 null，`rowsFromTeamView(null)` 为空；「在场」页签显示空态，而「动态」/事件流已经说 VP-Eng 上线。即同一批 `team/*` 事件在两个读模型里一个被消费、一个被丢弃。

触发场景：浏览器拿到的 `agentTeam` 投影缺席/尚未到达（旧快照、冷启动、投影失败），follow 流已送来 member 事件；任务板能靠 task 事件出现，但成员行仍然空。

## 根因（假设）

- `teamWithEventTasks` 的 null 基座判据只看 `event.type === 'team/task'`；`team/member` 不参与建视图。
- `useCompanyData` 的 `rows` 来自 `rowsFromTeamView(effectiveTeam)`，不是 `presenceFromEvents`；事件里的 member 只进了 activity。
- 修复 BUG-103/104 时把「task 补投影」做了，但「member 补投影」没做；两个 read model 对同一事件流不同步。

## 暴露的失败类

**null 基座的补投影只补了一半**：任务事件能建最小 view，成员事件不能；UI 的一栏有数据、另一栏空。只要投影可能缺席，所有 `team/*` 事件类型都要有「无投影时如何建最小视图」的规则，或统一用 `presenceFromEvents` 作为 fallback。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-member-null-view.mts
```

2026-11-13 输出：

```
teamWithEventTasks(null, member) -> null
presenceFromEvents rows -> [{"id":"m1","name":"vp-eng","phase":"active",...}]
presenceFromEvents activity -> [{"text":"VP-Eng 上线",...}]
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `teamWithEventTasks`（或改名 `teamWithEventStream`）在 null 基座下也消费 `team/member`，建 `members`；task 照旧。
- 或 `useCompanyData` 的 rows 在 `team === null` 时回退到 `presenceFromEvents(events)` 的 rows，不要留空。
- 加 spec：null projection + member-only 事件 → 在场行/任务板；member + task 混合；空事件仍 null（加载态）。
- 注意不要把 `team/member` 的 phase 直接当 task owner name；只补 rows。

## 修复关联

- 发现于 BUG-104/105 修复后的 C5 回归；与 [BUG-104](BUG-104-team-task-merge-no-revision-null-view.md) 同属 null 基座，但本卡是 member 事件。
- 相关：`src/lib/presence.ts` 的 `teamWithEventTasks` / `presenceFromEvents`；`src/client/data/use-company-data.ts` 的 `rows`。

## 已修判定

修成：`teamWithEventTasks` 的 null 基座同时消费 `team/member`（role 缺省 lead/teammate），成员事件在投影缺席时也建视图；空事件仍 null（加载态）。
- keyless：null + member-only → members 行；红证：HEAD presence → 1 failed。
