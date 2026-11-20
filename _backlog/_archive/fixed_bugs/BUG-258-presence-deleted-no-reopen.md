---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-258：投影 deleted 后任何事件都被忽略，任务无法重建/重开

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`teamWithEventTasks` 缺 revision 时 `previous.status === 'deleted'` 直接 `continue`；一个 deleted 投影 + 新 pending 事件（重开/重建）永远不出现。

## 复现

临时纯函数：base deleted + event pending → merged deleted。


```sh
pnpm test tests/lib/presence/presence-board.spec.ts
```

## 根因与证据

为防旧事件复活已删任务，删除状态被写成终态；没有「新 revision/新事件」通道。

## 失败类与同类排查

**失败类 = 删除是不可逆假设。**

## 已修判定

修成什么算修好：

1. deleted 投影可被显式事件重建，并标 `revisionGap`；仍不让 completed 被旧 pending 降级。
2. 负例：deleted + pending → pending + revisionGap。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/presence.ts`
- 红：`pnpm test tests/lib/presence/presence-board.spec.ts`（deleted + pending 永久 deleted）
- 绿：`pnpm test tests/lib/presence/presence-board.spec.ts`（显式重建 pending + revisionGap）
- 提交：commit 21ff3ee7
