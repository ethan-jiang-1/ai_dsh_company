---
status: 调查中
severity: P2
opened: 2026-11-24
---

# BUG-381：收尾/审计链仍各自解析 `meta.md` 且不感知围栏——围栏里的模板样例会让收敛器把未收口动议当成「已收口」

> 严重级别：P2（维护面误判：`lib`/`host` 侧的 `meta.md` 解析刚在 BUG-370/374/375 收成「结构行 + `yamlScalar`」，但 `tools/` 侧还有两份**独立的**行解析——`converge.mjs` 的 `metaField`（`/^${field}:\s*(.*)$/m`）与 `deliverables.mjs` 的 `parseMeta`（按行取首现）。两份都不跳过代码围栏：`meta.md` 里粘过模板片段时，围栏里的 `closed: 2020-01-01` 会被当真实收口日期，`assess()` 于是不再报 `closed-missing` ⇒ 收敛器把未收口动议推进归档；`result:` 同理，审计会用样例值判形状）｜发现：2026-11-24｜状态：调查中
>
> **留痕**：（待修复时裁决）

## 症状

同一份 `meta.md`（围栏里有模板样例，围栏外是真值且 `closed`/`result` 留空）：

| 字段 | `lib`（结构感知，现行判据） | `converge.mjs` `metaField` | `tools/…/deliverables.mjs` `parseMeta` |
|---|---|---|---|
| `closed` | `declared:true, value:''` | `"2020-01-01"` | `"2020-01-01"` |
| `result` | `declared:true, value:''` | `"accepted"` | `"accepted"` |

`assess()` 的判据是 `/\d{4}-\d{2}-\d{2}/.test(state.closed ?? '')`（[`converge-rules.mjs`](../../tools/lib/company/converge-rules.mjs#L234-L238)）——拿到样例日期就不报 `closed-missing`。

## 运行面

- **面 = tools**：[`tools/repo/converge.mjs`](../../tools/repo/converge.mjs#L73-L76)（`metaField`）、[`tools/lib/company/deliverables.mjs`](../../tools/lib/company/deliverables.mjs#L102-L140)（`parseMeta`/`validateMeta`）、[`tools/lib/company/converge-rules.mjs`](../../tools/lib/company/converge-rules.mjs#L234-L249)（`assess`）。

## 复现

```sh
pnpm exec tsx -e "
import { metaScalarField } from './packages/company-pack/src/lib/docs/requirements-check.ts';
const meta = ['\`\`\`','closed: 2020-01-01','result: accepted','\`\`\`','closed:','result:','slug: foo','kickoff: 2026-11-20','type: decision'].join('\n');
const converge = (f) => { const m = meta.match(new RegExp('^' + f + ':\\\\s*(.*)$', 'm')); return m ? m[1].trim() : '' };
console.log('converge closed =', JSON.stringify(converge('closed')), '| lib =', JSON.stringify(metaScalarField(meta, 'closed')));
console.log('converge result =', JSON.stringify(converge('result')), '| lib =', JSON.stringify(metaScalarField(meta, 'result')));
"
```

实测 `converge closed = "2020-01-01" | lib = {"declared":true,"value":""}`、`converge result = "accepted" | lib = {"value":""}`（`metaField` 的源码正则与上例逐字一致）。

## 根因与证据

1. BUG-370/374/375 的收口只覆盖了 `lib/`（`metaScalarField`/`metaListField`/`numberingMarker`）与 `host/`（`req-command`/`delivery-command`）；`tools/` 的两份是**第三、第四份**实现，未收进单一判据。
2. 两份都不看围栏：`converge.mjs` 用多行正则首匹配、`deliverables.mjs` 用逐行首现——都是 BUG-370 家族「同一文件多口径」的延续。

## 失败类与同类排查

- **失败类**：判据收口只做了半张网（`lib` 完成、`tools` 遗漏），且 `tools` 侧是**维护/审计链**——它错了不会红，只会悄悄做错决定。
- **同类排查**：`tools/repo/deliverables-index.mjs` 的 slug 集合与 `tools/lib/company/deliverables-catalog.mjs` 上一轮已对齐（BUG-347/356）；`checks/audit/deliverables-check.mjs` 透过 `validateMeta` 受影响（同卡）。

## 修复方案与范围

- **根因修法**：`tools/` 两份改为消费同一份结构感知解析——把 `meta` 扫描抽成纯 JS（`lib/docs/markdown-shape-core.js` 已是纯 JS，可被 `tools/` import），或至少在两者内用 `scanDocumentDetailed` 过滤结构行后再取字段；`assess` 拿到的 `closed` 因此与 `lib` 一致。

## 已修判定

- 上述复现里 `converge.mjs` 与 `deliverables.mjs` 读出的 `closed`/`result` 与 `metaScalarField` 相等（都为空）；
- 围栏外的真值仍正常读到；`assess` 对「只有样例日期」的动议仍报 `closed-missing`；
- 新增 `tests/tools/` 用例（旧实现红、新实现绿）。
