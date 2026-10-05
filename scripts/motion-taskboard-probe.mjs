#!/usr/bin/env node
// 状态：常驻
// 真动议首验探针：手册「动议任务板」行的模型行为层验证（2026-10-05，用户点名；真模型 ≈$2–4 / 8–15min，排练场）
// 何时跑：手册「协作规矩·动议任务板」行或协作纪律改动后的首验；真动议观察（与两卡演示观察项同源）
//
// 为什么存在：机制层全绿（taskboard-presence-probe 2/2）≠ 流程被执行——本 probe 验**模型行为层**：
//   prompt 刻意**零任务板指令**（只给动议 + 排练路径硬约束），看 CEO 是否按注入手册自发走
//   「落任务板带 writeScopes → 成员先认领后动笔 → 完成 + 回执」的新流程。
//
// 判据（verify the world：lead 日志 team/* 事件 + 排练产物文件）：
//   A1 CEO 落任务板带 writeScopes——team/task 创建快照 ≥2 且 writeScopes 非空者 ≥2
//   A2 成员先认领后动笔——∃(认领事件, 成员稿)：认领事件 time ≤ 稿 mtime + 2s
//   A3 完成闭环——completed 任务 ≥2 + journal 回执 .md 在场
//   A4 排练不污染——final.md 落指定排练路径 + 公司共享盘 deliverables/ 零新增
// 用法：source dev/env.sh && node scripts/motion-taskboard-probe.mjs
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readdir, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRecords } from './lib/session-log.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REHEARSAL = join(ROOT, 'dev/rehearsal-workspace')
const MOTION_DIR = join(REHEARSAL, 'motion-taskboard')
const DELIVERABLES = join(ROOT, 'company-workspace', 'deliverables')
const ASSETS = join(ROOT, 'snapshots/motion-taskboard-probe/2026-10-05')
mkdirSync(MOTION_DIR, { recursive: true })
mkdirSync(ASSETS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }
const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

// A4 基线：动议前共享盘 deliverables 快照
const deliverablesBefore = existsSync(DELIVERABLES) ? readdirSync(DELIVERABLES).sort().join('|') : ''

let home
try { home = (await import('./lib/runtime-home.mjs')).requireDevHome('motion-taskboard-probe') } catch (e) { console.error(e.message); process.exit(2) }

