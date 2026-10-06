#!/usr/bin/env node
// 状态：常驻
// browser-use 行为链探针（维护者侧，deferred-verifications 第 1 笔判收，2026-10-05；零模型调用=零 API 成本）
// 何时跑：browser-use 行为验证判收 / vendor 升 pin 涉及 @playwright/mcp 或 chromium 缓存时复跑
//
// 为什么存在：批5b 两轮只证到「工具调用落日志 + 模型诚实回退」——**导航成功本身从未被观察**。
// 本 probe 在维护者侧**镜像 provider 拉起链**（cli.js --browser chromium --isolated --headless，与
// experimental/browser-use-playwright-mcp/src/index.ts 逐参一致；pack Config = launch+headless），
// 把行为链一次测穿：导航→读内容→点击→输入。
//
// 判据（verify the world：MCP stdio JSON-RPC 真调用，无 mock）：
//   B0 缓存重定向进栅栏——PLAYWRIGHT_BROWSERS_PATH 指进排练场（chromium-1243 symlink 回机器缓存，
//      读不受栅栏限、写全落 workspace），标记文件 b/browser@* 落在栅栏内 ⇒ 全程无沙箱升级
//   B1 栈自检——server init 成功，tools/list 含 browser_navigate/browser_snapshot/browser_click/browser_type
//   B2 navigate 真成功——browser_navigate 无 isError 且响应含 fixture 标题
//   B3 内容保真——browser_snapshot 含 fixture 标记文本
//   B4 后续行为——click 后 snapshot 出现 CLICKED-OK；type 后出现 ECHO:probe-typed（≥2 个 navigate 外真调用）
//   B5 资产——判据明细 + 交互快照落 snapshots/probes/browser-behavior-probe/2026-10-04/
//
// 机制事实（2026-10-05 实测四条，写判据前/迭代中实证）：
//   ① @playwright/mcp initializeServer 写 ~/Library/Caches/ms-playwright/b/browser@* 标记——workspace
//      沙箱三度 EPERM（角色会话 ×2 + 维护者层 ×1）＝批5b 以来导航未成的根因；
//   ② 0.0.80 屏蔽 file: 协议 ⇒ fixture 必须走 http（本 probe 自起 127.0.0.1 static server）；
//   ③ 标记目录由 serverRegistry 的 registryDirectory2() 从 defaultCacheDirectory2() 直连构造，
//      env 免疫（PLAYWRIGHT_BROWSERS_PATH 管不到）⇒ HOME 重定向兜住（os.homedir() 认 $HOME）；
//   ④ Target crashed 根因 = MCP 默认启用 chromium 全进程内沙箱（--no-sandbox 旗子语义：
//      "disable the sandbox for all process types that are normally sandboxed"）在 DSH seatbelt
//      内嵌套崩溃——裸 playwright-core 默认 chromiumSandbox:false 故 A/B 双过。拉起加
//      --no-sandbox ⇒ **栅栏内 5/5（零升级）**。
//
// seam 选型证据（2026-10-05 源码定位，coreBundle serverRegistry.ts 段）：
//   ③ 标记写者 = @playwright/mcp 0.0.80 的 serverRegistry——registryDirectory2() =
//      join(defaultCacheDirectory2(), "ms-playwright", "b") **直连默认缓存、env 免疫**
//      （macOS 分支连 XDG_CACHE_HOME 都不认）；每次 launch 写 browser@<guid> liveness 标记、
//      退出删。⇒ 上游正解 = registryDirectory2 尊重 PLAYWRIGHT_BROWSERS_PATH（一行）；
//      配置面 workaround = provider env 透传 HOME（os.homedir() 认 $HOME ⇒ 标记落 workspace）。
//      本 probe 两个旋钮都拧上做机制验证（全程无沙箱升级）。
//
// 用法：node scripts/probes/browser-behavior-probe.mjs（栅栏内自证，无需沙箱升级）
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { REHEARSAL_REL } from '../lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { dirname, join, resolve } from 'node:path'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const ASSETS = join(ROOT, 'snapshots/probes/browser-behavior-probe/2026-10-04')
mkdirSync(join(REHEARSAL, 'browser-probe'), { recursive: true })
mkdirSync(ASSETS, { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

// 自含交互 fixture：导航/读内容/点击/输入四个行为各有断言锚点（排练场 = gitignored 运行残留）
const FIXTURE = join(REHEARSAL, 'browser-probe', 'fixture.html')
const FIXTURE_HTML = `<!doctype html><html><head><title>browser-probe fixture</title></head><body>
<h1>BROWSER-PROBE-MARKER</h1>
<input id="echo" placeholder="type here" oninput="document.getElementById('out').textContent='ECHO:'+this.value">
<button id="go" onclick="document.getElementById('out').textContent='CLICKED-OK'">go</button>
<div id="out">idle</div></body></html>`
writeFileSync(FIXTURE, FIXTURE_HTML)

// B0：浏览器根重定向进排练场（「放到栅栏里头，不用撞墙」——用户直觉的机制验证）
const PW_BROWSERS = join(REHEARSAL, 'browser-probe', 'pw-browsers')
mkdirSync(PW_BROWSERS, { recursive: true })
const FAKE_HOME = join(REHEARSAL, 'browser-probe', 'home')
mkdirSync(FAKE_HOME, { recursive: true })
const MACHINE_CACHE = join(process.env.HOME ?? '', 'Library', 'Caches', 'ms-playwright')
if (existsSync(MACHINE_CACHE)) {
  for (const d of readdirSync(MACHINE_CACHE).filter(n => n.startsWith('chromium'))) {
    const target = join(PW_BROWSERS, d)
    if (!existsSync(target)) {
      try { symlinkSync(join(MACHINE_CACHE, d), target) } catch (e) { if (e?.code !== 'EEXIST') throw e }
    }
  }
}

// 机制事实②：file: 协议被 0.0.80 屏蔽 ⇒ fixture 走本地 http static server
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(FIXTURE_HTML)
})
const fixturePort = await new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)))
const FIXTURE_URL = `http://127.0.0.1:${fixturePort}/fixture.html`

