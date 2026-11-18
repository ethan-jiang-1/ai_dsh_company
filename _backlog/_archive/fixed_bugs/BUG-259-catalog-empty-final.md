---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-259：catalog 把零字节 final.md 算 present，无判据

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`scanEntries` 只 `accessSync(R_OK)`，不判非空；零字节 final 进 catalog、`final:true`、warnings `[]`。

## 复现

临时 home：final.md 写空；`regenerateCatalog` entries 含该 dir、warnings `[]`。


```sh
pnpm test tests/host/ledger/catalog.spec.ts
```

## 根因与证据

final 的语义是「可展示成品」，判据只到「可读」。

## 失败类与同类排查

**失败类 = 存在/可读被折成可展示。**

## 已修判定

修成什么算修好：

1. catalog final 可读但零字节 → warning + final:false。
2. 负例：空 final → entries 空 + warning。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/host/ledger/catalog.ts`、`tests/host/ledger/catalog.spec.ts`
- 红：`pnpm test tests/host/ledger/catalog.spec.ts`（零字节 final 仍 present）
- 绿：`pnpm test tests/host/ledger/catalog.spec.ts`（warning + 无 final）
- 提交：commit 21ff3ee7
