#!/usr/bin/env node
// 署名/版本核对（2026-09-26 立；keyless，秒级；多人协作实验阶段的仪器之一）
// 何时跑：改过共享盘稿件之后（尤其多人模式）；或验证一份稿"到底是谁写的"时
//
// 为什么需要它：`journal-audit` 查**在场**（文件存在）**不查署名**（谁写的）——2026-09-26 真盘实测，
// `sea-reconcile-2026` 的 CFO 稿与 journal 首版由 **`ceo` preset 会话代笔**（开第二扇门时 preset 没改），
// `journal-audit` 照样判 ✅。这个盲区正是独立评审点名的：**路径不是作者证明**。
//
// 判据（档位定义与实现单一来源 = scripts/lib/authorship.mjs，keyless 单测见 tests/authorship.spec.ts）：
//   ✓ **一致**   —— 稿首署名行的角色 == 实际写入该文件的会话的 agentPreset；
//   ◐ **已收回** —— 署名 ≠ 写入者，但稿里有"复核并署名"更正行 ⇒ 观察（sea-reconcile 真实案例）；
//   ✗ **署名不实** —— 稿里**真的写了** `出稿：<角色>`，且 ≠ 写入者，且无更正行 ⇒ 判红；
//   ？ **观察**   —— 无署名行（约定 2026-09-26 才立，历史稿不追改）或写入者不可考（历史日志已不在）。
//   ⚠ **文件名推的归属不判红**（首跑修正）：`vp-sales.md` 的文件名只是名义归属，不是作者声明——
//   早期单操作者动议里 CEO 会话起草、成员审改是正常运作，拿文件名判红 = 误报（首跑曾报 12 条假 FAIL）。
//   ⚠ **写入路径归一**：同一份日志里绝对/相对路径并存，**相对路径必须按该会话自己的 cwd 补全**
//   （首版按脚本进程 cwd 归一 ⇒ 全部稿误判"写入者未知"）。
//   ✓ **版本一致**（R0-3，2026-10-03 加）—— final 依据所引稿版号 == 稿面署名行当前版号；
//   ✗ **版本过期** —— 引用 vN ≠ 稿面当前 vM（quote-z-2026 失败模式仪器化：双签锚 v2、盘面已 v3）。
// 用法：source dev/env.sh && node scripts/authorship-audit.mjs [--workspace <dir>]
// 退出码：0 = 无"署名不实"；1 = 有；2 = 环境（缺 DSH_HOME）。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deliverableId, normalizeRel } from './lib/deliverables.mjs'
import { classifyAuthorship, crossCheckVersions, currentVersionOf } from './lib/authorship.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WS_FLAG = process.argv.indexOf('--workspace')
const WS = WS_FLAG === -1 ? join(ROOT, 'company-workspace') : resolve(process.argv[WS_FLAG + 1])

const HOME = process.env.DSH_HOME
if (HOME === undefined) { console.error('authorship-audit: 先 source dev/env.sh（需要 DSH_HOME）'); process.exit(2) }
const SESSIONS = join(HOME, 'sessions')

/** 读 zstd 会话日志（多帧，用 zstd -dc；读不了就跳过）。 */
function readLog(file) {
  try { return execFileSync('zstd', ['-dc', file], { maxBuffer: 64 * 1024 * 1024 }).toString('utf8') } catch { return '' }
}

/** 一份日志里所有 write/edit 的目标文件（按该会话 cwd 归一成绝对路径）+ 会话 preset。 */
function writesOf(logText) {
  let preset = null
  let cwd = null
  const files = new Map()
  let seq = 0
  for (const line of logText.split('\n')) {
    if (line === '') continue
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (record.type === 'session') {
      preset = String(record.agentPreset ?? '')
      cwd = record.cwd !== undefined ? String(record.cwd) : null
    }
    if (record.type !== 'tool/call') continue
    const data = record.data ?? {}
    if (data.name !== 'write' && data.name !== 'edit') continue
    seq += 1
    let args = data.arguments
    if (typeof args === 'string') { try { args = JSON.parse(args) } catch { continue } }
    if (args === null || typeof args !== 'object') continue
    const raw = String(args.file_path ?? args.path ?? '')
    if (raw === '') continue
    const abs = raw.startsWith('/') ? raw : (cwd === null ? null : `${cwd}/${raw}`)
    if (abs === null) continue
    files.set(abs, seq)
  }
  return { preset, files }
}

// 索引：写入目标 → 写它的会话（取该目标上写入序最大的那个）。
// 键 = **交付物身份**（deliverableId，C1 跟随扩根）：迁移改名后（deliverables/ → 归档日期前缀），
// 日志里的老路径与盘上的新路径解析到同一身份，写入者匹配不断链；判据射程外的路径退回裸路径键。
const writers = new Map()
const cutoff = Date.now() - 90 * 24 * 3600 * 1000   // 覆盖全部历史动议（09-21 起）
let scanned = 0
for (const bucket of readdirSync(SESSIONS)) {
  const bdir = join(SESSIONS, bucket)
  if (!statSync(bdir).isDirectory()) continue
  for (const id of readdirSync(bdir)) {
    const sdir = join(bdir, id)
    if (!statSync(sdir).isDirectory()) continue
    let newest = null
    for (const name of readdirSync(sdir)) {
      if (/^session\.v\d+\.jsonl\.zstd$/.test(name)) newest = name
    }
    if (newest === null) continue
    const file = join(sdir, newest)
    if (statSync(file).mtimeMs < cutoff) continue
    scanned += 1
    const { preset, files } = writesOf(readLog(file))
    for (const [abs, seq] of files) {
      const absResolved = resolve(abs)
      const rel = relative(WS, absResolved)
      const id = rel.startsWith('deliverables') ? deliverableId(normalizeRel(rel)) : undefined
      const key = id !== undefined ? `id:${JSON.stringify([id.slug, id.kind, id.role ?? ''])}` : absResolved
      const prev = writers.get(key)
      if (prev === undefined || seq > prev.seq) writers.set(key, { preset, seq, session: id })
    }
  }
}

