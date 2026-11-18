---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-276：catalog.json 不可读时被静默重建，无 warning

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`regenerateCatalog` 对 `kb/deliverables-index.json` chmod 000，`readCatalogState` 失败，随后写新 catalog；无 warning 说「旧索引不可读」。

## 复现

临时 home：catalog chmod 000 → `written true`、warnings `[]`。

## 根因与证据

读失败被当 corrupt/空，没有 warning。

## 失败类与同类排查

**失败类 = 坏形状静默。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

读 catalog 失败时 warning + 保留/备份旧文件；不要静默覆盖。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
