---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-263：RELEASE_PIPELINE_FILES 漏 install-manual.mjs；只改手册生成器，pipeline 指纹不变

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

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

## 修复证据

- 改动面：`tools/lib/core/pack-source.mjs`、`tests/repo/release/shipped-shape.spec.ts`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（还原 `pack-source.mjs` 到 HEAD：`install-manual.mjs 改动没进指纹`，前后同为 `107c586152b7…`）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（61 绿，含「改发布面任一 .mjs 字节 → pipeline 指纹必变」）
- 提交：commit d13a0eb0
