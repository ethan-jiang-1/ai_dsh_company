---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-250：组合目标/关键件只查非空，不 parse YAML：坏 preset 仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`checkShippedPackage` 对 `presets/*/agent.cordis.yml` 只 `trim() !== ''`；把 ceo preset 换成 `not: [valid`（非法 YAML）仍 `[]`。运行时组合才会炸。

## 复现

`readTarball` 的 read 对 `package/presets/ceo/agent.cordis.yml` 返回 `not: [valid`，checker `[]`。

## 根因与证据

关键件/组合目标只做存在 + 非空；没有 YAML parse。

## 失败类与同类排查

**失败类 = 「在盘上」被折成「可加载」。**

## 已修判定

修成什么算修好（建议，供修复者采用）：

对 `*.yml` 关键件/组合目标做 JSON/YAML parse；坏 YAML → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。
