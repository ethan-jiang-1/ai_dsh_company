#!/usr/bin/env node
// 状态：常驻
// 何时跑：revoke/pending journal/方法层恢复改动后；发布前手动
// 成本：~1 分钟 keyless（真 tarball 安装 + 两次 boot；不含模型/浏览器）
//
// 证明形状：在真 home/公司盘/方法层上注入“revoke 崩溃后的两种状态”，再启动真 host：
// - 方法还在 + 记录已写 revokedAt ⇒ 启动恢复回滚记录，方法保留；
// - 方法已删 + 记录仍旧 ⇒ 启动恢复补完 revokedAt。
// 不证明：真实 SIGKILL 发生在 revoke 执行中的精确时点（状态注入覆盖恢复路径，不覆盖进程调度）。
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { plainNodeEnv, releaseProcesses } from '../../tools/drivers/release-process.mjs'

const PROFILE = 'revoke-recovery'
const REVOKED_AT = '2026-10-27T00:00:00.000Z'
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}

const devHome = requireDevHome('revoke-recovery-smoke')
const base = join(devHome, 'tmp/revoke-recovery-smoke')
const home = join(base, 'home')
const company = join(home, 'company-workspace')
const profileDir = join(home, 'profiles', PROFILE)
const pack = join(ROOT, '_dist', `dsh-company-pack-${JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8')).version}.tgz`)
const cliDir = join(ROOT, 'vendor/dsh/apps/cli')
const cliManifest = JSON.parse(readFileSync(join(cliDir, 'package.json'), 'utf8'))
const cli = join(cliDir, cliManifest.bin.dsh)
let processes

const recordText = (revoked) => `---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: smoke\nexpectation: recovery\nstatus: adopted\nmethodSlug: recovery-method\n${revoked ? `revokedAt: ${REVOKED_AT}\n` : ''}---\n\nthe body\n`
const recordPath = join(company, 'cultivation/records/20261027-000000-recovery.md')
const journalPath = join(company, 'cultivation/.pending-revoke.json')
const methodPath = join(profileDir, 'company-cultivation/ceo/recovery-method/SKILL.md')

const boot = async () => {
  const child = processes.start(process.execPath, [cli, '--profile', PROFILE, '--', '--port', '0', '--no-open'], { timeoutMs: 180_000 })
  await child.waitFor(/http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/, 120_000)
  const deadline = Date.now() + 20_000
  while (!(existsSync(join(company, 'kb/deliverables-index.json')) && existsSync(join(company, 'kb/deliverables-presented.json'))) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  await child.stop()
}

try {
  rmSync(base, { recursive: true, force: true })
  mkdirSync(profileDir, { recursive: true })
  writeFileSync(join(profileDir, 'package.json'), `${JSON.stringify({
    name: `dsh-profile-${PROFILE}`, private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'], patchReload: 'startup' } },
  }, null, 2)}\n`)
  writeFileSync(join(profileDir, 'pnpm-workspace.yaml'), 'packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n')
  writeFileSync(join(profileDir, '.npmrc'), `store-dir=${join(ROOT, '.pnpm-store')}\ncache-dir=${join(home, 'cache/pnpm')}\n`)
  const env = plainNodeEnv({
    ...process.env,
    DSH_HOME: home,
    DSH_COMPANY_HOME: company,
    DSH_COMPANY_BOOTSTRAP: 'if-missing',
    npm_config_cache: join(home, 'tmp/npm-cache'),
    npm_config_store_dir: join(ROOT, '.pnpm-store'),
    npm_config_verify_deps_before_run: 'false',
  })
  processes = releaseProcesses({ cwd: ROOT, env })
  if (!existsSync(pack)) throw new Error(`缺 tarball：${pack}；先跑 tools/export-dist.mjs`)
  await processes.run(process.execPath, [cli, 'plugin', '--profile', PROFILE, 'add', `file:${pack}`], { timeoutMs: 180_000 })
  await boot()
  check('首次 boot 建立公司盘', existsSync(join(company, 'AGENTS.md')))

  mkdirSync(join(company, 'cultivation/records'), { recursive: true })
  mkdirSync(join(methodPath, '..'), { recursive: true })
  writeFileSync(methodPath, '---\nname: recovery-method\ndescription: recovery\n---\n\n# recovery-method\n')
  const oldText = recordText(false)
  writeFileSync(recordPath, recordText(true))
  writeFileSync(journalPath, JSON.stringify({
    schema: 1, role: 'ceo', slug: 'recovery-method', revokedAt: REVOKED_AT, createdAt: REVOKED_AT,
    records: [{ id: '20261027-000000-recovery', text: oldText }],
  }))
  await boot()
  check('方法还在 ⇒ 记录回滚为旧全文', readFileSync(recordPath, 'utf8') === oldText, readFileSync(recordPath, 'utf8').slice(0, 120))
  check('方法还在 ⇒ 方法文件保留', existsSync(methodPath))
  check('方法还在 ⇒ journal 清理', !existsSync(journalPath))

  rmSync(join(profileDir, 'company-cultivation/ceo/recovery-method'), { recursive: true, force: true })
  writeFileSync(recordPath, oldText)
  writeFileSync(journalPath, JSON.stringify({
    schema: 1, role: 'ceo', slug: 'recovery-method', revokedAt: REVOKED_AT, createdAt: REVOKED_AT,
    records: [{ id: '20261027-000000-recovery', text: oldText }],
  }))
  await boot()
  check('方法已删 ⇒ 记录补完 revokedAt', readFileSync(recordPath, 'utf8').includes(`revokedAt: ${REVOKED_AT}`), readFileSync(recordPath, 'utf8').slice(0, 120))
  check('方法已删 ⇒ journal 清理', !existsSync(journalPath))
} catch (error) {
  failures.push(error.message)
  console.error(`revoke-recovery-smoke: ${error.stack ?? error.message}`)
} finally {
  try { await processes?.close() } catch (error) { failures.push(String(error?.message ?? error)) }
  if (!process.argv.includes('--keep')) rmSync(base, { recursive: true, force: true })
}
console.log(failures.length === 0
  ? '\nrevoke-recovery-smoke: ALL PASS（真 host 启动恢复：回滚/补完两态）'
  : `\nrevoke-recovery-smoke: ${failures.length} FAILURE(S)`)
process.exitCode = failures.length === 0 ? 0 : 1
