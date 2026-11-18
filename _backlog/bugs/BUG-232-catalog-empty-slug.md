---
status: 修复就绪
severity: P2
opened: 2026-11-18
---

# BUG-232：meta.md 的空 slug 被当成 `''`，不回退目录名、不告警

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：修复就绪｜修复：2026-11-18（进行中）｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-10 / G4）。
> **留痕**：批次 Note `notes/implemented/2026-11-18-shipped-shape-closure-and-low-confidence-runtime.md`（本批共用）。

## 症状

[catalog.ts](../../packages/company-pack/src/host/ledger/catalog.ts)：

```ts
const slug = fields.get('slug') ?? slugFromDirName(item.name)
```

`parseMeta` 对 `slug:` 空值返回 `''`（不是 undefined），所以 `??` 不回退；catalog entry 的 slug 变成空串，且没有 warning。多个空 slug 的成品会在目录/账本层互相撞。

## 复现

```sh
cat > runtime/tmp/c14-catalog2.test.mjs <<'EOF'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { regenerateCatalog } from '../../packages/company-pack/src/host/ledger/catalog.ts'
const home = mkdtempSync(join(tmpdir(), 'cat-'))
const root = join(home, '.dsh-company')
mkdirSync(join(root, 'deliverables', '2026-10-25-empty'), { recursive: true })
writeFileSync(join(root, 'deliverables', '2026-10-25-empty', 'meta.md'), '---\nslug:\n---\n')
writeFileSync(join(root, 'deliverables', '2026-10-25-empty', 'final.md'), '# final\n')
const result = regenerateCatalog(home)
console.log('entries', result.catalog?.entries.map(e => ({ dir: e.dir, slug: e.slug })))
console.log('warnings', result.warnings)
EOF
pnpm exec tsx runtime/tmp/c14-catalog2.test.mjs
```

实测 `entries [{ dir: '2026-10-25-empty', slug: '' }]`、`warnings []`。

## 根因与证据

- 根因：`fields.get('slug') ?? ...` 只处理 undefined；空字符串/空白没有「视为缺省」的归一。`parseMeta` 用 trim 后的值，空行就是 `''`。
- 证据：上脚本；`catalog.ts` 的 `scanEntries`；`parseMeta` 首现优先。
- 影响：模型可写的 `meta.md` 可以造出空 slug 成品；catalog/`presentedOf` 的 slug 键变成空串，UI/账本出现无 slug 条目。与「slug: 空值 = 未声明」的模板语义不一致。

## 失败类与同类排查

**失败类 = 成品目录 / 派生视图**（空值当已声明）。

同类：BUG-231（symlink 静默）；`numbering:` 空值在 PRD 闸门的同族（BUG-154）。

## 已修判定

修成什么算修好：

1. `slug:` 空/空白视为未声明：回退 `slugFromDirName`，并产生 warning；`buildDeliverablesCatalog` 用同一 `deliverableSlug` 判据。
2. 最小负例：`slug:` 空 → entry.slug == 目录名、warnings 含「slug 为空」；两个空 slug 不互相覆盖。
3. 正例：`slug: alpha` 不变。
