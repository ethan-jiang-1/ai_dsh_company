---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-245：REQUIRED_SHIPPED 漏 product-types 的 document-map/glossary/overview/模板

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`content/product-types/business-software/document-map.md` 是 `/req`/产品定义面读取的运行时文件，但不在 REQUIRED；过滤该 entry 后 checker 仍 `[]`。同类还有 hardware-software 的 templates/*.md、capabilities.md。

## 复现

`readTarball` 后过滤 `package/content/product-types/business-software/document-map.md`，checker `[]`。

## 根因与证据

REQUIRED 只收 requirements-model/check-rules 与部分 hardware templates，没有覆盖 product-types 的文档面。

## 失败类与同类排查

**失败类 = 关键件清单按「上次想到的文件」写，未按运行时读取面派生。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

补 product-types 的 document-map/glossary/overview/templates 关键件；删任一 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
