---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-244：REQUIRED_SHIPPED 仍漏 content/manifest 的 generic/* 运行时文件

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`content/manifest.json` 的 t2 列了 `generic/collaboration.md` 等 6 个文件，`REQUIRED_SHIPPED` 没有它们；真实 tarball 删掉 `content/generic/collaboration.md` 后 checker 仍 `[]`。

## 复现

`readTarball` 后过滤 `package/content/generic/collaboration.md`，`checkShippedPackage` 返回 `[]`。

## 根因与证据

REQUIRED_SHIPPED 是手写策展集合（43 条）；manifest 列出 50 条，检查器没有从 manifest/读取面派生。

## 失败类与同类排查

**失败类 = 关键件清单与运行时知识面清单不同步。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

从 `content/manifest.json` 的 tiers 派生关键件（或对账两份清单）；删 generic/* → checker 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
