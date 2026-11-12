#!/usr/bin/env node
// 状态：常驻
// 何时跑：需要交付 tarball 给仓库外的人时（版本号变动后、给无仓库权限者、风险变更前快照）；无 key，构建+打包秒级。
// 用法：node tools/export-dist.mjs
//
// 手动分发导出（精神借 ai_dsh_architect 的 export-dist，2026-09-28）：把 company-pack 打成
// _dist/ 下的 tarball + 同目录生成《安装手册》。三条规矩照搬：
//   ① _dist/ 是导出目的地不是源——tgz 全 gitignore，手册是唯一 tracked 例外（版本门禁防漂）；
//   ② 打包前先 tsc -b + tsdown（lib/ 是 gitignored；不 build 会打出旧产物）；打包步 = release-smoke 同一条 `npm pack`（npm cache 钉 scratch，不碰 ~/.npm），
//      导出后对产物本体再跑一遍清单边界断言（必备条目在场、无 package/ 外文件）；
//   ③ 手册由脚本生成、注入版本与日期，永不手改——手册和旁边的 tarball 不可能漂。
// 导出 ≠ 发布：不 bump 版本、不跑门禁（除清单）、不发布任何 registry——按工作树现状打包。
import { repositoryRoot as repoRoot } from './lib/repository-layout.mjs'
import { renderInstallManual } from './lib/install-manual.mjs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const packDir = join(repoRoot, 'packages', 'company-pack')
const distDir = join(repoRoot, '_dist')
const manualName = '安装手册.md'

const failed = []
let stagingDir
const report = (name, ok, detail) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
  if (!ok) failed.push(name)
}

