---
status: 已修
severity: P2
opened: 2026-11-23
---

# BUG-339：四大读模型解析器边缘坏形状静默吞错（`startup-options` 内嵌字段与版本、`ledger` 全空行、`catalog` 空白 `metaProblem` 与 `generatedAt`、`pendingQuestions` 空 `callId`）

> 严重级别：P2（解析器边界静默吞错：二期 Fuzz 矩阵未覆盖的字段组合仍可静默折成正常值或吞行）｜发现：2026-11-23｜状态：已修｜审查：agent — 逐条核对已修判定（四类畸形均显式诊断/拒绝）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（顺位 5 读模型边界；机械修复）

## 症状

在 `539dba6f` 落地六大解析器 Fuzz 之后，以下 4 类畸形输入仍能静默通过解析而不报错/不计数：

1. [`parseStartupOptionsState`](../../../packages/company-pack/src/lib/startup/startup-settings.ts#L272-L302)：
   - 输入 `{"v":999,"productTypes":["a"]}` 不校验 `v`，返回 `problem: null`；
   - 输入 `{"v":1,"wikiTemplate":123}` 静默折成 `wikiTemplate: null`，`problem: null`；
   - 输入 `{"v":1,"wikiCheck":{"ok":"yes","problem":"bogus","value":{}}}`（`wikiCheck` 是对象但内部字段类型非法）返回 `problem: null`，全部静默归零。
2. [`parseMotionLedger`](../../../packages/company-pack/src/lib/accounting/ledger.ts#L82)：
   - 表中出现全空 7 列表行 `| | | | | | | |` 时，因分隔行正则 `/^[-: ]*$/` 使用 `*` 而被当作分隔行**静默跳过**，既不进 `rows` 也不进 `badRows`。
3. [`parseCatalog`](../../../packages/company-pack/src/client/data/deliverables-index.ts#L83-L88)：
   - 合法 entry 带纯空白 `metaProblem: "   "` 时，`row.metaProblem !== ''` 为真，UI 会渲染带空白 tooltip 的异常 `Tag`；
   - 根字段 `generatedAt: 123`（非字符串）被静默折成 `""`（面板头显示 `静态索引 · 生成于 ` 缺时间）而不报错。
4. [`pendingQuestions`](../../../packages/company-pack/src/lib/presence/attention.ts#L391)：
   - 仅检查 `typeof data.callId === 'string'`，接受空串 `callId: ""`（而同文件的 `approvalFromPayload` 明确要求 `id !== ''`），导致空 `id` 问询条目进入面板键 `#`。

## 运行面

- **面 = lib + client**：[`startup-settings.ts`](../../../packages/company-pack/src/lib/startup/startup-settings.ts)、[`ledger.ts`](../../../packages/company-pack/src/lib/accounting/ledger.ts)、[`deliverables-index.ts`](../../../packages/company-pack/src/client/data/deliverables-index.ts)、[`attention.ts`](../../../packages/company-pack/src/lib/presence/attention.ts)。

## 复现

```sh
pnpm exec tsx -e "
import { parseStartupOptionsState } from './packages/company-pack/src/lib/startup/startup-settings.ts';
import { parseMotionLedger } from './packages/company-pack/src/lib/accounting/ledger.ts';
import { parseCatalog } from './packages/company-pack/src/client/data/deliverables-index.ts';
import { pendingQuestions } from './packages/company-pack/src/lib/presence/attention.ts';
console.log('opt:', parseStartupOptionsState(JSON.stringify({ v: 999, wikiTemplate: 123, wikiCheck: { ok: 'yes', problem: 'bogus', value: {} } })).problem);
console.log('led:', parseMotionLedger('| slug | date | type | participants | wallClock | deliverable | summary |\n|---|---|---|---|---|---|---|\n| | | | | | | |'));
console.log('cat:', parseCatalog(JSON.stringify({ schema: 1, generatedAt: 123, entries: [{ slug: 'a', path: 'deliverables/a/final.md', metaProblem: '   ' }] })));
console.log('qs:', pendingQuestions([{ type: 'tool/call', time: 1, data: { callId: '', name: 'ask_user_question', arguments: '{\"questions\":[{\"question\":\"hi\"}]}' } }], 's1'));
"
```

实际输出：`opt: null`；`led` 的 `rows` 与 `badRows` 均为空；`cat` 的 `metaProblem` 为 `"   "` 且 `generatedAt` 为 `""`；`qs[0].id` 为 `""`。

## 根因与证据

- [`startup-settings.ts:286-292`](../../../packages/company-pack/src/lib/startup/startup-settings.ts#L286-L292) 仅检查顶层 `productTypes`/`deliveryModes` 与 `wikiCheck` 是否为对象，未深入校验 `v`、`wikiTemplate` 与 `wikiCheck` 子字段类型；
- [`ledger.ts:82`](../../../packages/company-pack/src/lib/accounting/ledger.ts#L82) 分隔行正则 `/^[-: ]*$/` 允许零个 `-`（应至少有 `-`，例如 `/^[-: ]*-[-:\s]*$/` 或在表头之后只跳过紧跟表头的那一行分隔行）；
- [`deliverables-index.ts:83,88`](../../../packages/company-pack/src/client/data/deliverables-index.ts#L83-L88) 未对 `metaProblem` 做 `trim()` 归一化，也未对 `generatedAt` 非字符串报错；
- [`attention.ts:391`](../../../packages/company-pack/src/lib/presence/attention.ts#L391) 未像 [`L193`](../../../packages/company-pack/src/lib/presence/attention.ts#L193) 那样排除空字符串 `callId`。

## 失败类与同类排查

- **失败类**：宽松解析静默归一化（[`BUG-313`](BUG-313-startup-options-bad-shape-silent-empty.md) / [`BUG-324`](BUG-324-deliverables-catalog-field-shape-silent.md) / [`BUG-303`](BUG-303-ledger-malformed-rows-silent-drop.md) 同族）。
- **同类排查**：同步核对了 `parseStartupSettingsState`（已有 `deliveryMode: number` 显式兼容契约 [`startup-load.spec.ts:98`](../../../tests/client/startup/startup-load.spec.ts#L98)，不列入坏形状；`updatedAt` 非字符串仍宜在校验时注意不误破旧盘）。

## 修复方案与范围

- **根因修法**：收紧 4 处边缘校验（兼容合法缺省与旧盘格式的同时拒绝/记账存在却坏形状的值），并把这 4 类畸形样本全部扩进 [`parsers-fuzz.property.spec.ts`](../../../tests/lib/shared/parsers-fuzz.property.spec.ts)。

## 已修判定

- `parseStartupOptionsState` 对非 `v=1`（若存在且非 1）、`wikiTemplate` 非串非空、`wikiCheck` 子字段类型非法返回 `problem: 'unreadable'`；
- `parseMotionLedger` 对 `| | | | | | | |` 不再静默吞行（进 `rows` 或显式诊断，不匹配分隔行）；
- `parseCatalog` 将空白 `metaProblem` 归一为 `null`（或报错），对非法类型 `generatedAt` 返回 `null`/显式问题；
- `pendingQuestions` 对空串 `callId` 与 `approvalFromPayload` 保持同口径一致；
- `parsers-fuzz.property.spec.ts` 新增对应 Fuzz 变异类并全绿。

## 修复证据

- 改动面：`packages/company-pack/src/lib/startup/startup-settings.ts`、`packages/company-pack/src/lib/accounting/ledger.ts`、`packages/company-pack/src/client/data/deliverables-index.ts`、`packages/company-pack/src/lib/presence/attention.ts`、`packages/company-pack/src/client/locales.ts`、`tests/lib/shared/parsers-fuzz.property.spec.ts`、`tests/client/data/company-data-lifecycle.spec.ts`、`tests/tools/deliverables-catalog-tools.spec.ts`
- 红：`pnpm test tests/lib/shared/parsers-fuzz.property.spec.ts` —— 还原前 4 failed / 12 passed（四个畸形类全部静默通过）
- 绿：`pnpm test tests/lib/shared/parsers-fuzz.property.spec.ts` —— 16/16 passed；联动 `pnpm test tests/lib tests/client/startup tests/client/data tests/client/tabs tests/host/ledger` 482/482、`pnpm typecheck`、`pnpm lint` 全绿
- 提交：commit f3c4f821
