---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-249：seed.json 空对象通过 checker，但 bootstrap 报「装配清单为空」

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`content/kb-setup/seed.json` 的 `{}` 能过 REQUIRED（JSON.parse + trim 非空），`readSeeds` 却返回 `error: kb 装配清单为空`；这是发布前 checker 绿、首启装配失败的分叉。

## 复现

临时 content：写 `seed.json` 为 `{}`；`readSeeds(dir)` 返回 error；checker 对同一内容只 parse，返回 `[]`。

## 根因与证据

checker 只认 JSON 可解析；bootstrap 有自己的 `seeds` 数组语义。

## 失败类与同类排查

**失败类 = 同一关键件两套 schema。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

把 seed.json 的 `seeds` 非空/条目形状纳入 checker；空 → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
