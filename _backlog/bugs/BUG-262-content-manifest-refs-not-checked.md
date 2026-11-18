---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-262：content/manifest.json 的 tiers 引用不校验存在/安全，缺文件仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

manifest 的 tiers 路径没有被 checker 读取；把某 tier 指向不存在的文件，或写 `../`，只要 manifest JSON 可解析，checker 仍 `[]`。

## 复现

`readTarball` 的 read 对 `content/manifest.json` 返回含 `generic/missing.md` 的同一 JSON；checker `[]`。

## 根因与证据

REQUIRED 只检查 manifest 文件本身；manifest 的引用面没有闭包。

## 失败类与同类排查

**失败类 = 清单的引用未验证。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

对 tiers 每个路径：在 tarball 存在、非空、无 `..`/绝对路径、且在 content/ 下；否则红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