const child = spawn(process.execPath,
  ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', '0', '--no-open'],
  { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
const banner = await new Promise((res, rej) => {
  const on = c => { output += String(c); const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output); if (m) res({ port: +m[1], token: m[2] }) }
  child.stdout.on('data', on); child.stderr.on('data', on)
  child.on('exit', c => rej(new Error(`web 提前退出 ${c}`))); setTimeout(() => rej(new Error('boot 超时')), 120_000)
})
const base = `http://127.0.0.1:${banner.port}`
console.log(`web up: ${base}`)
try {
  const auth = await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual', signal: AbortSignal.timeout(15000) })
  const cookie = auth.headers.getSetCookie().map(c => c.split(';')[0]).join('; ')
  let rpcId = 0
  const rpc = async (endpoint, args) => {
    const r = await fetch(`${base}/api/${endpoint}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ type: 'client-request', rpcId: `mtp-${++rpcId}`, method: endpoint, payload: { args } }) })
    const body = await r.json()
    if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? '?'}`)
    return body.result.value
  }

  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  console.log('ceo session', sessionId)

  const MOTION = `开一个小动议（排练性质，严格按公司手册流程走完整闭环）。
口径已定，无需向任何人澄清，直接开工：
主题：竞品官网改版快照与配套投放建议。竞品 = 虚构的「竞品甲」「竞品乙」（改版方向：首页信息
架构重排 + 移动端优先）；内容全部虚构，不需要联网调研。
产出与分工：① 竞品官网改版快照（vp-eng 出稿）= 一页对照表（两家各 3 条改动点 + 1 条 takeaway）；
② 配套投放建议（vp-sales 出稿）= 150 字内的投放口径建议；最后你合稿 final.md。
排练硬约束：本动议所有产物（drafts、final、meta、journal）一律写到绝对路径
${MOTION_DIR}/ 下（drafts/ 与 journal/ 子目录按手册形状自建），不要写工作目录的其他任何位置；
成员的 CHARTER 在 ${REHEARSAL}/kb/<角色>/CHARTER.md。
完成标准：两位成员各出一份稿 + 你合稿 final.md；全程按手册协作规矩（动议从 CEO 进出、
任务板、署名行、收工留痕）。`

  await rpc('session/prompt', { request: { requestId: `mtp-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（零任务板指令——行为层首验）')

  const deadline = Date.now() + 20 * 60_000
  let evs = []
  const completedSubjects = list => new Set(list.filter(e => {
    const t = e?.data?.task ?? e?.data
    return typeof t?.subject === 'string' && t?.status === 'completed'
  }).map(e => (e?.data?.task ?? e?.data).subject))
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)
    const finalExists = walk(MOTION_DIR).some(p => p.endsWith('final.md'))
    if (completedSubjects(evs.filter(e => e?.type === 'team/task')).size >= 2 && finalExists
      && evs.filter(e => e?.type === 'turn/end').length >= 1) break
    await sleep(10_000)
  }
  await sleep(10_000)
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(r => r.event).filter(Boolean)

  const taskSnaps = evs.filter(e => e?.type === 'team/task').map(e => ({ t: e?.data?.task ?? e?.data, time: e?.time }))
  const tasksById = new Map()
  for (const { t, time } of taskSnaps) if (t && typeof t.id === 'string') {
    if (!tasksById.has(t.id)) tasksById.set(t.id, { subject: t.subject, scopesSeen: [], claimTime: undefined })
    const rec = tasksById.get(t.id)
    if (Array.isArray(t.writeScopes) && t.writeScopes.length > 0 && rec.scopesSeen.length === 0) rec.scopesSeen = t.writeScopes
    if (t.ownerId && rec.claimTime === undefined) rec.claimTime = typeof time === 'number' ? time : Date.parse(time ?? '') || undefined
  }
  const tasks = [...tasksById.values()]
  const withScopes = tasks.filter(t => t.scopesSeen.length > 0)
  check('A1 CEO 落任务板带 writeScopes', tasks.length >= 2 && withScopes.length >= 2,
    `任务=${tasks.length} 带 writeScopes=${withScopes.length} 样例=${JSON.stringify(withScopes[0]?.scopesSeen ?? null)}`)

  const memberMap = new Map()
  for (const e of evs.filter(e => e?.type === 'team/member')) {
    const m = e?.data?.member ?? e?.data
    if (m && typeof m.id === 'string' && typeof m.name === 'string') memberMap.set(m.id, m.name)
  }
  const draftFiles = walk(MOTION_DIR).filter(p => p.includes('drafts') && p.endsWith('.md'))
  let claimBeforeWrite = 0
  for (const t of tasks) {
    if (t.claimTime === undefined) continue
    const owner = memberMap.get(t.ownerId) ?? ''
    for (const f of draftFiles) {
      const mtime = statSync(f).mtimeMs
      if (mtime + 2000 >= t.claimTime && (owner === '' || f.toLowerCase().includes(owner))) { claimBeforeWrite++; break }
    }
  }
  check('A2 成员先认领后动笔', draftFiles.length >= 2 && claimBeforeWrite >= 1,
    `稿=${draftFiles.length} 认领→写配对=${claimBeforeWrite}（认领事件 time ≤ 稿 mtime + 2s）`)

  const allFiles = walk(MOTION_DIR)
  const completedCount = completedSubjects(evs.filter(e => e?.type === 'team/task')).size
  const journalFiles = allFiles.filter(p => p.includes('journal') && p.endsWith('.md'))
  check('A3 完成闭环——任务 completed + journal 回执在场', completedCount >= 2 && journalFiles.length >= 1,
    `completed=${completedCount} journal=${journalFiles.length}`)

  const finalFile = allFiles.find(p => p.endsWith('final.md'))
  const deliverablesAfter = existsSync(DELIVERABLES) ? readdirSync(DELIVERABLES).sort().join('|') : ''
  check('A4 排练不污染——final 落排练路径 + 共享盘 deliverables 零新增',
    finalFile !== undefined && deliverablesAfter === deliverablesBefore,
    `final=${finalFile ?? '缺'} deliverables 新增=${deliverablesAfter.split('|').filter(x => !deliverablesBefore.split('|').includes(x)).join(',') || '无'}`)

  writeFileSync(join(ASSETS, 'probe-stdout.md'), `# motion-taskboard-probe 2026-10-05\n\nsession: ${sessionId}\n判据明细：\n${results.map(r => `- ${r.ok ? 'PASS' : 'FAIL'} ${r.label}${r.detail ? `（${r.detail}）` : ''}`).join('\n')}\n\n产物清单：\n${allFiles.map(p => '- ' + p.replace(MOTION_DIR, '')).join('\n')}\n`)
  writeFileSync(join(ASSETS, `probe-stdout-${new Date().toISOString().replace(/[:.]/g, '-')}.md`), `# motion-taskboard-probe 2026-10-05\n\nsession: ${sessionId}\n判据明细：\n${results.map(r => `- ${r.ok ? 'PASS' : 'FAIL'} ${r.label}${r.detail ? `（${r.detail}）` : ''}`).join('\n')}\n`)
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nmotion-taskboard-probe: ALL PASS（${results.length}/${results.length}）——手册「动议任务板」行被模型真实执行`
    : `\nmotion-taskboard-probe: ${failed.length} FAILURE(S)——见各判据原文`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}
