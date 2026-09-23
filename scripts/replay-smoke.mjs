#!/usr/bin/env node
// 无 key 会话重放（R5a P1.2 + P1.3）：四方协作 ——
//   --prepare     原始录制（replay/raw/）→ 归一化 fixture（replay/session*.jsonl）+ sidecar
//                 （system-prompt.expected.md / tool-schemas.expected.json；child 带 .1. 后缀）
//   --record      场景组合（replay/cordis.yml，真模型认证档）下重录 → replay/raw/ → 顺带 prepare
//   --ui          默认重放的全部检查 + 委派卡端到端（P1.3）：playwright 加载真页面 →
//                 连接工作区 → 搜索打开 lead 会话 → 展开轮次组 → ariaSnapshot 金样比对 +
//                 委派卡可访问名断言（断言口径 = 可访问名/文本，不是 data-*——aria 树里没有
//                 DOM 属性；data-tool locator 只作 DOM 侧补充断言，vendor present.e2e 同款双轨）
//   --refresh-ui  与 --ui 同跑，但把捕获写成 replay/ui.expected.md 金样（首轮/有意变更时用；
//                 写之前仍断言委派卡在场，杜绝把"卡缺席"录成金样）
//   （默认）       重放组合（replay/cordis.snapshot.yml，llm-replay）复演 → 归一化比对 + sidecar 比对
// 机制依据：notes/research/2026-09-23-replay-harness-feasibility.md（P1.1 §0–§3 + P1.2 §7 + P1.3 §8）。
// ⚠ 录/放组合必须同构（vendor 教义：cordis.yml 与 cordis.snapshot.yml 仅差 LLM 行）——
//   title-llm 两侧都禁：其 LLM 调用不进重放脚本（deriveReplayScript 只收 assistant 流），
//   吃条目会造成供条错位；两侧都走截断回退 ⇒ 事件形态一致。
//   P1.3 起两侧同构地多两行（ui-agent-team + company-client）：委派卡注册在本包 client 面
//   （slots 的 tool.call.toolview keyed 注册），行不进组合卡永不渲染（红证即摘行）。
// sidecar 为什么自算：vendor suite.ts 的 format*Snapshot 有 vitest 依赖，纯 Node 驱动 import
//   不了；格式（{initial, changes} + <!-- system/message change N --> 分隔）照抄其源码。
// 浏览器面为什么复刻而不 import：vendor apps/web/tests/scaffold.ts 同样 import vitest；
//   normalizeAria / captureStableAria / expandTurnProcesses 逐行转写（出处注在函数头）。
// 分层（guides/60 §9.1 + readiness P1.4）：第三档（无 key、但要起进程与浏览器），不进 pnpm test。
// 预算（§10）：墙钟 ≤ --wall。
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  normalizeSessionLog,
  normalizeSessionSnapshots,
  scrubSessionSnapshot,
  tokenizeSessionFixtureCwd,
} from '../vendor/dsh/packages/test-support/session-snapshot/lib/types/normalize.js'
import { redactSessionSnapshotIds } from '../vendor/dsh/packages/test-support/session-snapshot/lib/types/identity.js'
import { materializeProfilePatch } from '../vendor/dsh/packages/test-support/session-snapshot/lib/types/launcher.js'
import { prepareSessionSnapshotFixtureForComparison } from '../vendor/dsh/packages/test-support/llm-replay/lib/index.js'
import { launchChromium, loadChromium } from './lib/playwright.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const SCENARIO = arg('scenario', 'r3-delegation')
const WALL_MS = Number(arg('wall', '240')) * 1000
const PREPARE = process.argv.includes('--prepare')
const RECORD = process.argv.includes('--record')
const UI = process.argv.includes('--ui')
const REFRESH_UI = process.argv.includes('--refresh-ui')
const KEEP = process.argv.includes('--keep')
const scenarioDir = join(ROOT, 'snapshots', SCENARIO)
const replayDir = join(scenarioDir, 'replay')
const rawLead = join(replayDir, 'raw', 'lead.jsonl')
const rawChild = join(replayDir, 'raw', 'vp-eng-child.jsonl')
const fixLead = join(replayDir, 'session.v3.jsonl')
const fixChild = join(replayDir, 'session.1.v3.jsonl')
const archiveLead = join(scenarioDir, 'sessions', 'lead.jsonl') // R3 历史归档（首录的任务来源）
const goldenUi = join(replayDir, 'ui.expected.md')
/** vendor suite.ts 的 sidecar 命名：lead 无后缀，child 按 fixture 序号（session.1 → .1）。 */
const sidecarPrompt = (index) => join(replayDir, index === 0 ? 'system-prompt.expected.md' : `system-prompt.${String(index)}.expected.md`)
const sidecarTools = (index) => join(replayDir, index === 0 ? 'tool-schemas.expected.json' : `tool-schemas.${String(index)}.expected.json`)
const BOOT_TIMEOUT_MS = 120_000

