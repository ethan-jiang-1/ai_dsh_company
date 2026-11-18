---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-279：bundle v3 pack.version 升级不备份旧 manifest/identity

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

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
