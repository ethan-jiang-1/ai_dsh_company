#!/usr/bin/env node
// 状态：常驻
// 何时跑：npm pack / npm publish 前自动（prepack）；也可手动 `node packages/company-pack/scripts/prepack-check.mjs`。
//
// 为什么：lib/ 是 gitignored 的构建产物；clean clone 上直接 `npm pack` 会静默跳过 files 里的
// lib/index.js 与 lib/client.js，产出“能装但 import 不了”的空壳。发布路径（export-dist / release）
// 会先 build，但手工 pack 没有这道保护——prepack 让缺产物变成 fail-loud。
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packDir = dirname(dirname(fileURLToPath(import.meta.url)))
const required = ['lib/index.js', 'lib/client.js']
const missing = required.filter((rel) => !existsSync(join(packDir, rel)))

if (missing.length > 0) {
  console.error(`pack: 缺 ${missing.join(' / ')}——先跑 \`pnpm setup\`（lib/ 是 gitignored 构建产物；没有它 npm pack 会打出不可安装的空包）`)
  process.exit(1)
}
