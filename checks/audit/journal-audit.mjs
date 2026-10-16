#!/usr/bin/env node
// 状态：常驻
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
//     🟡 已知历史缺口 = 已被角色 CHARTER / Note 承认、且早于对应纪律强制面落地的历史缺席——
//       每次照报提醒、**不进退出码**（deliverables-check「观察项」同款档，2026-10-05 立）
// 输入 = `$DSH_HOME/sessions/` 里的**真盘**会话（排练场默认排除——排练产物本就不写公司盘）。
// 用法：source run/env.sh && node checks/audit/journal-audit.mjs [--cwd <公司盘绝对路径>] [--limit N]
// 退出码：0 = 无违规；1 = 有违规（红）；2 = 环境问题（缺 DSH_HOME / 无 zstd）。
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { snapshotScenes } from '../../tools/lib/repository-layout.mjs'
import { pickArchivedJournal } from '../../tools/lib/converge-rules.mjs'
import { pickSessionLog } from '../../tools/lib/session-log-generation.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { COMPANY_ROLE_IDS } from '../../tools/lib/company-roles.mjs'
import { zstdText } from '../../tools/drivers/zstd.mjs'

const args = process.argv.slice(2)
const argOf = name => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}
// 日用 home 拒绝走家族守卫（2026-10-07 体检轮接线：原手搓等值检查只挡精确命中，漏双向重叠与符号链接别名）
const HOME = (() => { try { return requireDevHome('journal-audit') } catch (error) { console.error(error.message); process.exit(2) } })()
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

/**
 * 已知历史缺口名册（2026-10-05 立；观察项档，不进退出码）。入册三条件：①缺席为真且角色侧
 * 已承认（CHARTER/Note 既成记录）；②场次早于纪律强制面落地（journal 硬闸门语气 2026-09-25
 * 才进 skill——journal-presence-mechanism Note）；③经标定期判例确认。
 *
 * ⚠ **2026-10-16 二次标定（检索口径收紧后复核）**：当日先修「只认老归档形状」的检索盲区，
 * 中途一度据「内容命中」判 coo 在场并清了名册——**那是假阳性**（内容匹配把别的场的纪要当成
 * 本场证据）。收紧为**只认文件名命中**后复核：`emergency-x-incident-review` 的归档区**确实只有
 * ceo 一篇**（`workspace.actual/kb/ceo/journal/…`），coo 与 vp-eng 当轮真没留 journal——
 * 与 `kb/coo/CHARTER.md:34`、`kb/vp-eng/CHARTER.md:30` 的「当轮未留 journal，W8 同款缺口」
 * 逐字对上 ⇒ **两处都是已承认的真缺口，名册该收两条（原来只收了 coo，漏了 vp-eng）**。
 * 教训写在这里：**在场判据宁可收紧**——假阳性在场会比漏报更坏，它会静默掩盖真缺口。
 */
const KNOWN_MISSES = [
  { sessionIdPrefix: '6a0e551f', role: 'coo', reason: 'emergency-x 09-24：硬闸门（09-25 落地）前的场次，CHARTER 已承认（W8 同款缺口）' },
  { sessionIdPrefix: '6a0e551f', role: 'vp-eng', reason: 'emergency-x 09-24：同场同因，CHARTER「当轮未留 journal，W8 同款缺口」已承认（2026-10-16 补入）' },
]
const isKnownMiss = (entry, role) =>
  KNOWN_MISSES.some(k => entry.sessionId.startsWith(`session-${k.sessionIdPrefix}`) && k.role === role)

