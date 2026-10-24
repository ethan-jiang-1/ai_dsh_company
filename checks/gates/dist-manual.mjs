// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expectedTag } from './lib/pin.mjs'

// ── 2g. 手动分发手册版本 + 安装形状门禁（2026-09-28 立；2026-10-24 扩内容）────
// 负例留证 2026-09-28：手改手册表头版本 → dist-manual 红，跑 export-dist 还原 → 绿。
// 负例留证 2026-10-24：从手册删掉「run bundle」/「bundle.json」/「company-workspace」关键句 → 红；
//   重跑 export-dist → 绿。为什么扩：0.2.0 的手册表头版本没漂，但内容还是 2026-10-05 的
//   “139 条目、无 workspace”——只比版本号抓不到分发件已经教人装错东西。
// 解法：版本 bump 必须同 diff 重跑 `node tools/export-dist.mjs`（手册由脚本生成、永不手改）；
//   手册必须写清 run bundle 的安装/身份/干净判据。
export function run({ root, ok, fail }) {
  const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
  const manualPath = join(root, '_dist', '安装手册.md')
  if (!existsSync(manualPath)) {
    fail('dist-manual', '_dist/安装手册.md 缺失——跑 `node tools/export-dist.mjs` 生成（tracked 生成物，随版本变更同 diff 重导）')
    return
  }
  const manual = readFileSync(manualPath, 'utf8')
  const header = manual.split('| 版本 |')[1]?.split('|')[0]?.trim()
  const problems = []
  if (header !== packVersion) {
    problems.push(`表头版本（${header ?? '解析不到'}）≠ pack package.json（${packVersion}）——重跑 \`node tools/export-dist.mjs\` 再提交，别手改手册`)
  }
  const required = ['run bundle', 'bundle.json', 'company-workspace', 'workspace/']
  const missing = required.filter(phrase => !manual.includes(phrase))
  if (missing.length > 0) problems.push(`手册缺安装形状关键句：${missing.join(' / ')}（run bundle / bundle.json / workspace 骨架）`)
  if (!manual.includes(expectedTag)) problems.push(`手册缺验证基线 \`${expectedTag}\`（pin 漂了或没重导）`)
  problems.length === 0
    ? ok(`dist-manual（版本 ${packVersion} + run bundle 安装形状 + pin ${expectedTag}）`)
    : fail('dist-manual', problems.join('；'))
}
