#!/usr/bin/env node
// 状态：常驻
// 何时跑：新增/移动 checks/smoke|audit、probes、tools 顶层公开入口后；`pnpm verify` 的 script-index
// 门禁报“生成物不一致”时。成本秒级 keyless（只读目录 + 写一个 Markdown）。
// 用法：node tools/checks-index.mjs --write   # 重新生成 checks/INDEX.generated.md
//       node tools/checks-index.mjs [--check] # 只校验（默认）
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderScriptInventory, scanPublicScripts } from './lib/checks-index.mjs'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'

const OUT = join(ROOT, 'checks/INDEX.generated.md')
const gateCount = readdirSync(join(ROOT, 'checks/gates'), { withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.mjs')).length
const expected = renderScriptInventory(scanPublicScripts(ROOT), { gateCount })

if (process.argv.includes('--write')) {
  writeFileSync(OUT, expected)
  console.log(`checks-index: 已生成 ${OUT}（${String(expected.split('\n').length - 1)} 行）`)
} else {
  const actual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null
  if (actual === expected) {
    console.log('checks-index: 生成物与目录一致')
  } else {
    console.error(`checks-index: ${actual === null ? '缺 ' + OUT : '生成物过期'}；运行 node tools/checks-index.mjs --write`)
    process.exit(1)
  }
}
