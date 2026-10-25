// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expectedTag } from './lib/pin.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// ── 6. pack 形状：dsh.bundle.patch 指向的文件存在 + 兼容矩阵覆盖钉住的 tag ──────
// 负例留证 2026-09-27：patch 指向不存在文件 → pack-bundle 红；矩阵滤掉当前 tag → pack-compat 红。
export const pack = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))
export function run({ root, ok, fail }) {
// 0.1.7 起 `dsh.bundle.patch` 可以是字符串或**数组**（registry + 每预设一个 patch 文件）。
const patchRel = pack?.dsh?.bundle?.patch
const patchRels = typeof patchRel === 'string' ? [patchRel] : Array.isArray(patchRel) ? patchRel : []
const badPatch = patchRels.filter(rel => typeof rel !== 'string' || !existsSync(join(root, 'packages/company-pack', rel)))
if (patchRels.length === 0 || badPatch.length > 0) fail('pack-bundle', `dsh.bundle.patch 缺失、为空或未指向真实文件：${JSON.stringify(badPatch)}`)
else ok(`pack-bundle ×${patchRels.length}`)
// 兼容矩阵（R5a 发布欠账，合同 = docs/release.md）：`dsh.compatibility.dshReleases` 必须包含当前
// 钉住的 vendor tag——升 pin 不加矩阵列 = 没验证过就装作验证过。升 pin 走
// tools/sync-dsh.mjs（它会同步加列），这条门禁保证忘加就红。
const compatReleases = pack?.dsh?.compatibility?.dshReleases
if (!Array.isArray(compatReleases) || !compatReleases.includes(expectedTag)) {
  fail('pack-compat', `dsh.compatibility.dshReleases 必须包含当前钉住的 ${expectedTag}（升 pin 走 tools/sync-dsh.mjs 并同步加列）`)
} else ok(`pack-compat (${expectedTag} ×${String(compatReleases.length)})`)

// 分发契约（2026-10-25，RFC distribution-lifecycle）：DSH 只读 engines.dsh（存在即忽略 peers），
// 所以兼容窗口必须有这一行；license/repository/private 是给收件人的身份，不是装饰。
// 矩阵仍是“已认证 tag 台账”，engines 是“当前可安装窗口”——两者语义不同，别混。
const semver = (() => {
  for (const base of ['../../vendor/dsh/packages/boot/app-boot/package.json', '../../vendor/dsh/package.json']) {
    try {
      const require = createRequire(new URL(base, import.meta.url))
      return require('semver')
    } catch { /* next base */ }
  }
  return null
})()
const engines = pack?.engines
const nodeRange = engines?.node
const dshRange = engines?.dsh
const pinVersion = expectedTag.replace(/^dsh-v/, '')
const enginesProblems = []
if (typeof nodeRange !== 'string' || nodeRange.trim() === '') enginesProblems.push('engines.node 缺失')
if (typeof dshRange !== 'string' || dshRange.trim() === '') enginesProblems.push('engines.dsh 缺失（DSH 只读这一行；没有它才看 peers）')
else if (semver === null) enginesProblems.push('semver 不可解析（vendor app-boot / vendor 根都找不到）')
else if (!semver.satisfies(pinVersion, dshRange, { includePrerelease: true })) {
  enginesProblems.push(`engines.dsh ${JSON.stringify(dshRange)} 不覆盖当前 pin ${pinVersion}`)
}
if (typeof pack?.license !== 'string' || pack.license.trim() === '') enginesProblems.push('license 缺失')
if (pack?.repository === undefined) enginesProblems.push('repository 缺失')
if (pack?.private !== true) enginesProblems.push('private 不是 true（未到 publish 时不应放开）')
enginesProblems.length === 0
  ? ok(`pack-engines（node ${nodeRange} / dsh ${dshRange} / ${pack.license} / private）`)
  : fail('pack-engines', enginesProblems.join('；'))
}
