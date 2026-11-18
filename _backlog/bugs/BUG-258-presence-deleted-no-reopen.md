---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-258：投影 deleted 后任何事件都被忽略，任务无法重建/重开

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`teamWithEventTasks` 缺 revision 时 `previous.status === 'deleted'` 直接 `continue`；一个 deleted 投影 + 新 pending 事件（重开/重建）永远不出现。

## 复现

临时纯函数：base deleted + event pending → merged deleted。

## 根因与证据

为防旧事件复活已删任务，删除状态被写成终态；没有「新 revision/新事件」通道。

## 失败类与同类排查

**失败类 = 删除是不可逆假设。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

允许有更高 revision 或显式 recreate 的事件恢复；无 revision 时 warning 而不是永久忽略。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
