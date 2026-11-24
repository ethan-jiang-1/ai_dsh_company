---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-371：同一份 `meta.md` 有三个校验器，判据互不相同——缺 `slug:`、日期前缀 slug、空 `result:` 三处裁决相反

> 严重级别：P2（同一份数据两种结论：成品面板（client 目录）与仓库审计（`deliverables-check` / `deliverables-audit`）会对同一个 `meta.md` 给出一红一绿；其中「空 `result:`」一处还与模板生命周期矛盾——模板明说可留空到收口，面板却把每个在途动议标成形状坏）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（三处逐字相等；result 留空合法）
>
> **留痕**：Note [2026-11-24-meta-single-source-and-presence-parity](../../../notes/implemented/2026-11-24-meta-single-source-and-presence-parity.md)（批次 370..376：meta 形状单一判据）

## 症状

`meta.md` 的形状判据有三份实现：

1. [`lib/deliverables/deliverables-catalog.ts` `metaProblemsOf`](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L100-L114)（成品面板）；与 `tools/lib/company/deliverables-catalog.mjs` 的 `metaProblemsOf` 由 parity spec 钉住；
2. [`tools/lib/company/deliverables.mjs` `validateMeta`](../../../tools/lib/company/deliverables.mjs#L118-L140)（**仓库审计**：`checks/audit/deliverables-check.mjs`、`checks/lib/deliverables-audit.mjs` 的 `META_SHAPE_BAD`）。

两者的判据不同：

| 输入 | 面板（1） | 仓库审计（2） |
|---|---|---|
| 缺 `slug:` 行 | ✅ 无问题 | ❌`缺行「slug:」` |
| `slug: 2026-11-20-foo`（带日期前缀） | ✅ 无问题 | ❌`slug 字段写剥前缀形式…` |
| `result:` 留空（模板允许「开头留空」） | ❌`缺行「result:」` | ✅ 无问题 |

## 运行面

- **面 = lib + tools**：[`deliverables-catalog.ts`](../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L100-L114)、[`deliverables.mjs`](../../../tools/lib/company/deliverables.mjs#L118-L140)、[`deliverables-audit.mjs`](../../../checks/lib/deliverables-audit.mjs#L196-L205)。

## 复现

```sh
pnpm exec tsx -e "
import { metaProblemsOf, parseMeta } from './packages/company-pack/src/lib/deliverables/deliverables-catalog.ts';
import { validateMeta } from './tools/lib/company/deliverables.mjs';
const cases = { 'no slug': 'kickoff: 2026-11-20\ntype: decision\nresult: accepted\n', 'dated slug': 'slug: 2026-11-20-foo\nkickoff: 2026-11-20\ntype: decision\nresult: accepted\n', 'empty result': 'slug: foo\nkickoff: 2026-11-20\ntype: decision\nresult:   \n' };
for (const [k, body] of Object.entries(cases)) console.log(k, 'panel=', JSON.stringify(metaProblemsOf(parseMeta(body).fields)), 'audit=', JSON.stringify(validateMeta(body).problems));
"
```

实测：`no slug` → 面板 `[]`／审计 `["缺行「slug:」"]`；`dated slug` → 面板 `[]`／审计 `["slug 字段写剥前缀形式…"]`；`empty result` → 面板 `["缺行「result:」"]`／审计 `[]`。

## 根因与证据

1. 校验规则被复制成三份而不是「一份数据 + 各视图只决定怎么显示」；parity spec [`tests/client/data/catalog-contract.spec.ts`](../../../tests/client/data/catalog-contract.spec.ts#L57-L64) 只钉了 (1)↔(1')，没有钉 (2)。
2. 「值存在但为空」与「行缺失」的语义在三处定义不同：`metaProblemsOf` 把空值当缺行；`validateMeta` 只在 key 缺失时报缺行。
3. 模板 [`content/templates/meta.md`](../../../packages/company-pack/content/templates/meta.md) 明确 `result` 开头可留空、收口才写终态词，所以面板这一条与产品生命周期相反。

## 失败类与同类排查

- **失败类**：同一契约的多个校验实现各自演化（`BUG-347`/`BUG-362` 的同族，落点是 `meta.md` 形状）。
- **同类排查**：`deliverables-catalog` 与 `tools/lib/company/deliverables-catalog.mjs` 已由 parity 覆盖；`requiredFields`（delivery-rules）目前只有形状校验、没有内容校验，但 content 文档也没声明要校验（已核，不算缺陷）。

## 修复方案与范围

- **根因修法**：把 `meta.md` 的形状判据收成**一份**（建议 `lib/deliverables/` 的 `metaProblemsOf`，tools 侧继续 parity 引用），三处消费同一函数；并统一「空值 vs 缺行」语义：`result` 空 = 合法（未收口），`kickoff`/`type` 空 = 缺行，`slug` 由 `deliverableSlug` 回退（不强制书写），日期前缀 slug 判红（因为会与台账 slug 对不上）。

## 已修判定

- 上表三种输入的「面板结论」与「仓库审计结论」逐行相等；
- `result:` 留空的在途动议在成品面板不再显示形状警告；缺 `slug:` 的动议在成品面板也显示同一条问题（与审计一致）；
- 新增 parity 用例覆盖 `validateMeta`（旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/lib/deliverables/deliverables-catalog.ts`、`tools/lib/company/deliverables-catalog.mjs`、`tools/lib/company/deliverables.mjs`、`tests/tools/meta-shape-parity.spec.ts`、`tests/lib/shared/parsers-fuzz.property.spec.ts`、`tests/tools/deliverables-catalog-tools.spec.ts`
- 红：`pnpm test tests/tools/meta-shape-parity.spec.ts tests/lib/shared/parsers-fuzz.property.spec.ts` —— 还原三处判据前 5 failed（缺 slug/日期前缀/空 result 结论相反）
- 绿：`pnpm test tests/tools/meta-shape-parity.spec.ts tests/lib/shared/parsers-fuzz.property.spec.ts` —— 10/10 passed（面板 / 孪生 / 审计逐字相等；result 留空与缺行都合法）
- 提交：commit 7d81872c
