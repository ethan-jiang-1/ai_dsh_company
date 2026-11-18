---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-278：未知 status 保留后仍走 statusLabel unknown，且 revisionGap 不区分

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

未知 status 事件现在保留（revisionGap），但 `rowsFromTeamView`/board 的 statusLabel 仍 `unknown`，UI 无法区分「未知状态」与「缺 revision 恢复」。

## 复现

静态：presence 状态标签/消费面。

## 根因与证据

状态与 gap 两个维度没在文案上分开。

## 失败类与同类排查

**失败类 = 语义未到 UI。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

为 unknown+revisionGap 提供独立文案/标记；测试最小样本。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
