#!/usr/bin/env node
// 入口链探针（R6 P3，认证档）：全新上下文 Agent **只读入口链**（AGENTS.md → docs/00-index.md →
// docs/plans/ 队列），回答 8 个"现在"问题。判据 = **零过期、零自相矛盾**（roadmap R6 验收行）。
//
// 断言两层：① token 级（每题期望要点，脚本 regex 断言——见 QUESTIONS）；② 语义级归档给
// 人抽查（答案 + 引用原文一并落 snapshots/entry-probe/<date>/）。答案随文档演进，**不建金样、
// 不进 pnpm test**（真模型不进回归——guides/60 §9.1）。
//
// 反证（2026-09-23 实测，记录在 R6 Note）：把 AGENTS.md 当前条目改成过期值（如"R5b 驾驶舱"）
// → 探针 Agent 在答案里**主动显式报告矛盾**（"AGENTS.md 写 R5b 与 roadmap R6 🔄 相矛盾——
// 这是入口链里的过期状态，不是我不知道答案"），归档 answer.md 语义层可核（grep 矛盾/冲突）；
// 恢复后 8/8 复绿。token 层不因此红是**设计内边界**：矛盾检测属语义层（两处陈述对比），
// 机械层由 doc-budget / notes-links 门禁 + 归档人审承担。
//
// 前置：DSH_HOME + 已装 pack + DEEPSEEK_API_KEY。用法：
//   source dev/env.sh && node scripts/entry-probe-smoke.mjs [--port 3098] [--timeout 240000]
// 驱动形状与 probe-smoke 同构（boot → cookie → session/create → prompt → 等 turn/end → 读日志）；
// 探针 cwd = 排练场（练习场 ≠ 运行场）。
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from './lib/rehearsal.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3098'))
const CWD = resolve(arg('cwd', join(ROOT, REHEARSAL_REL)))
const BOOT_TIMEOUT_MS = 120_000
const TURN_TIMEOUT_MS = Number(arg('timeout', '240000'))

// ── 题单（8 问三分类：状态过期 / 事实家漂移 / 自相矛盾；期望要点 = 机器可核 token） ──
const QUESTIONS = [
  { id: 'Q1-当前条目', ask: '当前进行中的工作是什么？你从哪个文件的哪一节读到的？（只许引用入口链内的文件）', expect: [/R6|内容诊治/, /roadmap/] },
  { id: 'Q2-下一项', ask: '排在它之后的下一项工作是什么？', expect: [/分身成长/] },
  { id: 'Q3-三态规则家', ask: '「交付物三态」（成品/过程稿/排练产物）的规则写在哪个文件？', expect: [/company-workspace\/AGENTS\.md|公司手册/] },
  { id: 'Q4-vendor', ask: 'vendor/dsh 钉在哪个 tag？对它的铁律是什么？', expect: [/dsh-v0\.1\.5-rc\.2|0\.1\.5/, /只读|一个字节|零改动/] },
  { id: 'Q5-preset完成定义', ask: '改了 preset 的 agent.cordis.yml 之后，完成定义是跑哪个脚本？为什么 --dump-config 不算证据？', expect: [/preset-smoke/, /挂载|看不到|行校验发生在挂载时/] },
  { id: 'Q6-流程形态', ask: '本项目接下来的开发流程形态是什么？依据哪个决策（D 号）？', expect: [/feature|条目|队列/, /D23/] },
  { id: 'Q7-认证档边界', ask: '认证档与回归档的边界在哪份文档定义？真模型测试进不进 pnpm test？', expect: [/60-dev-loop|9\.1/, /不进|不进回归|layering/] },
  { id: 'Q8-矛盾裁决', ask: '如果 docs/plans 里某文件的陈述与 notes/implemented 的收尾记录矛盾，以哪边为准？为什么？', expect: [/台账|收尾|implemented|D 号/, /now|过期|计划层|权威/] },
]
const PROMPT = [
  '你是本仓库的fresh审读代理。规则：',
  '1. 只许读三个入口文件：AGENTS.md、docs/00-index.md、docs/plans/roadmap.md（含它们链接到的 docs/ 内文件；',
  '   **不许读 notes/**、不许读代码、不许联网）。',
  '2. 依次回答下面 8 个问题，每题给出：答案 + 你依据的文件与节名。',
  '3. 答不了的题直说"入口链答不了"，不许编。',
  '',
  ...QUESTIONS.map((q, i) => `${i + 1}. ${q.ask}`),
].join('\n')