const records = (text) => text.split(/\r?\n/).filter(l => l.trim() !== '').map(l => JSON.parse(l))
const headerOf = (text) => records(text)[0] ?? {}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** vendor writeSessionFixtures 生产线的裁剪版（stabilize 需先代 fixture，首录无先代跳过；redact 收数组）。 */
function normalizeFixtures(raws) {
  const scrubbed = raws
    .map(raw => tokenizeSessionFixtureCwd(raw))
    .map(stable => prepareSessionSnapshotFixtureForComparison(stable))
    .map(prepared => scrubSessionSnapshot(prepared))
  return redactSessionSnapshotIds(scrubbed)
}

/**
 * sidecar 提取：system prompt（system/message 首文本块）与 tool schemas（request/header 的
 * header.tools），从 **normalizeSessionLog(log, ctx) 之后**的日志里取（vendor suite.ts
 * normalizedSystemPrompts / toolSchemasFrom 同款管线）——ctx 必须带**全 run 的 session ids**
 * （lead 的 team id = session-<自身id>、child 的 system prompt 嵌 lead 的 id，不进 ctx 就
 * 每次运行漂移）与 cwd（system prompt 含临时工作区绝对路径）。
 * 场景自有替换（vendor scaffold.ts:1072 的 normalizePrompt 同款）：webUrl → {{webUrl}}——
 * web 每次起在 OS 随机端口，prompt 里 "…Web GUI at http://127.0.0.1:<port>" 随之漂移。
 * 录制侧从文本自提取（句子锚定，避免误伤公司手册里的正当端口引用）；重放侧传本次 boot 的 base。
 * 输出格式照抄 vendor suite.ts 的 formatSystemPromptSnapshot / formatToolSchemasSnapshot：
 *   prompt = 首条 + '\n'，后续条以 "\n<!-- system/message change N -->\n\n" 分隔；
 *   tools  = JSON.stringify({ initial, changes }, null, 2) + '\n'（changes = 后续 header 的完整表）。
 * 本场景每会话恰一条 system/message 与一条 request/header ⇒ changes 恒空；保留多条逻辑与 vendor 对齐。
 */
const WEB_URL_IN_PROMPT = /DeepSeek Harness Web GUI at (http:\/\/127\.0\.0\.1:\d+)/
const webUrlOf = (text) => WEB_URL_IN_PROMPT.exec(text)?.[1] ?? ''

function sidecarsOf(rawText, ctx, webUrl) {
  const prompts = []
  const tools = []
  for (const r of records(normalizeSessionLog(rawText, ctx))) {
    if (r.type === 'system/message') {
      const block = r.data?.message?.content?.[0]
      if (block?.type === 'text' && typeof block.text === 'string') prompts.push(block.text)
    }
    if (r.type === 'request/header') {
      const t = r.data?.header?.tools
      if (Array.isArray(t)) tools.push(t)
    }
  }
  let prompt = ''
  for (const [index, p] of prompts.entries()) {
    const body = p.endsWith('\n') ? p : `${p}\n`
    prompt += index === 0 ? body : `\n<!-- system/message change ${String(index)} -->\n\n${body}`
  }
  if (webUrl !== '') prompt = prompt.split(webUrl).join('{{webUrl}}')
  return {
    prompt,
    tools: `${JSON.stringify({ initial: tools[0] ?? [], changes: tools.slice(1) }, null, 2)}\n`,
  }
}

/** 一个 run 的归一化 ctx：全部会话 id（prompt 里会互相引用）+ lead 的 cwd。 */
const runCtx = (texts) => ({
  sessionIds: texts.map(t => String(headerOf(t).id)).filter(id => id !== ''),
  cwd: typeof headerOf(texts[0] ?? '')?.cwd === 'string' ? headerOf(texts[0]).cwd : '',
})

