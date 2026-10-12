#!/usr/bin/env node
// 状态：常驻
// 收敛执行器：把 snapshots/README §归档动作 的五步手工流程机械化——
//   证据副本 → git mv 交付物进归档家 → 清 live journal（留 .gitkeep）→ 台账行自动追加（逐字取 meta）→ 语义 TODO 打印。
// 何时跑：用户说「收敛/清理工作区」时；或轮末维护者收敛已闭合动议时（维护者专用——分身不自行删改，见手册「轮末收敛」）。
// 用法：
//   node tools/converge.mjs                     # 计划模式：列出可收敛/未闭合 slug + journal 收割预览 + 语义 TODO
//   node tools/converge.mjs --slug <目录名>     # 收敛单个（前提：final + meta.closed + 一句话结论）
//   node tools/converge.mjs --slug <目录名> --dry-run  # 只打印动作清单，不动盘
// 成本：秒级、无模型（纯文件/git 操作）；git mv/git rm 只动 tracked 文件。
// 退出码：0 = 成功（计划或执行）；1 = 前置不满足/用法错误。
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, cpSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const argOf = name => { const i = args.indexOf(`--${name}`); return i === -1 ? undefined : args[i + 1] }
const DRY = args.includes('--dry-run')
const SLUG_ARG = argOf('slug')
const WS = join(ROOT, 'company-workspace')
const ACTIVE = join(WS, 'deliverables')
const ARCHIVE = join(WS, 'deliverables-archive')
const LEDGER = join(WS, 'kb', 'motion-ledger.md')
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
const today = new Date().toISOString().slice(0, 10)

const git = (args_, opts = {}) => {
  const r = spawnSync('git', args_, { cwd: ROOT, encoding: 'utf8', ...opts })
  if (r.status !== 0) throw new Error(`git ${args_.join(' ')} 失败：${r.stderr.trim().slice(0, 200)}`)
  return r.stdout
}
const metaField = (dir, field) => {
  const m = readFileSync(join(dir, 'meta.md'), 'utf8').match(new RegExp(`^${field}:\\s*(.*)$`, 'm'))
  return m ? m[1].trim() : ''
}
/** journal 文件名 → 所属 slug（剥日期后：等于 slug 或以 slug- 开头）。无属主 = null（当轮散件，不清）。 */
const journalSlug = (fileName, slug) => {
  const stripped = fileName.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '')
  return stripped === slug || stripped.startsWith(`${slug}-`) ? fileName : null
}

const scanSlugs = () => {
  const out = []
  if (existsSync(ACTIVE)) for (const d of readdirSync(ACTIVE)) {
    const dir = join(ACTIVE, d)
    if (!existsSync(join(dir, 'meta.md'))) continue
    const closed = metaField(dir, 'closed')
    const concl = metaField(dir, '一句话结论')
    const hasFinal = existsSync(join(dir, 'final.md'))
    const archived = existsSync(join(ARCHIVE, d))
    const ready = /\d{4}-\d{2}-\d{2}/.test(closed) && concl && !concl.includes('回填') && hasFinal && !archived
    out.push({ dir: d, closed, hasFinal, archived, ready, reason: !hasFinal ? '无 final'
      : !/\d{4}-\d{2}-\d{2}/.test(closed) ? 'meta.closed 未回填'
      : !concl || concl.includes('回填') ? '一句话结论未回填'
      : archived ? '已存在同名归档' : '可收敛' })
  }
  return out
}

const harvestJournal = (slug) => {
  const moved = []
  for (const role of ROLES) {
    const dir = join(WS, 'kb', role, 'journal')
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      if (journalSlug(f, slug)) moved.push({ role, file: f, path: join('kb', role, 'journal', f) })
    }
  }
  return moved
}

const copyEvidence = (slugDir, slug, journal) => {
  const evDir = join(ROOT, 'snapshots', 'archive', `convergence-${today}`, slug)
  mkdirSync(join(evDir, 'journal'), { recursive: true })
  cpSync(slugDir, join(evDir, 'deliverable'), { recursive: true })
  for (const j of journal) {
    const src = join(WS, j.path)
    mkdirSync(join(evDir, 'journal', j.role), { recursive: true })
    cpSync(src, join(evDir, 'journal', j.role, j.file))
  }
  return evDir
}

const appendLedger = (fields) => {
  const row = `| ${fields.slug} | ${fields.kickoff} | ${fields.类型 || '—'} | ${fields.参与 || '—'} | ${fields.墙钟 || '未记'} | ✅ | ${fields.结论} |`
  const t = readFileSync(LEDGER, 'utf8')
  const lines = t.split('\n')
  let last = -1
  lines.forEach((l, i) => { if (l.startsWith('| ') && !l.startsWith('| slug') && !l.startsWith('|---')) last = i })
  if (last === -1) throw new Error('台账表未找到数据行')
  lines.splice(last + 1, 0, row)
  writeFileSync(LEDGER, lines.join('\n'))
  return row
}

