---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-279：bundle v3 pack.version 升级不备份旧 manifest/identity

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`planBundleManifest` 对 state ok + version 变化返回 `action:'upgrade'`，但 `writeBundleManifest` 只在 legacy 有 `legacyPath` 备份；v3 升级直接覆盖 `bundle.json`，旧版本证据丢失。

## 复现

静态：`planBundleManifest`/`writeBundleManifest`；临时 home + 两个 pack version。

## 根因与证据

升级路径只备份 v2，不备份 v3。

## 失败类与同类排查

**失败类 = 升级不可回看。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

v3 version 升级也保留 `bundle.v3-<oldVersion>.json`（或 identity 备份链）；负控升级后旧文件在。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/src/host/run-bundle/bundle-manifest.ts`、`tests/host/run-bundle/bundle-manifest.spec.ts`
- 红：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts`（旧 plan：v3 版本升级 `previousVersionPath === undefined`，旧字节被覆盖）
- 绿：`pnpm test tests/host/run-bundle/bundle-manifest.spec.ts`（13 绿：`bundle.json.v3-0.11.8.bak` 保留；`../../evil` 不出目录；空标签落 `v3-prev.bak`）
- 提交：commit d13a0eb0
