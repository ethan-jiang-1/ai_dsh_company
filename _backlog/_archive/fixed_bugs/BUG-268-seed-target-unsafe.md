---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-268：seed schema 只判 source/target 字符串，不判 target 安全/存在

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`jsonSchemaProblem` 的 seed 分支只要求 `source`/`target` 是字符串；`target:'../../evil.md'`、`source:'missing.md'` 都 PASS，`readSeeds` 会报越界/缺源。

## 复现

真实 tarball read 覆盖 seed.json 为上述对象 → checker `[]`。

## 根因与证据

schema 只做类型，不做 readSeeds 的安全/存在语义。

## 失败类与同类排查

**失败类 = 发布 schema 与运行时读取器不同义。**

## 已修判定

修成什么算修好：

1. seed 的 target 必须在 `.dsh-company/` 内、source 在 inventory、无重复；越界形态（绝对路径 / 盘符 / 反斜杠 / NUL / `..` 段）一律红。
2. 运行面 `readSeeds` 与合同**同义**：pack 不能 import `tools/lib`（发布面自包含），所以是两份渲染；等价矩阵 = `tests/tools/kb-seeds.spec.ts` 的「seed 路径越界：readSeeds 与 content 合同同义（BUG-268）」——同一批越界样本两边同时拒。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/company/content-contract.mjs`、`tools/lib/release/shipped-shape.mjs`、`tests/tools/content-contract.spec.ts`
- 红：`pnpm test tests/tools/content-contract.spec.ts`（旧 checker：seed `target:"../../evil.md"` 通过）
- 绿：`pnpm test tests/tools/content-contract.spec.ts`（target 越界/source 缺件/重复 target 都红）
- 提交：commit 4bc09e0c
