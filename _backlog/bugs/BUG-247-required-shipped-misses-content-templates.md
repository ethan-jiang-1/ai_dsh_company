---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-247：REQUIRED_SHIPPED 漏 content/templates 的其他模板（strs/decision-memo/…）

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

REQUIRED 只收 prd/mrd/meta 三个模板；`content/templates/strs.md`、`decision-memo.md`、`ops-review-note.md`、`review-note.md`、`weekly-report.md` 不在列表。过滤 `strs.md` 后 checker `[]`。

## 复现

`readTarball` 后过滤 `package/content/templates/strs.md`，checker `[]`。

## 根因与证据

模板家族按 C15 当时 `/prd` 相关文件收，未收 strs/评审/周报模板。

## 失败类与同类排查

**失败类 = 同一关键件面缺口。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 content/templates 全家族纳入派生/清单；删任一 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
