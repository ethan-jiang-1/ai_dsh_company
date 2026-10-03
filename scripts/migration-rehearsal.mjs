#!/usr/bin/env node
// 布局卡 C1 存量迁移的一体仪器（2026-10-03；--execute 前零模型，--execute 改真盘；推敲卡 ⑤ 拍板前置）：
// 何时跑：布局卡 RFC 决策点⑤拍板前跑一次（默认 = 排练/排练场）；真迁移时 `--execute`（先复跑默认态作
//   pre-flight，再执行）。
//
// 默认态（排练）：把真盘 `company-workspace/deliverables/` 复制进排练场 staging，演练 A2→A1 形状的
//   「存量话题 → `deliverables-archive/<kickoff 日期>-<slug>/`」整批迁移 + 门禁事后视野。
// `--execute`（真迁移）：在**真盘**上——① 按台账/git/mtime 给每个话题生成 meta.md（机械字段；
//   「结果」留空 = 回填态，收敛时维护者回填）；② `git mv deliverables/<slug> deliverables-archive/<日期>-<slug>`；
//   ③ 真盘跑 deliverables-check + authorship-audit 验收。
// 判据（排练成功）：① 无日期空白 ② 根清空、archive 计数齐 ③ 迁移后判据视野=全部话题（跟随扩根修复 T-11）④ 墙钟实测。
// 用法：node scripts/migration-rehearsal.mjs            # 排练（staging，只读真盘）
//       node scripts/migration-rehearsal.mjs --execute  # 真迁移（改真盘！先跑 git status 确认干净）
// 退出码：0 = 判据满足；1 = 有判据未满足；2 = 环境失败。
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const EXECUTE = process.argv.includes('--execute')
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REAL = join(ROOT, 'company-workspace/deliverables')
const LEDGER = join(ROOT, 'company-workspace/kb/motion-ledger.md')
const STAGE = join(ROOT, 'dev/rehearsal-workspace/migration-rehearsal')

// 台账「类型」列 → meta 分型词表（META_TYPES）；无法判的落「决策」并在 detail 标注来源。
const typeOf = (ledgerType, slug) => {
  const t = ledgerType ?? ''
  if (t.includes('口径问答')) return '口径问答'
  if (t.includes('复盘') || t.includes('季度')) return '诊断'
  if (t.includes('流水线') || t.includes('写作')) return '生产'
  if (t !== '') return '决策'
  return /agent-2026$|poc/.test(slug) ? '生产' : '决策'   // 无台账行的话题：构建类归生产，其余归决策（提交留痕供复核）
}

const t0 = Date.now()
// ── 1. staging 成型（幂等：先清场）──
rmSync(STAGE, { recursive: true, force: true })
mkdirSync(join(STAGE, 'kb'), { recursive: true })
cpSync(REAL, join(STAGE, 'deliverables'), { recursive: true })
cpSync(LEDGER, join(STAGE, 'kb/motion-ledger.md'))
const topics = readdirSync(join(STAGE, 'deliverables')).filter(name =>
  statSync(join(STAGE, 'deliverables', name)).isDirectory() && !name.startsWith('.'))

// ── 2. 日期判定：台账权威 → git 首次 add → mtime 兜底 ──
const ledgerRows = new Map()
for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
  const m = /^\|\s*([a-z0-9][a-z0-9-]*)\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/.exec(line)
  if (m === null || m[1] === 'slug') continue
  ledgerRows.set(m[1], { date: m[2].trim(), type: m[3].trim(), part: m[4].trim(), wall: m[5].trim(), concl: m[7].trim() })
}
const ledgerDate = new Map([...ledgerRows].map(([slug, r]) => [slug, r.date]))
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

// ── 2.5 --execute：真盘迁移（meta 生成 + git mv + 门禁验收）──
if (EXECUTE) {
  const archiveDir = join(ROOT, 'company-workspace/deliverables-archive')
  mkdirSync(archiveDir, { recursive: true })
  // ① meta 生成（机械字段；「结果」留空 = 回填态，类型映射见 typeOf——提交留痕供维护者复核）
  for (const p of plan) {
    const row = ledgerRows.get(p.slug)
    const meta = [
      `slug: ${p.slug}`,
      `kickoff: ${p.date}`,
      `类型: ${typeOf(row?.type, p.slug)}`,
      `参与: ${row?.part ?? 'CEO（待补）'}`,
      '结果:',
      'closed:',
      `墙钟: ${row?.wall ?? '未记'}`,
      `一句话结论: ${row?.concl ?? '（待补——见 final 正文）'}`,
    ].join('\n') + '\n'
    writeFileSync(join(REAL, p.slug, 'meta.md'), meta, 'utf8')
  }
  console.log(`meta 生成 ${String(plan.length)} 份（结果留空待回填）`)
  // ② 移动：tracked = git mv（保历史）；untracked = fs rename（git mv 会拒）
  let gitMoved = 0, fsMoved = 0
  for (const p of plan) {
    const src = `company-workspace/deliverables/${p.slug}`
    const dst = `company-workspace/deliverables-archive/${p.date}-${p.slug}`
    let tracked = true
    try { execFileSync('git', ['ls-files', '--error-unmatch', src], { cwd: ROOT, stdio: 'pipe' }) } catch { tracked = false }
    if (tracked) { execFileSync('git', ['mv', src, dst], { cwd: ROOT }); gitMoved += 1 }
    else { renameOrFallback(join(ROOT, src), join(ROOT, dst)); fsMoved += 1 }
  }
  console.log(`迁移完成：git mv ${String(gitMoved)} / fs mv ${String(fsMoved)}`)
  // ③ 真盘门禁验收（退出码传递：子门禁失败 ⇒ 本脚本退 1——「证据不许假绿」，红证 2026-10-04：
  //   剥 PATH 里的 zstd 令 deliverables-check 退 2，旧版无条件 exit(0) 假绿，修后退 1）
  let gateFailures = 0
  for (const cmd of [['scripts/deliverables-check.mjs'], ['scripts/authorship-audit.mjs']]) {
    try {
      const out = execFileSync(process.execPath, cmd, { cwd: ROOT, encoding: 'utf8', timeout: 300_000,
        env: { ...process.env, DSH_HOME: join(ROOT, 'dev/harness-home') } })
      console.log(`[${cmd[0]}]\n` + out.split('\n').filter(l => /ALL PASS|违规|观察项 \d|一致 \d|版本引用/.test(l)).slice(0, 4).join('\n'))
    } catch (error) {
      gateFailures += 1
      console.log(`[${cmd[0]}] exit ${String(error.status)}\n` + String(error.stdout ?? '').split('\n').slice(-6).join('\n'))
    }
  }
  process.exit(gateFailures === 0 ? 0 : 1)
}
function renameOrFallback(from, to) {
  try { execFileSync('git', ['mv', from, to], { cwd: ROOT }) } catch { rmSync(to, { recursive: true, force: true }); cpSync(from, to, { recursive: true }); rmSync(from, { recursive: true, force: true }) }
}

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
console.log(`迁移后 deliverables-check 视野：成品 ${checkSeesFinals ?? '?'} 份（跟随扩根 = 判据穿透归档根，T-11 已修复；无会话上下文的 not-presented 不计）`)
console.log(`墙钟：${String(Math.round((Date.now() - t0) / 100) / 10)}s（复制+判定+迁移+门禁全程）`)

const ok = noDate.length === 0 && leftInRoot.length === 0 && archived.length === topics.length && checkSeesFinals === String(topics.length)
console.log(`migration-rehearsal: ${ok ? 'PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
