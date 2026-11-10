// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 3b. 交付产物新鲜度（dist-freshness，2026-10-27 立，六维提分 D4）───────────────
// 为什么：2026-10-27 收口时 `_dist` 三处不一致——tarball 0.3.14（20:30 生成）、
//   `release-manifest.json` 记 0.3.10、`package.json` 0.3.14，`pnpm release --check` 直接红；
//   而 verify 全绿（没有任何门禁看交付面）。这类「交付物与版本记录漂移」正是 D4 的腐化形态。
// 规则：`_dist/release-manifest.json` 在场时校验（版本 == package、artifact sha 与 tgz 一致、
//   manual sha 一致）；**不在场 → SKIP**（`_dist` 整树 gitignored，CI/fresh clone 常态）。
// 边界：证明「记录与产物自洽」+「产物包含源码声明的全部 patch」（2026-11-10 补：stale tarball
//   自身 10 条 patch 全在，但比源码少 quality-loop 两档——只看产物内部会假绿，必须 source→artifact）；
//   不证明产物由最新源码重打（全量源码指纹归 `release --check`）。
// 负例留证 2026-10-27：把 manifest 的 version 临时改回 0.3.10 → 红（见下方 fail 文案）；删 manifest → SKIP。
// 负例留证 2026-11-10：`_dist/0.9.0.tgz` 与源码 12 条 patch 对照 → 红（缺 quality-loop-producer/verifier）。
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
    // 2026-11-10：stale tarball 自身自洽（10 条 patch 对应 9 个文件都在），
    // 但与源码 12 条不一致。必须 source→artifact 对照，不能 artifact→artifact。
    try {
      const sourcePatch = JSON.parse(readFileSync(join(root, 'packages/company-pack/package.json'), 'utf8'))?.dsh?.bundle?.patch
      const artifactManifest = JSON.parse(execFileSync('tar', ['-xzOf', tgzPath, 'package/package.json'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }))
      const artifactPatch = artifactManifest?.dsh?.bundle?.patch ?? []
      if (!Array.isArray(sourcePatch)) {
        problems.push('源码 package.json 缺 dsh.bundle.patch 数组')
      } else {
        if (JSON.stringify(sourcePatch) !== JSON.stringify(artifactPatch)) {
          problems.push(`tarball 的 dsh.bundle.patch 与源码不一致（源码 ${String(sourcePatch.length)} 条 / 产物 ${String(artifactPatch.length)} 条）——重跑 release --prepare`)
        }
        const entries = new Set(execFileSync('tar', ['-tzf', tgzPath], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\n'))
        const missing = sourcePatch.filter(rel => !entries.has(`package/${rel.replace(/^\.\//, '')}`))
        if (missing.length > 0) problems.push(`tarball 缺源码声明的 patch：${missing.join('、')}`)
      }
    } catch (error) {
      problems.push(`tarball 的 patch 清单不可核（${String(error?.message ?? error)}）`)
    }
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
    ? ok(`dist-freshness（${packVersion}；tarball/manual sha 与 manifest 一致；可发布性看 release --check）`)
    : fail('dist-freshness', problems.join('；'))
}
