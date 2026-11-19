---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-281：release docs-only 对 rename 只按 name-only 判，code→docs rename 可能误判

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`docsOnlySince` 用 `git diff --name-only`；rename 的旧/新路径是否都出现取决于 git 输出。一个 code 文件 rename 到 `_backlog/` 可能只看到新 docs 路径，被当 docs-only。

## 复现

静态：`docsOnlySince`；临时 git 仓库 rename 实验。

## 根因与证据

路径集合判据不含 rename 对。

## 失败类与同类排查

**失败类 = 发布边界。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

用 `--name-status -z`/rename 对判：任一旧路径非 docs → 非 docs-only。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/release/docs-only.mjs`、`tools/release/release.mjs`、`tests/repo/release/docs-only.spec.ts`
- 红：`pnpm test tests/repo/release/docs-only.spec.ts`（真 git 抓的 `--name-only` 输出只有 `docs/a.md`，code→docs 改名被判 docs-only）
- 绿：`pnpm test tests/repo/release/docs-only.spec.ts`（`--name-status -z` 两侧都判：`src/a.ts` → 红）
- 提交：commit d13a0eb0