// 镜像 provider 的解析与拉起（experimental/browser-use-playwright-mcp/src/index.ts:28-41 同款）；
// env 多带一个 PLAYWRIGHT_BROWSERS_PATH（provider 今日未暴露此面 = seam 缺口本体）
const requireFromProvider = createRequire(join(ROOT, 'vendor/dsh/packages/experimental/browser-use-playwright-mcp/lib/index.js'))
const cli = join(dirname(requireFromProvider.resolve('@playwright/mcp/package.json')), 'cli.js')
const child = spawn(process.execPath, [cli, '--browser', 'chromium', '--isolated', '--headless', '--no-sandbox'],
  { cwd: REHEARSAL, env: { ...process.env, HOME: FAKE_HOME, PLAYWRIGHT_BROWSERS_PATH: PW_BROWSERS }, stdio: ['pipe', 'pipe', 'pipe'] })
let stderrLog = ''
child.stderr.on('data', c => { stderrLog += String(c) })
child.on('exit', code => { stderrLog += `\n[server exited ${code}]` })

let buf = ''
const pending = new Map()
let rpcId = 0
child.stdout.on('data', chunk => {
  buf += String(chunk)
  let idx
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1)
    if (!line) continue
    let msg; try { msg = JSON.parse(line) } catch { continue }
    if (msg.id !== undefined && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  }
})
const rpc = (method, params, timeoutMs = 60_000) => new Promise((res, rej) => {
  const id = ++rpcId
  const timer = setTimeout(() => { pending.delete(id); rej(new Error(`${method} 超时；stderr 尾部=${stderrLog.slice(-400)}`)) }, timeoutMs)
  pending.set(id, msg => { clearTimeout(timer); res(msg) })
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }) + '\n')
})
const resultText = result => (result?.content ?? []).map(c => c?.text ?? '').join('\n')