try {
  const pkg = JSON.parse(readFileSync(join(packDir, 'package.json'), 'utf8'))
  const version = pkg.version
  const tarballName = `dsh-company-pack-${version}.tgz`
  // 验证基线的事实家 = checks/gates/lib/pin.mjs（2026-10-14 拆分轮自 run-gates.mjs §0 迁出）；先核对输入，再替换已有导出。
  const pinText = readFileSync(join(repoRoot, 'checks', 'gates', 'lib', 'pin.mjs'), 'utf8')
  const expectedTag = /const expectedTag = '([^']+)'/.exec(pinText)?.[1]
  if (!expectedTag) throw new Error('pin.mjs 缺 expectedTag；未替换已有导出')


  // 0. 产物必须由当前源码构建：lib/ 整目录 gitignored，直接 npm pack 会静默打旧代码。
  //    tsc -b 是 solution root 的 build 模式；tsdown 再产出 lib/index.js + lib/client.js。
  const tsc = spawnSync(process.execPath, [join(repoRoot, 'node_modules/typescript/bin/tsc'), '-b', 'packages/company-pack'], {
    cwd: repoRoot, encoding: 'utf8', timeout: 180_000,
  })
  report('build (tsc -b)', tsc.status === 0, (tsc.status === 0 ? '' : `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')))
  if (tsc.status !== 0) throw new Error('tsc -b 失败；保留旧的 _dist 不替换')
  const require = createRequire(join(repoRoot, 'package.json'))
  const tsdown = join(dirname(require.resolve('tsdown/package.json')), 'dist/run.mjs')
  const bundled = spawnSync(process.execPath, [tsdown], { cwd: packDir, encoding: 'utf8', timeout: 180_000 })
  report('bundle (tsdown)', bundled.status === 0, (bundled.status === 0 ? '' : `${bundled.stdout ?? ''}${bundled.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')))
  if (bundled.status !== 0) throw new Error('tsdown 失败；保留旧的 _dist 不替换')

  // 1. 打包到 staging：旧 _dist 直到新产物完整校验通过才动（BUG-100）。
  //    先删后建会让 npm pack/清单/sha/手册任一步失败都丢掉上一份可用导出。
  mkdirSync(distDir, { recursive: true })
  const staging = mkdtempSync(join(distDir, '.staging-'))
  stagingDir = staging
  // 与 release-smoke 同一条 `npm pack`，cache 钉 scratch（§11：npm 不碰 ~/.npm）
  const scratch = mkdtempSync(join(tmpdir(), 'dsh-export-dist-'))
  const packed = spawnSync('npm', ['pack', '--pack-destination', staging, '--cache', join(scratch, 'npm-cache')], { cwd: packDir, encoding: 'utf8' })
  rmSync(scratch, { recursive: true, force: true })
  const packedName = (packed.stdout ?? '').trim().split('\n').filter(Boolean).pop()
  if (packed.status !== 0 || packedName !== tarballName) {
    report('npm pack', false,
      `exit ${packed.status}, ${packedName ?? 'no tarball'}${(packed.stderr ?? '').trim() ? `: ${packed.stderr.trim().split('\n')[0]}` : ''}`)
    throw new Error(`npm pack 失败；旧 _dist 未动（staging 清理）`)
  }
  report('npm pack', true, tarballName)

  // 2. 清单边界——对 staging 里的产物本体再断言一次发布形状
  const stagedTarball = join(staging, tarballName)
  const listed = spawnSync('tar', ['-tzf', stagedTarball], { encoding: 'utf8' })
  const entries = (listed.stdout ?? '').split('\n').filter(Boolean)
  const must = ['package/cordis.patch.yml', 'package/package.json', 'package/lib/index.js', 'package/lib/client.js',
    'package/content/AGENTS.md', 'package/content/wiki-template/index.md', 'package/content/wiki-template/AGENTS.md', 'package/presets/_shared/wiki/skills/consulting-the-knowledge-map/SKILL.md', 'package/content/templates/meta.md', 'package/content/charters/ceo.md',
    'package/content/state/org.md', 'package/locale/en.json', 'package/locale/zh.json', 'package/icon.svg']
  const missing = must.filter((entry) => !entries.includes(entry))
  const presetFiles = entries.filter((entry) => entry.startsWith('package/presets/')).length
  const outside = entries.filter((entry) => !entry.startsWith('package/'))
  // run bundle 不进包（2026-10-24）：扩张数据/凭据/会话一律不许出现在 tarball。
  const forbidden = entries.filter((entry) => /^package\/(bin|workspace|company-workspace|sessions|deliverables|cultivation|profiles)\//.test(entry)
    || /credentials/.test(entry))
  // 发布面只留 runtime 两半 + 声明（2026-10-26）：tsc 的中间 .js/.map/.tsbuildinfo 不进包。
  const buildLeak = entries.filter((entry) => /^package\/lib\/(?:tsconfig\..*\.tsbuildinfo|.*\.map)$/.test(entry)
    || /^package\/lib\/types\/.*\.js$/.test(entry))
  const inventoryOk = listed.status === 0 && missing.length === 0 && outside.length === 0 && presetFiles > 0 && forbidden.length === 0 && buildLeak.length === 0
  report('tarball inventory', inventoryOk,
    missing.length ? `missing: ${missing.join(', ')}` : `${entries.length} entries, presets ×${presetFiles}${outside.length ? `, outside package/: ${outside.join(', ')}` : ''}${forbidden.length ? `, forbidden: ${forbidden.slice(0, 3).join(', ')}` : ''}${buildLeak.length ? `, build leak: ${buildLeak.slice(0, 3).join(', ')}` : ''}`)
  if (!inventoryOk) throw new Error('tarball 清单不合发布形状；旧 _dist 未动')

  // 2b. 产物身份（2026-10-25，RFC distribution-lifecycle）：tgz 的 sha256 是收件人唯一的
  // 字节级凭证；手册与旁文件必须同源，不靠“下载后看起来一样”。
  const digest = createHash('sha256').update(readFileSync(stagedTarball)).digest('hex')
  const stagedSha = `${stagedTarball}.sha256`
  writeFileSync(stagedSha, `${digest}  ${tarballName}\n`, 'utf8')
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error('sha256 形状不对；旧 _dist 未动')

  // 3. 手册——脚本生成，版本/日期/条目数注入；步骤镜像 release-smoke 验证过的安装路径
  // 手册日期按部署时区（Asia/Shanghai）落；UTC 跨日会把 10-26 写成 10-25，与 CHANGELOG 不一致。
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const manual = renderInstallManual({
    version,
    tarballName,
    digest,
    date,
    expectedTag,
    entries: entries.length,
  })
  const stagedManual = join(staging, manualName)
  writeFileSync(stagedManual, manual, 'utf8')

  // 4. 全部成功才替换：只清本脚本自己的旧产物，不动 _dist/ 里别人放的东西。
  for (const name of readdirSync(distDir)) {
    if (name === manualName || /^dsh-company-pack-.*\.tgz$/.test(name) || /^dsh-company-pack-.*\.tgz\.sha256$/.test(name)) {
      rmSync(join(distDir, name), { force: true })
    }
  }
  renameSync(stagedTarball, join(distDir, tarballName))
  renameSync(stagedSha, join(distDir, `${tarballName}.sha256`))
  writeFileSync(join(distDir, manualName), manual, 'utf8')
  report('sha256', true, `${digest}  ${tarballName}`)
  report('manual generated', true, `${manualName}（tracked，版本 ${version}）`)
  rmSync(staging, { recursive: true, force: true })
} catch (error) {
  failed.push('unexpected')
  console.error(`export-dist: ${error.message}`)
  if (stagingDir !== undefined) {
    try { rmSync(stagingDir, { recursive: true, force: true }) } catch { /* staging 清理失败不掩原错误 */ }
  }
}

if (failed.length) {
  console.error(`export-dist: ${failed.length} step(s) failed: ${failed.join(', ')}`)
  process.exit(1)
}
console.log('export-dist: ALL PASS')
