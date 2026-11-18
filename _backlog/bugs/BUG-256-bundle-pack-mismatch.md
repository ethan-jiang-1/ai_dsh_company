---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-256：bundle v3 pack.name/version 不校验与实际 pack 一致

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`validateBundleManifest` 只要求 pack.name/version 是字符串；把 `pack:{name:'other',version:'999'}` 写入 v3 manifest 仍 ok，身份/升级日志会记错包。

## 复现

临时 workspace + 上述 manifest；`readBundleManifestState` 返回 ok。


```sh
pnpm test tests/host/run-bundle/bundle-manifest.spec.ts
```

## 根因与证据

manifest 是模型可写约定，但 host 在读取时没有与 `resolvePackMetadata` 对账。

## 失败类与同类排查

**失败类 = 身份字段没有当前 pack 绑定。**

## 已修判定

修成什么算修好：

1. read 只把 **pack.name** 不符判 corrupt；同 name 的 version 变化是正常升级，plan 返回 upgrade（保留 id/createdAt，重写 pack.version），boot 不 block。
2. 负例：`pack:{name:'other',version:'999'}` → corrupt。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/host/run-bundle/bundle-manifest.ts`、`packages/company-pack/src/host/run-bundle/runtime-guard.ts`
- 红：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts`（pack 名称不符仍 ok；version 变化被判 corrupt）
- 绿：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts`（name 不符 corrupt；version 变化 upgrade 保留 id/createdAt；boot 不 block）
- 提交：commit 82e23163
