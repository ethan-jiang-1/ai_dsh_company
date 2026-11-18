---
status: 修复已落地
severity: P2
opened: 2026-11-18
---

# BUG-248：REQUIRED_SHIPPED 的 JSON 只 parse 不验 schema：空对象也 PASS

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复已落地｜修复：2026-11-18｜审查：agent（独立盲审）— 见本卡 `## 修复证据`
>
> **关联**：[C16 卡](../issues/2026-11-18-pipeline-fingerprint-and-runtime-exploratory.md)（C16 / 发虚领域）。
> **留痕**：批次 Note [2026-11-18-pipeline-fingerprint-and-runtime-closure](../../notes/implemented/2026-11-18-pipeline-fingerprint-and-runtime-closure.md)（本批共用）。

## 症状

`checkShippedPackage` 对 `.json` 关键件只 `JSON.parse`；把 `content/delivery-modes/managed-service/delivery-rules.json` 替换成 `{}` 仍 `[]`。运行时拿到空规则对象，checker 说可用。

## 复现

`readTarball` 的 read 对 delivery-rules.json 返回 `{}`，checker `[]`。


```sh
pnpm test tests/repo/release/shipped-shape.spec.ts
```

## 根因与证据

非空判据 = trim + JSON.parse；没有最小 schema/必填键。

## 失败类与同类排查

**失败类 = 「可用」被折成「可解析」。**

## 已修判定

修成什么算修好：

1. delivery-rules JSON 校验 deliveryMode/kind/documents 非空；空对象红。
2. 负例：`{}` → 红。

## 修复方向（不授权，仅记录）

- 先补最小负例到对应 spec/checker，再改实现；不动 vendor。

## 修复证据

- 改动面：`tools/lib/release/shipped-shape.mjs`
- 红：`pnpm test tests/repo/release/shipped-shape.spec.ts`（delivery-rules {} 仍 PASS）
- 绿：`pnpm test tests/repo/release/shipped-shape.spec.ts`（缺 deliveryMode/kind/documents 红）
- 提交：commit 82e23163
