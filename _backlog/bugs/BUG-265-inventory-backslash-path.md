---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-265：content inventory 的 safeContentRel 只按 `/` 判 `..`，Windows 反斜杠可穿

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`safeContentRel` 用 `rel.split('/').includes('..')`；`..\\evil` 不含 `/../`，通过检查。Windows 上 `join(content, '..\\evil')` 可越界。

## 复现

静态：`safeContentRel` 源码；合成 inventory `..\\evil` 不触发。

## 根因与证据

路径安全只按 POSIX 分隔符。

## 失败类与同类排查

**失败类 = 跨平台路径安全。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

拒绝反斜杠/盘符/NUL；用 `path.win32` 与 `path.posix` 双向判。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
