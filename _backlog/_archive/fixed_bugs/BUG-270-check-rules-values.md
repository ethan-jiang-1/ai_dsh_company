---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-270：check-rules 的 files 只判非空对象，不判 value 形状/文件存在

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`jsonSchemaProblem` 对 check-rules 要求 `files` 非空对象；`files:{x:{}}` 仍 PASS，`/req check` 读不到规则文件/字段。

## 复现

真实 tarball read 覆盖 check-rules → checker `[]`。

## 根因与证据

schema 只判容器，不判条目形状。

## 失败类与同类排查

**失败类 = 同上。**

## 已修判定

修成什么算修好：

1. `files` 的每个 value 是 `<slug>.md` 文件名；`layers` 的每一层都在 `files` 里有条目；`defaultLayers ⊆ layers`、`retiredPrefixes` 是字符串数组。
2. **已知残余**：`/req check` 当前只读 `layers`/`defaultLayers`/`retiredPrefixes`，不读 `files`——判据钉的是 content 合同（`document-map.md` 与台账把 `files` 当层表文件名），不是今天的运行时读取面；运行时开始读 files 时判据已就位。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/company/content-contract.mjs`、`tools/lib/release/shipped-shape.mjs`、`tests/tools/content-contract.spec.ts`
- 红：`pnpm test tests/tools/content-contract.spec.ts`（旧 checker：`files:{MRD:{}}` 通过）
- 绿：`pnpm test tests/tools/content-contract.spec.ts`（files 值形状 + layers 覆盖都红）
- 提交：commit d13a0eb0
