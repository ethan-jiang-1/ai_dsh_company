---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-243：管线指纹不含 sanitizer/export-dist：只改发布管线，release:shape 仍给旧 _dist 盖章

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`sourceFingerprint` 只覆盖 pack 源；`tools/lib/release/shipped-shape.mjs`、`tools/release/export-dist.mjs` 等决定 tarball 字节的管线文件不在指纹里。只改 sanitizer（或 export-dist）后，`sourceFingerprint` 不变，`release:shape` 对旧 `_dist` 仍 PASS。

## 复现

在 `tools/lib/release/shipped-shape.mjs` 末尾加一行注释；前后 `sourceFingerprint` 都是 `f9eaef4dd008`；`node tools/release/shipped-shape.mjs` exit 0 / PASS。还原后干净。


```sh
pnpm release:shape
```

## 根因与证据

`pack-source.mjs` 的 `PACKAGE_SOURCE_FILES`/`DIRS` 只收 `packages/company-pack`；sanitizer 与 pack 管线在 `tools/`，不在指纹输入。C15 修复 Note 自己把这条列为未修轴（S2）。

## 失败类与同类排查

**失败类 = 发布门禁的「输入」不完整：字节由 sanitizer 决定，指纹却没覆盖 sanitizer。**

## 已修判定

修成什么算修好：

1. release manifest 增 `pipelineFingerprint`（sanitizer/export-dist/pack-source/CLI）；`release:shape` 同时比对 source 与 pipeline，`release --check/--verify` 同。
2. 负例：只改 sanitizer → pipeline 变、旧 `_dist` 红；`release --prepare` 后绿。
3. 正例：现存 tarball 137 entries PASS。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/core/pack-source.mjs`、`tools/release/release.mjs`、`tools/release/shipped-shape.mjs`
- 红：`pnpm release:shape`（旧 manifest 无 pipelineFingerprint → freshness 红）
- 绿：`pnpm release:shape`（rebuild 后 source+pipeline 匹配 → PASS）
- 提交：commit 21ff3ee7
