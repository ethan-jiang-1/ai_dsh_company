---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-255：bundle v3 createdAt 任意字符串仍 ok

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`validateBundleManifest` 只要求 `createdAt` 是非空字符串；`createdAt:'not-a-date'` 的 v3 manifest 返回 `status:'ok'`，identity/展示层拿到坏日期。

## 复现

临时 workspace 写 v3 `bundle.json`（createdAt `not-a-date`）；`readBundleManifestState` 返回 ok。


```sh
pnpm test tests/host/run-bundle/bundle-manifest.spec.ts
```

## 根因与证据

形状校验只判非空，没有日期往返/ISO 校验。

## 失败类与同类排查

**失败类 = 「存在」被折成「有效」。**

## 已修判定

修成什么算修好：

1. v3 createdAt 必须 ISO 往返；坏日期 corrupt；v2 升级坏日期归一为 now。
2. 负例：`not-a-date` → corrupt。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/host/run-bundle/bundle-manifest.ts`、`tests/host/run-bundle/bundle-manifest.spec.ts`
- 红：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts`（createdAt not-a-date 仍 ok）
- 绿：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts`（ISO 往返失败 corrupt；v2 坏日期归一 now）
- 提交：commit 21ff3ee7
