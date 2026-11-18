---
status: 调查中
severity: P2
opened: 2026-11-18
---

# BUG-239：catalog 把不可读 final.md 仍算 present，warnings 为空

> 严重级别：P2（次要）｜发现：2026-11-18｜状态：调查中｜审查：—
>
> **关联**：[C15 卡](../issues/2026-11-18-guard-closure-and-unreadable-inputs.md)（C15-7 / H5）。
> **留痕**：待修复者决定（只开卡，不修）。

## 症状

`scanEntries` 对 `final.md` 只做 `plainFileProblem`（路径安全/普通文件），不读内容；权限 000 的 `final.md` 仍被算成 `final:true`，catalog entry 进目录，warnings 为空。`final` 是「可展示的成品」的存在标记，不是「路径存在」标记；不可读的成品会让 `/deliverables` 或导出在读 final 时失败，而 catalog 说一切正常。

## 复现

```sh
cat > runtime/tmp/c15-final-perm.test.mjs <<'EOF'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { regenerateCatalog } from '../../packages/company-pack/src/host/ledger/catalog.ts'
const home = mkdtempSync(join(tmpdir(), 'cat-'))
const root = join(home, '.dsh-company')
const dir = join(root, 'deliverables', '2026-10-25-a')
mkdirSync(dir, { recursive: true }); writeFileSync(join(dir, 'meta.md'), 'slug: a\n'); writeFileSync(join(dir, 'final.md'), '# f\n')
mkdirSync(join(root, 'deliverables-archive'), { recursive: true })
chmodSync(join(dir, 'final.md'), 0o000)
const r = regenerateCatalog(home)
console.log('entries', r.catalog?.entries.map(e => e.dir), 'warnings', r.warnings)
EOF
pnpm exec tsx runtime/tmp/c15-final-perm.test.mjs
```

实测 `entries [ '2026-10-25-a' ]`、`warnings []`。

## 根因与证据

- 根因：`final` 只由 `plainFileProblem(companyHome, finalPath) === null` 决定；没有可读性/非空判据，也没有 warning 分支。
- 证据：上脚本；[catalog.ts](../../packages/company-pack/src/host/ledger/catalog.ts) 的 `finalProblem` 逻辑。
- 影响：权限坏形状被当成正常成品；与「数据诚实」和 BUG-231/232 同族。

## 失败类与同类排查

**失败类 = 成品目录 / 坏形状**（可读性未入判据）。

同类：BUG-238（meta/ledger 不可读抛）；BUG-096/108/122（历史坏形状）。

## 已修判定

修成什么算修好（建议，供修复者采用）：

1. final 至少 `accessSync(R_OK)` 或读首字节；不可读 → warning + `final:false`（或 `unreadable` 状态）。
2. 最小负例：chmod 000 final.md → entry 不进/标不可读 + warning；不静默 present。
3. 正例：正常 final 仍 present。
