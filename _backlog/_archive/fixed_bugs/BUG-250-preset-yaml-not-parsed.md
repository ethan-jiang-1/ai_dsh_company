---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-250：组合目标/关键件只查非空，不 parse YAML：坏 preset 仍 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`checkShippedPackage` 对 `presets/*/agent.cordis.yml` 只 `trim() !== ''`；把 ceo preset 换成 `not: [valid`（非法 YAML）仍 `[]`。运行时组合才会炸。

## 复现

`readTarball` 的 read 对 `package/presets/ceo/agent.cordis.yml` 返回 `not: [valid`，checker `[]`。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

关键件/组合目标只做存在 + 非空；没有 YAML parse。

## 失败类与同类排查

**失败类 = 「在盘上」被折成「可加载」。**

## 已修判定

修成什么算修好：

1. preset `agent.cordis.yml` 用 js-yaml（含 `!!js` tag）parse；坏 YAML 红。
2. 负例：`not: [valid` → 红；真实 11 个 preset PASS。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（坏 YAML preset 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（js-yaml（含 !!js tag）parse 失败红）
- 提交：commit 21ff3ee7
