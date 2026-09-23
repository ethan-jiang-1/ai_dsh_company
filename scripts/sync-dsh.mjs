#!/usr/bin/env node
// 升 pin 程序（R5a P4）：guides/60 §5 升级环的机械执行器——
//   vendor/dsh 换 tag → 记 SHA 簿记（AGENTS.md + scripts/verify.mjs 两处）→
//   compatibility 矩阵加列 → pnpm install → pnpm verify + test → release-smoke（真实安装冒烟）。
// 用法：
//   node scripts/sync-dsh.mjs                # 检查模式：三处簿记（submodule HEAD / verify.mjs /
//                                           # AGENTS.md）+ 矩阵是否一致，只读不改动
//   node scripts/sync-dsh.mjs --pin <tag>    # 升 pin：执行上面整条程序（要求两边工作树干净）
// ⚠ vendor 构建产物（lib/、apps/web/dist、client bundles）**不在本脚本职责内**——那是
//   guides/60 §7 的构建配方（一处事实一个家）；升 pin 后若 dist 陈旧，release-smoke 的
//   boot 会红，按 §7 重建即可。vendor 铁律不受影响：checkout 已发布的 tag 不是"改 vendor"。
// 分层（guides/60 §9.1）：认证档（动 submodule、跑 release-smoke），不进 pnpm test。
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = join(ROOT, 'vendor/dsh')
const PIN = process.argv.includes('--pin') ? process.argv[process.argv.indexOf('--pin') + 1] : undefined
if (process.argv.includes('--pin') && (typeof PIN !== 'string' || !/^[\w.-]+$/.test(PIN))) {
  console.error('sync-dsh: --pin 需要一个 tag 名（如 dsh-v0.1.5-rc.3）')
  process.exit(2)
}

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT, ...opts })
const gitVendor = (args) => run('git', ['-C', VENDOR, ...args]).trim()

/** verify.mjs 的簿记常量（机械门禁的事实源之一）。 */
const verifyText = () => readFileSync(join(ROOT, 'scripts/verify.mjs'), 'utf8')
const readVerifyPin = () => {
  const tag = /const expectedTag = '([^']+)'/.exec(verifyText())?.[1]
  const sha = /const expectedSha = '([0-9a-f]{40})'/.exec(verifyText())?.[1]
  return { tag, sha }
}
/** AGENTS.md 簿记行（人类账本）。 */
const agentsText = () => readFileSync(join(ROOT, 'AGENTS.md'), 'utf8')
const readAgentsPin = () => {
  const m = /当前钉住：tag `([^`]+)` = `([0-9a-f]{40})`/.exec(agentsText())
  return { tag: m?.[1], sha: m?.[2] }
}
const readMatrix = () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
  return manifest?.dsh?.compatibility?.dshReleases ?? []
}

// ── 检查模式（默认）：四处一致性 ──
if (PIN === undefined) {
  const head = gitVendor(['rev-parse', 'HEAD'])
  const v = readVerifyPin()
  const a = readAgentsPin()
  const matrix = readMatrix()
  const problems = []
  if (v.sha !== head) problems.push(`verify.mjs 簿记 SHA ${v.sha} ≠ submodule HEAD ${head}`)
  if (a.sha !== head) problems.push(`AGENTS.md 簿记 SHA ${a.sha} ≠ submodule HEAD ${head}`)
  if (v.tag !== a.tag) problems.push(`verify.mjs tag ${v.tag} ≠ AGENTS.md tag ${a.tag}`)
  if (!matrix.includes(v.tag)) problems.push(`兼容矩阵缺当前 tag ${v.tag}：${JSON.stringify(matrix)}`)
  if (problems.length > 0) {
    console.error(`sync-dsh: 簿记漂移（${String(problems.length)} 处）——升 pin 走 --pin，或手动对齐：`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`sync-dsh: 簿记一致（${v.tag} @ ${head.slice(0, 8)}；矩阵 ${String(matrix.length)} 列）`)
  process.exit(0)
}

// ── 升 pin 模式 ──
console.log(`── 升 pin → ${PIN} ──`)
const dirtyVendor = gitVendor(['status', '--porcelain'])
if (dirtyVendor !== '') { console.error(`sync-dsh: vendor/dsh 工作树不干净（铁律只读）——先处理：\n${dirtyVendor}`); process.exit(1) }
const dirtyRepo = run('git', ['status', '--porcelain']).trim()
if (dirtyRepo !== '') { console.error(`sync-dsh: 仓库工作树不干净——升 pin 的 diff 要独立成提交，先收掉手头的改动：\n${dirtyRepo.slice(0, 500)}`); process.exit(1) }

console.log('① fetch tags + checkout（vendor 铁律不受影响：checkout 已发布 tag 不是改 vendor）')
gitVendor(['fetch', '--tags', 'origin'])
gitVendor(['checkout', PIN])
const newSha = gitVendor(['rev-parse', 'HEAD'])

console.log(`② 簿记两处（scripts/verify.mjs + AGENTS.md）→ ${PIN} @ ${newSha.slice(0, 8)}`)
writeFileSync(join(ROOT, 'scripts/verify.mjs'), verifyText()
  .replace(/const expectedTag = '[^']+'/, `const expectedTag = '${PIN}'`)
  .replace(/const expectedSha = '[0-9a-f]{40}'/, `const expectedSha = '${newSha}'`))
writeFileSync(join(ROOT, 'AGENTS.md'), agentsText()
  .replace(/当前钉住：tag `[^`]+` = `[0-9a-f]{40}`/, `当前钉住：tag \`${PIN}\` = \`${newSha}\``))

console.log('③ 兼容矩阵加列（pack package.json 的 dsh.compatibility.dshReleases）')
const manifestPath = join(ROOT, 'packages/company-pack/package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
manifest.dsh = { ...manifest.dsh, compatibility: { ...manifest.dsh?.compatibility, dshReleases: [...new Set([...readMatrix(), PIN])] } }
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

console.log('④ pnpm install（workspace 解析新 vendor 树）')
run('pnpm', ['install'])

console.log('⑤ pnpm verify + pnpm test（迭代环门禁）')
run('pnpm', ['verify'])
run('pnpm', ['test'])

console.log('⑥ release-smoke（真实安装冒烟；boot 红多半是 vendor dist 陈旧 → 按 guides/60 §7 重建后重跑本步）')
run(process.execPath, [join(ROOT, 'scripts/release-smoke.mjs')], { stdio: 'inherit' })

console.log(`── 升 pin 完成 ──\n提交内容：vendor/dsh 指针 + AGENTS.md 簿记 + scripts/verify.mjs + pack 矩阵 + lockfile。`)
console.log('别忘了：本仓对 vendor 行为的覆盖层（cordis.patch.yml / overlay）对照新 tag 复核一遍。')
