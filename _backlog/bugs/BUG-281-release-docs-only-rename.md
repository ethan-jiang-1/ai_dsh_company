---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-281：release docs-only 对 rename 只按 name-only 判，code→docs rename 可能误判

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`docsOnlySince` 用 `git diff --name-only`；rename 的旧/新路径是否都出现取决于 git 输出。一个 code 文件 rename 到 `_backlog/` 可能只看到新 docs 路径，被当 docs-only。

## 复现

静态：`docsOnlySince`；临时 git 仓库 rename 实验。

## 根因与证据

路径集合判据不含 rename 对。

## 失败类与同类排查

**失败类 = 发布边界。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

用 `--name-status -z`/rename 对判：任一旧路径非 docs → 非 docs-only。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
