---
status: 已修
severity: P2
opened: 2026-11-13
---

# BUG-105：follow 流失败时任务板/看板/DAG 静默空或旧，只有「在场」显示 `streamError`

> 严重级别：P2（次要）｜发现：2026-11-13｜状态：已修｜审查：agent — 见 Note
>
> **关联**：[高复杂度面持续探索卡](../../issues/2026-11-12-deep-surface-continuous-bug-hunt.md)（C5 / 客户端流）
> **留痕**：Note [2026-11-13-followup-bug-sweep](../../../notes/implemented/2026-11-13-followup-bug-sweep.md)

## 症状

`useCompanyData` 的 `streamError` 注释明确：「流断了不致命，但**不静默**：错误显式落面板（fail-loud）」。实际只有 `PresenceTab` 渲染了它：

- `PresenceTab`：`data.streamError !== null` → `presence.streamError` 错误条。
- `BoardTab` / `DagTab` / `TasksTab`：只渲染 `data.error`，**不渲染 `data.streamError`**。
- 这三个页签正是依赖 follow 流补 `team/task`（BUG-103 修复）的页签；流失败时它们显示投影快照（可能空/旧），用户看到的是「没有任务/空看板」，不是「实时流断了」。

在隔离 home 里如果 WebSocket/命令面断，任务板仍会显示「还没有共享任务」——与 BUG-103 的空板外观完全相同，无法区分「真没有任务」与「流失败」。

## 根因（假设）

- `useCompanyData` 已把 `streamError` 放进返回值，但四个页签只消费了 `error`；`BoardTab`/`DagTab` 的代码路径（`company-tabs.tsx:165-210`）与 `TasksTab`（:293-300）没有错误条。
- 页签没有统一的「流状态」展示，只有各页签手写错误 UI；新增页签容易再漏。

## 暴露的失败类

**错误面按页签各写一份**：`streamError` 在数据层有了，但只有「在场」消费；其它页签把「流断」折成空态。fail-loud 的承诺停在 hook 注释里。

## 复现

静态可判（无需造断流）：

```ts
// presence tab:
{data.streamError !== null && <div className="wk-error">{t('presence.streamError', …)}</div>}
// board/dag/tasks: only data.error
```

运行时可用浏览器 DevTools 断 `/api/session/follow` 或让 `follow` 抛错，任务板仍显示空态；`PresenceTab` 会显示错误。

## 修复方向（授权：2026-11-13 用户指令；见[修复交接](../../bugs/README.md#2026-11-13-修复交接第二轮根因组-s1s6bug-104113)）

- 四个消费 `useCompanyData` 的页签统一渲染 `streamError`（或一个 `StreamStateNote`），文案「实时流断开：显示的是投影快照，可能过期」；不要只说「没有任务」。
- 或把 `streamError` 合并进 `data.error` 的展示路径（但保留来源文案）。
- 加 client 渲染 spec / ui-scene steps：模拟 follow reject → 页签有错误条；无流错误 → 不显示。

## 修复关联

- 发现于 BUG-103 修复后的回归扫；与 [BUG-104](BUG-104-team-task-merge-no-revision-null-view.md) 同属任务板数据面。
- 相关：`src/client/tabs/company-tabs.tsx`、`src/client/data/use-company-data.ts`。

## 已修判定

修成：Board/Dag/Tasks 三个消费 `useCompanyData` 的页签统一渲染 `StreamErrorNotice`（「实时流断开：显示的是投影快照，可能过期（…）」）；不再把流断折成空态。

- keyless：`StreamErrorNotice` 静态渲染包含「实时流断开」与具体错误。
- 红证：组件返回 null → 1 failed；复原 6 passed。