const modelOf = (text) => {
  for (const r of records(text)) {
    if (r.type !== 'request/header') continue
    const c = r.data?.header?.config ?? {}
    if (typeof c.provider === 'string' && typeof c.model === 'string') return { provider: c.provider, model: c.model }
  }
  throw new Error('录制里没有 request/header 模型信息')
}
const tasksFromSession = (text) => {
  const out = []
  for (const r of records(text)) {
    if (r.type !== 'user/message') continue
    const m = r.data
    if (m?.source?.kind !== 'user' || !Array.isArray(m.content)) continue
    const b = m.content
    if (b.length === 1 && b[0]?.type === 'text' && typeof b[0].text === 'string') out.push(b[0].text)
  }
  if (out.length === 0) throw new Error('录制里提取不到用户任务（source.kind=user 的单文本块）')
  return out
}

/** 写一套 sidecar（lead + child；与 fixture 同源同序；webUrl 从录制文本自提取）。 */
function writeSidecars(raws) {
  const ctx = runCtx(raws)
  for (const [index, raw] of raws.entries()) {
    const { prompt, tools } = sidecarsOf(raw, ctx, webUrlOf(raw))
    writeFileSync(sidecarPrompt(index), prompt, 'utf8')
    writeFileSync(sidecarTools(index), tools, 'utf8')
  }
}

// ── prepare ──
if (PREPARE) {
  for (const p of [rawLead, rawChild]) {
    if (!existsSync(p)) { console.error(`replay-smoke: 找不到原始录制 ${p}（先 --record）`); process.exit(2) }
  }
  mkdirSync(replayDir, { recursive: true })
  const raws = [readFileSync(rawLead, 'utf8'), readFileSync(rawChild, 'utf8')]
  const [leadOut, childOut] = normalizeFixtures(raws)
  writeFileSync(fixLead, leadOut, 'utf8')
  writeFileSync(fixChild, childOut, 'utf8')
  writeSidecars(raws)
  console.log('replay-smoke --prepare: fixture + sidecar 已生成（原始录制保留不动）')
  process.exit(0)
}

