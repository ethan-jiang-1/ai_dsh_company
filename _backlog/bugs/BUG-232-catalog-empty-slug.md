---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-232：meta.md 的空 slug 被当成 `''`，不回退目录名、不告警

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-10 / G4）。
> **留痕**：待修复者决定（只开卡，不修）。

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

修成什么算修好（建议，供修复者采用）：

1. `const raw = fields.get('slug')?.trim() ?? ''; const slug = raw === '' ? slugFromDirName(item.name) : raw`，并可加 warning（`slug 为空，按目录名`）。
2. 最小负例：`slug:` 空 → entry.slug == 目录名（或 warning 点名）；两件空 slug 不互相覆盖。
3. 正例：正常 `slug: alpha` 不变。
