---
status: 调查中
severity: P2
opened: 2026-11-23
---

# BUG-347：`tools` 侧成品目录索引未复用 `BUG-232` 空 `slug:` 判据，产物被客户端 `parseCatalog` 整条丢弃

> 严重级别：P2（静默丢数据：同一成品在 host 目录里正常可见，但 `pnpm deliverables:index` 生成的目录 JSON 输出空 `slug: ""` 且误标 `ledgered: false`，导致客户端 `parseCatalog` 直接 `skipped += 1` 整条扔掉）｜发现：2026-11-23｜状态：调查中
>
> **留痕**：（待修复时裁决；需审 `BUG-232` 契约是否同步收拢单一事实源）

## 症状

当成品 `meta.md` 存在 `slug:` 行但值为空或仅含空白（例如 `slug:   `）：

1. `packages/company-pack/src/lib/deliverables/deliverables-catalog.ts` 的 [`deliverableSlug`](../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L95-L98)（`BUG-232` 单一判据）会先 `.trim()` 再在空串时回退到 `slugFromDirName(dir)`；
2. 但工具链侧 [`tools/lib/company/deliverables-catalog.mjs`](../../tools/lib/company/deliverables-catalog.mjs#L59) 与 [`tools/repo/deliverables-index.mjs`](../../tools/repo/deliverables-index.mjs#L75) 仍写 `entry.fields.get('slug') ?? slugFromDirName(entry.dir)`。因为 `parseMeta` 对空 `slug:` 会把 `''` 写入 `fields`，`??` 不会触发回退，于是索引 JSON 发出 `slug: ""` 并用 `""` 去查动议台账与 presented 集合（误判 `ledgered: false` / `presented: false`）；
3. 客户端 [`parseCatalog`](../../packages/company-pack/src/client/data/deliverables-index.ts#L71) 校验 `if (slug === '' || path === '') { skipped += 1; continue }`，最终将整条成品从目录里静默丢弃。

## 运行面

- **面 = tools + client**：[`tools/lib/company/deliverables-catalog.mjs`](../../tools/lib/company/deliverables-catalog.mjs#L59)、[`tools/repo/deliverables-index.mjs`](../../tools/repo/deliverables-index.mjs#L75)、[`packages/company-pack/src/client/data/deliverables-index.ts`](../../packages/company-pack/src/client/data/deliverables-index.ts#L69-L71)。

## 复现

构造 `meta.md`（`slug:` 为空、合法 `kickoff/type/result`）并用 `parseMeta` + `buildDeliverablesCatalog`（tools 侧）生成 catalog，再交给客户端 `parseCatalog(JSON.stringify(catalog))` 解析：

- `catalog.entries[0]` 实测生成 `slug: ""`、`ledgered: false`；
- 客户端 `parseCatalog` 实测返回 `entries.length === 0`、`skipped === 1`（同份文件走 host `lib/deliverables/deliverables-catalog.ts` 的 `deliverableSlug` 则正常产出回退后的 `slug`）。

## 根因与证据

1. [`packages/company-pack/src/lib/deliverables/deliverables-catalog.ts`](../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts#L95-L98) 修复 `BUG-232` 时增加了 `deliverableSlug(fields, dir)`，但双份维护在 `tools/` 的纯 ESM 版本 [`tools/lib/company/deliverables-catalog.mjs`](../../tools/lib/company/deliverables-catalog.mjs#L59) 与入口 [`tools/repo/deliverables-index.mjs`](../../tools/repo/deliverables-index.mjs#L75) 没有同步这段 `.trim() === ''` 回退逻辑，仍在用 `fields.get('slug') ?? slugFromDirName(...)`。

## 失败类与同类排查

- **失败类**：`packages/` 与 `tools/` 之间同类解析规则未抽单一事实源，旧缺陷 `BUG-232` 的修补只落在一侧。
- **同类排查**：同文件的 `metaProblemsOf` 在 `.mjs` 与 `.ts` 也呈双份实现，建议一并核对其它字段（`kickoff`/`type`/`result`）判据是否已对齐或收拢。

## 修复方案与范围

- **根因修法**：在 `tools/lib/company/deliverables-catalog.mjs` 与 `tools/repo/deliverables-index.mjs` 对齐 `deliverableSlug` 的 `.trim() === ''` 回退逻辑（或将无构建依赖的纯 JS helper 抽成共享模块 / 补 `static-audit` 对齐守卫），确保为空或纯空白 `slug:` 与缺失 `slug:` 表现一致。

## 已修判定

- 当 `meta.md` 含空 `slug:` 或纯空白 `slug:   ` 时，`tools/lib/company/deliverables-catalog.mjs` 与 `tools/repo/deliverables-index.mjs` 回退到 `slugFromDirName(dir)`，正确匹配 `ledgerSlugs` / `presentedSet`，且客户端 `parseCatalog` 返回 `skipped === 0` 并完整保留该条目。