const converge = (dirName) => {
  const slugDir = join(ACTIVE, dirName)
  if (!existsSync(join(slugDir, 'meta.md'))) { console.error(`✗ ${dirName}: deliverables/ 下无此目录或缺 meta.md`); process.exit(1) }
  if (existsSync(join(ARCHIVE, dirName))) { console.error(`✗ ${dirName}: 归档家已有同名目录（重复收敛？）`); process.exit(1) }
  const closed = metaField(slugDir, 'closed')
  const concl = metaField(slugDir, '一句话结论')
  if (!existsSync(join(slugDir, 'final.md')) || !/\d{4}-\d{2}-\d{2}/.test(closed) || !concl || concl.includes('回填')) {
    console.error(`✗ ${dirName}: 未闭合（final=${existsSync(join(slugDir, 'final.md'))} closed=${closed} 结论=${concl ? '有' : '无'}）——收敛只收已闭合动议`)
    process.exit(1)
  }
  // ⚠ 字段必须在任何搬移前捕获——git mv 之后 meta.md 就不在原位了（2026-10-12 实测 crash 教训）
  const fields = {
    slug: metaField(slugDir, 'slug') || dirName.replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    kickoff: metaField(slugDir, 'kickoff') || dirName.slice(0, 10),
    类型: metaField(slugDir, '类型'), 参与: metaField(slugDir, '参与'), 墙钟: metaField(slugDir, '墙钟'), 结论: concl,
  }
  const journal = harvestJournal(fields.slug)
  const actions = [
    `证据副本 → snapshots/archive/convergence-${today}/${dirName}/（交付物整目录 + ${journal.length} 篇 journal 副本）`,
    `git mv deliverables/${dirName} → deliverables-archive/${dirName}`,
    ...journal.map(j => `git rm kb/${j.role}/journal/${j.file}（副本已入证据目录）`),
    `台账追加一行（逐字取 meta：${fields.结论.slice(0, 40)}…）`,
    `语义 TODO（CLI 不做）：CHARTER 历史纪要（各角色把本轮教训压进 kb/<role>/CHARTER.md）`,
  ]
  console.log(`收敛计划 · ${dirName}${DRY ? '（dry-run）' : ''}`)
  actions.forEach(a => console.log('  · ' + a))
  if (DRY) { console.log('dry-run 结束，未动盘'); return }
  const evDir = copyEvidence(slugDir, dirName, journal)
  // ⚠ CHARTER 引用重指：CHARTER 里若有指向被清 journal 的反引号路径，清出即断链
  //   （foundation-safety 钉「CHARTER 的 kb/ 路径必须存在」）。指向一律改写为证据副本路径，
  //   并逐条打印供人复核（决定内容应已 inline 在 CHARTER 句里，此处只动指针）。
  const refRewrites = []
  for (const role of ROLES) {
    const charter = join(WS, 'kb', role, 'CHARTER.md')
    if (!existsSync(charter)) continue
    let ct = readFileSync(charter, 'utf8')
    let touched = false
    for (const j of journal) {
      const ref = `kb/${j.role}/journal/${j.file}`
      if (ct.includes('`' + ref + '`') || ct.includes(ref)) {
        const to = `snapshots/archive/convergence-${today}/${dirName}/journal/${j.role}/${j.file}`
        ct = ct.split('`' + ref + '`').join(`'${to}'（原稿）`).split(ref).join(to)
        touched = true
        refRewrites.push(`kb/${role}/CHARTER.md：${ref} → ${to}`)
      }
    }
    if (touched) writeFileSync(charter, ct)
  }
  for (const r of refRewrites) console.log('  · CHARTER 引用重指：' + r)
  git(['mv', join('company-workspace', 'deliverables', dirName), join('company-workspace', 'deliverables-archive', dirName)])
  const removed = []
  for (const j of journal) {
    const p = join('company-workspace', j.path)
    git(['rm', '-q', p]); removed.push(p)
    const roleDir = join(WS, 'kb', j.role, 'journal')
    if (readdirSync(roleDir).length === 0) writeFileSync(join(roleDir, '.gitkeep'), '')
  }
  const row = appendLedger(fields)
  console.log(`✓ 收敛完成：交付物已入归档家、${journal.length} 篇 journal 清入证据副本、台账行已追加`)
  console.log(`  语义 TODO：各角色 CHARTER 历史纪要（本轮教训压进 kb/<role>/CHARTER.md）——CLI 不代写`)
}

if (SLUG_ARG) { converge(SLUG_ARG); process.exit(0) }
console.log(`收敛计划 @ ${today}${DRY ? '（dry-run）' : ''}\n`)
const slugs = scanSlugs()
for (const s of slugs) console.log(`${s.ready ? '✓ 可收敛' : '· 未备'}  ${s.dir}  ← ${s.reason}`)
const ready = slugs.filter(s => s.ready)
console.log(`\njournal 收割预览（收敛后清出 live）:`)
const tally = {}
for (const s of ready) for (const j of harvestJournal(s.dir.replace(/^\d{4}-\d{2}-\d{2}-/, ''))) {
  tally[j.role] = (tally[j.role] ?? 0) + 1
}
for (const [r, n] of Object.entries(tally)) console.log(`  ${r}: ${n} 篇`)
console.log(`\n执行：node tools/converge.mjs --slug <目录名>   （--dry-run 先看清单）`)
