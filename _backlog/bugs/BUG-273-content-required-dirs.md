---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-273：content-manifest gate 的 REQUIRED_DIRS 不含 templates/methods/wiki/charters

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`REQUIRED_DIRS = [generic, company, product-types, delivery-modes]`；整目录缺 `templates`/`methods`/`wiki-template`/`charters` 仍可能 PASS（inventory 可同步裁掉）。

## 复现

静态：`checks/gates/content-manifest.mjs`。

## 根因与证据

必需目录是手写 4 个。

## 失败类与同类排查

**失败类 = 运行时内容面缺口。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把运行时读取的目录加入 REQUIRED_DIRS；负控删整目录 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
