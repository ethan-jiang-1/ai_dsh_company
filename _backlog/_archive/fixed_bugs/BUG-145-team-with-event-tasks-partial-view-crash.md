---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-145：`teamWithEventTasks` 假定 `agentTeam` view 必有 `members`/`tasks` 数组；partial view 直接抛 `reading 'map'`（4 条 client 生命周期 spec 红）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — keyless 红→绿（partial view）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 客户端读模型）
> **留痕**：Note [2026-11-13-state-root-write-gate-sweep](../../../notes/implemented/2026-11-13-state-root-write-gate-sweep.md)

## 症状

A 的 BUG-118 修复把 `teamWithEventTasks` 改成先建 members/tasks Map：

```ts
const base = view ?? { members: [], tasks: [] }
const members = new Map(base.members.map(...))
const tasks = new Map(base.tasks.map(...))
```

只要 view 非 null 但缺任一数组（或下游 `memberNames` 等消费方）就直接崩：

```js
teamWithEventTasks({ tasks: [] }, [])  → THREW Cannot read properties of undefined (reading 'map')
teamWithEventTasks({ members: [] }, []) → THREW
teamWithEventTasks({}, [])              → THREW
```

当前 `pnpm test` 因此 **client 生命周期 spec 红**；A 给 `teamWithEventTasks` 加了 `?? []` 后，错误转移到 `memberNames`：

```
FAIL tests/client/data/company-data-lifecycle.spec.ts > useCompanyData 订阅生命周期 > stream:true 历史帧立即播种动态…
TypeError: Cannot read properties of undefined (reading 'map')
 ❯ teamWithEventTasks .../presence.ts:124
 ❯ useCompanyData .../use-company-data.ts:152
```

这是 A 的 in-progress BUG-118 修复引入的回归；测试是现有的生命周期 spec，不是新写。2026-11-13 复验：`teamWithEventTasks` 已加 `?? []`，但 `memberNames` 仍 `view.members.map`，5 failed / 1 passed。

## 根因（假设）

- `TeamViewLike` 类型要求 members/tasks，但运行时投影/测试 fixture 可能只给一维或空对象；`view ?? ...` 只覆盖 null，不覆盖 partial。
- member 合并新增了 `base.members` 的 Map 构造，没有 `?? []` 兜底；tasks 同样。
- 没有「投影形状不完整」的测试；4 条现有 client spec 直接炸。

## 暴露的失败类

**对 wire projection 做 `?? null` 只挡 null，不挡 partial**：外部投影可能缺字段；merge 需要对每个数组兜底并归一化 member role/phase，不能假定 required type 的运行时完整。

## 复现

```sh
node --import tsx/esm runtime/tmp/newbugs-team-partial-view.mts
```

2026-11-13 输出：

```
{"tasks":[]} THREW Cannot read properties of undefined (reading 'map')
{"members":[]} THREW ...
{} THREW ...
```

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md)）

- 同轮修所有 view 消费方：`memberNames` / `rowsFromTeamView` / `tasksFromTeamView` / `boardColumns` 对 members/tasks 做 `?? []`；不要只修一处。

- `const base = { members: Array.isArray(view?.members) ? view.members : [], tasks: Array.isArray(view?.tasks) ? view.tasks : [] }`；或 `const members = new Map((view?.members ?? []).map(...))`。
- 归一化 member 事件缺 `role`/`phase`（测试 `memberActive` 只给 id/name/phase；role undefined 会让 rows 显示错）。
- 保留 `view === null && no team events → null` 的加载态语义。
- 加 spec：partial view、空 view、member-only event（无 role）、task-only event；恢复 4 条 lifecycle spec。

## 修复关联

- 发现于 BUG-118 修复的回归；与 [BUG-118](BUG-118-member-events-dropped-without-team-projection.md) 同函数，但本卡是 partial shape/崩溃。
- 相关：`src/lib/presence.ts` 的 `teamWithEventTasks`；`tests/client/data/company-data-lifecycle.spec.ts`。

## 已修判定

修成：`teamWithEventTasks` 对 `view.members`/`view.tasks` 用 `?? []` 归一化；`memberNames`/`rowsFromTeamView`/`currentTask` 同样兜底；member 事件缺 role 时按 lead/teammate 归一。
- keyless：`{tasks:[]}` / `{}` / `{members:[]}` 均不抛；4 条 client 生命周期 spec 恢复绿；红证：HEAD presence → 1 failed。
