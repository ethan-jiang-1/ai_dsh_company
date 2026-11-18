---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-255：bundle v3 createdAt 任意字符串仍 ok

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`validateBundleManifest` 只要求 `createdAt` 是非空字符串；`createdAt:'not-a-date'` 的 v3 manifest 返回 `status:'ok'`，identity/展示层拿到坏日期。

## 复现

临时 workspace 写 v3 `bundle.json`（createdAt `not-a-date`）；`readBundleManifestState` 返回 ok。

## 根因与证据

形状校验只判非空，没有日期往返/ISO 校验。

## 失败类与同类排查

**失败类 = 「存在」被折成「有效」。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

对 createdAt 做 ISO 往返（与 notes 日期同族）；坏日期 → corrupt/warning。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
