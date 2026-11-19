---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-276：catalog.json 不可读时被静默重建，无 warning

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

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

## 修复证据

- 改动面：`packages/company-pack/src/host/ledger/catalog.ts`、`tests/host/ledger/catalog.spec.ts`
- 红：`pnpm test tests/host/ledger/catalog.spec.ts`（旧路径：坏索引被静默覆盖、warnings `[]`）
- 绿：`pnpm test tests/host/ledger/catalog.spec.ts`（corrupt/unsupported → warning + `.bak`；目标被目录占用/不可写各降级成 warning）
- 提交：commit 4bc09e0c
