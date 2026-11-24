---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-362：`ledgerSlugsFromText` 把列数不符的坏行首列也当 slug 收进「已入账」集合，与台账面板的坏行判据相反

> 严重级别：P2（跨消费者同一份数据两种结论：台账面板把列数不符的行报成坏行并说「共 N 场」少报，同一行的首列却进了「已入账」集合，让成品目录把一条**台账里根本不存在的行**标成 `ledgered: true`）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（行有效性单一判据）
>
> **留痕**：Note [2026-11-24-boundary-window-and-bad-shape-batch](../../../notes/implemented/2026-11-24-boundary-window-and-bad-shape-batch.md)（批次 360..369）

## 症状

[`ledgerSlugsFromText`](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L159-L174) 收集 slug 时**不校验列数**：只要表头见过、该行不是分隔行、首列非空，就把首列当 slug。而同一个表的权威解析 [`parseMotionLedger`](../../../packages/company-pack/src/lib/accounting/ledger.ts#L70-L106) 在该行 `cells.length !== 7` 时记进 `badRows` 并**不**产出该场动议。

## 运行面

- **面 = lib**：[`deliverables-catalog.ts`](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L159-L174) 与 [`ledger.ts`](../../../packages/company-pack/src/lib/accounting/ledger.ts#L70-L106)；消费方 = host 目录生成 [`catalog.ts`](../../../packages/company-pack/src/host/ledger/catalog.ts#L191-L195)（`ledgerSlugs:`）。

## 复现

```sh
pnpm exec tsx -e "
import { ledgerSlugsFromText } from './packages/company-pack/src/lib/deliverables/deliverables-catalog.ts';
import { parseMotionLedger } from './packages/company-pack/src/lib/accounting/ledger.ts';
const text = ['| slug | date | type | participants | wallClock | deliverable | summary |','|---|---|---|---|---|---|---|','| ok-1 | 2026-01-01 | decision | ceo | 1m | ✅ | s |','| broken | x |'].join('\n');
console.log('slugs =', [...ledgerSlugsFromText(text)]);
const parsed = parseMotionLedger(text);
console.log('rows =', parsed.rows.map(r => r.slug), 'badRows =', parsed.badRows);
"
```

实测 `slugs = [ 'ok-1', 'broken' ]`，而 `rows = ['ok-1']`、`badRows = [{ line: 4, cells: 2, reason: 'cell-count' }]`——`broken` 只存在于 slug 集合里。

## 根因与证据

1. 两处各写一份表格遍历：`parseMotionLedger` 有列数/空行/分隔行三重判据，`ledgerSlugsFromText` 只有「跳过分隔行」。
2. `ledgerSlugsFromText` 的设计注释写「格式家 = kb/motion-ledger.md」，但实现没有跟随格式家给出的列数约束。

## 失败类与同类排查

- **失败类**：同一方言两份解析器，宽的那份把坏行当有效数据（`BUG-356` 只统一了**拆行**，没有统一**行有效性**）。
- **同类排查**：`tools/repo/deliverables-index.mjs` 的 slug 集合（不随包分发）按同一规则实现，需同步核对。

## 修复方案与范围

- **根因修法**：`ledgerSlugsFromText` 与 `parseMotionLedger` 共享行有效性判据（列数 = 表头列数、非全空行），或直接复用 `parseMotionLedger` 的 `rows` 取 slug（`lib` 内部依赖允许，`ledger.ts` 不反向依赖本文件）。

## 已修判定

- 上述复现里 `slugs` 只剩 `['ok-1']`；`parseMotionLedger` 对同一文本的结论不变（1 行 + 1 坏行）；两份解析器对任意输入给出同一批 slug。

## 修复证据

- 改动面：`packages/company-pack/src/lib/deliverables/deliverables-catalog.ts`、`tools/lib/company/deliverables-catalog.mjs`、`tests/tools/deliverables-catalog-tools.spec.ts`
- 红：`pnpm test tests/tools/deliverables-catalog-tools.spec.ts` —— 还原前 1 failed（列数不符的 `broken` 进了 slug 集合）
- 绿：`pnpm test tests/tools/deliverables-catalog-tools.spec.ts` —— 13/13 passed（坏行不进集合，TS/JS 两侧一致）
- 提交：commit c62865ac
- 复审修正：commit cb668231（盲审后收敛判据/暴露原因/转义边界）