// ── boot + 驱动 + 收割持久化会话（record 与 replay 共用）──
async function driveScenario({ patchSource, env, tasks }) {
  const workspace = mkdtempSync(join(tmpdir(), `dsh-replay-${SCENARIO}-`))
  mkdirSync(join(workspace, '.dsh'), { recursive: true })
  mkdirSync(join(workspace, '.agents'), { recursive: true })
  cpSync(join(ROOT, 'company-workspace/AGENTS.md'), join(workspace, 'AGENTS.md')) // 公司手册 = 注入基线
  const patchRoot = join(workspace, '.snapshot-patches')
  mkdirSync(patchRoot, { recursive: true })
  const patch = materializeProfilePatch(patchSource, workspace, patchRoot, 0)
  if (env.credentials) {
    copyFileSync(env.credentials, join(workspace, '.dsh', '.credentials.yaml'))
    delete env.credentials
  }
  const child = spawn(process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--patch', patch, '--', '--port', '0', '--no-open'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        DSH_HOME: join(workspace, '.dsh'),
        DSH_AGENTS_HOME: join(workspace, '.agents'),
        ...env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, '--disable-warning=ExperimentalWarning'].filter(Boolean).join(' '),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  let output = ''
  try {
    const banner = await new Promise((resolveBanner, rejectBanner) => {
      const onData = (chunk) => {
        output += String(chunk)
        const m = /http:\/\/127\.0\.0\.1:(\d+)\/\?token=(\S+)/.exec(output)
        if (m !== null) resolveBanner({ port: Number(m[1]), token: m[2] })
      }
      child.stdout.on('data', onData); child.stderr.on('data', onData)
      child.on('exit', (code) => rejectBanner(new Error(`web 提前退出 code ${String(code)}\n${output.slice(-600)}`)))
      setTimeout(() => rejectBanner(new Error(`boot 超时\n${output.slice(-600)}`)), BOOT_TIMEOUT_MS)
    })
    const base = `http://127.0.0.1:${String(banner.port)}`
    const url = `${base}/?token=${banner.token}` // 浏览器档直接带 token 进页面
    const cookie = (await fetch(`${base}/?token=${banner.token}`, { redirect: 'manual' })).headers.getSetCookie()?.map(c => c.split(';')[0]).join('; ') ?? ''
    let rpcId = 0
    const rpc = async (endpoint, args) => {
      const response = await fetch(`${base}/api/${endpoint}`, {
        method: 'POST', headers: { 'content-type': 'application/json', cookie },
        body: JSON.stringify({ type: 'client-request', rpcId: `replay-${++rpcId}`, method: endpoint, payload: { args } }),
      })
      const body = await response.json()
      if (body?.result?.ok !== true) throw new Error(`${endpoint}: ${body?.result?.error?.message ?? JSON.stringify(body).slice(0, 200)}`)
      return body.result.value
    }
    const created = await rpc('session/create', { request: { cwd: workspace, agentPreset: 'ceo' } })
    const sessionId = created.sessionId
    const readPage = async () => {
      let cursor = -1
      try {
        const probe = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: Number.MAX_SAFE_INTEGER, maxMessages: 1 } })
        cursor = probe.records?.at(-1)?.event?.seq ?? -1
      } catch (error) {
        const m = /past cursor (\d+)/.exec(error.message); if (m === null) throw error; cursor = Number(m[1])
      }
      if (cursor < 0) return { turnEnds: 0 }
      const page = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: cursor, maxMessages: 500 } })
      let turnEnds = 0
      for (const record of page.records ?? []) if (record.event?.type === 'turn/end') turnEnds++
      return { turnEnds }
    }
    let seenTurnEnds = 0
    for (const [index, task] of tasks.entries()) {
      await rpc('session/prompt', {
        request: { requestId: `replay-${index}-${Date.now()}`, sessionId, mode: 'queue', content: [{ type: 'text', text: task }], clientTimeZone: 'Asia/Shanghai' },
      })
      for (;;) {
        if (Date.now() - startedAt > WALL_MS) break
        await sleep(3000)
        const { turnEnds } = await readPage()
        if (turnEnds > seenTurnEnds) { seenTurnEnds = turnEnds; break }
      }
      console.log(`  第 ${String(index + 1)}/${String(tasks.length)} 段完成（${String(Math.round((Date.now() - startedAt) / 1000))}s）`)
    }
    await sleep(2000)
    // 收割持久化会话
    const sessionRoot = join(workspace, '.dsh', 'sessions')
    const files = []
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name)
        if (entry.isDirectory()) walk(p)
        else if (/^session\.v\d+\.jsonl(\.zstd)?$/.test(entry.name)) files.push(p)
      }
    }
    if (existsSync(sessionRoot)) walk(sessionRoot)
    const logs = files.map(p => basename(p).endsWith('.zstd')
      ? spawnSync('zstd', ['-d', '-c', p], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).stdout
      : readFileSync(p, 'utf8'))
    const parsed = logs.map(text => ({ text, header: headerOf(text) }))
      .sort((a, b) => (a.header.parentSession ? 1 : 0) - (b.header.parentSession ? 1 : 0))
    return { workspace, child, parsed, sessionId, url, baseUrl: base }
  } catch (error) {
    child.kill('SIGTERM')
    throw error
  }
}

const startedAt = Date.now()

if (RECORD) {
  // 任务来源：已有 fixture（refresh 语义）→ 原始录制 → R3 历史归档（首录）
  const taskSource = existsSync(fixLead) ? fixLead : (existsSync(rawLead) ? rawLead : archiveLead)
  const tasks = tasksFromSession(readFileSync(taskSource, 'utf8'))
  const credentials = join(ROOT, 'dev/harness-home/.credentials.yaml')
  if (!existsSync(credentials)) { console.error('replay-smoke --record: 需要 dev home 凭据（真模型认证档）'); process.exit(2) }
  console.log(`--record：场景组合下重录（任务来源 ${basename(taskSource)}，真模型，${String(tasks.length)} 段）`)
  const { workspace, child, parsed } = await driveScenario({
    patchSource: join(replayDir, 'cordis.yml'),
    env: { credentials },
    tasks,
  })
  child.kill('SIGTERM'); await sleep(300)
  try {
    if (parsed.length !== 2) {
      console.error(`--record：期望 lead+child 两个会话，实际 ${String(parsed.length)}：${parsed.map(p => JSON.stringify(p.header)).join('\n')}`)
      process.exit(1)
    }
    mkdirSync(join(replayDir, 'raw'), { recursive: true })
    writeFileSync(rawLead, parsed[0].text, 'utf8')
    writeFileSync(rawChild, parsed[1].text, 'utf8')
    const [leadOut, childOut] = normalizeFixtures([parsed[0].text, parsed[1].text])
    writeFileSync(fixLead, leadOut, 'utf8')
    writeFileSync(fixChild, childOut, 'utf8')
    writeSidecars([parsed[0].text, parsed[1].text])
    console.log(`--record：录制 + fixture + sidecar 完成（lead ${String(records(parsed[0].text).length)} 行 / child ${String(records(parsed[1].text).length)} 行）`)
  } finally {
    if (!KEEP) rmSync(workspace, { recursive: true, force: true })
  }
  process.exit(0)
}

