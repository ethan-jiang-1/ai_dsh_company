---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-257：缺 revision 时未知 task status 被静默忽略

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`STATUS_ORDER` 对未知 status 取 -1；投影 pending（0）遇到事件 `paused`（-1）时 `nextRank < beforeRank` → skip，事件被静默丢弃；动态/任务板都不显示这个未知状态。

## 复现

临时纯函数：base pending + event `paused` → merged 仍 pending；事件消失。


```sh
pnpm test tests/lib/presence/presence-board.spec.ts
```

## 根因与证据

状态序只覆盖四个已知值；未知值被当「后退」而不是「未知事件」。

## 失败类与同类排查

**失败类 = 未知状态既不是前进也不是后退。**

## 已修判定

修成什么算修好：

1. 缺 revision 的未知 status 不静默丢：保留事件并标 `revisionGap`。
2. 负例：pending + paused → paused + revisionGap。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/lib/presence/presence.ts`、`tests/lib/presence/presence-board.spec.ts`
- 红：`pnpm test tests/lib/presence/presence-board.spec.ts`（pending + paused 静默丢弃）
- 绿：`pnpm test tests/lib/presence/presence-board.spec.ts`（保留 paused + revisionGap）
- 提交：commit 21ff3ee7
