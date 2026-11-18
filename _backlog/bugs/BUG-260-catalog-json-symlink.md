---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-260：catalog.json 是 symlink 时被静默替换，无 warning

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`regenerateCatalog` 对 `kb/deliverables-index.json` 只 `lstat` 判目录；symlink 不是目录，`writeCompanyAtomic` 替换链接本身，不警告。

## 复现

临时 home：`kb/deliverables-index.json` 指向不存在的 target；`regenerateCatalog` written true、warnings `[]`，链接被替换。

## 根因与证据

catalog 输出路径的坏形状（symlink）没有 warning/拒绝，与 final/meta 的 symlink 判据不同。

## 失败类与同类排查

**失败类 = 输出载体的坏形状未入判据。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

catalog 输出是 symlink → warning + 拒绝写（或明确 safe-replace 并记录）。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
