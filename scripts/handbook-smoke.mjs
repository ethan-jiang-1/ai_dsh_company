#!/usr/bin/env node
// 公司手册注入验收（会话级验证）：boot 真 web → 真挂 preset → 真发一个 prompt → 读会话日志里的
// **指令基线**事件（`user/message` + `source.kind === 'agent-instructions'` + `baseline === true`）。
//
// 为什么需要它（D15 + D7）：`agent-instructions` 的载体是"从 projectRoot 到 cwd 的 AGENTS.md 链"，
// 而 projectRoot 默认靠 `.git` 认——公司共享盘在开发仓库里，认错根就会把**本仓的开发 AGENTS.md**
// （vendor 铁律等）灌进角色会话。所以必须断言"注入的是 `company-workspace/AGENTS.md`、不是仓库根
// 那份"，这正是 preset 里 `projectRootMarkers: []` 的作用。preset-smoke 只能证明行能挂上，
// 证明不了注入内容；本脚本是这条线的完成定义。
//
// 前置：DSH_HOME + 已装 pack + 模型凭据（每个角色 1 次小调用）。
// 用法：source dev/env.sh && node scripts/handbook-smoke.mjs [--roles ceo,vp-eng] [--port 3096]
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collectText, readRecords } from './lib/session-log.mjs'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from './lib/rehearsal.mjs'
import { requireDevHome } from './lib/runtime-home.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3096'))
const ROLES = arg('roles', 'ceo').split(',').map(role => role.trim()).filter(role => role !== '')
// 练习场 ≠ 运行场（轮间待办②）：默认 cwd 在排练场，排练/探针产物不再积进真盘；
// `--cwd` 可显式覆盖。排练场的 AGENTS.md 是指向真盘手册的符号链接 ⇒ 注入基线仍是手册，
// projectRootMarkers: [] ⇒ 指令链只认 cwd，不会向上混入开发仓库 AGENTS.md——断言语义不变。
const CWD = resolve(arg('cwd', join(ROOT, REHEARSAL_REL)))
const BOOT_TIMEOUT_MS = 120_000
const BASELINE_TIMEOUT_MS = 120_000

/** 手册里必须出现、且**只**可能来自 `company-workspace/AGENTS.md` 的字符串。 */
const HANDBOOK_MARKERS = ['公司手册', '事实的家', '唯一事实家']
/** 只可能来自**本仓开发用** AGENTS.md 的字符串——出现即说明 projectRoot 认到了仓库根。 */
const DEV_REPO_MARKERS = ['vendor 铁律', 'pnpm verify', '双 home']

let home
try {
  home = requireDevHome('handbook-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
if (!process.argv.includes('--cwd')) ensureRehearsalWorkspace(ROOT)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let rpcId = 0

/** 向运行中的 web 实例发一条 Typert RPC（与 preset-smoke / probe-smoke 同一封套）。 */
async function rpc(base, cookie, endpoint, args) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `handbook-${++rpcId}`, method: endpoint, payload: { args } }),
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
  const banner = new Promise((resolveBanner, rejectBanner) => {
    const onData = (chunk) => {
      output += String(chunk)
      const match = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
      if (match !== null) resolveBanner({ port: Number(match[1]), token: match[2] })
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)
    child.on('exit', (code) => rejectBanner(new Error(`web 进程提前退出（code ${String(code)}）\n${output.slice(-800)}`)))
    setTimeout(() => rejectBanner(new Error(`等待启动横幅超时\n${output.slice(-800)}`)), BOOT_TIMEOUT_MS)
  })
  return { child, ...(await banner) }
}

async function authenticate(port, token) {
  const response = await fetch(`http://127.0.0.1:${String(port)}/?token=${token}`, { redirect: 'manual' })
  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('token 交换没有拿到 cookie')
  return cookies.map(c => c.split(';')[0]).join('; ')
}

/** 等指令基线事件出现（它由首个请求的 pre-step 追加，早于模型回复）。 */
async function waitBaseline(page, address, deadline) {
  for (;;) {
    for (const record of await readRecords(page, address)) {
      const event = record.event
      if (event?.type !== 'user/message') continue
      const source = event.data?.source
      if (source?.kind !== 'agent-instructions' || source?.baseline !== true) continue
      return collectText(event.data).join('\n')
    }
    if (Date.now() > deadline) throw new Error(`等指令基线超时（${String(BASELINE_TIMEOUT_MS)}ms）`)
    await sleep(1000)
  }
}

const failures = []
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  (error) => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)

const { child, port, token } = await boot()
try {
  const base = `http://127.0.0.1:${String(port)}`
  const cookie = await authenticate(port, token)

  for (const role of ROLES) {
    await check(`${role} 注入公司手册（且不是开发仓库的 AGENTS.md）`, async () => {
      const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: role } })
      const sessionId = created?.sessionId ?? created?.id
      if (typeof sessionId !== 'string') throw new Error(`session/create 没返回会话 id：${JSON.stringify(created).slice(0, 200)}`)
      await rpc(base, cookie, 'session/prompt', {
        request: {
          requestId: `handbook-${role}-${String(Date.now())}`,
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text: '用一句话说明你是谁。' }],
          clientTimeZone: 'Asia/Shanghai',
        },
      })
      const page = (request) => rpc(base, cookie, 'session/page', { request })
      const baseline = await waitBaseline(page, { kind: 'session', sessionId }, Date.now() + BASELINE_TIMEOUT_MS)
      const missing = HANDBOOK_MARKERS.filter(marker => !baseline.includes(marker))
      if (missing.length > 0) {
        throw new Error(`基线里没有手册内容（缺 ${missing.join(' / ')}）\n──基线──\n${baseline.slice(0, 600)}`)
      }
      const leaked = DEV_REPO_MARKERS.filter(marker => baseline.includes(marker))
      if (leaked.length > 0) {
        throw new Error(`基线里混进了开发仓库 AGENTS.md 的内容（${leaked.join(' / ')}）——projectRootMarkers 没生效？`)
      }
    })
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures.length === 0
  ? `\nhandbook-smoke: ALL PASS（${ROLES.join(', ')} 的指令基线 = 公司手册，未混入开发仓库 AGENTS.md）`
  : `\nhandbook-smoke: ${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
