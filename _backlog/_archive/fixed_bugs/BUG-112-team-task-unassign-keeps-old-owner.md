---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-112：任务被取消认领时 `teamWithEventTasks` 保留旧 ownerName，任务板仍显示原负责人

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 任务板）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`team/task` 事件的 `ownerId` 是可选字段；任务被取消认领时事件不带 `ownerId`。merge 代码：

```ts
const ownerName = task.ownerId === undefined
  ? tasks.get(task.id)?.ownerName
  : nameById.get(task.ownerId) ?? tasks.get(task.id)?.ownerName
```

把「事件没带 ownerId」当成「保持旧 owner」：

```
view task ownerName='lead' + event task 无 ownerId（status in_progress）
→ tasksFromTeamView ownerName 仍是 'lead'
```

任务板显示原负责人，实际已无人认领；与 `presenceFromEvents` 里 `ownerId === undefined ? '未分配'` 的口径相反。

## 根因（假设）

- 事件协议用「字段缺席」表达「无 owner」，而 merge 用 `=== undefined` 做 fallback，没有区分「字段未提供 → 保持」与「字段提供为 null/空 → 清空」。
- `ownerName` 的 fallback 是为了处理「ownerId 指向不在投影成员表里的 id」；这个 fallback 不应覆盖「事件明确无 owner」。

## 暴露的失败类

**可选字段的「缺席」被当成「未变」**：状态事件里的 owner removal 是真实语义；merge 用 undefined fallback 保留旧值，UI 继续显示旧 owner。同类：任何“部分事件”合并都要先把字段缺席语义定义清楚。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-2.mts
```

2026-11-13 输出：

```
unassign -> tasks:[{id:t1, status:in_progress, ownerName:lead, revision:2}]
```

期望：`ownerName` 缺失/未分配。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- 事件带 `ownerId: undefined` 时清空 ownerName（若协议另有「未变」语义，用显式字段/版本区分，不能靠缺席）。
- 若需要保留旧 owner（为了名称解析），只在 ownerId **存在但映射不到**时 fallback；不要在没有 ownerId 时 fallback。
- 加 spec：认领→取消认领、owner 换人、ownerId 未知、无 owner 任务。

## 修复关联

- 发现于 BUG-104 merge 回归扫；与 [BUG-104](BUG-104-team-task-merge-no-revision-null-view.md) 同函数，但本卡是字段语义。
- 相关：`src/lib/presence.ts` `teamWithEventTasks`；`src/client/tabs/TasksPanel.tsx`。

## 已修判定

修成：`team/task` 事件是完整 snapshot，`ownerId` 缺席即清空 ownerName（取消认领）；只有 ownerId 存在但映射不到成员时才保留旧名。

- keyless：认领后无 ownerId 的事件 → ownerName undefined；同 revision/旧 revision 规则同 104。
- 红证：HEAD 版 merge → 同一用例 failed；复原全绿。