// ── 驱动（形状照 probe-smoke / guides/60 §8 实证配方） ──
const home = process.env.DSH_HOME
if (home === undefined || home === '') {
  console.error('entry-probe-smoke: 需要 DSH_HOME（先 `source dev/env.sh`；双 home 纪律）')
  process.exit(2)
}
if (!process.argv.includes('--cwd')) ensureRehearsalWorkspace(ROOT)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let rpcId = 0
async function rpc(base, cookie, endpoint, args) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `entryprobe-${++rpcId}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) {
    const message = body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)
    throw new Error(`${endpoint} 失败: ${message}`)
  }
  return body.result.value
}

async function boot() {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--', '--port', String(PORT), '--no-open'],
    { cwd: ROOT, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] },
  )
  let output = ''
  let bannerOutput = ''
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      bannerOutput += String(chunk)
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(bannerOutput)
      if (match !== null) resolveBanner({ port: Number(match[1]), token: match[2] })
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => rejectBanner(new Error(`web 进程提前退出（code ${String(code)}）\n${bannerOutput.slice(-800)}`)))
    setTimeout(() => rejectBanner(new Error(`等待启动横幅超时\n${bannerOutput.slice(-800)}`)), BOOT_TIMEOUT_MS)
  })
  return { child, ...(await banner) }
}

async function authenticate(port, token) {
  const response = await fetch(`http://127.0.0.1:${String(port)}/?token=${token}`, { redirect: 'manual' })
  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('token 交换没有拿到 cookie')
  return cookies.map(c => c.split(';')[0]).join('; ')
}

function collectText(value, out) {
  if (Array.isArray(value)) { for (const item of value) collectText(item, out); return }
  if (value !== null && typeof value === 'object') {
    if (value.type === 'text' && typeof value.text === 'string') out.push(value.text)
    for (const item of Object.values(value)) collectText(item, out)
  }
}

async function readLog(base, cookie, sessionId) {
  const address = { kind: 'session', sessionId }
  let cursor = -1
  try {
    const probe = await rpc(base, cookie, 'session/page', {
      request: { address, throughSeq: Number.MAX_SAFE_INTEGER, maxMessages: 1 },
    })
    cursor = probe.records?.at(-1)?.event?.seq ?? -1
  } catch (error) {
    const match = /past cursor (\d+)/.exec(error.message)
    if (match === null) throw error
    cursor = Number(match[1])
  }
  if (cursor < 0) return { turnEnds: 0, text: '' }
  const page = await rpc(base, cookie, 'session/page', {
    request: { address, throughSeq: cursor, maxMessages: 500 },
  })
  let turnEnds = 0
  const parts = []
  for (const record of page.records ?? []) {
    const event = record.event
    if (event?.type === 'turn/end') { turnEnds++; continue }
    if (event?.type !== 'assistant/message') continue
    collectText(event.data, parts)
  }
  return { turnEnds, text: parts.join('\n') }
}

async function turnReply(base, cookie, sessionId, before, deadline) {
  while (Date.now() < deadline) {
    await sleep(2000)
    const now = await readLog(base, cookie, sessionId)
    if (now.turnEnds > before.turnEnds && now.text.length > before.text.length) {
      return now.text.slice(before.text.length).trim()
    }
  }
  throw new Error(`等待回复超时（${String(TURN_TIMEOUT_MS)}ms）`)
}

// ── 主流程 ──
const failures = []
let passCount = 0
const { child, port, token } = await boot()
let reply = ''
try {
  const base = `http://127.0.0.1:${String(port)}`
  const cookie = await authenticate(port, token)
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD } }) // standard，不挂 preset——测的是入口链不是人格
  const sessionId = created.sessionId
  const before = await readLog(base, cookie, sessionId)
  await rpc(base, cookie, 'session/prompt', {
    request: {
      requestId: `entry-probe-${String(Date.now())}`,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: PROMPT }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  reply = await turnReply(base, cookie, sessionId, before, Date.now() + TURN_TIMEOUT_MS)

  // ── token 断言：每题的答案段内查期望要点（按 Q 编号切分） ──
  for (const [index, q] of QUESTIONS.entries()) {
    const section = reply.split(new RegExp(`^\\s*${String(index + 1)}[.、）\\)]`, 'm'))[1] ?? reply
    const missing = q.expect.filter(pattern => !pattern.test(section))
    if (missing.length === 0) {
      passCount++
      console.log(`  PASS ${q.id}`)
    } else {
      failures.push(`${q.id}: 未命中 ${missing.map(p => String(p)).join(' ; ')}`)
      console.log(`  FAIL ${q.id}: 期望 ${missing.map(p => String(p)).join(' ; ')} 未命中`)
    }
  }
} catch (error) {
  failures.push(`驱动: ${error.message}`)
  console.log(`  FAIL 驱动: ${error.message}`)
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

// ── 归档（语义级抽查的家） ──
const DATE = new Date().toISOString().slice(0, 10)
const OUT_DIR = join(ROOT, 'snapshots/entry-probe', DATE)
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'answer.md'),
  `# 入口链探针归档 · ${DATE}\n\n> 全新上下文（standard preset，排练场 cwd）只读 AGENTS.md → 00-index → roadmap，答 8 问。\n> 判据：零过期、零自相矛盾（token 层 ${String(passCount)}/${String(QUESTIONS.length)} PASS）。\n\n## 原始回答\n\n${reply}\n`)
console.log(`归档 → ${OUT_DIR}/answer.md`)

const total = QUESTIONS.length
console.log(failures.length === 0
  ? `\nentry-probe: ALL PASS（${String(passCount)}/${String(total)}）`
  : `\nentry-probe: ${String(passCount)}/${String(total)} PASS，${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
