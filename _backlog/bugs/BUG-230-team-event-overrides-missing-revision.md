---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-230：teamWithEventTasks 在投影任务缺 revision 时让旧事件覆盖 completed → pending

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-8 / G3）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`teamWithEventTasks` 的 BUG-104 保护是：

```ts
if (previous !== undefined && typeof previous.revision === 'number' && task.revision < previous.revision) continue
```

只有**投影任务带 revision** 时才拦旧事件。若投影任务没有 revision（`TeamViewLike` 的 `revision?` 是可选；`TeamTaskSnapshot`/旧快照可能没带），一个 revision 1 的旧 `pending` 事件会把投影的 `completed` 覆盖回 `pending`。实测：

```text
base: {id:t1, subject:'done task', status:'completed'}  （无 revision）
event: revision 1, status 'pending'
merged: status 'pending', revision 1
```

## 复现

```sh
cat > runtime/tmp/c14-team.test.mjs <<'EOF'
import { teamWithEventTasks } from '../../packages/company-pack/src/lib/presence/presence.ts'
const base = { members: [{ id: 'm1', name: 'vp-eng', role: 'teammate', phase: 'active' }], tasks: [{ id: 't1', subject: 'done task', status: 'completed' }] }
const events = [{ type: 'team/task', time: 1, data: { teamId: 'lead', task: { id: 't1', revision: 1, subject: 'done task', status: 'pending', ownerId: undefined } } }]
console.log(JSON.stringify(teamWithEventTasks(base, events)))
EOF
pnpm exec tsx runtime/tmp/c14-team.test.mjs
```

实测 `status:"pending", revision:1`。

## 根因与证据

- 根因：`previous.revision` 缺失时，`typeof previous.revision === 'number'` 为 false，比较被短路；事件无条件覆盖。类型允许 revision 可选（事件路径的 `TeamTaskSnapshot` 无 `ready`，注释也说明投影/事件字段不同），所以这是合法输入形状。
- 证据：上脚本；[presence.ts](../../packages/company-pack/src/lib/presence/presence.ts) 的 `teamWithEventTasks`；BUG-104 的既有负例只覆盖「两边都有 revision」。
- 影响：任务板/看板可能把已完成任务显示回待办（“回退”假动态）；与 BUG-104 同类，只是缺字段。

## 失败类与同类排查

**失败类 = 读模型 / 新旧覆盖**（缺 revision 时无判据）。

同类：BUG-229（部分视图抛错）；BUG-098/104（任务状态/修订顺序）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. 投影缺 revision 时不要静默让事件覆盖：可保留投影状态并告警/标 `revisionGap`，或只允许「事件比投影新」的显式证据（时间/来源）；不能把 completed 改成 pending。
2. 最小负例：上面样本的 merged 仍为 `completed`（或明确 `revisionGap`），不能是 pending。
3. 正例：两边都有 revision 的 BUG-104 样本行为不变。
