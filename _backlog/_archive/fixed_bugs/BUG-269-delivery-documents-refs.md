---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-269：delivery-rules 的 documents 只判非空对象，不判每个文件存在

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`jsonSchemaProblem` 对 delivery-rules 要求 `documents` 是非空对象；`documents:{overview:'missing.md'}` 仍 PASS，`/delivery` 读取时会缺文件。

## 复现

真实 tarball read 覆盖 delivery-rules → checker `[]`。

## 根因与证据

schema 只判容器，不判引用闭包。

## 失败类与同类排查

**失败类 = JSON schema 与运行时读取面不同义。**

## 已修判定

修成什么算修好：

1. `documents` 每个 value 是对象：`owner` 非空、`file` 形如 `drafts/<slug>.md`、`template` 在 `content/delivery-modes/<id>/` 内**存在**；`entry` 在场。
2. **只判 `template`/`entry` 的存在**：`documents.*.file` 是 workspace 相对的草稿路径（不是包内文件），判形状不判存在——判据文案别读成在查草稿。
3. 同一份判据被 content-manifest gate、`delivery-mode-sources` 门禁与 tarball checker 共用（不再各写一半）。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/company/content-contract.mjs`、`tools/lib/release/shipped-shape.mjs`、`tests/tools/content-contract.spec.ts`
- 红：`pnpm test tests/tools/content-contract.spec.ts`（旧 checker：`documents:{SLA:{template:"templates/missing.md"}}` 通过）
- 绿：`pnpm test tests/tools/content-contract.spec.ts`（template 不在 content → 红）
- 提交：commit 4bc09e0c
