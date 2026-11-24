---
status: 已修
severity: P2
opened: 2026-11-24
---

# BUG-383：先 present 后审计为 false，归档后又被 slug 延续成 true——操作员的「未交付」结论被旧背书覆盖

> 严重级别：P2（审计结论被反转为假：`setPresentedAudit(true)` 会写 `paths[rel]=true` 与 `slugs[slug]=true`；随后同一条 `setPresentedAudit(false)` 只写 `paths[rel]=false`，**不清理** `slugs[slug]`。同一路径上 false 优先（正确），但成品归档是高动议生命周期的正常动作——路径一变，查询落到 `slugs[slug]===true`，于是操作员刚做的「未 present」判定被归档前的旧 true 覆盖，面板显示「已交付」）｜发现：2026-11-24｜状态：已修｜审查：agent — 逐条核对已修判定（true→false→归档仍 false，同 slug 新件不继承）
>
> **留痕**：Note [2026-11-24-degrade-and-structure-batch](../../../notes/implemented/2026-11-24-degrade-and-structure-batch.md)（批次 377..383：false 随目录延续）

## 症状

1. `present` 或 `/deliverables audit … true` → 账本 `paths[rel]=true`、`slugs[slug]=true`；
2. 操作员复核后执行 `/deliverables audit … false` → `paths[rel]=false`，`slugs[slug]` **仍是 true**；
3. 收敛/手工把交付物移进 `deliverables-archive/`（路径变化）→ [`presentedOf`](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L149-L153) 先查新 path（无记录）再查 slug → 返回 `true`；
4. 成品面板对这条已明确判定「未交付」的成品显示「已交付」，且「未 present」筛选器再也列不出它。

## 运行面

- **面 = host**：[`presented-ledger.ts`](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L210-L248)（`setPresentedAudit`）、[第 148-153 行](../../../packages/company-pack/src/host/ledger/presented-ledger.ts#L148-L153)（`presentedOf`）。

## 复现

```sh
pnpm exec tsx -e "
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os'; import { join } from 'node:path';
import { setPresentedAudit, presentedOf } from './packages/company-pack/src/host/ledger/presented-ledger.ts';
const ws = mkdtempSync(join(tmpdir(), 'pres-'));
const dir = join(ws, '.dsh-company', 'deliverables', '2026-11-20-foo');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'meta.md'), 'slug: foo\nkickoff: 2026-11-20\ntype: decision\nresult: accepted\n');
writeFileSync(join(dir, 'final.md'), 'body\n');
const rel = '.dsh-company/deliverables/2026-11-20-foo/final.md';
setPresentedAudit(ws, rel, true);
const after = setPresentedAudit(ws, rel, false).ledger;
console.log('same path   =', presentedOf(after, rel, 'foo'));
console.log('slug map    =', JSON.stringify(after.slugs));
console.log('archived    =', presentedOf(after, '.dsh-company/deliverables-archive/2026-11-20-foo/final.md', 'foo'));
rmSync(ws, { recursive: true, force: true });
"
```

实测 `same path = false`、`slug map = {"foo":true}`、`archived = true`。

## 根因与证据

1. `setPresentedAudit` 的 false 分支只写 `paths`，没有把同 slug 的 `slugs[slug]` 撤回；而 true 分支的语义是「present 过就是背书」，两者叠加后无法表达「后来被否决」。
2. `presentedOf` 的优先级是「精确 path 优先，然后是 slug 延续」——对**归档后的同一成品**，唯一能表达结论的键就是 slug，于是旧 true 胜出。
3. 设计注释只推演了「同 slug 的新交付物不能继承旧 false」，没有推演反方向（旧 true 污染新结论）。

## 失败类与同类排查

- **失败类**：单向合并的账本（只写 true、不清 slug）遇到「结论反转 + 路径迁移」（`BUG-357` 的同族，落点是 false 分支）。
- **同类排查**：`presentedFromLegacyCatalog` 迁移时对 false 只写 path（同一口径）；`mergePresented` 只写 true（设计如此）；`presentedOf` 的 path 优先逻辑本身正确。

## 修复方案与范围

- **根因修法**：`setPresentedAudit(false)` 同时删除 `slugs[slug]`（并可选写一条 `slugs[slug]=false` 表示「该 slug 已被否决」，让 `presentedOf` 的 slug 分支能返回 false 而不是 null）；迁移/兼容路径需说明旧账本里已有的 true 如何处理（建议 `presentedOf` 支持 slug 的显式 false）。

## 已修判定

- 上述复现里 `archived` 为 `false`（或 `null` 并按口径说明）；
- 新的「false 后归档」用例与既有「true 延续」用例同时绿（两种语义各自成立）；
- `tests/host/ledger/` 补一条「true → false → 归档」序列的用例（旧实现红、新实现绿）。

## 修复证据

- 改动面：`packages/company-pack/src/host/ledger/presented-ledger.ts`、`tests/host/ledger/catalog.spec.ts`
- 红：`pnpm test tests/host/ledger/catalog.spec.ts` —— 还原 dirVeto 前 1 failed（归档后被旧 true 覆盖）
- 绿：`pnpm test tests/host/ledger/catalog.spec.ts` —— 43/43 passed（true→false→归档 false；同 slug 新件仍 null）
- 提交：commit b5a3ea4b
- 复审说明：卡里建议的 `slugs[slug]=false` 会破坏「同 slug 新件不继承旧 false」的既有契约，改用 `dirVeto`（目录名在 live→archive 稳定）