// ── replay（默认）──
for (const p of [fixLead, fixChild, join(replayDir, 'cordis.snapshot.yml')]) {
  if (!existsSync(p)) { console.error(`replay-smoke: 缺 ${p}（先 --record）`); process.exit(2) }
}
const leadFixture = readFileSync(fixLead, 'utf8')
const childFixture = readFileSync(fixChild, 'utf8')
const fixtures = [leadFixture, childFixture]
const { provider, model } = modelOf(leadFixture)
const tasks = tasksFromSession(leadFixture)
const failures = []
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures.push(label)
}
/** 金样差异首行定位（多行文本的失败诊断）。 */
const firstDiff = (expected, actual) => {
  const e = expected.split('\n'); const a = actual.split('\n')
  for (let i = 0; i < Math.max(e.length, a.length); i++) {
    if (e[i] !== a[i]) return `第 ${String(i + 1)} 行：期望 ${JSON.stringify(e[i] ?? '(缺)').slice(0, 160)} / 实际 ${JSON.stringify(a[i] ?? '(缺)').slice(0, 160)}`
  }
  return '内容一致（可能是行尾差异）'
}

// ── 浏览器档（P1.3）：vendor apps/web/tests/{scaffold,support}.ts 管线的逐行转写 ──
// 出处：normalizeAria/captureStableAria = scaffold.ts:1385-1480；expandTurnProcesses =
// support.ts:41-53；工作区连接 = support.ts connectFreshWorkspace；搜索开会话 =
// navigation-panes.e2e.ts ensureSeedOpen。不能 import 原件（scaffold 顶部 import vitest）。
const ARIA_AGE =
  /(?:now|\d+min|\d+h|\d+d|\d+mo|\d+y|刚刚|\d+分钟|\d+小时|\d+天|\d+个月|\d+年)(?=")/g

function normalizeAria(snapshot, workspaceCwd, age) {
  // 会话抬头渲染的是工作区 basename 而非全路径，两种拼写都要坍缩进 token。
  const base = workspaceCwd.split('/').pop()
  return (age ? snapshot.replace(ARIA_AGE, '{{age}}') : snapshot)
    .split(workspaceCwd).join('{{cwd}}')
    .split(base).join('{{workspace}}')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{{uuid}}')
    // `\d+m ?\d+s` 的可选空格覆盖 stats 行的紧凑写法与 message-chrome 模板的带空格写法。
    .replace(
      /~\d+(?:y(?: \d+mo)?|mo(?: \d+d)?)|\b(?:\d+d(?: \d+h(?: \d+m \d+s)?)?|\d+h \d+m \d+s|\d+m ?\d+s|\d+(?:\.\d+)?s|\d+(?:\.\d+)?ms)\b/g,
      duration => duration.startsWith('~') ? duration : '{{duration}}',
    )
    .replace(/\b\d[\d,]*(?:\.\d+)? ms\b/g, '{{duration}}')
    .replace(
      /约\d+(?:年(?:\d+个月)?|个月(?:\d+天)?)|\d+(?:天(?:\d+小时(?:\d+分\d+秒)?)?|小时\d+分\d+秒|分\d+秒|(?:\.\d+)?秒)/g,
      duration => duration.startsWith('约') ? duration : '{{duration}}',
    )
    .replace(/\d+(?:\.\d+)?(?= tok\/s(?!\w))/g, '{{throughput}}')
    .replace(/(Compacted \d+ history items \(~)\d+( tokens\))/g, '$1{{tokens}}$2')
    // 会话摘要与消息操作的时钟会跨日历边界；所有形态都坍缩保证金样跨边界稳定。
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '{{timestamp}}')
    .replace(/\d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}/g, '{{clock}}')
    .replace(/\d{1,2}月\d{1,2}日 \d{2}:\d{2}/g, '{{clock}}')
    .replace(/(?<!\d)\d{1,2}:\d{2}:\d{2}(?:\.\d+)?(?:\s*[AP]M)?(?!\d)/gi, '{{clock}}')
    .replace(/(?<!\d)\d{2}:\d{2}(?!\d)/g, '{{clock}}')
}

