---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-274：inventory 重复项：gate 不判、checker 判，两门结论不一致

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`content-manifest` gate 用 `new Set`，重复只影响列表；`contentManifestProblems` 显式判重复。`pnpm verify` 走 gate+shipped-links，但单独 `content-manifest`/单元 gate 可能给出不同结论。

## 复现

静态：两份实现。

## 根因与证据

同一清单两处判据。

## 失败类与同类排查

**失败类 = 判据不一致。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 inventory 校验收成一份纯函数，gate/checker 共用；重复 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
