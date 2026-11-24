---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-372：`diffActivity` 把 CEO（lead）认领/完成的任务显示成 `lead`，同一数据在看板里是正确的「CEO」

> 严重级别：P2（同一实体两副脸：vendor 的 `projectTaskView` 对 lead 拥有的任务把 `ownerName` 解析成**字面量 `'lead'`**（`vendor/dsh/packages/experimental/agent-team/src/task-view.ts:38-41`）。看板读模型 [`tasksFromTeamView`](../../packages/company-pack/src/lib/presence/board.ts#L204-L225) 有 `owner === 'lead' ? 'lead' : 'teammate'` 的特判所以显示 CEO；而在场动态的差分 [`diffActivity`](../../packages/company-pack/src/lib/presence/presence.ts#L291) 把角色硬编码成 `'teammate'`，于是英文界面出现 `lead claimed task-1`、中文出现 `lead 认领 task-1`）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

CEO 自己在任务板上认领/完成一个任务后，在场页「协作动态」显示 `lead 认领 task-1` / `lead 完成 task-1`（en：`lead claimed task-1`），而不是 `CEO 认领 task-1`。同一个任务在「任务看板」页签里的负责人徽章是 `CEO`（`boardColumns` → `ownerLabel`），两处对同一事实说法不同。

## 运行面

- **面 = lib**：[`presence.ts`](../../packages/company-pack/src/lib/presence/presence.ts#L288-L300)（`diffActivity`）；对照 [`board.ts`](../../packages/company-pack/src/lib/presence/board.ts#L214-L218)（正确写法）。

## 复现

```sh
pnpm exec tsx -e "
import { diffActivity, rowsFromTeamView } from './packages/company-pack/src/lib/presence/presence.ts';
const view = (tasks) => ({ members: [{ id: 'm-lead', name: 'lead', role: 'lead', phase: 'active' }], tasks });
const before = view([{ id: 'task-1', revision: 1, subject: 's', status: 'pending' }]);
const after = view([{ id: 'task-1', revision: 2, subject: 's', status: 'in_progress', ownerName: 'lead' }]);
console.log(diffActivity(before, after, 1).map(e => [e.text, e.token]));
console.log(rowsFromTeamView(after).map(r => [r.name, r.displayName]));
"
```

实测第一行 `[["lead 认领 task-1",{"key":"presence.activity.taskClaimed","params":{"owner":"lead","id":"task-1"}}]]`，第二行 `[["lead","CEO"]]`——同一份数据，动态里是裸 `lead`，板行里是 `CEO`。

## 根因与证据

1. `diffActivity` 的成员分支用的是 `displayNameFor(member.name, member.role)`（拿得到 `role: 'lead'`），任务分支却写死 `displayNameFor(task.ownerName, 'teammate')`——`'lead'` 不是 preset id，`displayNameFor` 原样返回。
2. `board.ts` 对同一字段有显式特判（`owner === 'lead' ? 'lead' : 'teammate'`），说明「`ownerName` 可能是字面量 lead」是本仓已知事实；`diffActivity` 漏用了这条事实。
3. vendor 侧证据：`projectTaskView` 在 `task.ownerId === state.id`（团队根会话）时直接给 `'lead'`。

## 失败类与同类排查

- **失败类**：同一字段的「特殊值」在一条消费路径上处理、另一条漏掉（`BUG-354` 的 `未分配` 同族，落点是 `lead`）。
- **同类排查**：`presenceFromEvents` 的 owner 走 `displayOf(task.ownerId)`，其中 `teamId` 相等时已映射 CEO（已核，正确）；`rowsFromTeamView` 的 `currentTasks` 用 `member.name === task.ownerName`，lead 行 `name === 'lead'` 与 `ownerName === 'lead'` 相等（已核，正确）；`dag` 的 `ownerLabel` 来自已规整的 `TaskRow.ownerName`（已核）。

## 修复方案与范围

- **根因修法**：把 `board.ts` 的 lead 特判抽成共享 helper（例如 `ownerDisplayName(name)`），`diffActivity` 与 `tasksFromTeamView` 同用；并给 `presence.ts` 补一条 lead-owned 任务的 diff 用例。

## 已修判定

- 上述复现里动态文本为 `CEO 认领 task-1`（en：`CEO claimed task-1`），与 `rowsFromTeamView` 的显示名一致；
- presence 活动读模型新增 lead owner 用例（旧实现红、新实现绿）。
