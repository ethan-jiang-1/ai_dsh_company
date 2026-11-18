---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-231：catalog 静默跳过 deliverables 子目录 symlink，entries 少一条且 warnings 为空

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C14 低置信卡](../issues/2026-11-18-low-confidence-runtime-exploratory.md)（C14-9 / G4）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

[catalog.ts](../../packages/company-pack/src/host/ledger/catalog.ts) 的 `scanEntries`：

```ts
for (const item of children) {
  if (!item.isDirectory()) continue   // ← symlink 到目录的 Dirent.isDirectory() = false
  ...
}
```

一个 deliverables 子目录如果是 **symlink**，它既不会进 catalog，也不会产生 warning。根目录 symlink、final/meta symlink 都有 warning（`plainFileProblem`），唯独「成品目录本身是 symlink」被静默过滤。

## 复现

```sh
cat > runtime/tmp/c14-catalog.test.mjs <<'EOF'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { regenerateCatalog } from '../../packages/company-pack/src/host/ledger/catalog.ts'
const home = mkdtempSync(join(tmpdir(), 'cat-'))
const root = join(home, '.dsh-company')
mkdirSync(join(root, 'deliverables', '2026-10-25-real'), { recursive: true })
writeFileSync(join(root, 'deliverables', '2026-10-25-real', 'meta.md'), 'slug: real\n')
writeFileSync(join(root, 'deliverables', '2026-10-25-real', 'final.md'), '# final\n')
mkdirSync(join(root, 'deliverables-archive'), { recursive: true })
symlinkSync(join(root, 'deliverables', '2026-10-25-real'), join(root, 'deliverables', '2026-10-25-linked'))
const result = regenerateCatalog(home)
console.log('entries', result.catalog?.entries.map(e => e.dir))
console.log('warnings', result.warnings)
EOF
pnpm exec tsx runtime/tmp/c14-catalog.test.mjs
```

实测 `entries ['2026-10-25-real']`、`warnings []`；`2026-10-25-linked` 静默消失。

## 根因与证据

- 根因：`item.isDirectory()` 不跟随 symlink（安全），但过滤后没有 `item.isSymbolicLink()` 分支；warnings 契约只覆盖根/final/meta，漏子目录。
- 证据：上脚本；`catalog.ts` 的 `scanEntries`；`plainFileProblem` 对 final/meta 的 symlink warning。
- 影响：「成品目录」被 symlink 到别处时，catalog 不给任何提示，UI 少一条、presented 账本也对不上；与「数据诚实：不可达 ≠ 0」同族。

## 失败类与同类排查

**失败类 = 成品目录 / 派生视图**（坏形状静默）。

同类：BUG-232（空 slug）；BUG-096/108/122/125/132/135（成品目录坏形状，已修）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. `scanEntries` 对 `item.isSymbolicLink()` 产生 warning（`<path> 是 symlink，不跟随`），并按「无 final」处理；不要静默 skip。
2. 最小负例：symlink 子目录 → warnings 至少一条，点名路径；entries 不含不跟随项。
3. 正例：真实目录 + 真实 final 仍进 catalog。
