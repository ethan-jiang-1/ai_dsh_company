---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-098：任务从 `in_progress` 回到 `pending` 时，在场动态显示「已删除」（live 差分与事件折算同错）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 在场动态）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

任务状态从 `in_progress` 变成 `pending`（取消认领/重新打开）：

```ts
diffActivity(prev=in_progress, next=pending)
→ [{ text: 't1 已删除' }]        // 应为「重新打开/退回待办」类动态

presenceFromEvents([
  team/task in_progress,
  team/task pending,
])
→ activity: ['新任务 t1：任务一', 't1 已删除']   // 第二条同样错成删除
```

`deleted` 与 `pending` 走了同一个 `else` 分支；用户会以为任务被删了，实际只是回到待办。`completed` 与 `in_progress` 有正确分支，`pending` / 未知状态没有。

## 根因（假设）

`diffActivity`（`src/lib/presence.ts:223-232`）与 `presenceFromEvents`（`:305-314`）的任务迁移分支都是：

```ts
if (task.status === 'in_progress') { ... }
else if (task.status === 'completed') { ... }
else { ... '已删除' ... }
```

把「`deleted` 之外的所有状态」都当成删除；`TeamTaskStatus` 还有 `pending`。事件路径的第一条任务（previous 不存在）还会先报「新任务」，即使它是 `deleted`（与 live 差分不一致）。

## 暴露的失败类

**状态迁移文案用「else = 删除」当默认**：状态机有 4 个值，UI 只写了 2 个正向 + 1 个兜底；新增/回退状态自动落成最坏语义。同类：任何状态枚举的迁移文案都要显式 `deleted`，未知状态显示「未知」而不是猜测。

## 复现

```sh
node --import tsx/esm runtime/tmp/c5-pending-activity.mts
```

2026-11-13 原始输出：

```
diff -> pending ["t1 已删除"]
diff -> deleted ["t1 已删除"]
diff -> completed ["lead 完成 t1"]
diff -> in_progress []
events activity ["新任务 t1：任务一","t1 已删除"]
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- `diffActivity` / `presenceFromEvents` 显式分 `deleted`、`pending`、`completed`、`in_progress`、未知；`pending` 用「退回待办/重新打开」类 token（新增字典 key），未知显示「未知」。
- 事件路径首次出现 `deleted` 任务不要报「新任务」；与 live 差分同口径。
- 加 keyless spec：in_progress→pending、in_progress→deleted、pending→in_progress、未知状态；两路径文案/ token 一致；en 字典同步。

## 修复关联

- 发现于 C5；`presence-board.spec` 覆盖了成员 phase 与 task completed/deleted，但没覆盖 task 回退 pending。
- 相关：[`docs/contracts/data-model.md`](../../../docs/contracts/data-model.md) 的任务状态；`presence.ts` 的 D-b 动态流。

## 已修判定

修成：`diffActivity` 与 `presenceFromEvents` 都显式分 `in_progress` / `completed` / `pending` / `deleted` / 未知；`pending` 显示「退回待办」（token `presence.activity.taskReopened`），未知显示「状态未知」（`taskUnknown`）；首次 deleted 事件不报「新任务」；zh/en 字典成对。

- keyless：in_progress→pending = 退回待办；→deleted = 已删除；未知 = 状态未知；事件路径同口径且首次 deleted 无动态。
- 红证：HEAD 版 presence → 3 failed；复原 20 passed。
