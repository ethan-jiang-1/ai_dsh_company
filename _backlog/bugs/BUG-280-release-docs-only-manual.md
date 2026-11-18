---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-280：release docs-only 允许改 _dist/安装手册.md 而不重打/不校验

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`DOCS_ONLY_PATHS` 含 `_dist/安装手册.md`；只改生成手册会被 docs-only 快速路径接受，`--check` 用旧 artifact/manifest 也可能通过（手册与 tarball 同源要求被绕过）。

## 复现

静态：release.mjs 的 DOCS_ONLY_PATHS；`--stamp`/`--check` 路径。

## 根因与证据

生成物被当 docs。

## 失败类与同类排查

**失败类 = 发布字节与 docs-only 边界。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 `_dist/安装手册.md` 移出 docs-only；改它必须重打/校验。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
