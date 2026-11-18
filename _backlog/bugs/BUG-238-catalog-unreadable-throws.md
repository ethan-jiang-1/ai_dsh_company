---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-238：catalog 对不可读 meta.md / motion-ledger.md 直接抛 EACCES，不转 warning

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-6 / H5）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`scanEntries` 对 `meta.md` 先 `plainFileProblem`（路径安全/普通文件），再直接 `readFileSync`：

```ts
const body = metaIsFile ? readFileSync(metaPath, 'utf8') : ''
```

`plainFileProblem` 不查可读性；`meta.md` 权限 000 时 `readFileSync` 抛 EACCES，`regenerateCatalog` 整个崩，不产生 warning。`kb/motion-ledger.md` 同理（`ledgerIsFile ? readFileSync(...)`）。

## 复现

```sh
cat > runtime/tmp/c15-catalog-perm.test.mjs <<'EOF'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { regenerateCatalog } from '../../packages/company-pack/src/host/ledger/catalog.ts'
const home = mkdtempSync(join(tmpdir(), 'cat-'))
const root = join(home, '.dsh-company')
const dir = join(root, 'deliverables', '2026-10-25-locked')
mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'meta.md'), 'slug: locked\n'); writeFileSync(join(dir, 'final.md'), '# f\n')
mkdirSync(join(root, 'deliverables-archive'), { recursive: true })
chmodSync(join(dir, 'meta.md'), 0o000)
try { console.log(regenerateCatalog(home)) } catch (e) { console.log('THREW', e.code, e.message) }
EOF
pnpm exec tsx runtime/tmp/c15-catalog-perm.test.mjs
```

实测 `THREW EACCES ... meta.md`。ledger 版本同样抛。

## 根因与证据

- 根因：`plainFileProblem` 只回答「存在/安全/普通文件」，不回答「可读」；读取点没有 try/catch 到 warnings。契约是「坏形状给 warning，不静默/不崩」，这里两者都没做到。
- 证据：上脚本；[catalog.ts](../../packages/company-pack/src/host/ledger/catalog.ts) 的 `scanEntries` 与 ledger 读取；`permissions-recovery` 场景说明权限错误是预期形状。
- 影响：只读 workspace / 文件权限修复期间，boot 的 catalog 初始化可能整体抛，而不是降级成「无 meta/空账本 + warning」。

## 失败类与同类排查

**失败类 = 成品目录 / 坏形状**（不可读未入判据）。

同类：BUG-239（final 不可读静默）；`regenerateCatalog` 的 `readdirSync` 已有 try/catch。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. meta/ledger 读取用 try/catch → warning + 按无 meta/空账本处理；退出不再抛。
2. 最小负例：chmod 000 meta.md / ledger → `written` 合理 + warnings 点名路径；不抛。
3. 正例：正常运行结果不变。