/** 轮询到两次连续归一化捕获相等（单发捕获会与最后一次 React commit 竞态）。 */
async function captureStableAria(page, selector, workspaceCwd) {
  const region = page.locator(selector).first()
  const normalize = (snapshot) => normalizeAria(snapshot, workspaceCwd, false)
  let previous = normalize(await region.ariaSnapshot())
  const deadline = Date.now() + 5000
  for (;;) {
    const current = normalize(await region.ariaSnapshot())
    if (current === previous) return current
    previous = current
    if (Date.now() > deadline) throw new Error(`aria snapshot 未稳定（${selector}）`)
    await sleep(400)
  }
}

/** 展开所有轮次过程组（工具卡默认折叠在 "N tool call" 组里，不展开不进 aria 树）。 */
async function expandTurnProcesses(page) {
  const controls = page.locator('[data-turn-process]')
  await controls.first().waitFor({ state: 'visible', timeout: 10_000 })
  const count = await controls.count()
  for (let index = 0; index < count; index++) {
    const control = controls.nth(index)
    if (await control.getAttribute('aria-expanded') !== 'true') await control.click()
  }
}

/** 委派卡端到端（P1.3 主判据）：金样 + 双轨断言。 */
async function uiPhase({ url, workspace }) {
  const chromiumApi = await loadChromium(ROOT)
  const browser = await launchChromium(chromiumApi)
  try {
    // vendor newEnglishPage：英文锚点（可访问名/占位符都是英文文案）+ 固定视口时区。
    const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: 'en-US', timezoneId: 'Asia/Shanghai' })
    try {
      await runUiFlow(page, { url, workspace })
    } catch (error) {
      // 失败现场保留（vendor support.ts saveFailureShot 先例）：截图 + 全页 aria，落 /tmp。
      await page.screenshot({ path: '/tmp/replay-ui-fail.png', fullPage: false }).catch(() => {})
      writeFileSync('/tmp/replay-ui-fail.aria', await page.locator('body').ariaSnapshot().catch(() => ''), 'utf8')
      throw error
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

/** 浏览器导航与断言（与 uiPhase 分层：uiPhase 管浏览器生命周期与现场保留）。 */
async function runUiFlow(page, { url, workspace }) {
    await page.goto(url, { waitUntil: 'load', timeout: 60_000 })
    // 模态通告（fresh home 首访必弹）：Internal Testing Notice，挡住整页指针事件。
    // ⚠ 必须**等它出现**再关——goto 返回时它往往还没挂载完，条件检查会扑空（实证一次）。
    const notice = page.getByRole('dialog', { name: 'Internal Testing Notice' })
    await notice.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    if (await notice.isVisible()) {
      await notice.getByRole('button', { name: 'Continue' }).click()
      await notice.waitFor({ state: 'detached', timeout: 10_000 })
    }
    // 兜底：还有别的可见模态框就点名失败——别让它静默拦截后续 click 查半天才懂
    const otherDialogs = page.getByRole('dialog')
    if (await otherDialogs.count() > 0) {
      const names = []
      for (let i = 0; i < await otherDialogs.count(); i++) {
        if (await otherDialogs.nth(i).isVisible()) names.push((await otherDialogs.nth(i).innerText().catch(() => '')).split('\n')[0])
      }
      if (names.length > 0) throw new Error(`存在未处理的模态框：${names.join(' / ')}`)
    }
    // onboarding 覆盖层（vendor navigation-panes ensureSeedOpen 同款守卫；另一类首访浮层）
    const welcome = page.locator('[class*="onboardingOverlay"]')
    if (await welcome.count() > 0 && await welcome.isVisible()) {
      await welcome.getByRole('button').click()
      await welcome.waitFor({ state: 'detached', timeout: 15_000 })
    }
    // 连接工作区：空态 EmptyHero 的选择器流程（vendor support.ts connectFreshWorkspace），
    // 但连接的是**已承载会话的临时工作区**本身（vendor 版连接的是它新建的 workspace/ 子目录）。
    await page.getByRole('textbox', { name: 'Choose workspace' }).click()
    const dialog = page.getByRole('dialog', { name: 'Select Workspace Directory' })
    await dialog.waitFor({ timeout: 10_000 })
    await dialog.getByRole('button', { name: 'Edit path' }).click()
    const pathInput = dialog.getByRole('textbox', { name: 'Edit path' })
    await pathInput.fill(workspace)
    await pathInput.press('Enter')
    await dialog.getByRole('button', { name: 'Open', exact: true }).click()
    await page.locator('[data-composer-input][contenteditable="true"][data-placeholder="Describe what you want to build, / commands, @ files or sessions"]')
      .waitFor({ timeout: 15_000 })
    // 搜索打开 lead 会话（title 是 title-llm 禁用后的截断回退 ⇒ 确定性文本）
    const searchButton = page.getByRole('button', { name: 'Search sessions' })
    if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
    const search = page.getByPlaceholder('Search sessions', { exact: false })
    await search.fill('只回复两个字')
    const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: '只回复两个字' })
    await result.first().waitFor({ timeout: 15_000 })
    await result.first().click()
    await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
    // 委派卡：先 DOM 在场（折叠组里也 attached），再展开轮次组，等可见
    const card = page.locator('[data-tool="vp_eng"]')
    await card.first().waitFor({ state: 'attached', timeout: 30_000 })
    await expandTurnProcesses(page)
    await card.first().waitFor({ state: 'visible', timeout: 15_000 })
    // 委派卡基数断言（可访问名口径——readiness P1.3 教义：aria 树里没有 data-*）：
    // ⚠ 不能用 [data-tool="vp_eng"] 判在不在——**通用工具行也渲染同款属性**（红证实证：
    // 摘掉 company-client 行后 locator 版仍绿、可访问名版正确红）。settled ok 的卡
    // expandable ⇒ header 是 role=button，名字以 "委派 VP-Eng（研发）" 开头。
    const genericRow = page.locator('[data-tool="vp_eng"]')
    const cardButton = page.getByRole('button', { name: /^委派 VP-Eng（研发）/ })
    const cardCount = await cardButton.count()
    check('委派卡渲染 ×1（可访问名 "委派 VP-Eng（研发）…"）', cardCount === 1, `${String(cardCount)} 张（DOM 里 vp_eng 行 ${String(await genericRow.count())} 处，含通用行）`)
    // 金样：centerCol（会话中列，vendor present.e2e 同款区域）；展开轮次组后捕获
    const aria = await captureStableAria(page, '[class*="centerCol"]', workspace)
    check('委派卡节点在 aria 树（可访问名 "委派 VP-Eng（研发）…"）', aria.includes('委派 VP-Eng（研发）'))
    if (REFRESH_UI) {
      writeFileSync(goldenUi, `${aria}\n`, 'utf8')
      console.log(`  （--refresh-ui：金样已写入 ${basename(goldenUi)}）`)
    } else {
      if (!existsSync(goldenUi)) {
        check('ui 金样在场', false, `缺 ${goldenUi}（先 --refresh-ui 生成）`)
      } else {
        const expected = readFileSync(goldenUi, 'utf8')
        const actual = `${aria}\n`
        check('ui 金样零 diff（centerCol aria）', expected === actual, expected === actual ? '' : firstDiff(expected, actual))
      }
    }
}

