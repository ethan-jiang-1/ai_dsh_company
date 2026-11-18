---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-244：REQUIRED_SHIPPED 仍漏 content/manifest 的 generic/* 运行时文件

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`content/manifest.json` 的 t2 列了 `generic/collaboration.md` 等 6 个文件，`REQUIRED_SHIPPED` 没有它们；真实 tarball 删掉 `content/generic/collaboration.md` 后 checker 仍 `[]`。

## 复现

`readTarball` 后过滤 `package/content/generic/collaboration.md`，`checkShippedPackage` 返回 `[]`。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

REQUIRED_SHIPPED 是手写策展集合（43 条）；manifest 列出 50 条，检查器没有从 manifest/读取面派生。

## 失败类与同类排查

**失败类 = 关键件清单与运行时知识面清单不同步。**

## 已修判定

修成什么算修好：

1. `content/manifest.json` 增 `inventory`（content/** 全量 84 件）；checker 要求每件在 tarball、非空。
2. 负例：删 `content/generic/collaboration.md` → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/content/manifest.json`、`tools/lib/release/shipped-shape.mjs`、`tests/repo/release/shipped-shape.spec.ts`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（删 generic/collaboration.md 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（inventory 缺文件红）
- 提交：commit 21ff3ee7
