---
status: 调查中
severity: P2
opened: 2026-11-19
---

# BUG-275：catalog 只判 size==0，纯空白 final 仍 present

> 严重级别：P2（次要）｜发现：2026-11-19｜状态：调查中｜审查：—
>
> **关联**：[C17 卡](../issues/2026-11-19-guard-residuals-and-runtime-edges.md)（C17 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

C16 修复判零字节 final，但 `final.md` 为 `'   \n'`（size 4）仍 `final:true`、warnings `[]`。

## 复现

临时 home：final 写空白 → entry 进、warnings `[]`。

## 根因与证据

空判据只到字节数，不到 trim。

## 失败类与同类排查

**失败类 = 「可展示」被折成「非空字节」。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

用 `readFileSync(...).trim() === ''` 判空；空白 → warning/无 final。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
