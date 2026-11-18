---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-240：缺 revision 的投影任务仍可被旧 pending 事件打回 pending（in_progress → pending）

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-8 / H6）。
> **留痕**：批次 Note [2026-11-18-shipped-key-closure-and-unreadable-inputs](../../notes/implemented/2026-11-18-shipped-key-closure-and-unreadable-inputs.md)（本批共用）。

## 症状

C14 修复针对 BUG-230 增加了「投影缺 revision 时」的保护，但只保护 `completed`/`deleted`：

```ts
if (previous !== undefined && typeof previous.revision !== 'number') {
  if (previous.status === 'deleted') continue
  if (previous.status === 'completed' && task.status !== 'completed' && task.status !== 'deleted') continue
}
```

`in_progress` 的投影仍可被旧 `pending` 事件覆盖回去。实测：

```text
in_progress -> pending {"id":"t1","status":"pending","revision":1}
```

## 复现

```sh
cat > runtime/tmp/c15-team2.test.mjs <<'EOF'
import { teamWithEventTasks } from '../../packages/company-pack/src/lib/presence/presence.ts'
const base = { members: [], tasks: [{ id: 't1', subject: 'x', status: 'in_progress' }] }
const ev = [{ type: 'team/task', time: 1, data: { teamId: 'lead', task: { id: 't1', revision: 1, subject: 'x', status: 'pending' } } }]
console.log(teamWithEventTasks(base, ev).tasks[0])
EOF
pnpm exec tsx runtime/tmp/c15-team2.test.mjs
```

实测 `status:'pending'`。

## 根因与证据

- 根因：缺 revision 时只能证明「不能把终态改成非终态」，但 `in_progress → pending` 也是回退；修复只覆盖了 completed。`TeamViewLike.revision` 可选，部分/旧投影合法。
- 证据：上脚本；[presence.ts](../../packages/company-pack/src/lib/presence/presence.ts) 的保护分支；C14 修复 Note 决定 4。
- 影响：任务板/看板把正在执行的任务显示回待办；与 BUG-230 同类、只从 completed 缩到 in_progress。

## 失败类与同类排查

**失败类 = 读模型 / 新旧覆盖**（缺 revision 的回退）。

同类：BUG-230（completed）；BUG-229（部分视图）。

## 已修判定

修成什么算修好：

1. 缺 revision 时按状态序 `pending → in_progress → completed → deleted` 只进不退；in_progress 不被旧 pending 打回，任意→deleted 仍允许。
2. 最小负例：in_progress + 旧 pending → 仍 in_progress；pending + completed → completed。
3. 正例：有 revision 的 BUG-104 行为不变。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/presence.ts`、`tests/lib/presence/presence-board.spec.ts`
- 红：`pnpm test tests/lib/presence/presence-board.spec.ts`（in_progress 无 revision + 旧 pending → pending）
- 绿：`pnpm test tests/lib/presence/presence-board.spec.ts`（状态序只进不退：in_progress 保持；pending→completed 允许）
- 提交：commit ce472f48
