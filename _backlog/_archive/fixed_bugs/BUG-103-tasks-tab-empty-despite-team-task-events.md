---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-103：`team_task_create` 已在会话日志落 `team/task`，但「任务板」页签在隔离 home 里仍显示「还没有共享任务」

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 任务板真页面）
> **留痕**：Note [2026-11-13-deep-surface-bug-sweep](../../../notes/implemented/2026-11-13-deep-surface-bug-sweep.md)

## 症状

隔离 home（只保留 profile/凭据 + seed 一个 workspace registry，无旧会话）里：

1. RPC 建 CEO 会话，prompt 让模型只调 `team_task_create` 建两个任务。
2. 模型实际调用两次，工具结果：

```json
{"id":"task-1","revision":1,"subject":"写 PRD","status":"pending","blockedBy":[],"ready":true}
{"id":"task-2","revision":1,"subject":"复核 PRD","status":"pending","blockedBy":["task-1"],"ready":false}
```

3. 会话日志确有两条 `team/task` 事件（`teamId = session-e0b3…`）。
4. 真页面打开「任务板」页签：

```
成员：lead(待命)
还没有共享任务。
```

即：**任务已创建、事件在盘、UI 却报空板**。同页签依赖图/看板同样基于 `agentTeam` 投影，数据面为空。

## 根因（假设）

- `TasksTab` → `useCompanyData` 读 `useSessions(state => state.projectionsBySession[lead]?.values.agentTeam)`（`src/client/data/use-company-data.ts:106`）；`TeamViewLike` 的 `tasks` 来自 Host `agentTeam` 投影。
- 会话日志已有 `team/task`，但该投影在 **没有 teammate（只有 lead）** 的 CEO root 上可能没有把 `team/task` 折进 `tasks`，或浏览器打开时拿到的投影快照早于这两条事件。
- 也可能 `team_task_create` 在 no-team root 上只写任务存储/事件，不更新投影帧；UI 的「投影更新」标签显示它在等一个不会到的更新。

## 暴露的失败类

**任务板读模型与任务创建事件不同源/不同步**：任务工具已经确认成功，UI 的投影仍是空。同类：任何「工具写事件 → 投影 → 面板」三段的链路，都要在真页面验证「写后可见」，不能只看工具回执。

## 复现

```sh
node runtime/tmp/c5-iso-page.mjs
```

2026-11-13 原始输出（节选）：

```
calls: team_task_create ×2
tool results: task-1 / task-2
session events: team/task ×2
probe stepFailures: ["waitText 写 PRD missing"]
body: "任务板\n投影更新\n浮出\n成员：lead(待命)\n还没有共享任务。"
```

证据：`runtime/tmp/c5-iso-results.json`、`runtime/tmp/c5-iso-body.txt`、`runtime/tmp/c5-iso-home/sessions/.../session-e0b3bd89-….jsonl.zstd`、cdp-probe 证据 `runtime/harness-home/diagnosis/cdp-probe-2026-11-12T16-32-40-018Z`。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接根因组-g1g7bug-090103)）

- 先在隔离 home 里确认 `projectionsBySession[lead].values.agentTeam.tasks` 是否为空、`team/task` 事件是否被投影消费；区分「投影缺 fold」与「客户端快照早于事件」。
- 若是投影：让 `team/task` 在无 teammates 的 Lead root 上也进 `tasks`；或让任务板读 Host 的 task store（有事件为准）。
- 若是客户端快照：任务工具完成后主动刷新投影/订阅 `team/task`，不要只信首次快照。
- 加真页面 smoke：工具创建任务 → 任务板/依赖图出现 task-1/task-2；带 teammate 与不带 teammate 两种。

## 修复关联

- 发现于隔离 C5 真页面；与 [BUG-098](BUG-098-presence-pending-transition-shows-deleted.md) 同属 C5 读模型面，但本卡是「任务根本不在板上」。
- 相关：`src/client/data/use-company-data.ts`、`src/client/tabs/company-tabs.tsx`（TasksTab）、vendor `agent-team` 投影。

## 已修判定

修成：任务板/看板/依赖图在 `agentTeam` 投影缺失或过期时，用 follow 流的 `team/task` 事件合并任务（ownerName 按成员名解析、deleted 移除、revision 以事件为准）；三个页签都开 `stream: true`，投影有任务时事件覆盖、成员名与兜底保留。

- keyless：投影 `tasks=[]` + `team/task` 两条（含 revision 与 deleted）→ 合并视图出现 task-1；红证：让 merge 直接返回 view → 1 failed；复原 21 passed。
- 真投影：用证据 home 起 web，`session/list` 实查 `agentTeam` 已含 task-1/task-2（说明落盘投影正确，缺陷在客户端拿到的旧快照）；本修覆盖该窗口。
