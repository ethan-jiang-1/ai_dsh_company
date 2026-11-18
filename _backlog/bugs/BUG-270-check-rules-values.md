---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-270：check-rules 的 files 只判非空对象，不判 value 形状/文件存在

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`jsonSchemaProblem` 对 check-rules 要求 `files` 非空对象；`files:{x:{}}` 仍 PASS，`/req check` 读不到规则文件/字段。

## 复现

真实 tarball read 覆盖 check-rules → checker `[]`。

## 根因与证据

schema 只判容器，不判条目形状。

## 失败类与同类排查

**失败类 = 同上。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

files 的每个 value 至少含文件路径/规则字段；与读规则器同形。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
