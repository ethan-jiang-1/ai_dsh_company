---
status: 已结
severity: P2
opened: 2026-11-13
---

# BUG-140：BUG-103 修复后，真页面选中含 `team/task` 的会话时任务板仍空（follow 流没把任务补进 TasksTab）

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已结（撤回：非产品缺陷）
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 任务板真页面）
> **留痕**：待修（本轮不修）

## 撤回（2026-11-13）

后续用 Playwright `page.on('websocket')` 复现并**显式点选**会话标题后，任务板出现：

```
任务板 (2)
task-1 写 PRD / task-2 复核 PRD
```

之前的 cdp-probe 默认落在应用新建的空会话 `session-7726…`（storage 里有 e0b3，但 UI 新开了空会话并选中它），不是选中含 task 的会话。**BUG-140 不成立，不是产品缺陷**；原文保留作测试方法证据。真正要记的是「cdp-probe 默认新空会话」这一测试选址坑，不是产品 bug。

## 症状

隔离 home 里已有 CEO 会话 `session-e0b3bd89-…`，日志含两条 `team/task`：

```
{"teamId":"session-e0b3…","task":{"id":"task-1","subject":"写 PRD",...}}
{"teamId":"session-e0b3…","task":{"id":"task-2","subject":"复核 PRD","blockedBy":["task-1"],...}}
```

把该会话登记进 `storages/workspace.json.sessionIds` 后起 company 实例，UI 侧栏已显示会话标题「用 team_task_create 创建两个任务」，任务板页签仍：

```
成员：lead(待命)
还没有共享任务。
```

`/task board` 无 streamError 条；`agentTeam` 投影有 lead 成员，但 tasks 空。即 BUG-103 修复（用 follow 流补 task）在**真页面**没有生效，而修复时的 spec 用 `session/list` 投影 / 纯 merge 能过。

## 根因（假设）

- `TasksTab` 的 `useCompanyData(..., {stream:true})` 订阅 `session/follow`；`teamWithEventTasks` 只对 `eventsRef.current` 里的 `team/task` 生效。真页面的 `follow` 可能不返回这些事件（只返回 message/other），或 `TeamStreamFrame` 的事件形状/字段与 merge 预期不同。
- 适配层 `company-session-adapters.ts` 的 `companyFrames` 只把 `snapshot.records[].event` / `event` 原样透传，没有过滤 `team/task`；若页面没任务，问题在更上游的 `remote.follow` 帧内容，不在本次 merge 的 revision。
- BUG-103 修复验证停在「投影有 task」/纯函数 merge；没有这条「已结束会话 + 真 follow + 选中会话」的页面证据；BUG-104 的 revision 修复也依赖同一事件流。
- 也可能是 `useCompanyData` 的 `stream` 在 TasksTab 仍为 false（需核对当前构建产物/源码版本），但源码已传 `{stream:true}`；页面无 streamError，更像事件没到。

## 补充：host 投影有 task，浏览器投影没有（2026-11-13）

`session/list` RPC 对同一会话 `session-e0b3…` 返回：

```json
"agentTeam": { "members":[{ "id":"session-e0b3…", "name":"lead", "role":"lead", "phase":"active" }],
               "tasks":[ {"id":"task-1","subject":"写 PRD","status":"pending",…},
                         {"id":"task-2","subject":"复核 PRD","blockedBy":["task-1"],…} ] }
```

但浏览器任务板仍是 `成员：lead(待命) / 还没有共享任务`。重新用当前源码 `tsc -b` + `tsdown` 生成 `lib/client.js`（含 `teamWithEventTasks`/`stream.error`）后重跑仍空——**不是旧 bundle**。所以问题在浏览器 session store 的 `agentTeam` 投影/`session/follow` 没把 task 带进页面，而不是 host 投影或 merge 纯函数。

## 暴露的失败类

**修复验证面停在投影/纯函数，没到真 follow**：任务板依赖「follow 事件 + 投影」两源；只证投影有任务，不等于页面能补。C5 的验收必须选中含任务历史的会话跑一次真页面。

## 复现

```sh
python3 - <<'PY'  # 把 c5-iso-home/storages/workspace.json 的 sessionIds 指向 session-e0b3…
...
PY
node runtime/tmp/c5-iso-recheck2.mjs
```

2026-11-13 输出：

```
ui title: 用 team_task_create 创建两个任务
task board: 成员：lead(待命) / 还没有共享任务。
waitText 写 PRD → missing
```

证据：`runtime/tmp/c5-recheck2-body.txt`、cdp-probe `runtime/harness-home/diagnosis/cdp-probe-2026-11-12T19-26-31-670Z`、会话 `session-e0b3bd89-…`。

## 修复方向（未授权）

- 在真页面/真 follow 上确认 `follow` 是否返回 `team/task`；若否，TasksTab 不能只靠 follow，需读 session projections/`session/list` 的 task 面，或订阅正确的投影。
- 若事件形状不同，修 `teamWithEventTasks` 的适配层；加真页面 steps（选中含任务会话 → 任务板/依赖图出现 task-1/task-2）。
- BUG-103/104/118 的修复要一起收口：任务/成员两个 read model 在投影缺失时都能从 follow 建视图。

## 修复关联

- 复发/未收口 [BUG-103](../fixed_bugs/BUG-103-tasks-tab-empty-despite-team-task-events.md)（已归档「修复」）与 [BUG-104](../fixed_bugs/BUG-104-team-task-merge-no-revision-null-view.md) / [BUG-118](../fixed_bugs/BUG-118-member-events-dropped-without-team-projection.md)（当前活跃）。
- 相关：`src/client/tabs/company-tabs.tsx` 的 `TasksTab`；`src/client/data/use-company-data.ts` 的 `follow` 订阅/merge。
