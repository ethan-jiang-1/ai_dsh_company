---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-264：RELEASE_PIPELINE_FILES 漏 market-index.mjs；市场索引变化不影响指纹

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

给 `tools/lib/release/market-index.mjs` 加注释后 `releasePipelineFingerprint` 仍 `107c586152b7`。市场索引是发布面的一部分，但不在 pipeline。

## 复现

前后指纹相同。

## 根因与证据

同 BUG-263：pipeline 清单手写。

## 失败类与同类排查

**失败类 = 发布输入集不完整。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

同 263；把 market-index 纳入 pipeline 或明确它不属于 tarball 字节。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
