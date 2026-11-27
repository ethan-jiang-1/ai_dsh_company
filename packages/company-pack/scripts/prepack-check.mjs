#!/usr/bin/env node
// 状态：常驻
// 何时跑：npm pack / npm publish 前自动（prepack / prepublishOnly）；也可手动 `node packages/company-pack/scripts/prepack-check.mjs`。
//
// 为什么：
// ① lib/ 是 gitignored 的构建产物；clean clone 上直接 `npm pack` 会静默跳过 files 里的入口，产出空壳；
// ② 源目录 `npm publish` 会把 dev 元数据（scripts/devDependencies/workspace:*）直接发往 registry——
//    正式发布必须对 `pnpm release --prepare` 清洗后的 `_dist/dsh-company-pack-<ver>.tgz` 执行。
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (
  (process.argv.includes('--publish') || process.env.npm_command === 'publish')
  && process.env.DSH_SANITIZED_PUBLISH !== '1'
) {
  console.error('pack: 禁止在源码包目录直接 `npm publish`（源 manifest 含 workspace:* devDependencies 与 scripts）。')
  console.error('      请先跑 `pnpm release --prepare` 生成清洗后的 `_dist/dsh-company-pack-<version>.tgz`，再对 tarball 发布（确需人工放行设 DSH_SANITIZED_PUBLISH=1）。')
  process.exit(1)
}

const packDir = dirname(dirname(fileURLToPath(import.meta.url)))
const required = [
  'lib/index.js',
  'lib/client.js',
  'lib/types/index.d.ts',
  'lib/types/client/index.d.ts',
  'lib/types/host/cultivation/cultivation.d.ts',
]
const missing = required.filter((rel) => !existsSync(join(packDir, rel)))

if (missing.length > 0) {
  console.error(`pack: 缺 ${missing.join(' / ')}——先跑 \`pnpm setup\`（lib/ 是 gitignored 构建产物；没有它 npm pack 会打出不可安装的空包）`)
  process.exit(1)
}
