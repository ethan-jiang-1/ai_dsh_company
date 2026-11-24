---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-357：`presented=true` 的 slug 延续写目录名 slug、查 `meta` 的 `slug:`——自定义 slug 的成品归档后背书变「未核」

> 严重级别：P2（审计背书静默丢失：`presented=true` 的对外承诺是「归档/搬迁后按 slug 延续」，但写入方一律用**目录名剥日期**当 slug，读取方 `scanCatalogEntries` 用 **`meta.md` 里的 `slug:`**（`BUG-232` 判据）查询；两者不等时，成品一进 `deliverables-archive/` 就从「已交付」掉成「未核」）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（自定义 slug 归档仍 presented、旧账本回退生效）
>
> **留痕**：Note [2026-11-23-quality-defenses-bugfix-batch](../../../notes/implemented/2026-11-23-quality-defenses-bugfix-batch.md)（批次 351..359：成品身份单一派生）

## 症状

成品 `meta.md` 写了自定义 `slug: custom-name`（目录名是 `2026-11-20-dir-name`）时：

1. 交付当场：`present` 事件 → [`presentedFromEvent`](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L313-L345) 写入 `paths['.dsh-company/deliverables/<dir>/final.md'] = true` 与 `slugs['dir-name'] = true`（目录名剥日期）；`/deliverables audit … true` 同样只写目录名 slug（[`setPresentedAudit`](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L232-L246)）。此时目录索引 `presented: true`，因为**path 命中**。
2. 归档（同一目录搬到 `deliverables-archive/`，path 改变）：[`scanCatalogEntries`](../../../packages/company-pack/src/host/ledger/catalog.ts#L97-L111) 用 `deliverableSlug(fields, dir)`（= `custom-name`）去问 [`presentedOf`](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L149-L153)，账本里只有 `slugs['dir-name']` → 返回 `null`。
3. 面板把这条已交付的成品显示成「未核」，操作员再也看不到当初的 present 背书；`paths` 的 false 审计同样会因 path 变化失效（这是设计），但 true 的 slug 延续明确承诺过要生效。

## 运行面

- **面 = host**：[`presented-ledger.ts`](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L149-L153)（查询）、[第 232-246 行](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L232-L246)（审计写）、[第 313-345 行](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L313-L345)（事件写）、[`catalog.ts`](../../../packages/company-pack/src/host/ledger/catalog.ts#L97-L111)（读取方）。

## 复现

```sh
pnpm exec tsx -e "
import { emptyPresentedLedger, mergePresented, presentedOf } from './packages/company-pack/src/host/ledger/presented-ledger.ts';
import { slugFromDirName } from './packages/company-pack/src/lib/deliverables/deliverables-catalog.ts';
const dir = '2026-11-20-dir-name';
const live = '.dsh-company/deliverables/' + dir + '/final.md';
const archived = '.dsh-company/deliverables-archive/' + dir + '/final.md';
const ledger = mergePresented(emptyPresentedLedger(), { paths: [live], slugs: [slugFromDirName(dir)] });
console.log(JSON.stringify({ live: presentedOf(ledger, live, 'custom-name'), archived: presentedOf(ledger, archived, 'custom-name'), slugs: ledger.slugs }));
"
```

实测输出 `{"live":true,"archived":null,"slugs":{"dir-name":true}}`。端到端同一结论：临时工作区里 plant 一份 `deliverables/<dir>/{meta.md,final.md}` 与上述账本 → `scanCatalogEntries` 得 `presented: true`；把同一目录搬到 `deliverables-archive/` 再扫 → `presented: null`（两条断言已在隔离探针里跑过）。

## 根因与证据

1. 写入方两处（[`setPresentedAudit` 第 241 行](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L241)、[`presentedFromEvent` 第 340 行](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L340)）都把 slug 定义成 `slugFromDirName(<dir>)`；
2. 读取方 [`catalog.ts:99`](../../../packages/company-pack/src/host/ledger/catalog.ts#L99) 用 `deliverableSlug(fields, item.name)`（`meta` 的 `slug:` 优先，`BUG-232` 的单一判据）；
3. 两侧对「成品身份」的定义不一致，而 `presentedOf` 的 slug 分支只查一次键，于是自定义 slug 的成品**永远**拿不到 slug 延续。

## 失败类与同类排查

- **失败类**：同一领域对象（成品身份）在两个模块各写一份派生规则（`BUG-347` 的 TS/JS 双份问题的 host 侧镜像）。
- **同类排查**：`presentedFromLegacyCatalog` 用 `entry.slug`（= meta slug），与上面两处写入口径又不同；三处写入应当统一到 `deliverableSlug`。`tests/host/ledger/*` 现有用例的 fixture 中 meta 无自定义 slug，因此全绿。

## 修复方案与范围

- **根因修法**：slug 派生收成一处——`setPresentedAudit` 与 `presentedFromEvent` 读同一份 `meta.md`（经 `readCompanyFile`）取 `deliverableSlug`，读不到才退回 `slugFromDirName`；`presentedFromLegacyCatalog` 保持 `entry.slug`。
- **兼容**：对历史账本（只有目录名 slug）在 `presentedOf` 里退一步也比对目录名 slug，或在 `ensurePresentedLedger` 迁移时补写两个键，二选一须在卡内裁决后写进实现。

## 已修判定

- 自定义 `slug:` 的成品在 present 之后归档，`scanCatalogEntries` 仍给 `presented: true`；
- 只有目录名 slug 的历史账本（升级前写入）也不丢背书（迁移或回退查询至少一条生效）；
- `tests/host/ledger/` 增加「meta 自定义 slug + 归档」用例，旧实现红、新实现绿。

## 修复证据

- 改动面：`packages/company-pack/src/host/ledger/presented-ledger.ts`、`tests/host/ledger/catalog.spec.ts`
- 红：`pnpm test tests/host/ledger/catalog.spec.ts` —— 还原 `slugFromDirName` 前 1 failed（自定义 slug 归档后 `presented: null`）
- 绿：`pnpm test tests/host/ledger/catalog.spec.ts` —— 37/37 passed（present 写 `custom-name`；归档后仍 true；目录名 slug 旧账本回退也 true）
- 提交：commit 07f90eb3
