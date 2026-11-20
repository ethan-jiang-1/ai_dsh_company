---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-262：content/manifest.json 的 tiers 引用不校验存在/安全，缺文件仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

manifest 的 tiers 路径没有被 checker 读取；把某 tier 指向不存在的文件，或写 `../`，只要 manifest JSON 可解析，checker 仍 `[]`。

## 复现

`readTarball` 的 read 对 `content/manifest.json` 返回含 `generic/missing.md` 的同一 JSON；checker `[]`。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

REQUIRED 只检查 manifest 文件本身；manifest 的引用面没有闭包。

## 失败类与同类排查

**失败类 = 清单的引用未验证。**

## 已修判定

修成什么算修好：

1. tiers 每路径安全、存在、在 inventory；`../`/绝对/缺失红。
2. 负例：tier 指向 generic/missing.md → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`packages/company-pack/content/manifest.json`、`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（tier 指向 generic/missing.md 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（tiers 安全/存在/在 inventory 红）
- 提交：commit 21ff3ee7
