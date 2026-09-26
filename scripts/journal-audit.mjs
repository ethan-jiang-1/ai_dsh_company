#!/usr/bin/env node
// journal 在场审计（2026-09-26 立，deliverables-check 家族）：**「收工留痕」的缺席检测**。
// 何时跑：收工留痕缺席审计；维护者按需跑（三级置信度 + 归档区），不进 verify
//
// 为什么需要它：journal 缺席是行为问题（skill 硬闸门语气实测 8→8 红证），而缺席**没人检测**——
//   要等下次复盘翻 journal 才发现；缺席者自己也不会报自己缺席。本脚本把"缺席"从没人知道
//   变成**可复核的违规**。
//
// 口径（唯一权威 = 公司手册「收工留痕」）：一场动议里**出过活**（有 completed 任务）的角色，
//   应在 `kb/<角色>/journal/` 留下当轮纪要。匹配按三级（诚实标注置信度）：
//     ✅ 确认 = journal 文件名或正文含本场 slug
//     ⚠ 存疑 = 只按时间窗命中（该目录下有文件落在本场时间窗内）
//     ❌ 违规 = 两者都没有
// 输入 = `$DSH_HOME/sessions/` 里的**真盘**会话（排练场默认排除——排练产物本就不写公司盘）。
// 用法：source dev/env.sh && node scripts/journal-audit.mjs [--cwd <公司盘绝对路径>] [--limit N]
// 退出码：0 = 无违规；1 = 有违规（红）；2 = 环境问题（缺 DSH_HOME / 无 zstd）。
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const argOf = name => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
const HOME = process.env.DSH_HOME ?? ''
if (HOME === '' || resolve(HOME) === resolve(join(homedir(), '.dsh'))) {
  console.error('journal-audit: 需要开发 home（先 `source dev/env.sh`）；拒绝在日用 home 上跑')
  process.exit(2)
}
try {
  execFileSync('zstd', ['--version'], { stdio: 'ignore' })
} catch {
  console.error('journal-audit: 需要 `zstd`（会话日志是多 frame zstd，node 内置解不全）')
  process.exit(2)
}

const SESSIONS = join(HOME, 'sessions')
if (!existsSync(SESSIONS)) {
  console.error(`journal-audit: 没有会话库 ${SESSIONS}`)
  process.exit(2)
}
const TARGET = argOf('--cwd') === undefined ? undefined : resolve(argOf('--cwd'))
const LIMIT = Number(argOf('--limit') ?? '400')
// 「收工留痕」硬闸门语气 2026-09-25 才进 skill；早于此的场次按**历史**单列（不判违规——
// 拿今天的规矩去判规则生效前的行为是假阳性，会淹掉真信号）。
const SINCE = Date.parse(argOf('--since') ?? '2026-09-24T00:00:00Z')

const ROLES = ['ceo', 'cfo', 'coo', 'vp-eng', 'vp-sales']
/** 全量解压（team/task 事件在流中后段，必须读全）。 */
const read = file => execFileSync('zstd', ['-d', '-c', file], { maxBuffer: 512 * 1024 * 1024 }).toString('utf8')

