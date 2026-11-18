---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-257：缺 revision 时未知 task status 被静默忽略

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`STATUS_ORDER` 对未知 status 取 -1；投影 pending（0）遇到事件 `paused`（-1）时 `nextRank < beforeRank` → skip，事件被静默丢弃；动态/任务板都不显示这个未知状态。

## 复现

临时纯函数：base pending + event `paused` → merged 仍 pending；事件消失。

## 根因与证据

状态序只覆盖四个已知值；未知值被当「后退」而不是「未知事件」。

## 失败类与同类排查

**失败类 = 未知状态既不是前进也不是后退。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

未知 status 保留事件（或显式 warning `revisionGap`），不要静默丢弃；最小负例纳入 spec。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
