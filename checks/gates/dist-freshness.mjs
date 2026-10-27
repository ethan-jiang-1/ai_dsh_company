// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 3b. 交付产物新鲜度（dist-freshness，2026-10-27 立，六维提分 D4）───────────────
// 为什么：2026-10-27 收口时 `_dist` 三处不一致——tarball 0.3.14（20:30 生成）、
//   `release-manifest.json` 记 0.3.10、`package.json` 0.3.14，`pnpm release --check` 直接红；
//   而 verify 全绿（没有任何门禁看交付面）。这类「交付物与版本记录漂移」正是 D4 的腐化形态。
// 规则：`_dist/release-manifest.json` 在场时校验（版本 == package、artifact sha 与 tgz 一致、
//   manual sha 一致）；**不在场 → SKIP**（`_dist` 整树 gitignored，CI/fresh clone 常态）。
// 边界：只证明「记录与产物自洽」，不证明产物包含最新源码（那要重建，归 release --prepare）。
// 负例留证 2026-10-27：把 manifest 的 version 临时改回 0.3.10 → 红（见下方 fail 文案）；删 manifest → SKIP。
export function run({ root, ok, fail, skip }) {
  const manifestPath = join(root, '_dist', 'release-manifest.json')
  if (!existsSync(manifestPath)) {
    skip('dist-freshness', '无 _dist/release-manifest.json（未做发布准备；CI/fresh clone 常态）')
    return
  }
  let manifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    fail('dist-freshness', `${manifestPath} 不可解析：${String(error?.message ?? error)}（特殊：手改坏了交付记录）`)
    return
  }
  const packVersion = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8')).version
  const problems = []
  if (manifest.version !== packVersion) {
    problems.push(`manifest 版本 ${String(manifest.version)} ≠ package ${String(packVersion)}（改了内容没 bump/没重跑 --prepare，或交付记录过期）`)
  }
  const artifact = manifest.artifact ?? {}
  const tgzName = typeof artifact.file === 'string' ? artifact.file : ''
  const tgzPath = join(root, '_dist', tgzName)
  if (tgzName === '' || !existsSync(tgzPath)) {
    problems.push(`manifest 指的 tarball 不在盘上：${tgzName === '' ? '(缺 artifact.file)' : tgzName}——重跑 release --prepare`)
  } else {
    const actual = createHash('sha256').update(readFileSync(tgzPath)).digest('hex')
    if (artifact.sha256 !== actual) problems.push(`${tgzName} 的 sha256 与 manifest 不一致（${String(artifact.sha256).slice(0, 8)}… vs ${actual.slice(0, 8)}…）——产物被替换或记录过期`)
  }
  const manualName = typeof artifact.manual === 'string' ? artifact.manual : ''
  if (manualName !== '' && typeof artifact.manualSha256 === 'string') {
    const manualPath = join(root, '_dist', manualName)
    if (!existsSync(manualPath)) problems.push(`manifest 指的手册不在盘上：${manualName}`)
    else {
      const actual = createHash('sha256').update(readFileSync(manualPath)).digest('hex')
      if (artifact.manualSha256 !== actual) problems.push(`${manualName} 的 sha256 与 manifest 不一致——手册与 tarball 不同代`)
    }
  }
  problems.length === 0
    ? ok(`dist-freshness（${packVersion}；tarball/manual sha 与 manifest 一致）`)
    : fail('dist-freshness', problems.join('；'))
}
