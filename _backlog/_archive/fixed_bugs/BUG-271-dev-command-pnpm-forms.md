---
status: 已修
severity: P2
opened: 2026-11-19
---

# BUG-271：DEV_COMMAND 漏 `pnpm -s test`/`pnpm exec`/`npm run` 形式

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：已修｜修复：2026-11-19｜审查：agent（独立盲审）— 两份独立只读盲审（互不知情）均 approve-with-notes；无产品 blocker，notes 已在 4bc09e0c 收口
>
> **关联**：[C17 卡](../../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：批次 Note [2026-11-19-guard-residuals-closure](../../../notes/implemented/2026-11-19-guard-residuals-closure.md)（本批共用）。

## 症状

`DEV_COMMAND` 只匹配 `pnpm <白名单>`；`pnpm -s test`、`pnpm exec vitest`、`npm run test` 不在判据。一个 persona 写这些仍 PASS。

## 复现

静态：`DEV_COMMAND` 正则；合成 persona `pnpm -s test`。

## 根因与证据

命令判据是窄白名单。

## 失败类与同类排查

**失败类 = dev 命令面缺口。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 `pnpm -s/exec/dlx`/`npm run`/`npx` 纳入；或统一解析命令首词。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/core/dev-command.mjs`、`tools/lib/release/shipped-shape.mjs`、`tests/tools/dev-command.spec.ts`
- 红：`pnpm test tests/tools/dev-command.spec.ts`（旧正则只认 pnpm 后紧跟白名单脚本名：`-s` 旗标、exec 子命令、npm run、npx 四种形式全部未命中 → 放行）
- 绿：`pnpm test tests/tools/dev-command.spec.ts`（包管理器形式全部命中，散文 pnpm 不误伤）
- 提交：commit d13a0eb0
