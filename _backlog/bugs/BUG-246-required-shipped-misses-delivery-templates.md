---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-246：REQUIRED_SHIPPED 漏 delivery-modes 的模板/文档面

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`content/delivery-modes/project-services/templates/sow.md` 是交付模式运行时模板，但不在 REQUIRED；过滤后 checker `[]`。managed-service 的 incident/monthly-report/renewal/runbook/sla/service-catalog 同族。

## 复现

`readTarball` 后过滤 `package/content/delivery-modes/project-services/templates/sow.md`，checker `[]`。

## 根因与证据

REQUIRED 只收 delivery-rules.json，没有收 templates/overview/document-map/glossary。

## 失败类与同类排查

**失败类 = 同上：关键件未按交付模式读取面派生。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

补 delivery-modes 的文档/模板关键件；删任一 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