// 本文件的角色序 = 字母序（显示口径沿旧），成员资格从唯一事实家派生（company-roles.mjs 保语义序）。
const ROLES = [...COMPANY_ROLE_IDS].sort()
/** 全量解压（team/task 事件在流中后段，必须读全）。 */
const read = file => zstdText(file, { maxBuffer: 512 * 1024 * 1024 })

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
      // 世代选择唯一口径 = session-log-generation（版本化数值取最高——只认单一世代或按字典序都会漏场/读旧世代）。
      const name = pickSessionLog(sessionDir)?.name
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
  // 多人形态（2026-09-26 补，修一处**假绿**）：`owners` 只从 `team/task` 事件推 ⇒ 多人模式下
  // CEO **不 spawn 成员**、没有任务板事件 ⇒ owners 为空 ⇒ 整场被下面的 `owners.length === 0`
  // **静默跳过**，审计照样 ALL PASS。补一条：**根会话自己就是参与角色**——但只算**真正提到该 slug**
  // 的那些（否则任何根会话都会把它的角色算进来，凭空误报缺席）。
  let selfRole
  let isRootSession = false
  const mySlugs = new Set()
  for (const line of read(entry.file).split('\n')) {
    if (line === '') continue
    let record
    try { record = JSON.parse(line) } catch { continue }
    if (typeof record.time === 'number') last = Math.max(last, record.time)
    // 首行是 `type: session` 的 header，带 agentPreset / delegationDepth（实测两代日志都有）。
    if (record.type === 'session') {
      isRootSession = record.delegationDepth === 0
      const preset = String(record.agentPreset ?? '')
      if (ROLES.includes(preset)) selfRole = preset
    }
    const text = JSON.stringify(record.data ?? {})
    for (const match of text.matchAll(/slug[=＝:\s\\"'`]{1,8}([a-z0-9][a-z0-9-]{2,40})/g)) {
      slugs.set(match[1], (slugs.get(match[1]) ?? 0) + 1)
      mySlugs.add(match[1])
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
  if (isRootSession && selfRole !== undefined && slug !== undefined && mySlugs.has(slug)) owners.add(selfRole)
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
  // 两种归档形状都认（判据纯逻辑 = lib `pickArchivedJournal`，keyless spec 在
  // tests/company/converge-rules.spec.ts）：
  //   ① 老：`<场景>/workspace.actual/kb/<角色>/journal/`（memory-convergence-* 的整盘拷贝形状）；
  //   ② 新：`<场景>/<dirName>/journal/<角色>/`（现行 converge 的证据副本形状）。
  // ⚠ 2026-10-16 实测：只认形状① ⇒ 命名换代后**收敛过的场次全被误报缺席**（16 条缺席里 9 场有证据）。
  for (const scene of snapshotScenes(repoRoot)) {
    const dirs = [
      join(scene.path, 'workspace.actual', 'kb', role, 'journal'),
      ...readdirSyncSafe(scene.path).map(entry => join(scene.path, entry, 'journal', role)),
    ]
    const hit = pickArchivedJournal({ dirs, slug })
    if (hit !== null) return `${scene.kind}/${scene.name}/${hit.slice(scene.path.length + 1)}`
  }
  return null
}

/** 列目录，失败给空数组（场景目录可能被清过 / 无权限）。 */
function readdirSyncSafe(dir) {
  try { return readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name) } catch { return [] }
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
let knownCount = 0
for (const entry of entries) {
  const motion = motionOf(entry)
  if (motion.owners.length === 0) continue
  if (entry.createdAt < SINCE) { historical += 1; continue }
  audited += 1
  const rows = motion.owners.map(role => ({ role, known: isKnownMiss(entry, role), ...presence(entry.workspace, role, motion) }))
  const bad = rows.filter(row => row.level === 'missing' && !row.known)
  const knownMisses = rows.filter(row => row.level === 'missing' && row.known)
  const soft = rows.filter(row => row.level === 'suspect')
  violations += bad.length
  knownCount += knownMisses.length
  suspect += soft.length
  const format = formatViolations(entry.workspace, motion)
  formatCount += format.length
  const mark = bad.length > 0 || format.length > 0 ? '❌' : knownMisses.length > 0 ? '🟡' : soft.length > 0 ? '⚠' : '✅'
  const shortId = entry.sessionId.replace(/^session-/, '').slice(0, 8)
  console.log(`${mark} ${motion.slug ?? '(无 slug)'} @ ${new Date(entry.createdAt).toISOString().slice(0, 16)} 会话 ${shortId}`)
  const label = row => row.level === 'confirmed' ? '确认'
    : row.level === 'archived' ? `在场(已归档 ${String(row.hit)})`
      : row.level === 'suspect' ? `存疑(${String(row.hit)})`
        : row.known ? `缺席(已承认历史缺口：${KNOWN_MISSES.find(k => k.role === row.role)?.reason ?? ''})` : '**缺席**'
  console.log(`   ${rows.map(row => `${row.role}:${label(row)}`).join('  ')}`)
  if (format.length > 0) console.log(`   ⚠ 格式不合规（结尾换行）：${format.join('、')}`)
}
console.log(`\njournal-audit: 审计 ${String(audited)} 场（规则生效后）/ 缺席 ${String(violations)} 条 / 格式不合规 ${String(formatCount)} 条 / 存疑 ${String(suspect)} 条 / 已知历史缺口 ${String(knownCount)} 条（每次提醒、不进退出码）/ 历史场次 ${String(historical)} 场（不计判）`)
console.log(violations === 0 && formatCount === 0 ? 'ALL PASS（无新缺席、格式合规）' : 'FAIL（有缺席或格式不合规：收工留痕未落实）')
process.exit(violations === 0 && formatCount === 0 ? 0 : 1)
