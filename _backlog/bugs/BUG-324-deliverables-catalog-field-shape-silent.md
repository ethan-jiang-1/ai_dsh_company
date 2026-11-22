---
status: 调查中
severity: P2
opened: 2026-11-22
---

# BUG-324：成品索引的 `root`/`ledgered`/`presented` 字段形状坏被静默归一化——审计分类与台账归属可能反了

> 严重级别：P2（次要偏重：成品索引是审计视图；`root` 写错仍按 active 显示、`ledgered:"false"` 仍算已入账、`presented:"true"` 变未核，而 `skipped` 仍是 0）｜发现：2026-11-22（E2E 第五轮）｜状态：调查中
>
> **留痕**：待定（本轮只立卡，不修——用户 2026-11-22 指令「继续争取搞个 8–10 个，setup goal」）。

## 症状

索引 entry 的 `slug`/`path` 合法，但字段形状坏：

```json
{ "slug": "a", "path": "p", "root": "bogus", "ledgered": "false", "presented": "true" }
```

面板：

- 该 entry 被当作 **active**（`root` 回退 `.dsh-company/deliverables`）；
- `ledgered` 变成 **true**（只有 `=== false` 才 false；字符串 `"false"` 不是）；
- `presented` 变成 **null（未核）**（只有布尔 true/false 才保留）；
- `catalog.skipped` 仍是 0，没有任何「字段形状坏」提示。

这些不是显示小差异：`root` 决定归档/活跃、`ledgered` 决定「台账外」审计、`presented` 决定 present 背书。

纯证据：

```sh
node --import tsx/esm -e "
import { parseCatalog } from './packages/company-pack/src/client/data/deliverables-index.ts'
const c = parseCatalog(JSON.stringify({ schema:1, entries:[
  { slug:'a', path:'p', root:'bogus', ledgered:'false', presented:'true' }
] }))
console.log(c.skipped, c.entries[0].root, c.entries[0].ledgered, c.entries[0].presented)
"
# 0 .dsh-company/deliverables true null
```

## 运行面

- **面 = client 成品读模型/页签**：`packages/company-pack/src/client/data/deliverables-index.ts` 的 `parseCatalog`；`tabs/DeliverablesTab.tsx` 的审计分类/present 标签。
- 数据面 = host 生成的 `kb/deliverables-index.json`。

## 复现

1. 起隔离实例，打开「成品」。
2. 把索引覆盖成上面的一条 entry（其它字段合法）。
3. 点「重读」。
4. 期望：该条被标「字段形状坏」/skipped；实际：按 active、已入账、未核显示，skipped=0。

## 根因与证据

`parseCatalog` 只对 `slug`/`path` 为空计数 skipped，其它字段用宽松归一化：

- `deliverables-index.ts:52`：`root = row.root === archive ? archive : deliverables` —— 任何非法值都回退 deliverables；
- `:66`：`ledgered: row.ledgered !== false` —— 只有布尔 false 才 false，字符串/undefined 都 true；
- `:67`：`presented: row.presented === true ? true : row.presented === false ? false : null` —— 其它值静默 null；
- `:69`：`metaProblem` 只接受非空字符串。
- `skipped` 只在 `:56`（空 slug/path）和 null 非对象时增加。

这与 310 修的 `skipped` 是两个层次：310 修的是**条目缺失**，本卡是**字段形状坏被猜值**。

## 失败类与同类排查

**失败类 = 宽松归一化把「坏字段」伪装成合法值，审计分类静默改变**。同类：

- 310：空 slug/path → skipped（已修）。
- 313/314：startup 字段类型坏 → 诊断（已修）。
- 本卡：catalog `root`/`ledgered`/`presented` 字段类型坏 → 猜值。
- 不是「字段缺失」：缺失是 host 旧格式的合法默认；本卡是**存在但类型错**。

## 修复方案与范围

- **根因修法**：对 `root`/`ledgered`/`presented` 做类型校验；坏类型计 skipped（或每字段 `fieldProblems`），不要猜。缺失字段仍用默认。
- 面板显示「N 条字段形状坏」；审计分类不再把坏 root 当 active、坏 ledgered 当已入账。
- **判据**：坏 root/ledgered/presented 各一条 → skipped/字段问题；缺失字段 → 默认；合法值不回归；zh/en 同步。
- **不改**：host 生成格式；`skipped` 的空 slug/path 语义。
- **材料性**：client 读模型；修复需授权/留痕裁决，本轮不修。

## 已修判定

- 坏 `root` 不再静默 active；
- 坏 `ledgered`/`presented` 不再猜 true/null；
- 缺失字段仍按默认；
- 解析层 spec + 面板一条。
