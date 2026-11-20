---
status: 已修
severity: P2
opened: 2026-11-18
---

# BUG-249：seed.json 空对象通过 checker，但 bootstrap 报「装配清单为空」

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：已修｜修复：2026-11-18｜审查：agent（独立盲审）— B1 + S1–S5 已处置；证据见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../settled_issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`content/kb-setup/seed.json` 的 `{}` 能过 REQUIRED（JSON.parse + trim 非空），`readSeeds` 却返回 `error: kb 装配清单为空`；这是发布前 checker 绿、首启装配失败的分叉。

## 复现

临时 content：写 `seed.json` 为 `{}`；`readSeeds(dir)` 返回 error；checker 对同一内容只 parse，返回 `[]`。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

checker 只认 JSON 可解析；bootstrap 有自己的 `seeds` 数组语义。

## 失败类与同类排查

**失败类 = 同一关键件两套 schema。**

## 已修判定

修成什么算修好：

1. seed JSON 校验 seeds 非空且 source/target；`{}` 红。
2. 负例：`{}` → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（seed {} 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（缺 seeds/source/target 红）
- 提交：commit 21ff3ee7