// 共享盘（活跃根 + 归档根，C1 跟随扩根）：每份稿 判档（判据 = lib/authorship.mjs）
const rows = []
for (const root of ['deliverables', 'deliverables-archive']) {
  const rootDir = join(WS, root)
  if (!existsSync(rootDir)) continue
  for (const slug of readdirSync(rootDir)) {
    const drafts = join(rootDir, slug, 'drafts')
    if (!existsSync(drafts)) continue
    for (const name of readdirSync(drafts)) {
      if (!name.endsWith('.md')) continue
      const path = join(drafts, name)
      const rel = normalizeRel(relative(WS, path))
      const writerId = deliverableId(rel)
      const key = writerId !== undefined ? `id:${JSON.stringify([writerId.slug, writerId.kind, writerId.role ?? ''])}` : resolve(path)
      const writer = writers.get(key) ?? null
      rows.push({ slug, file: name, ...classifyAuthorship(readFileSync(path, 'utf8'), name, writer?.preset ?? null) })
    }
  }
}

// 版本一致交叉核对（R0-3，2026-10-03；quote-z-2026 失败模式仪器化——final 依据所引版号 ≠ 稿面当前版号）：
//   ✓ 引用版号 == 当前版号；✗ 不等（依据无法按所引版号在盘上复核）；？稿面无版号行（历史稿，观察）。
const versionRows = []
for (const root of ['deliverables', 'deliverables-archive']) {
  const rootDir = join(WS, root)
  if (!existsSync(rootDir)) continue
  for (const slug of readdirSync(rootDir)) {
  const slugDir = join(rootDir, slug)
  const finalPath = join(slugDir, 'final.md')
  if (!existsSync(finalPath)) continue
  const currentByDraft = new Map()
  const draftsDir = join(slugDir, 'drafts')
  if (existsSync(draftsDir)) {
    for (const name of readdirSync(draftsDir)) {
      if (name.endsWith('.md')) currentByDraft.set(`drafts/${name}`, currentVersionOf(readFileSync(join(draftsDir, name), 'utf8')))
    }
  }
  for (const r of crossCheckVersions(readFileSync(finalPath, 'utf8'), currentByDraft)) versionRows.push({ slug, ...r })
  }
}
const staleRefs = versionRows.filter(r => r.stale)
const unversionedRefs = versionRows.filter(r => !r.stale && r.current === undefined)

const COUNT = { match: 0, reclaimed: 0, fail: 0, unsigned: 0, 'unsigned-mismatch': 0, unknown: 0 }
const MARK = { match: '✓', reclaimed: '◐', fail: '✗', 'unsigned-mismatch': '？', unsigned: '？', unknown: '？' }
console.log(`authorship-audit: 扫 ${String(scanned)} 个会话 / ${String(rows.length)} 份稿 / ${String(versionRows.length)} 处 final 版本引用（workspace=${WS}）`)
for (const r of versionRows) {
  if (r.current === undefined) console.log(`  ？ ${r.slug}/final.md 引用 ${r.draft} v${String(r.cited)}｜稿面无版号行（观察）`)
  else if (r.stale) console.log(`  ✗ ${r.slug}/final.md 引用 ${r.draft} v${String(r.cited)} ≠ 稿面当前 v${String(r.current)}（依据无法按所引版号复核——quote-z 失败模式）`)
}
for (const r of rows) {
  COUNT[r.level] += 1
  const desc = r.level === 'match' ? `署名=${r.claimed}｜写入=${r.writer}`
    : r.level === 'reclaimed' ? `署名=${r.claimed}｜写入=${r.writer}｜**已收回署名**（有更正行）`
    : r.level === 'fail' ? `署名=${r.claimed}｜**实际写入=${r.writer}**（无更正行——声明了作者却对不上）`
    : r.level === 'unknown' ? `署名=${r.claimed}｜写入者不可考（历史稿）`
    : r.level === 'unsigned-mismatch'
      ? `无署名行｜名义(${r.byName})≠写入(${r.writer})——早期单操作者运作或代笔，**文件名不构成作者声明**`
      : `无署名行｜实际写入=${r.writer ?? '?'}`
  console.log(`  ${MARK[r.level]} ${r.slug}/${r.file}｜${desc}`)
}
console.log(`\nauthorship-audit: 一致 ${String(COUNT.match)}｜已收回 ${String(COUNT.reclaimed)}｜无署名(观察) ${String(COUNT.unsigned + COUNT['unsigned-mismatch'])}｜写入者不可考(观察) ${String(COUNT.unknown)}｜**署名不实 ${String(COUNT.fail)}**｜版本引用 ${String(versionRows.length)}（✗过期 ${String(staleRefs.length)}｜？无版号 ${String(unversionedRefs.length)}）`)
const ok = COUNT.fail === 0 && staleRefs.length === 0
console.log(ok ? 'ALL PASS（无「声明了作者却对不上且无更正行」的稿；final 版本引用全部对得上盘面）'
  : `FAIL（署名不实 ${String(COUNT.fail)}｜版本引用过期 ${String(staleRefs.length)}）`)
process.exit(ok ? 0 : 1)
