---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-261：content/manifest.json 与盘面 34 个文件不一致，无对账门禁

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`content/manifest.json` 列 50 个文件，盘上 84 个；34 个实际文件（charters/contracts/kb-setup/…）不在 manifest。manifest 自称「新增/重命名必须同 diff 更新」，但没有门禁对账。

## 复现

脚本比较 tiers 并集与 `content/**`：`listed 50 actual 84 missing 0 extra 34`。

## 根因与证据

manifest 是手写声明；checker 只要求它 JSON 可解析，未与盘面对账。

## 失败类与同类排查

**失败类 = 声明与实盘漂移。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

从 `content/**` 与 tiers 双向求差；extra/missing 都红（或有白名单）。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
