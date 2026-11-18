---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-248：REQUIRED_SHIPPED 的 JSON 只 parse 不验 schema：空对象也 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`checkShippedPackage` 对 `.json` 关键件只 `JSON.parse`；把 `content/delivery-modes/managed-service/delivery-rules.json` 替换成 `{}` 仍 `[]`。运行时拿到空规则对象，checker 说可用。

## 复现

`readTarball` 的 read 对 delivery-rules.json 返回 `{}`，checker `[]`。

## 根因与证据

非空判据 = trim + JSON.parse；没有最小 schema/必填键。

## 失败类与同类排查

**失败类 = 「可用」被折成「可解析」。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

对 delivery-rules/seed/check-rules 至少校验顶层必填键；空对象/坏 schema → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
