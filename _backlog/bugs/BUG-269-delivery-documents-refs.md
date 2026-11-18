---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-269：delivery-rules 的 documents 只判非空对象，不判每个文件存在

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`jsonSchemaProblem` 对 delivery-rules 要求 `documents` 是非空对象；`documents:{overview:'missing.md'}` 仍 PASS，`/delivery` 读取时会缺文件。

## 复现

真实 tarball read 覆盖 delivery-rules → checker `[]`。

## 根因与证据

schema 只判容器，不判引用闭包。

## 失败类与同类排查

**失败类 = JSON schema 与运行时读取面不同义。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

documents 每个 value 必须在 content/delivery-modes/<id>/ 存在；缺 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