try {
  const init = await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {},
    clientInfo: { name: 'browser-behavior-probe', version: '0.0.1' } })
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
  const tools = await rpc('tools/list')
  const names = (tools.result?.tools ?? []).map(t => t.name)
  const REQUIRED = ['browser_navigate', 'browser_snapshot', 'browser_click', 'browser_type']
  check('B1 栈自检——server init + 浏览器工具挂载', init.result?.serverInfo?.name !== undefined
    && REQUIRED.every(n => names.includes(n)), `tools=${names.length} server=${init.result?.serverInfo?.name ?? '?'}`)

  const nav = await rpc('tools/call', { name: 'browser_navigate', arguments: { url: FIXTURE_URL } })
  const navText = resultText(nav.result)
  check('B0 缓存重定向进栅栏——标记文件落 workspace（全程无升级）',
    existsSync(join(FAKE_HOME, 'Library', 'Caches', 'ms-playwright', 'b'))
      || existsSync(join(PW_BROWSERS, 'b')),
    `HOME 侧 b/=${existsSync(join(FAKE_HOME, 'Library', 'Caches', 'ms-playwright', 'b'))} PW 侧 b/=${existsSync(join(PW_BROWSERS, 'b'))}`)
  check('B2 navigate 真成功', nav.result?.isError !== true && navText.includes('browser-probe fixture'),
    `isError=${String(nav.result?.isError)} 标题在场=${navText.includes('browser-probe fixture')} 原始=${JSON.stringify(nav.result).slice(0, 300)} stderr尾=${stderrLog.slice(-200)}`)

  const snap1 = await rpc('tools/call', { name: 'browser_snapshot' })
  const snap1Text = resultText(snap1.result)
  check('B3 内容保真——snapshot 含标记文本', snap1.result?.isError !== true && snap1Text.includes('BROWSER-PROBE-MARKER'),
    `标记在场=${snap1Text.includes('BROWSER-PROBE-MARKER')}`)

  const refOf = (text, pattern) => { const m = text.match(pattern); return m?.[1] }
  const btnRef = refOf(snap1Text, /button "go"[^[]*\[ref=([^\]]+)\]/) ?? refOf(snap1Text, /ref=([^\s\]]+)/)
  const boxRef = refOf(snap1Text, /textbox[^[]*\[ref=([^\]]+)\]/)
  const click = await rpc('tools/call', { name: 'browser_click', arguments: { element: 'go button', target: btnRef } })
  const snap2 = await rpc('tools/call', { name: 'browser_snapshot' })
  const snap2Text = resultText(snap2.result)
  const type = await rpc('tools/call', { name: 'browser_type', arguments: { element: 'echo input', target: boxRef, text: 'probe-typed' } })
  const snap3 = await rpc('tools/call', { name: 'browser_snapshot' })
  const snap3Text = resultText(snap3.result)
  check('B4 后续行为——click/type 真调用并生效',
    click.result?.isError !== true && snap2Text.includes('CLICKED-OK')
    && type.result?.isError !== true && snap3Text.includes('ECHO:probe-typed'),
    `click.isError=${String(click.result?.isError)} click原文=${resultText(click.result).replace(/\n/g, ' ').slice(0, 220)} | type.isError=${String(type.result?.isError)} type原文=${resultText(type.result).replace(/\n/g, ' ').slice(0, 150)} | snap2含CLICKED=${snap2Text.includes('CLICKED-OK')} snap3含ECHO=${snap3Text.includes('ECHO:probe-typed')}`)

  const report = `# browser-behavior-probe 2026-10-05\n\ncli: ${cli}\nfixture: ${FIXTURE_URL}\nbrowsers root: ${PW_BROWSERS}（重定向进栅栏）\n\n判据明细：\n${results.map(r => `- ${r.ok ? 'PASS' : 'FAIL'} ${r.label}${r.detail ? `（${r.detail}）` : ''}`).join('\n')}\n\n## 最终快照（type 后）\n\n\`\`\`\n${snap3Text.slice(0, 2000)}\n\`\`\`\n`
  writeFileSync(join(ASSETS, 'probe-stdout.md'), report)
  // 复跑不覆盖历史（2026-10-05 复跑轮教训：稳定指针 + 时间戳历史各一份）
  writeFileSync(join(ASSETS, `probe-stdout-${new Date().toISOString().replace(/[:.]/g, '-')}.md`), report)
  const failed = results.filter(r => !r.ok)
  console.log(failed.length === 0
    ? `\nbrowser-behavior-probe: ALL PASS（${results.length}/${results.length}）——缓存重定向进栅栏 + 导航/读内容/点击/输入行为链全通`
    : `\nbrowser-behavior-probe: ${failed.length} FAILURE(S)`)
  process.exitCode = failed.length === 0 ? 0 : 1
} finally {
  server.close()
  child.kill('SIGTERM'); await sleep(1_000); child.kill('SIGKILL')
}
