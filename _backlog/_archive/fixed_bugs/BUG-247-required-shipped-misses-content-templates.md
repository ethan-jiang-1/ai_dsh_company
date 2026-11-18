---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-247：REQUIRED_SHIPPED 漏 content/templates 的其他模板（strs/decision-memo/…）

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

REQUIRED 只收 prd/mrd/meta 三个模板；`content/templates/strs.md`、`decision-memo.md`、`ops-review-note.md`、`review-note.md`、`weekly-report.md` 不在列表。过滤 `strs.md` 后 checker `[]`。

## 复现

`readTarball` 后过滤 `package/content/templates/strs.md`，checker `[]`。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

模板家族按 C15 当时 `/prd` 相关文件收，未收 strs/评审/周报模板。

## 失败类与同类排查

**失败类 = 同一关键件面缺口。**

## 已修判定

修成什么算修好：

1. inventory 覆盖 content/templates 全家族（strs/decision-memo/ops-review-note/review-note/weekly-report）。
2. 负例：删 templates/strs.md → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/content/manifest.json`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（删 templates/strs.md 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（inventory 缺文件红）
- 提交：commit 21ff3ee7
