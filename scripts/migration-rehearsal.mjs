#!/usr/bin/env node
// 布局卡 C1 存量迁移的零模型排练（2026-10-03 立；keyless，秒级；推敲卡 ⑤ 迁移时机的拍板前置）：
// 何时跑：布局卡 RFC 决策点⑤（迁移时机）拍板前跑一次；真迁移实施前复跑作 pre-flight 演练。
//
// 它做什么：把真盘 `company-workspace/deliverables/` 复制进排练场 staging，按 A2+C1(a) 形状
//   演练「全部存量话题 → `deliverables-archive/<kickoff 日期>-<slug>/`」的整批迁移——
//   日期判定（台账权威 → git 首次 add → mtime 兜底）、操作清单、实际执行、门禁事后视野。
// 它不做什么：不改真盘、不动判据代码（slug 归一化是实施件不是排练件）、不猜会话 createdAt
//   （真迁移用 E3 导出工具补精确日期；本排练记录 git 代理日期的偏差样本）。
// 判据（排练成功的定义）：
//   ① 每个话题都拿到一个日期来源与归属（无日期空白）；
//   ② 迁移后 `deliverables/` 根清空、archive 内 22 个日期前缀目录；
//   ③ `deliverables-check` 对迁移后 staging 报空视野（≠ 报错）——T-11 判据盲区的实证形状；
//   ④ 全程墙钟实测（工时从估计变实测）。
// 用法：node scripts/migration-rehearsal.mjs（不依赖 DSH_HOME；纯文件操作）
// 退出码：0 = 四判据满足；1 = 有判据未满足；2 = 环境失败。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REAL = join(ROOT, 'company-workspace/deliverables')
const LEDGER = join(ROOT, 'company-workspace/kb/motion-ledger.md')
const STAGE = join(ROOT, 'dev/rehearsal-workspace/migration-rehearsal')

const t0 = Date.now()
// ── 1. staging 成型（幂等：先清场）──
rmSync(STAGE, { recursive: true, force: true })
mkdirSync(join(STAGE, 'kb'), { recursive: true })
cpSync(REAL, join(STAGE, 'deliverables'), { recursive: true })
cpSync(LEDGER, join(STAGE, 'kb/motion-ledger.md'))
const topics = readdirSync(join(STAGE, 'deliverables')).filter(name =>
  statSync(join(STAGE, 'deliverables', name)).isDirectory() && !name.startsWith('.'))

// ── 2. 日期判定：台账权威 → git 首次 add → mtime 兜底 ──
const ledgerDate = new Map()
for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
  const m = /^\|\s*([a-z0-9][a-z0-9-]*)\s*\|\s*(20\d\d-\d\d-\d\d|日期待核)/.exec(line)
  if (m !== null) ledgerDate.set(m[1], m[2])
}
const gitAddDate = slug => {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--format=%as', '--', `company-workspace/deliverables/${slug}`],
      { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    return out.length > 0 ? out[out.length - 1] : undefined   // 最早一次 add
  } catch { return undefined }
}
const plan = []
for (const slug of topics.sort()) {
  let date = ledgerDate.get(slug)
  let source = 'ledger'
  if (date === undefined) { date = gitAddDate(slug); source = 'git-add(代理)' }
  if (date === undefined) {
    const st = statSync(join(STAGE, 'deliverables', slug, 'final.md'))
    date = st.mtime.toISOString().slice(0, 10); source = 'mtime(兜底)'
  }
  plan.push({ slug, date, source })
}
const noDate = plan.filter(p => !/^\d{4}-\d{2}-\d{2}$/.test(p.date))

// ── 3. 执行迁移（staging 内 mv）──
mkdirSync(join(STAGE, 'deliverables-archive'), { recursive: true })
let moved = 0
for (const p of plan) {
  const from = join(STAGE, 'deliverables', p.slug)
  const to = join(STAGE, 'deliverables-archive', `${p.date}-${p.slug}`)
  cpSync(from, to, { recursive: true })
  rmSync(from, { recursive: true, force: true })   // staging 非 git 索引，mv 语义 = cp+rm
  moved += 1
}
const archived = readdirSync(join(STAGE, 'deliverables-archive'))
const leftInRoot = readdirSync(join(STAGE, 'deliverables')).filter(n => !n.startsWith('.'))

// ── 4. 门禁事后视野（T-11 实证：判据根部只认 deliverables/ 前缀）──
// --sessions 指向 staging 内空目录 = keyless 跑（无会话日志映射；本步只验"扫描根还看不看得到成品"）。
mkdirSync(join(STAGE, 'empty-sessions'), { recursive: true })
let checkOutput = '(未运行)'
try {
  checkOutput = execFileSync(process.execPath, ['scripts/deliverables-check.mjs', '--workspace', STAGE, '--sessions', join(STAGE, 'empty-sessions')],
    { cwd: ROOT, encoding: 'utf8', timeout: 120_000 })
} catch (error) {
  checkOutput = `exit ${error.status}：${String(error.stdout ?? '').split('\n').slice(0, 3).join(' | ')}`
}
const checkSeesFinals = /成品 (\d+) 份/.exec(checkOutput)?.[1]

// ── 报告 ──
console.log(`迁移排练：${String(topics.length)} 个话题（台账 ${String(ledgerDate.size)} 行覆盖 / git 代理 ${String(plan.filter(p => p.source === 'git-add(代理)').length)} / mtime 兜底 ${String(plan.filter(p => p.source === 'mtime(兜底)').length)}）`)
for (const p of plan) console.log(`  ${p.date}  ${p.slug}  [${p.source}]`)
console.log(`已迁移 ${String(moved)} → archive ${String(archived.length)} 个目录；deliverables/ 根剩余 ${leftInRoot.length === 0 ? '0（清空 ✓）' : leftInRoot.join(',')}`)
console.log(`无日期空白：${noDate.length === 0 ? '是 ✓' : '否——' + noDate.map(p => p.slug).join(',')}`)
console.log(`迁移后 deliverables-check 视野：成品 ${checkSeesFinals ?? '?'} 份（T-11 实证：归档件出判据视野）`)
console.log(`墙钟：${String(Math.round((Date.now() - t0) / 100) / 10)}s（复制+判定+迁移+门禁全程）`)

const ok = noDate.length === 0 && leftInRoot.length === 0 && archived.length === topics.length && checkSeesFinals === '0'
console.log(`migration-rehearsal: ${ok ? 'PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
