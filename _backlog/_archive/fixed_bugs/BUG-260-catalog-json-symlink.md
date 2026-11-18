---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-260：catalog.json 是 symlink 时被静默替换，无 warning

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`regenerateCatalog` 对 `kb/deliverables-index.json` 只 `lstat` 判目录；symlink 不是目录，`writeCompanyAtomic` 替换链接本身，不警告。

## 复现

临时 home：`kb/deliverables-index.json` 指向不存在的 target；`regenerateCatalog` written true、warnings `[]`，链接被替换。


```sh
pnpm test tests/host/ledger/catalog.spec.ts
```

## 根因与证据

catalog 输出路径的坏形状（symlink）没有 warning/拒绝，与 final/meta 的 symlink 判据不同。

## 失败类与同类排查

**失败类 = 输出载体的坏形状未入判据。**

## 已修判定

修成什么算修好：

1. catalog 输出 `deliverables-index.json` 是 symlink → warning + 拒绝写，不替换链接。
2. 负例：symlink target 不存在 → written:false。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/host/ledger/catalog.ts`
- 红：`pnpm test tests/host/ledger/catalog.spec.ts`（catalog.json symlink 被静默替换）
- 绿：`pnpm test tests/host/ledger/catalog.spec.ts`（warning + 拒绝写）
- 提交：commit 21ff3ee7
