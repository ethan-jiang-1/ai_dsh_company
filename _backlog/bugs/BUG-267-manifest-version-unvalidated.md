---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-267：content/manifest.json 的 version 无判据，v2/缺 version 仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`contentManifestProblems` 不读 `manifest.version`；把 manifest 改成 `version:2`（其余 inventory/tiers 不变），checker 仍 `[]`。

## 复现

真实 tarball read 覆盖 manifest.version=2 → `[]`。

## 根因与证据

inventory/tiers 校验了，version 没校验。

## 失败类与同类排查

**失败类 = 清单 schema 缺版本。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

要求 version === 1（或当前已知版本）；否红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
