---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-271：DEV_COMMAND 漏 `pnpm -s test`/`pnpm exec`/`npm run` 形式

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

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
