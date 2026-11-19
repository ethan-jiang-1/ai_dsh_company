---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-278：未知 status 保留后仍走 statusLabel unknown，且 revisionGap 不区分

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

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

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/board.ts`、`packages/company-pack/src/client/tabs/TasksPanel.tsx`、`packages/company-pack/src/client/tabs/company-panels.tsx`、`packages/company-pack/src/client/locales.ts`、`tests/client/tabs/tasks-table.spec.ts`
- 红：`pnpm test tests/lib/presence tests/client`（还原 UI：未知 status 折成「待办」且无任何标记）
- 绿：`pnpm test tests/lib/presence tests/client`（`statusGap` 标「未知状态」；看板 tag + 任务表后缀）
- 提交：commit d13a0eb0
