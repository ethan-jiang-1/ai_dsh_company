#!/usr/bin/env node
// 状态：常驻
// 何时跑：改动 `packages/company-pack/{package.json,cordis.patch.yml,presets/**}` 后，或 `pnpm verify` 的 `script-index` 报目录过期时。
// 用法：pnpm gen:catalog -- --write   # 生成/刷新 docs/reference/package-catalog.generated.md
//       pnpm gen:catalog [--check]    # 只校验新鲜度（默认）
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { repositoryRoot as ROOT } from '../lib/core/repository-layout.mjs'
import { renderPackageCatalog, scanPackageCatalog } from '../lib/repo/package-catalog.mjs'

const OUT = join(ROOT, 'docs/reference/package-catalog.generated.md')
const expected = renderPackageCatalog(scanPackageCatalog(ROOT))

if (process.argv.includes('--write')) {
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, expected, 'utf8')
  console.log(`gen-catalog: 已生成 ${OUT}（${String(expected.split('\n').length - 1)} 行）`)
} else {
  const actual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null
  if (actual === expected) {
    console.log('gen-catalog: docs/reference/package-catalog.generated.md 与源码一致')
  } else {
    console.error(`gen-catalog: ${actual === null ? '缺 ' + OUT : '生成物过期'}；运行 pnpm gen:catalog -- --write`)
    process.exit(1)
  }
}
