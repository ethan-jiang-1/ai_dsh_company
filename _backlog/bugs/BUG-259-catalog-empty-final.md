---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-259：catalog 把零字节 final.md 算 present，无判据

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`scanEntries` 只 `accessSync(R_OK)`，不判非空；零字节 final 进 catalog、`final:true`、warnings `[]`。

## 复现

临时 home：final.md 写空；`regenerateCatalog` entries 含该 dir、warnings `[]`。

## 根因与证据

final 的语义是「可展示成品」，判据只到「可读」。

## 失败类与同类排查

**失败类 = 存在/可读被折成可展示。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

final 至少非空（或可解析首块）；空 → warning + 不进/标 unavailable。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
