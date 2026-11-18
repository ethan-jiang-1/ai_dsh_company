---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-277：revisionGap 只进 TeamViewLike，client/board/UI 不消费

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

C16 修复在 `teamWithEventTasks` 写 `revisionGap:true`，但 `grep` client/board 没有消费；任务板看不到「这是缺 revision 的恢复」，用户/agent 无法区分真实状态与推测。

## 复现

静态：`revisionGap` 只在 presence.ts/类型；client 无。

## 根因与证据

修复加了字段，消费面没接。

## 失败类与同类排查

**失败类 = 数据有了、语义没到 UI。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

至少任务板/看板显示 revisionGap（或日志）；或者不要把它写成已修。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