/** 只取表头（会话元数据在首行）——不为此解压整个日志。 */
const readHeader = file => execSync(`zstd -d -c ${JSON.stringify(file)} 2>/dev/null | head -c 8000`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

/** 会话库 → [{file, workspace, createdAt, sessionId}]，只取真盘会话（排练场默认排除）。 */
function candidates() {
  const found = []
  for (const bucket of readdirSync(SESSIONS)) {
    const dir = join(SESSIONS, bucket)
    if (!statSync(dir).isDirectory()) continue
    for (const id of readdirSync(dir).slice(0, LIMIT)) {
      // 会话日志有两代（v3 / v4）——只认 v4 会把 09-25 之前的场次全漏掉（首版就漏了 26/30）。
      const sessionDir = join(dir, id)
      if (!statSync(sessionDir).isDirectory()) continue
      const name = readdirSync(sessionDir)
        .filter(entry => /^session\.v\d+\.jsonl\.zstd$/.test(entry))
        .sort()
        .at(-1)
      if (name === undefined) continue
      const file = join(sessionDir, name)
      let header
      try {
        header = JSON.parse(readHeader(file).split('\n', 1)[0])
      } catch { continue }
      const workspace = String(header.cwd ?? '')
      if (!workspace.endsWith('company-workspace')) continue
      if (TARGET !== undefined && resolve(workspace) !== TARGET) continue
      found.push({ file, workspace: resolve(workspace), createdAt: Number(header.createdAt ?? 0), sessionId: String(header.id ?? id) })
    }
  }
  return found
}

/** 从会话日志抽"本场动议"：slug + 出过活的角色 + 时间窗。 */
function motionOf(entry) {
  let last = entry.createdAt
  const owners = new Set()
  const slugs = new Map()
  // owner 是**成员 id**（不是角色名）：靠 team/member 事件建映射；Lead 自己的 id = 会话 id ⇒ ceo。
  // （实测：task 对象只有 ownerId，没有 ownerName——首版按 ownerName 读，全场漏光。）
  const roleOf = new Map()
  for (const line of read(entry.file).split('\n')) {
    if (line === '') continue
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (typeof record.time === 'number') last = Math.max(last, record.time)
    const text = JSON.stringify(record.data ?? {})
    for (const match of text.matchAll(/slug[=＝:\s\\"'`]{1,8}([a-z0-9][a-z0-9-]{2,40})/g)) {
      slugs.set(match[1], (slugs.get(match[1]) ?? 0) + 1)
    }
    // ⚠ 事件形状：任务嵌在 data.task 里（不是 data 顶层）——首版按顶层读，全漏。
    if (record.type === 'team/member') {
      const member = record.data?.member
      if (member?.id !== undefined && member?.name !== undefined) roleOf.set(String(member.id), String(member.name))
    }
    const payload = record.type === 'team/task' ? record.data : undefined
    const task = payload?.task ?? payload
    if (task?.status === 'completed') {
      const raw = String(task.ownerName ?? task.ownerId ?? '')
      const role = roleOf.get(raw) ?? (raw === entry.sessionId ? 'ceo' : raw)
      if (ROLES.includes(role)) owners.add(role)
    }
  }
  const slug = [...slugs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  return { owners: [...owners], slug, from: entry.createdAt - 60 * 60 * 1000, to: last + 2 * 60 * 60 * 1000 }
}
/**
 * 归档区在场：**轮末收敛**会把已闭轮的 journal 压进 CHARTER 并把原文件随快照归档
 * （`snapshots/<场次>/workspace.actual/kb/<角色>/journal/`）——只查 live 目录会把
 * 每一场已收敛的动议误报成缺席（标定时实测：q3 / emergency-x 都被误报）。
 */
function archived(workspace, role, slug) {
  if (slug === undefined) return null
  const repoRoot = resolve(workspace, '..')
  const snapshots = join(repoRoot, 'snapshots')
  if (!existsSync(snapshots)) return null
  for (const scene of readdirSync(snapshots)) {
    const dir = join(snapshots, scene, 'workspace.actual', 'kb', role, 'journal')
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (!statSync(path).isFile()) continue
      if (name.includes(slug) || readFileSync(path, 'utf8').includes(slug)) return `${scene}/${name}`
    }
  }
  return null
}

/** 三级匹配：确认 / 存疑 / 违规。 */
function presence(workspace, role, motion) {
  const dir = join(workspace, 'kb', role, 'journal')
  const inArchive = archived(workspace, role, motion.slug)
  if (inArchive !== null) return { level: 'archived', hit: inArchive }
  if (!existsSync(dir)) return { level: 'missing', hit: null }
  let windowHit = null
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (!statSync(path).isFile()) continue
    const mtime = statSync(path).mtimeMs
    // 文件名命中 = 刻意命名，任何时间都算（含 W8 式**事后补记**）。
    if (motion.slug !== undefined && name.includes(motion.slug)) return { level: 'confirmed', hit: name }
    // 正文命中**必须落在本场时间窗内**：否则后一场的 journal 引用前一场 slug 会被误判成"前一场留了痕"
    // （实测：renewal-x 的 cfo 在场一度靠 revenue-plan 场次的引用蒙对，反证因此翻不了红）。
    const body = readFileSync(path, 'utf8')
    if (motion.slug !== undefined && body.includes(motion.slug) && mtime >= motion.from && mtime <= motion.to) {
      return { level: 'confirmed', hit: name }
    }
    if (mtime >= motion.from && mtime <= motion.to && windowHit === null) windowHit = name
  }
  return windowHit === null ? { level: 'missing', hit: null } : { level: 'suspect', hit: windowHit }
}

/**
 * 格式检查（2026-09-26 加）：本轮真动议实测 **2/6 篇 journal 没以单个换行结尾**（手册明令的格式规则，
 * md-newline 门禁事后才抓得到）⇒ 并进审计，让"格式不合规"和"缺席"一样当场可见。
 */
function formatViolations(workspace, motion) {
  const bad = []
  for (const role of ROLES) {
    const dir = join(workspace, 'kb', role, 'journal')
    if (!existsSync(dir)) continue
    for (const name of readdirSync(dir)) {
      const path = join(dir, name)
      if (!statSync(path).isFile()) continue
      if (motion.slug !== undefined && !name.includes(motion.slug)) continue
      const body = readFileSync(path, 'utf8')
      if (!body.endsWith('\n') || body.endsWith('\n\n')) bad.push(`${role}/${name}`)
    }
  }
  return bad
}

const entries = candidates()
console.log(`journal-audit: 扫 ${String(entries.length)} 个真盘会话（DSH_HOME=${HOME}）`)
let violations = 0
let suspect = 0
let audited = 0
let historical = 0
let formatCount = 0
for (const entry of entries) {
  const motion = motionOf(entry)
  if (motion.owners.length === 0) continue
  if (entry.createdAt < SINCE) { historical += 1; continue }
  audited += 1
  const rows = motion.owners.map(role => ({ role, ...presence(entry.workspace, role, motion) }))
  const bad = rows.filter(row => row.level === 'missing')
  const soft = rows.filter(row => row.level === 'suspect')
  violations += bad.length
  suspect += soft.length
  const format = formatViolations(entry.workspace, motion)
  formatCount += format.length
  const mark = bad.length > 0 || format.length > 0 ? '❌' : soft.length > 0 ? '⚠' : '✅'
  const shortId = entry.sessionId.replace(/^session-/, '').slice(0, 8)
  console.log(`${mark} ${motion.slug ?? '(无 slug)'} @ ${new Date(entry.createdAt).toISOString().slice(0, 16)} 会话 ${shortId}`)
  const label = row => row.level === 'confirmed' ? '确认'
    : row.level === 'archived' ? `在场(已归档 ${String(row.hit)})`
      : row.level === 'suspect' ? `存疑(${String(row.hit)})` : '**缺席**'
  console.log(`   ${rows.map(row => `${row.role}:${label(row)}`).join('  ')}`)
  if (format.length > 0) console.log(`   ⚠ 格式不合规（结尾换行）：${format.join('、')}`)
}
console.log(`\njournal-audit: 审计 ${String(audited)} 场（规则生效后）/ 缺席 ${String(violations)} 条 / 格式不合规 ${String(formatCount)} 条 / 存疑 ${String(suspect)} 条 / 历史场次 ${String(historical)} 场（不计判）`)
console.log(violations === 0 && formatCount === 0 ? 'ALL PASS（无缺席、格式合规）' : 'FAIL（有缺席或格式不合规：收工留痕未落实）')
process.exit(violations === 0 && formatCount === 0 ? 0 : 1)
