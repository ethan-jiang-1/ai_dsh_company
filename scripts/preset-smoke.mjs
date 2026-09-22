#!/usr/bin/env node
// preset 冒烟（上线前门禁）：boot 真 web profile，逐个 preset 建一次会话，断言挂载成功。
//
// 为什么必须有它（R1 实证）：preset 的失败发生在"**会话创建时挂载**"——Loader 用每行的 config
// 校验插件 schema，任一必填字段缺失就让整个 preset 挂载失败（agent-preset/invalid）。
// 而 roster 扫描（discoverPresets）只解析 YAML + 解析包名，`--dump-config` 只打印 profile 树，
// 两者都看不到 config 校验；**UI 还会把错误吞掉**（"新建会话点了没反应"）。
// 所以唯一能上线前抓住它的手段是：走真入口路径（web RPC session/create）挂一次。
//
// 前置：DSH_HOME 指向已装本 pack 的 profile（`source dev/env.sh` 后用 dev home），
//       client 面与前端 dist 已构建（guides/60 §7）。
// 用法：source dev/env.sh && node scripts/preset-smoke.mjs [--port 3099] [--profile web]
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '3099'))
const PROFILE = arg('profile', 'web')
const CWD = resolve(arg('cwd', join(ROOT, 'company-workspace')))
const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo']
const BOOT_TIMEOUT_MS = 120_000

const home = process.env.DSH_HOME
if (home === undefined || home === '') {
  console.error('preset-smoke: 需要 DSH_HOME（先 `source dev/env.sh`；双 home 纪律：别碰日用 ~/.dsh）')
  process.exit(2)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let rpcId = 0

/** 向运行中的 web 实例发一条 Typert RPC。 */
async function rpc(base, cookie, endpoint, args) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `smoke-${++rpcId}`, method: endpoint, payload: { args } }),
  })
  const body = await response.json()
  if (body?.result?.ok !== true) {
    const message = body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)
    throw new Error(`${endpoint} 失败: ${message}`)
  }
  return body.result.value
}

/** boot web profile，等到启动横幅打印带 token 的 URL。 */
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
  const ready = await banner
  return { child, ...ready }
}

/** token → 会话 cookie（按 origin 隔离）。 */
async function authenticate(port, token) {
  const response = await fetch(`http://127.0.0.1:${String(port)}/?token=${token}`, { redirect: 'manual' })
  const cookies = response.headers.getSetCookie?.() ?? []
  if (cookies.length === 0) throw new Error('token 交换没有拿到 cookie')
  return cookies.map(c => c.split(';')[0]).join('; ')
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

  // ① roster：四个角色都在且零 broken（扫不到就不必谈挂载）
  //    `agentPresets/list` 无参数 → args 就是空对象；`session/create(request)` → args 是 { request }
  const roster = await rpc(base, cookie, 'agentPresets/list', {})
  const presets = roster.presets ?? []
  for (const role of ROLES) {
    await check(`roster 含 ${role}`, async () => {
      const row = presets.find(p => p.id === role)
      if (row === undefined) throw new Error(`roster 里没有 ${role}（共 ${presets.length} 条）`)
      if (row.broken !== undefined) throw new Error(`preset 被标 broken：${String(row.broken).slice(0, 160)}`)
    })
  }

  // ② 真入口：逐个 preset 建会话——**这一步才会触发行 config 校验**
  for (const role of ROLES) {
    await check(`session/create 挂上 ${role}`, async () => {
      const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: role } })
      if (created?.agentPreset !== role) throw new Error(`返回的 preset 不是 ${role}：${JSON.stringify(created)}`)
    })
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures.length === 0
  ? `\npreset-smoke: ALL PASS（${ROLES.length} 个 preset 全部可挂载）`
  : `\npreset-smoke: ${failures.length} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
