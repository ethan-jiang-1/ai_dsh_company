---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-253：--allow-stale 的理由是任意字符串，无审核/绑定

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

C15 修复要求 `--allow-stale=理由`，但理由可以是 `x`；CLI 只判非空。旧 `_dist` 可以用一个任意词过门。

## 复现

临时改 `README.shipped.md`，`node tools/release/shipped-shape.mjs --allow-stale=x`：WARN + PASS + exit 0。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

`staleFlagProblem` 只判 `reason.trim() !== ''` 与 CI 环境，不绑定 ticket/过期时间/审计。

## 失败类与同类排查

**失败类 = 降级仍是「有词就过」。**

## 已修判定

修成什么算修好：

1. `--allow-stale=<sha>:<reason>` 结构化；裸/任意词红，CI 禁。
2. 负例：`=x` → exit 1；`=<sha>:docs-only` → PASS。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（--allow-stale=x 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（要求 <sha>:<reason>；裸/任意词红）
- 提交：commit 21ff3ee7
