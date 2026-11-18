---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-263：RELEASE_PIPELINE_FILES 漏 install-manual.mjs；只改手册生成器，pipeline 指纹不变

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`RELEASE_PIPELINE_FILES` 只有 sanitizer/CLI/export-dist/release/pack-source 5 个；`tools/lib/release/install-manual.mjs` 决定安装手册字节，不在指纹。给 install-manual 加注释后 `releasePipelineFingerprint` 仍 `107c586152b7`；`release:shape` 仍 PASS。

## 复现

前后 `releasePipelineFingerprint` 相同；`release:shape` PASS。

## 根因与证据

pipeline 指纹是手写 5 条；手册/市场索引等发布输入没进清单。

## 失败类与同类排查

**失败类 = 发布输入集不完整。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 install-manual（及所有进 _dist/发布字节的生成器）纳入 pipeline；改它必须要求 --prepare。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