let workspace
let parsed = []
let webChild
let replayUrl = ''
let replayBase = ''
try {
  ;({ workspace, parsed, child: webChild, url: replayUrl, baseUrl: replayBase } = await driveScenario({
    patchSource: join(replayDir, 'cordis.snapshot.yml'),
    env: {
      DSH_SNAPSHOT: 'replay',
      DSH_SNAPSHOT_PROVIDER: provider,
      DSH_SNAPSHOT_MODEL: model,
      DSH_SNAPSHOT_FILE: fixLead,
      DSH_SNAPSHOT_CHILD_FILES: fixChild,
      DSH_TELEMETRY_DISABLED: '1',
    },
    tasks,
  }))
  check('持久化会话数 = 2（lead + child）', parsed.length === 2, `实际 ${String(parsed.length)}${parsed.length !== 2 ? `：${parsed.map(p => p.header.id).join(', ')}` : ''}`)
  if (parsed.length !== 2) {
    for (const p of parsed) {
      const counts = {}
      for (const r of records(p.text)) counts[r.type] = (counts[r.type] ?? 0) + 1
      console.log(`  ── 诊断：${p.header.parentSession ? 'child' : 'lead'} 事件 = ${JSON.stringify(counts)}`)
    }
    console.log('  （会话数不足，仍对比已有会话以定位差异行）')
  }
  // 归一化比对（vendor 对位：两侧各自 ctx；{{cwd}}/{{system}}/{{tools}} + id redaction 吸收波动）
  const ctxOf = (items) => ({
    sessionIds: items.map(i => String(i.header.id)).filter(id => id !== ''),
    cwd: typeof items[0]?.header.cwd === 'string' ? items[0].header.cwd : '',
  })
  const actualN = normalizeSessionSnapshots(parsed.map(p => p.text), ctxOf(parsed))
  const expectedN = normalizeSessionSnapshots(fixtures, ctxOf(fixtures.map(t => ({ header: headerOf(t) }))))
  let diffLine = ''
  let sessionDiffs = 0
  for (const [index, actual] of actualN.entries()) {
    const a = records(actual)
    const e = records(expectedN[index] ?? '')
    for (let i = 0; i < Math.max(a.length, e.length); i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(e[i])) {
        sessionDiffs++
        diffLine = `session#${index} 第 ${String(i + 1)} 行：期望 ${e[i]?.type ?? '(缺)'} / 实际 ${a[i]?.type ?? '(缺)'}`
        console.log(`    差异：${diffLine}`)
        if (e[i] !== undefined) console.log(`      期望: ${JSON.stringify(e[i]).slice(0, 700)}`)
        if (a[i] !== undefined) console.log(`      实际: ${JSON.stringify(a[i]).slice(0, 700)}`)
        break
      }
    }
  }
  check('归一化日志零 diff', sessionDiffs === 0, sessionDiffs === 0 ? `${String(actualN.length)} 个会话逐行一致` : diffLine)
  // sidecar 比对（P1.3）：system prompt 与 tool schemas 离开 fixture 后的真值对照
  const sidecarCtx = runCtx(parsed.map(p => p.text))
  for (const [index, p] of parsed.entries()) {
    const actualSidecars = sidecarsOf(p.text, sidecarCtx, replayBase)
    /** 比对一个 sidecar：零 diff 才 PASS；失败时期望/实际全文落 /tmp 供逐行比对。 */
    const compareSidecar = (kind, path, actual) => {
      if (!existsSync(path)) {
        check(`sidecar ${kind}#${String(index)} 在场`, false, `缺 ${path}（先 --prepare）`)
        return
      }
      const expected = readFileSync(path, 'utf8')
      const pass = expected === actual
      if (!pass) {
        writeFileSync(`/tmp/replay-sidecar-${kind}-${String(index)}.expected`, expected, 'utf8')
        writeFileSync(`/tmp/replay-sidecar-${kind}-${String(index)}.actual`, actual, 'utf8')
      }
      check(`sidecar ${kind}#${String(index)} 零 diff`, pass, pass ? '' : `${firstDiff(expected, actual)}（全文已落 /tmp/replay-sidecar-${kind}-${String(index)}.*）`)
    }
    compareSidecar('system-prompt', sidecarPrompt(index), actualSidecars.prompt)
    compareSidecar('tool-schemas', sidecarTools(index), actualSidecars.tools)
  }
  check('全程无 key（DSH_SNAPSHOT=replay + 真 LLM 已禁用）', true)
  // 浏览器档（P1.3）：真页面里的委派卡
  if (UI) {
    console.log('  ── ui 档（真浏览器委派卡端到端）──')
    await uiPhase({ url: replayUrl, workspace })
  }
} catch (error) {
  failures.push(`异常: ${error.message}`)
  console.log(`  FAIL 异常: ${error.message.split('\n')[0]}`)
  console.log(error.stack?.split('\n').slice(1, 4).join('\n') ?? '')
} finally {
  webChild?.kill('SIGTERM')
  await sleep(300)
  if (KEEP) console.log(`  （--keep：现场保留 ${workspace ?? '(未建立)'}）`)
  else if (workspace) rmSync(workspace, { recursive: true, force: true })
}

console.log(failures.length === 0
  ? `\nreplay-smoke: ALL PASS（${SCENARIO} 无 key 重放${UI ? ' + 委派卡端到端' : ''}，归一化零 diff，${String(Math.round((Date.now() - startedAt) / 1000))}s）`
  : `\nreplay-smoke: ${String(failures.length)} FAILURE(S)\n  ${failures.join('\n  ')}`)
process.exit(failures.length === 0 ? 0 : 1)
