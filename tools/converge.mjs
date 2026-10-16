#!/usr/bin/env node
// 状态：常驻
// 收敛执行器：把 snapshots/README §归档动作 的五步手工流程机械化——
//   证据副本 → git mv 交付物进归档家 → 清 live journal（留 .gitkeep）→ 台账行自动追加（逐字取 meta，查重跳过）→ 打印 CHARTER 补登指引（--charter-backfill）。
// 何时跑：用户说「收敛/清理工作区」时；或轮末维护者收敛已闭合动议时（维护者专用——分身不自行删改，见手册「轮末收敛」）。
// 用法（参数唯一源 = 本头注；未知旗标 = 退出 1——`--plan` 不是旗标，无参即计划模式）：
//   node tools/converge.mjs                     # 计划模式：列出可收敛/未闭合 slug + journal 收割预览
//   node tools/converge.mjs --slug <目录名>     # 收敛单个（前提：final + meta.closed + 一句话结论 + 至少一篇 journal + **无未结审计发现**）
//   node tools/converge.mjs --slug <目录名> --allow-no-journal  # 显式接受零 journal 缺口（照记，不静默放行）
//   node tools/converge.mjs --slug <目录名> --allow-open-findings # 显式接受未结审计发现（照记，不静默放行）
//   node tools/converge.mjs --slug <目录名> --dry-run  # 只打印动作清单，不动盘
//   node tools/converge.mjs --charter-backfill <目录名>  # 为已收敛 slug 补登 CHARTER 历史纪要（归档动作第 3 步）
// 成本：秒级~十秒级、无模型；git mv/git rm 只动 tracked 文件。
// ⚠ 环境：需 **`source run/env.sh`**（DSH_HOME 指向开发 home）——「无未结审计发现」这道前置要调
//   `checks/audit/deliverables-check.mjs --only <slug>`（判据单一来源 = 那个审计档，收敛器不重写）。
//   环境不可用时 fail-closed（报一条不可评估的发现），不放行。
// 退出码：0 = 成功（计划或执行）；1 = 前置不满足/用法错误。
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, cpSync, renameSync, rmSync } from 'node:fs'
import { join, basename } from 'node:path'
import { repositoryRoot as ROOT } from './lib/repository-layout.mjs'
import { archiveMovePlan, charterHasEntry, journalPresence, journalSlug, parseFlags, resolveEvidenceDir } from './lib/converge-rules.mjs'
import { COMPANY_ROLE_IDS } from './lib/company-roles.mjs'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
// 旗标解析单源 = tools/lib/converge-rules.mjs parseFlags（未知旗标 fail-loud——BUG-016①：
// `--plan` 曾被文档发明出来，传了还被静默「碰巧能跑」）
let DRY, SLUG_ARG, BACKFILL_ARG, ALLOW_NO_JOURNAL, ALLOW_OPEN_FINDINGS
try {
  const flags = parseFlags(args)
  DRY = flags.dryRun; SLUG_ARG = flags.slug; BACKFILL_ARG = flags.charterBackfill; ALLOW_NO_JOURNAL = flags.allowNoJournal; ALLOW_OPEN_FINDINGS = flags.allowOpenFindings
} catch (e) { console.error(`✗ ${e.message}`); process.exit(1) }
const WS = join(ROOT, 'company-workspace')
const ACTIVE = join(WS, 'deliverables')
const ARCHIVE = join(WS, 'deliverables-archive')
const LEDGER = join(WS, 'kb', 'motion-ledger.md')
const ROLES = COMPANY_ROLE_IDS
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
/**
 * 本 slug 的**未结审计发现**（复用 `checks/audit/deliverables-check.mjs --only <slug>` 的裁决）。
 *
 * 为什么不在这里重写判据：`present` 背书 / meta 形状 / 占位抢注这些裁决的单一来源是那个审计档；
 * 在收敛器里复述一遍 = 两处判据必然漂移。收敛只要一个「通过/未通过 + 为什么」。
 * 环境不可用（缺 DSH_HOME 等）时**fail-closed**：报一条不可评估的发现——收敛需要能审计。
 * @returns `{ ok, detail, violations }`
 */
