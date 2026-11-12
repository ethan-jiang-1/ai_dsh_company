---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-104：任务板 merge 不看 revision：旧 `team/task` 事件可覆盖更新的 `agentTeam` 投影；无投影时事件被整段丢掉

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 任务板）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`teamWithEventTasks(view, events)` 是 BUG-103 的修复：把 follow 流的 `team/task` 事件合并进投影。实测两个边界：

1. **旧事件覆盖新投影**（不看 `revision`）：

```ts
view = { tasks: [{ id:'t1', revision:5, subject:'new', status:'completed', ownerName:'lead' }] }
event = { type:'team/task', data:{ task:{ id:'t1', revision:1, subject:'old', status:'pending' } } }
teamWithEventTasks(view, [event])
→ t1 revision 1 / subject old / status pending
```

UI 会把已完成的 t1 退回 pending；follow 快照/历史若包含比投影旧的事件（快照只带最新一页，投影可能是更新的 Host 帧），就会回滚。

2. **没有 `agentTeam` 投影时整段丢事件**：

```ts
teamWithEventTasks(null, [event]) → null
```

`useCompanyData` 里 `team = projection ?? null`，`effectiveTeam` 为 null，`tasks` 为空；任务事件明明在 follow 流里也不显示。

## 根因（假设）

`src/lib/presence.ts` 的 `teamWithEventTasks`：

- 直接 `tasks.set` 覆盖，不比较 `task.revision`；事件流的历史/实时顺序不等于投影的新旧。
- `if (view === null) return null`，即使 events 里有完整 task。

## 暴露的失败类

**把「事件流是权威」当成「事件流一定最新且完整」**：投影和事件流是两个到达顺序不同的源；merge 需要 revision/seq 规则、null 基座与「字段缺席」语义。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-merge.mts
```

2026-11-13 原始输出：

```
stale event over newer view -> tasks:[{id:t1, subject:old, status:pending, revision:1}]
null view with tasks -> null
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- merge 时只接受 `task.revision >= view.tasks[id].revision`（相同 revision 以后到的字段为准；或按事件 seq）；旧事件丢弃。
- `view === null` 时用事件里的 task 建最小 view（members 可空/lead），不要整段丢。
- 加 spec：revision 回退、同 revision、null view、deleted 后重开。

## 修复关联

- 发现于 BUG-103 修复后的回归扫；与 [BUG-103](BUG-103-tasks-tab-empty-despite-team-task-events.md) 同面但不同根因（merge 顺序/基座）；owner 取消认领的字段语义见 [BUG-112](BUG-112-team-task-unassign-keeps-old-owner.md)。
- 合同：`src/client/data/use-company-data.ts` 的「事件最新、成员名兜底」；`src/lib/presence.ts` 的 `teamWithEventTasks`。

## 已修判定

修成：merge 按 `revision` 判新旧（旧事件不回滚；相同 revision 接受）；`view=null` 且事件含 `team/task` 时建最小视图（空流仍 null → 加载态）；事件是完整 snapshot，`ownerId` 缺席 = 清空 owner（判别见 112），只有 ownerId 存在但成员表映射不到才 fallback 旧名。

- keyless：旧 revision 事件覆盖新投影 → 保持新值；null 视图 + 事件 → 出现任务；空流仍 null。
- 红证：HEAD 版 merge → 1 failed；复原全绿。
