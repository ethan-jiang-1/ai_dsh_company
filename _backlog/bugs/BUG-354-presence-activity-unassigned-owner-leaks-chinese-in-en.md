---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-354：`presence` 读模型在无负责人的任务变更中硬编码中文 `'未分配'`，英文界面泄漏未翻译词

> 严重级别：P2（i18n 漏词：`en` 模式下「在场」协作动态出现未认领任务的进行中/完成迁移时，页面渲染出 `"未分配 claimed T1"` / `"未分配 completed T1"`）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决；可走机械修复）

## 症状

`BUG-336` 修复了 `team/message/queued` 的消息动态中文冒号/`（空）` 与多任务分隔符，但同文件 [`presence.ts`](../../packages/company-pack/src/lib/presence/presence.ts#L291-L370) 两处任务动态仍把缺省负责人硬编码为中文字符串 `'未分配'`：

1. [`diffActivity`](../../packages/company-pack/src/lib/presence/presence.ts#L291) 第 291 行：`const owner = task.ownerName === undefined ? '未分配' : displayNameFor(task.ownerName, 'teammate')`；
2. [`presenceFromEvents`](../../packages/company-pack/src/lib/presence/presence.ts#L365) 第 365 行：`const owner = task.ownerId === undefined ? '未分配' : displayOf(task.ownerId)`。

随后该 `owner` 被放进 `token: { key: 'presence.activity.taskClaimed' | 'presence.activity.taskCompleted', params: { owner, id: task.id } }`。英文 [`locales.ts`](../../packages/company-pack/src/client/locales.ts#L549-L550) 虽然译好了模板 `{owner} claimed {id}`，但占位符 `owner` 原样输出为 `"未分配"`（尽管 [`locales.ts`](../../packages/company-pack/src/client/locales.ts#L486) 已有 `'tasks.unassigned': 'Unassigned'`）。

## 运行面

- **面 = lib + client**：[`packages/company-pack/src/lib/presence/presence.ts`](../../packages/company-pack/src/lib/presence/presence.ts#L291-L370)、[`packages/company-pack/src/client/locales.ts`](../../packages/company-pack/src/client/locales.ts#L549-L550)。

## 复现

将 `ownerName` / `ownerId` 缺席的任务从 `pending` 转为 `in_progress` 或 `completed`，分别经 `diffActivity` 与 `activityFromEvents` 折算，并用 `locales.ts` 的 `en` 字典调 [`activityText`](../../packages/company-pack/src/client/tabs/company-panels.tsx#L415-L417)：

- 实测返回 `'未分配 claimed T1'` 与 `'未分配 completed T2'`。

## 根因与证据

1. [`presence.ts`](../../packages/company-pack/src/lib/presence/presence.ts#L291) 与 [第 365 行](../../packages/company-pack/src/lib/presence/presence.ts#L365) 把语言无关的「未分配」状态折叠成了中文显示串 `'未分配'` 再塞进 i18n `token.params.owner`，绕过了 client 字典。

## 失败类与同类排查

- **失败类**：`lib/` 读模型向结构化渲染 token 塞入中文展示字面量，导致多语言切换失效（`BUG-333` / `BUG-336` 同族漏网）。
- **同类排查**：`presenceFromEvents` 第 328 行、[`doors.ts`](../../packages/company-pack/src/lib/presence/doors.ts#L48) 的 `'(未选 preset)'`（如被直显到 UI）、以及 `presence.ts` 全部 `ActivityToken` 需一并排查 `params` 里是否还夹带中文占位词。

## 修复方案与范围

- **根因修法**：在无负责人时不要把 `'未分配'` 写进 `token.params.owner`（例如新增无 `owner` 参数的 `presence.activity.taskClaimedUnassigned` / `taskCompletedUnassigned` 字典键，或在渲染 token 时解析独立 unassigned 标记），确保 `en` 下输出 `Unassigned claimed T1` / `Unassigned completed T2`。

## 已修判定

- `ownerName` / `ownerId` 缺失的任务迁移经 `diffActivity` 与 `activityFromEvents` 输出后，在 `zh` 下含「未分配」，在 `en` 下输出 `Unassigned claimed ...` / `Unassigned completed ...` 且零中文字符。
