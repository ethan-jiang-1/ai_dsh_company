---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-256：bundle v3 pack.name/version 不校验与实际 pack 一致

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`validateBundleManifest` 只要求 pack.name/version 是字符串；把 `pack:{name:'other',version:'999'}` 写入 v3 manifest 仍 ok，身份/升级日志会记错包。

## 复现

临时 workspace + 上述 manifest；`readBundleManifestState` 返回 ok。

## 根因与证据

manifest 是模型可写约定，但 host 在读取时没有与 `resolvePackMetadata` 对账。

## 失败类与同类排查

**失败类 = 身份字段没有当前 pack 绑定。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

读取 v3 时与当前 pack name/version 对比；不匹配 → warning/corrupt（或显式迁移）。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
