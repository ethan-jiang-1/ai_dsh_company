---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-356：`parseMotionLedger` 用裸 `|` 拆行，按 markdown 正确转义的 `\|` 会把整行动议判成坏行并从台账面板消失

> 严重级别：P2（读模型拒绝合法输入：台账单元格里写 `\|` 是 markdown 表格表达「文本含竖线」的正确写法，但台账解析把这行当成 8 列坏行丢弃，面板只剩「跳过 1 行（格式不符）」而**看不到这场动议**；同一张表在 `/req check` / `/prd check` 里却被正确解析成 7 列）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（TS/JS 同方言、转义竖线留列内）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（批次 351..359：表格方言单一解析）

## 症状

`kb/motion-ledger.md` 的一行里任何一个单元格含 `\|`（例如一句话结论写 `A\|B 方案对比`，或 slug 里带竖线）时：

1. [`parseMotionLedger`](../../../packages/company-pack/src/lib/accounting/ledger.ts#L77) 按裸 `|` 切出 8 个单元格 → 命中 `cells.length !== HEADER.length` 分支 → 进 `badRows`（`reason: 'cell-count'`），**不进 `rows`**；
2. [「经营仪表」页签体](../../../packages/company-pack/src/client/tabs/LedgerTab.tsx#L145-L193) 于是少一行动议，只显示一条坏行横幅——「共 N 场」少报一场；
3. 同一份文本交给文档校验链路（`splitTableRow`）却是 7 列，`/req check` 与 `/prd check` 对同一张表的结论与台账面板相反（同一方言、两套解析）。

## 运行面

- **面 = lib**：[`packages/company-pack/src/lib/accounting/ledger.ts`](../../../packages/company-pack/src/lib/accounting/ledger.ts#L68-L105)；同一裸拆还有 [`deliverables-catalog.ts`](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L159-L174)（台账 slug 集合）与仓库侧 [`tools/repo/deliverables-index.mjs`](../../../tools/repo/deliverables-index.mjs#L48)、[`tools/lib/company/candidate-scan.mjs`](../../../tools/lib/company/candidate-scan.mjs#L176)。

## 复现

```sh
pnpm exec tsx -e "
import { parseMotionLedger } from './packages/company-pack/src/lib/accounting/ledger.ts';
const p = parseMotionLedger([
  '| slug | date | type | participants | wallClock | deliverable | summary |',
  '|---|---|---|---|---|---|---|',
  '| 2026-11-20-a | 2026-11-20 | decision | ceo | 1m | ✅ | A\\\\|B 方案对比 |',
].join('\n'));
console.log(JSON.stringify({ rows: p.rows.length, bad: p.badRows }));
"
```

实测输出 `{"rows":0,"bad":[{"line":3,"cells":8,"reason":"cell-count"}]}`（行内容本身合法，转义竖线应留在单元格内）。

## 根因与证据

1. [`ledger.ts:77`](../../../packages/company-pack/src/lib/accounting/ledger.ts#L77) 用 `trimmed.slice(1, …).split('|')` 直拆，既不识别 `\|` 转义，也不识别结尾反斜杠的奇偶；
2. 仓库早已有唯一实现 [`splitTableRow`](../../../packages/company-pack/src/lib/docs/markdown-shape-core.js#L19-L60)（处理 `\|`、`\\|` 与行尾反斜杠奇偶），并由 [`prd-check.ts`](../../../packages/company-pack/src/lib/docs/prd-check.ts) / [`requirements-check.ts`](../../../packages/company-pack/src/lib/docs/requirements-check.ts#L348) 消费——台账与 slug 集合是漏接的两个消费者。

## 失败类与同类排查

- **失败类**：同一表格方言存在两套解析器，窄的那套把合法输入判坏（`BUG-339` 只修了「全空行被当分隔行」，同函数另一条边）。
- **同类排查**：本卡「运行面」列出的 4 处裸 `split('|')` 需一起换到共享实现；`tools/lib/release/readiness.mjs` 的 `split('|').slice(2, -1).join('|')` 是有意的保守读法，可不改，但应在注释里点明。

## 修复方案与范围

- **根因修法**：`parseMotionLedger` 与 `ledgerSlugsFromText` 改用 `splitTableRow`（`lib/` 已可依赖 `lib/docs/markdown-shape-core.js`，无 node 依赖），仓库侧两个 `.mjs` 同步换到同一实现或抽共享纯 JS helper；并给 `tests/lib/accounting/ledger.spec.ts` 增加「含 `\|` 的行仍是 1 场动议」用例。

## 已修判定

- 含 `\|` 的台账行解析为 1 行、0 坏行，`summary` 保留字面竖线；同一文本经 `splitTableRow` 与 `parseMotionLedger` 得到相同列数；
- `/deliverables` 索引生成器与客户端对同一条含转义竖线的动议给出相同 slug 集合；
- 新增用例在旧实现下红、新实现下绿。

## 修复证据

- 改动面：`packages/company-pack/src/lib/accounting/ledger.ts`、`packages/company-pack/src/lib/deliverables/deliverables-catalog.ts`、`tools/lib/company/deliverables-catalog.mjs`、`tools/repo/deliverables-index.mjs`、`tools/lib/company/candidate-scan.mjs`、`tests/lib/accounting/ledger.spec.ts`、`tests/tools/deliverables-catalog-tools.spec.ts`
- 红：`pnpm test tests/lib/accounting/ledger.spec.ts tests/tools/deliverables-catalog-tools.spec.ts` —— 还原裸 split 前 2 failed（含 `\|` 的行被判 8 列坏行）
- 绿：`pnpm test tests/lib/accounting/ledger.spec.ts tests/tools/deliverables-catalog-tools.spec.ts` —— 18/18 passed（summary 保留字面竖线；TS/JS slug 集合一致）
- 提交：commit ed54ef17
