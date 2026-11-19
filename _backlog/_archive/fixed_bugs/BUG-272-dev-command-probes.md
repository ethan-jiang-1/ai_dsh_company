---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-272：DEV_COMMAND 只列 node tools|checks|tests，漏 node probes

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../settled_issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`DEV_COMMAND` 的 `node (tools|checks|tests)/` 不含 `probes/`；`node probes/...` 是仓内 dev 入口，persona 写它仍 PASS。

## 复现

静态：`DEV_COMMAND` 正则。

## 根因与证据

命令面按上次想到的目录。

## 失败类与同类排查

**失败类 = dev 命令面缺口。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 `probes/` 纳入 dev 命令；正例 `node tools/...` 仍红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/core/dev-command.mjs`、`tools/lib/release/shipped-shape.mjs`、`tests/tools/dev-command.spec.ts`
- 红：`pnpm test tests/tools/dev-command.spec.ts`（旧正则的目录白名单只有 tools/checks/tests：probes 下的入口全部放行）
- 绿：`pnpm test tests/tools/dev-command.spec.ts`（`DEV_DIRS` 四个目录含 probes）
- 提交：commit d13a0eb0
