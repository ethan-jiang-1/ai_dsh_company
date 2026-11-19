---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-277：revisionGap 只进 TeamViewLike，client/board/UI 不消费

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

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

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/board.ts`、`packages/company-pack/src/client/tabs/company-panels.tsx`、`packages/company-pack/src/client/tabs/TasksPanel.tsx`、`packages/company-pack/src/client/locales.ts`、`tests/lib/presence/board.spec.ts`、`tests/client/tabs/board-panel.spec.ts`
- 红：`pnpm test tests/lib/presence tests/client`（还原 `company-panels.tsx`/`TasksPanel.tsx`：卡面/状态格找不到「修订缺失」）
- 绿：`pnpm test tests/lib/presence tests/client`（`revisionGap` 透传到 `TaskRow`/`BoardCard` + zh/en 文案渲染）
- 提交：commit d13a0eb0
