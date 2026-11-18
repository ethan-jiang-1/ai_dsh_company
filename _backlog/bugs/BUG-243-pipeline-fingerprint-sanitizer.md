---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-243：管线指纹不含 sanitizer/export-dist：只改发布管线，release:shape 仍给旧 _dist 盖章

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`sourceFingerprint` 只覆盖 pack 源；`tools/lib/release/shipped-shape.mjs`、`tools/release/export-dist.mjs` 等决定 tarball 字节的管线文件不在指纹里。只改 sanitizer（或 export-dist）后，`sourceFingerprint` 不变，`release:shape` 对旧 `_dist` 仍 PASS。

## 复现

在 `tools/lib/release/shipped-shape.mjs` 末尾加一行注释；前后 `sourceFingerprint` 都是 `f9eaef4dd008`；`node tools/release/shipped-shape.mjs` exit 0 / PASS。还原后干净。

## 根因与证据

`pack-source.mjs` 的 `PACKAGE_SOURCE_FILES`/`DIRS` 只收 `packages/company-pack`；sanitizer 与 pack 管线在 `tools/`，不在指纹输入。C15 修复 Note 自己把这条列为未修轴（S2）。

## 失败类与同类排查

**失败类 = 发布门禁的「输入」不完整：字节由 sanitizer 决定，指纹却没覆盖 sanitizer。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 `tools/lib/release/shipped-shape.mjs`/`tools/release/export-dist.mjs`/`tools/lib/core/pack-source.mjs` 纳入发布 fingerprint（或单独的 pipeline fingerprint），只改管线时 `release:shape` 必须要求 `--prepare`。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
