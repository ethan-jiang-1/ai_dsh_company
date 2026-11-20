---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-246：REQUIRED_SHIPPED 漏 delivery-modes 的模板/文档面

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`content/delivery-modes/project-services/templates/sow.md` 是交付模式运行时模板，但不在 REQUIRED；过滤后 checker `[]`。managed-service 的 incident/monthly-report/renewal/runbook/sla/service-catalog 同族。

## 复现

`readTarball` 后过滤 `package/content/delivery-modes/project-services/templates/sow.md`，checker `[]`。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

REQUIRED 只收 delivery-rules.json，没有收 templates/overview/document-map/glossary。

## 失败类与同类排查

**失败类 = 同上：关键件未按交付模式读取面派生。**

## 已修判定

修成什么算修好：

1. inventory 覆盖 delivery-modes 的 templates/overview/document-map/glossary。
2. 负例：删 project-services/templates/sow.md → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/content/manifest.json`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（删 delivery template 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（inventory 缺文件红）
- 提交：commit 21ff3ee7
