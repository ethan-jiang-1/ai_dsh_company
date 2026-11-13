// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// ── 3a. 资产命名契约（naming-contract，2026-11-13 立；卡 = _backlog/issues/2026-11-13-test-asset-naming-contract.md）
// 为什么：文件名是资产的**类型声明**。名字撒谎的代价不是审美——agent 按名字选错检查、人找错层、
// census 把 fixture 当资产（2026-11-13 审计：refactor-drift-oracle 住 smoke、fast.mjs 像资产、
// quality-loop-audit 住 probes、3 个 -walkthrough/-scenarios/-e2e 逃过 script-triggers、
// read-barrier/index 被当第 69 个探针）。
// 判据（窄、机械）：
//   ① checks/smoke/ 根文件 = *-smoke.mjs（资产）或 *-lane.mjs（runner）；
//   ② probes/** = *-probe.mjs；仅 probes/<域>/<fixture>/index.mjs 允许作模块入口；
//   ③ checks/audit/ = *-(audit|check|eval|ratchet).mjs；
//   ④ **资产面**（smoke/audit/probe/gate）的文件名 token（按 -_. 切）不得含禁用词：
//      golden/util/misc/helper/common/tmp/temp/new/old/copy/backup。
//      不扫 tests/support/docs——那里的 copy（文案）/temp（临时环境）是准确用词，不是资产类型。
// 负例留证 2026-11-13（造红→还原→绿）：
//   ① checks/smoke/foo-oracle.mjs → `FAIL naming-contract: … 期望 -smoke.mjs 或 -lane.mjs`；
//   ② probes/bar-e2e.mjs → `FAIL naming-contract: … 期望 -probe.mjs`；
//   ③ checks/smoke/golden-thing-smoke.mjs → `FAIL naming-contract: … 含禁用词 golden`。
const BANNED = new Set(['golden', 'util', 'misc', 'helper', 'common', 'tmp', 'temp', 'new', 'old', 'copy', 'backup'])

const walk = (dir, acc = []) => {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, acc)
    else if (/\.(mjs|ts|tsx|json|md)$/.test(entry.name)) acc.push(path)
  }
  return acc
}

export function run({ ok, fail }) {
  const problems = []
  const failWith = (path, detail) => problems.push(`${relative(root, path)} → ${detail}`)

  const smokeDir = join(root, 'checks/smoke')
  for (const entry of readdirSync(smokeDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue
    if (!/-(smoke|lane)\.mjs$/.test(entry.name)) {
      failWith(join(smokeDir, entry.name), '期望 -smoke.mjs（资产）或 -lane.mjs（runner）')
    }
  }

  const auditDir = join(root, 'checks/audit')
  for (const entry of readdirSync(auditDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue
    if (!/-(audit|check|eval|ratchet)\.mjs$/.test(entry.name)) {
      failWith(join(auditDir, entry.name), '期望 -(audit|check|eval|ratchet).mjs')
    }
  }

  const probesDir = join(root, 'probes')
  for (const path of walk(probesDir)) {
    if (!path.endsWith('.mjs')) continue
    const rel = relative(probesDir, path).split('/')
    if (rel[rel.length - 1] === 'index.mjs' && rel.length >= 3) continue // probes/<域>/<fixture>/index.mjs
    if (!path.endsWith('-probe.mjs')) failWith(path, '期望 -probe.mjs（fixture 入口只允许 <域>/<fixture>/index.mjs）')
  }

  const assetPaths = [
    ...readdirSync(smokeDir, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith('.mjs')).map(entry => join(smokeDir, entry.name)),
    ...readdirSync(auditDir, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith('.mjs')).map(entry => join(auditDir, entry.name)),
    ...walk(probesDir).filter(path => path.endsWith('.mjs')),
    ...walk(join(root, 'checks/gates')).filter(path => path.endsWith('.mjs')),
  ]
  for (const path of assetPaths) {
    const base = path.split('/').pop() ?? ''
    const tokens = base.replace(/\.mjs$/, '').split(/[-_.]+/).map(token => token.toLowerCase())
    const hit = tokens.find(token => BANNED.has(token))
    if (hit) failWith(path, `文件名含禁用词 ${hit}（改用准确的词，如 expected）`)
  }

  problems.length === 0
    ? ok('naming-contract（smoke/lane、probe、audit 后缀 + 禁词表）')
    : fail('naming-contract', `资产名与类型不符（文件名 = 类型声明）：${problems.slice(0, 6).join('；')}${problems.length > 6 ? `；…共 ${String(problems.length)} 处` : ''}`)
}
