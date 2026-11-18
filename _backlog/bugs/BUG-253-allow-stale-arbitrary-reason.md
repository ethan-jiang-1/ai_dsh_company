---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-253：--allow-stale 的理由是任意字符串，无审核/绑定

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

C15 修复要求 `--allow-stale=理由`，但理由可以是 `x`；CLI 只判非空。旧 `_dist` 可以用一个任意词过门。

## 复现

临时改 `README.shipped.md`，`node tools/release/shipped-shape.mjs --allow-stale=x`：WARN + PASS + exit 0。

## 根因与证据

`staleFlagProblem` 只判 `reason.trim() !== ''` 与 CI 环境，不绑定 ticket/过期时间/审计。

## 失败类与同类排查

**失败类 = 降级仍是「有词就过」。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把理由解析成结构化（issue/日期）或要求 `--allow-stale=<sha>:<reason>`；CI 仍禁用。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