const checkSlugFindings = slug => {
  const r = spawnSync(process.execPath, [join(ROOT, 'checks', 'audit', 'deliverables-check.mjs'), '--only', slug], { encoding: 'utf8' })
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`
  if (r.status === 2 || /工作区不存在|缺 DSH_HOME|requireDevHome/.test(text)) {
    return { ok: false, detail: '审计档跑不起来（环境不满足）——收敛前须能审计', violations: [] }
  }
  const violations = [...text.matchAll(/^\s+([a-z][a-z-]+) \| (deliverables[^\n]*)$/gm)].map(m => `${m[1]} ${m[2]}`)
  return { ok: r.status === 0, detail: violations.join('；') || '（见审计档输出）', violations }
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
    const slugOf = d.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    const journals = harvestJournal(slugOf)
    const findings = hasFinal ? checkSlugFindings(slugOf) : { ok: true, detail: '' }
    const gates = [
      [/\d{4}-\d{2}-\d{2}/.test(closed), 'meta.closed 未回填'],
      [Boolean(concl) && !concl.includes('回填'), '一句话结论未回填'],
      [hasFinal, '无 final'],
      [!archived, '已存在同名归档'],
      [journalPresence({ slug: slugOf, journals }).missing === false, '零 journal（收工留痕缺口）——补齐或显式 --allow-no-journal'],
      [findings.ok, `有未结审计发现：${findings.detail}`],
    ]
    const failed = gates.find(([pass]) => !pass)
    out.push({ dir: d, closed, hasFinal, archived, journals: journals.length, findings, ready: failed === undefined,
      reason: failed === undefined ? '可收敛' : failed[1] })
  }
  return out
}

const allSlugs = () => [...new Set([...(existsSync(ACTIVE) ? readdirSync(ACTIVE) : []),
  ...(existsSync(ARCHIVE) ? readdirSync(ARCHIVE) : [])].map(d => d.replace(/^\d{4}-\d{2}-\d{2}-/, '')))]
const harvestJournal = (slug) => {
  const moved = []
  const known = allSlugs().filter(s => s !== slug)
  for (const role of ROLES) {
    const dir = join(WS, 'kb', role, 'journal')
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue
      if (journalSlug(f, slug, known)) moved.push({ role, file: f, path: join('kb', role, 'journal', f) })
    }
  }
  return moved
}

const copyEvidence = (evDir, journal) => {
  // ⚠ 证据副本只收 **journal**（它们被从 live 删除，需要留底）；交付物本体 = git mv 进
  //   deliverables-archive（持久拷贝）——再拷一份进 snapshots 是双份存储（2026-10-12 实测把
  //   snapshots 顶爆 64M 预算，84.1M）。evDir 由调用方构造（converge() 内 evName 单一出处）。
  mkdirSync(join(evDir, 'journal'), { recursive: true })
  for (const j of journal) {
    const src = join(WS, j.path)
    mkdirSync(join(evDir, 'journal', j.role), { recursive: true })
    cpSync(src, join(evDir, 'journal', j.role, j.file))
  }
  return evDir
}

const appendLedger = (fields) => {
  // 查重：台账可能已有该 slug 的行（动议闭合时已登记过）——重复追加 = slug 唯一性断言红
  //   （2026-10-12 实测）。已有行 = 跳过（台账为准）。
  if (readFileSync(LEDGER, 'utf8').includes(`| ${fields.slug} |`)) {
    console.log(`  · 台账已有 ${fields.slug} 行——跳过追加（不重复登记）`)
    return null
  }
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
  // 收敛前置：零 journal 不放行（2026-10-16 立；事故 = ai-transformation-2026-v4 五职零留痕却照样归档，
  // 事后只有 journal-audit 能发现——坑在收敛步，闸门只在事后响）。放行 = 显式旗标，动作留痕。
  const presence = journalPresence({ slug: fields.slug, journals: journal })
  if (presence.missing && !ALLOW_NO_JOURNAL) {
    console.error(`✗ ${dirName}: 本动议零 journal（收工留痕缺口）——先补 kb/<role>/journal/ 留痕，或确认接受缺口后加 --allow-no-journal 显式放行`)
    process.exit(1)
  }
  if (presence.missing) console.error(`⚠ ${dirName}: 零 journal，--allow-no-journal 显式放行（缺口照记：收敛后 live 不再有留痕）`)
  // 收敛前置（2026-10-16 立，事故 = all-in-ai-2026）：未结审计发现不放行。
  const findings = checkSlugFindings(fields.slug)
  if (!findings.ok && !ALLOW_OPEN_FINDINGS) {
    console.error(`✗ ${dirName}: 有未结审计发现——${findings.detail}\n  先按审计档处置（例如缺 present 就补 present），或确认接受后加 --allow-open-findings 显式放行`)
    process.exit(1)
  }
  if (!findings.ok) console.error(`⚠ ${dirName}: 有未结审计发现，--allow-open-findings 显式放行——${findings.detail}`)
  const evName = `convergence-${today}` // 证据目录 = 创建日（本函数创建；backfill 补登走 resolveEvidenceDir——BUG-015）
  const evDir = join(ROOT, 'snapshots', 'archive', evName, dirName)
  const actions = [
    `证据副本 → snapshots/archive/${evName}/${dirName}/（journal ×${journal.length} 留底；交付物本体 git mv 进归档家，不双份拷贝）`,
    `git mv deliverables/${dirName} → deliverables-archive/${dirName}`,
    ...journal.map(j => `git rm kb/${j.role}/journal/${j.file}（副本已入证据目录）`),
    `台账追加一行（逐字取 meta：${fields.结论.slice(0, 40)}…）`,
    `CHARTER 历史纪要补登：node tools/converge.mjs --charter-backfill ${dirName}（结论逐字取 meta）`,
  ]
  console.log(`收敛计划 · ${dirName}${DRY ? '（dry-run）' : ''}`)
  actions.forEach(a => console.log('  · ' + a))
  if (DRY) { console.log('dry-run 结束，未动盘'); return }
  copyEvidence(evDir, journal)
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
        const to = `snapshots/archive/${evName}/${dirName}/journal/${j.role}/${j.file}`
        ct = ct.split('`' + ref + '`').join(`'${to}'（原稿）`).split(ref).join(to)
        touched = true
        refRewrites.push(`kb/${role}/CHARTER.md：${ref} → ${to}`)
      }
    }
    if (touched) writeFileSync(charter, ct)
  }
  // notes/implemented 的路径 currency 同属本改动（D38：keep paths current in the same change）
  const implDir = join(ROOT, 'notes', 'implemented')
  if (existsSync(implDir)) for (const n of readdirSync(implDir)) {
    if (!n.endsWith('.md')) continue
    const nf = join(implDir, n)
    let nt = readFileSync(nf, 'utf8')
    let touched = false
    for (const j of journal) {
      const ref = `company-workspace/kb/${j.role}/journal/${j.file}`
      if (nt.includes(ref)) {
        nt = nt.split(ref).join(`snapshots/archive/${evName}/${dirName}/journal/${j.role}/${j.file}`)
        touched = true
        refRewrites.push(`notes/implemented/${n}：journal 路径 → 证据副本`)
      }
    }
    for (const dref of [`company-workspace/deliverables/${dirName}/`]) {
      if (nt.includes(dref)) {
        nt = nt.split(dref).join(`company-workspace/deliverables-archive/${dirName}/`)
        touched = true
        refRewrites.push(`notes/implemented/${n}：交付物路径 → 归档家`)
      }
    }
    if (touched) writeFileSync(nf, nt)
  }
  for (const r of refRewrites) console.log('  · 引用重指：' + r)
  // 归档搬移（2026-10-13 起）：`git mv` → **fs rename + git add -A**。原因见 archiveMovePlan 注释
  // （drafts 不再 tracked，`git mv` 遇未跟踪文件 fatal）；计划住 lib 纯逻辑缝，spec 在临时仓真跑过。
  const move = archiveMovePlan(dirName)
  renameSync(join(ROOT, move.from), join(ROOT, move.to))
  git(move.gitArgs)
  const removed = []
  for (const j of journal) {
    const p = join('company-workspace', j.path)
    git(['rm', '-q', p]); removed.push(p)
    const roleDir = join(WS, 'kb', j.role, 'journal')
    if (readdirSync(roleDir).length === 0) writeFileSync(join(roleDir, '.gitkeep'), '')
  }
  const row = appendLedger(fields)
  console.log(`✓ 收敛完成：交付物已入归档家、${journal.length} 篇 journal 清入证据副本、台账行已追加`)
  console.log(`  收尾：CHARTER 历史纪要补登跑 node tools/converge.mjs --charter-backfill ${dirName}（教训性文字仍由人把守——纪要素材逐字取 meta）`)
}

const ROLE_KEY = { CEO: 'ceo', 'VP-Eng': 'vp-eng', 'VP-Sales': 'vp-sales', COO: 'coo', CFO: 'cfo' }
// --charter-backfill <目录名>：为已收敛 slug 补登 CHARTER 历史纪要（归档动作第 3 步机械化）。
//   纪要素材逐字取 meta（结论不转写）；条目 = 日期 + slug（类型）+ 结论 + 两个归档位。
//   已登记（charterHasEntry 条目行锚——BUG-014）则跳过；「历史纪要」节缺失则新建；
//   证据日期按 slug 解析真实收敛目录（BUG-015），无证据目录 fail-loud。
const charterBackfill = (dirName) => {
  const slugDir = join(ARCHIVE, dirName)
  if (!existsSync(join(slugDir, 'meta.md'))) { console.error(`✗ ${dirName}: 归档家无此目录`); process.exit(1) }
  const slug = metaField(slugDir, 'slug') || dirName.replace(/^\d{4}-\d{2}-\d{2}-/, '')
  const kickoff = metaField(slugDir, 'kickoff') || dirName.slice(0, 10)
  const kind = metaField(slugDir, '类型') || '—'
  const concl = metaField(slugDir, '一句话结论')
  const roles = [...new Set((metaField(slugDir, '参与').match(/CEO|VP-Eng|VP-Sales|COO|CFO/g) ?? []).map(r => ROLE_KEY[r]).filter(Boolean))]
  if (roles.length === 0) { console.error(`✗ ${dirName}: meta.参与 无可解析角色`); process.exit(1) }
  let evName
  try { evName = resolveEvidenceDir(join(ROOT, 'snapshots', 'archive'), dirName) }
  catch (e) { console.error(`✗ ${dirName}: ${e.message}`); process.exit(1) }
  if (DRY) { console.log(`backfill 计划：${slug} → ${roles.join(', ')} 的 CHARTER 历史纪要（journal 全文：snapshots/archive/${evName}/${dirName}/journal/<role>/）`); return }
  for (const role of roles) {
    const charter = join(WS, 'kb', role, 'CHARTER.md')
    let ct = existsSync(charter) ? readFileSync(charter, 'utf8') : ''
    if (charterHasEntry(ct, slug)) { console.log(`  · ${role}: CHARTER 历史纪要已有 ${slug} 条目——跳过`); continue }
    const entry = `- ${kickoff} · ${slug}（${kind}）—— ${concl}\n  （journal 全文：\`snapshots/archive/${evName}/${dirName}/journal/${role}/\`；交付物：\`deliverables-archive/${dirName}/\`）`
    const hdr = ct.match(/^## 历史纪要.*$/m)
    if (hdr) {
      const after = ct.indexOf('\n## ', hdr.index + 1)
      const insertAt = after === -1 ? ct.length : after
      ct = ct.slice(0, insertAt).replace(/\n$/, '') + '\n' + entry + '\n' + ct.slice(insertAt)
    } else {
      ct = ct.replace(/\n$/, '') + '\n\n## 历史纪要（2026-10-12 起由收敛 CLI 登记）\n\n' + entry + '\n'
    }
    writeFileSync(charter, ct)
    console.log(`  · ${role} CHARTER 历史纪要 +1（${slug}）`)
  }
  console.log(`✓ backfill 完成：${slug} → ${roles.length} 角色 CHARTER`)
}

if (BACKFILL_ARG) { charterBackfill(BACKFILL_ARG); process.exit(0) }
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
