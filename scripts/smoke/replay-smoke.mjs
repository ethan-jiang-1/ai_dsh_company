#!/usr/bin/env node
// 状态：常驻
// 无 key 会话重放（R5a P1.2 + P1.3；R5b 扩多 child 场景与在场板判据）——四方协作 ——
// 何时跑：录制行为、组合、委派 UI 或 workspace replay 改动时（第三档，无 key ~11s；--ui 另起浏览器）
//   --prepare     原始录制（replay/raw/，lead.jsonl + 任意名 child）→ 归一化 fixture
//                 （session.v3.jsonl + session.<k>.v3.jsonl，child 按 header createdAt 排序）
//                 + sidecar（system-prompt.expected.md / tool-schemas.expected.json；child 带 .k. 后缀）
//   --refresh     headless authored 场景无 key 刷新会话/sidecar，完整 workspace oracle 必须先通过且永不重写。
//   --record      场景组合（replay/cordis.yml，真模型认证档）下重录 → replay/raw/ → 顺带 prepare
//   --ui          默认重放的全部检查 + 委派卡端到端（P1.3，r3-delegation 场景）：playwright
//                 加载真页面 → 连接工作区 → 搜索打开 lead 会话 → 展开轮次组 → ariaSnapshot
//                 金样比对 + 委派卡可访问名断言（断言口径 = 可访问名/文本，不是 data-*——
//                 aria 树里没有 DOM 属性；data-tool locator 只作 DOM 侧补充断言，vendor
//                 present.e2e 同款双轨）
//   --refresh-ui  与 --ui 同跑，但把捕获写成 replay/ui.expected.md 金样（首轮/有意变更时用；
//                 写之前仍断言委派卡在场，杜绝把"卡缺席"录成金样）
//   （默认）       重放组合（replay/cordis.snapshot.yml，llm-replay）复演 → 归一化比对 + sidecar
//                 比对 + 在场板判据（R5b：重放 lead 的 team/* 事件喂 pack 读模型，非空且与录制
//                 同形；提案验收 4。场景不带 team 事件时自动跳过）
// 机制依据：notes/implemented/2026-09-23-replay-harness-feasibility.md（P1.1 §0–§3 + P1.2 §7 + P1.3 §8）。
// ⚠ 录/放组合必须同构（vendor 教义：cordis.yml 与 cordis.snapshot.yml 仅差 LLM 行）——
//   title-llm 两侧都禁：其 LLM 调用不进重放脚本（deriveReplayScript 只收 assistant 流），
//   吃条目会造成供条错位；两侧都走截断回退 ⇒ 事件形态一致。
//   P1.3 起两侧同构地多两行（ui-agent-team + company-client）：委派卡注册在本包 client 面
//   （slots 的 tool.call.toolview keyed 注册），行不进组合卡永不渲染（红证即摘行）。
// sidecar 为什么自算：vendor suite.ts 的 format*Snapshot 有 vitest 依赖，纯 Node 驱动 import
//   不了；格式（{initial, changes} + <!-- system/message change N --> 分隔）照抄其源码。
// 浏览器面为什么复刻而不 import：vendor apps/web/tests/scaffold.ts 同样 import vitest；
//   normalizeAria / captureStableAria / expandTurnProcesses 逐行转写（出处注在函数头）。
// 分层（guides/dev-loop §9.1 + readiness P1.4）：第三档（无 key、但要起进程与浏览器），不进 pnpm test。
// 预算（§10）：墙钟 ≤ --wall。
import { repositoryRoot as ROOT } from '../lib/repository-layout.mjs'
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { compareWorkspace, seedWorkspace, workspaceOracle } from '../lib/workspace-oracle.mjs'
import {
  normalizeSessionLog,
  normalizeSessionSnapshots,
  scrubSessionSnapshot,
  tokenizeSessionFixtureCwd,
} from '../../vendor/dsh/packages/test-support/session-snapshot/lib/types/normalize.js'
import { redactSessionSnapshotIds } from '../../vendor/dsh/packages/test-support/session-snapshot/lib/types/identity.js'
import { materializeProfilePatch } from '../../vendor/dsh/packages/test-support/session-snapshot/lib/types/launcher.js'
import { prepareSessionSnapshotFixtureForComparison } from '../../vendor/dsh/packages/test-support/llm-replay/lib/index.js'
import { launchChromium, loadChromium } from '../drivers/playwright.mjs'
import { snapshotScene } from '../lib/repository-layout.mjs'

const { load } = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const SCENARIO_ARG = arg('scenario', 'r3-delegation')
const WALL_MS = Number(arg('wall', '240')) * 1000
const PREPARE = process.argv.includes('--prepare')
const RECORD = process.argv.includes('--record')
const UI = process.argv.includes('--ui')
const REFRESH_UI = process.argv.includes('--refresh-ui')
const KEEP = process.argv.includes('--keep')
const REFRESH = process.argv.includes('--refresh')
const scenarioDir = snapshotScene(ROOT, SCENARIO_ARG)
const SCENARIO = basename(scenarioDir)
const replayDir = join(scenarioDir, 'replay')
const rawLead = join(replayDir, 'raw', 'lead.jsonl')
const metadata = load(readFileSync(join(scenarioDir, 'snapshot.yml'), 'utf8'))
const oracle = workspaceOracle(scenarioDir, metadata)
const HEADLESS = metadata.profile === 'headless'
// rc.2：五个角色预设行住在 pack 的 `presets/<role>/agent.cordis.yml`（各自是 patch 文件）；
// `--patch` 可重复 ⇒ 组合夹具只声明 registry，预设行由这里追加（单一事实 = pack 的文件）。
const PRESET_PATCHES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']
  .flatMap(role => ['--patch', join(ROOT, 'packages/company-pack/presets', role, 'agent.cordis.yml')])
if (HEADLESS && (RECORD || UI || REFRESH_UI)) throw new Error('Headless workspace fixture supports keyless replay, --prepare, and --refresh only')
if (HEADLESS && !oracle) throw new Error('Headless workspace replay requires workspace.final with before/expected trees')
if (REFRESH && (!HEADLESS || RECORD || PREPARE)) throw new Error('--refresh supports only keyless headless replay')

/**
 * 场景的 child 会话清单：`replay/raw/` 下除 lead 外的录制，按 header `createdAt` 排序
 * （llm-replay 的绑定序：primary 后按 createdAt，vendor index.ts:845 同款排序）。
 * r3-delegation = 1 child；r2-motion = 4 child（五会话形状）。
 */
function childRaws() {
  const dir = join(replayDir, 'raw')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter(name => name !== 'lead.jsonl' && name.endsWith('.jsonl'))
    .map(name => join(dir, name))
    .map(path => ({ path, createdAt: Number(headerOf(readFileSync(path, 'utf8')).createdAt ?? 0) }))
    .sort((a, b) => a.createdAt - b.createdAt || a.path.localeCompare(b.path))
    .map(entry => entry.path)
}
/** vendor fixture 命名：lead = session.v3.jsonl，child k（1 起）= session.k.v3.jsonl。 */
const fixLead = join(replayDir, 'session.v3.jsonl')
const childFixture = (k) => join(replayDir, `session.${String(k)}.v3.jsonl`)
const archiveLead = join(scenarioDir, 'sessions', 'lead.jsonl') // 历史归档（首录的任务来源）
const goldenUi = join(replayDir, 'ui.expected.md')
/** vendor suite.ts 的 sidecar 命名：lead 无后缀，child 按 fixture 序号（session.1 → .1）。 */
const sidecarPrompt = (index) => join(replayDir, index === 0 ? 'system-prompt.expected.md' : `system-prompt.${String(index)}.expected.md`)
const sidecarTools = (index) => join(replayDir, index === 0 ? 'tool-schemas.expected.json' : `tool-schemas.${String(index)}.expected.json`)
const BOOT_TIMEOUT_MS = 120_000

const records = (text) => text.split(/\r?\n/).filter(l => l.trim() !== '').map(l => JSON.parse(l))
const headerOf = (text) => records(text)[0] ?? {}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

/** vendor writeSessionFixtures 生产线的裁剪版（stabilize 需先代 fixture，首录无先代跳过；redact 收数组）。 */
// 场景自有替换（webUrl 同款先例）：日期通道（0.2.0 升 pin 起随 pack bundle insert 启用）把
// **当前时间**作为 durable user/message 注入会话——时间戳是墙钟，录制与重放必然不同（这正是
// 机制在工作的证据）。归一化两件：采样时刻（ISO 带时区）→ <time-context-sample>；相对时长
// （"Elapsed since …" 后面的值随节奏漂）→ <time-context-elapsed>。录制侧与重放侧同管道对称生效。
const TIME_CONTEXT_SAMPLE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2}:\d{2}\[[^\]"]*\]/g
const TIME_CONTEXT_ELAPSED = /(Elapsed since the preceding model-visible message: )[^"\\\n]*/g
const normalizeTimeContext = (text) => text
  .replace(TIME_CONTEXT_SAMPLE, '<time-context-sample>')
  .replace(TIME_CONTEXT_ELAPSED, '$1<time-context-elapsed>')

function normalizeFixtures(raws) {
  const scrubbed = raws
    .map(raw => tokenizeSessionFixtureCwd(raw))
    .map(stable => prepareSessionSnapshotFixtureForComparison(stable))
    .map(prepared => scrubSessionSnapshot(prepared))
    .map(text => normalizeTimeContext(text))
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
  const rawPaths = [rawLead, ...childRaws()]
  for (const p of rawPaths) {
    if (!existsSync(p)) { console.error(`replay-smoke: 找不到原始录制 ${p}（先 --record 或从 sessions/ 归档拷入）`); process.exit(2) }
  }
  const raws = rawPaths.map(p => readFileSync(p, 'utf8'))
  mkdirSync(replayDir, { recursive: true })
  const normalized = normalizeFixtures(raws)
  writeFileSync(fixLead, normalized[0], 'utf8')
  for (const [index, text] of normalized.slice(1).entries()) {
    writeFileSync(childFixture(index + 1), text, 'utf8')
  }
  writeSidecars(raws)
  console.log(`replay-smoke --prepare: fixture + sidecar 已生成（1 lead + ${String(normalized.length - 1)} child；原始录制保留不动）`)
  process.exit(0)
}

// The headless lane uses the shipped CLI and keeps runtime files outside the complete workspace tree.
async function driveHeadless({ patchSource, env, tasks }) {
  if (tasks.length !== 1) throw new Error('Headless workspace replay requires one recorded user task')
  const runParent = join(ROOT, 'runtime/harness-home/replay-runs')
  mkdirSync(runParent, { recursive: true })
  const runRoot = mkdtempSync(join(runParent, `${SCENARIO}-`))
  const workspace = join(runRoot, 'workspace')
  try {
    seedWorkspace(oracle.before, workspace)
    const patchRoot = join(runRoot, '.snapshot-patches')
    mkdirSync(patchRoot, { recursive: true })
    const patch = materializeProfilePatch(patchSource, runRoot, 'headless', patchRoot, 0)
    const replayEnv = { ...process.env, ...env, DSH_HOME: join(runRoot, '.dsh'), DSH_AGENTS_HOME: join(runRoot, '.agents'), DSH_PERMISSION_MODE: 'workspace-write' }
    for (const key of Object.keys(replayEnv)) if (/KEY|SECRET|TOKEN|PASSWORD/i.test(key)) delete replayEnv[key]
    const result = spawnSync(process.execPath, [join(ROOT, 'vendor/dsh/apps/cli/lib/bin.js'), '--profile', 'headless', '--patch', patch, ...PRESET_PATCHES, tasks[0]], {
      cwd: workspace, env: replayEnv, encoding: 'utf8', timeout: WALL_MS, killSignal: 'SIGKILL', maxBuffer: 16 * 1024 * 1024,
    })
    if (result.error || result.status !== 0) throw new Error(`headless replay failed (${result.status}): ${result.error?.message ?? ''}\n${result.stderr}\n${result.stdout}`)
    const logs = []
    const walk = dir => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (/^session\.v\d+\.jsonl$/.test(entry.name)) logs.push(readFileSync(path, 'utf8'))
      }
    }
    walk(join(runRoot, '.dsh/sessions'))
    return { workspace, runRoot, parsed: logs.map(text => ({ text, header: headerOf(text) })), baseUrl: '' }
  } catch (error) {
    if (KEEP) console.log(`  （--keep：现场保留 ${runRoot}）`)
    else rmSync(runRoot, { recursive: true, force: true })
    throw error
  }
}

// ── boot + 驱动 + 收割持久化会话（record 与 replay 共用）──
async function driveScenario({ patchSource, env, tasks }) {
  if (HEADLESS) return driveHeadless({ patchSource, env, tasks })
  const runRoot = mkdtempSync(join(tmpdir(), `dsh-replay-${SCENARIO}-`))
  const workspace = oracle ? join(runRoot, 'workspace') : runRoot
  mkdirSync(join(runRoot, '.dsh'), { recursive: true })
  mkdirSync(join(runRoot, '.agents'), { recursive: true })
  if (oracle) seedWorkspace(oracle.before, workspace)
  else cpSync(join(ROOT, 'company-workspace/AGENTS.md'), join(workspace, 'AGENTS.md'))
  const patchRoot = join(runRoot, '.snapshot-patches')
  mkdirSync(patchRoot, { recursive: true })
  // rc.2：启动器签名多了 profile 参数（`materializeProfilePatch(source, cwd, profile, targetDir, index)`）
  // —— profile = 接收测试包链接的 profile 名（本 lane 为 web），不是 profile 目录。
  const profileDir = join(runRoot, '.dsh', 'profiles', 'web')
  mkdirSync(profileDir, { recursive: true })
  // rc.2：client 模块表（`window.__DSH_BOOT__` 的 dsh.client 行）按 **profile 的 node_modules** 解析
  // 每个 browser 模块 ⇒ 裸 `--patch` lane（无 profile 安装）下本包的 client 半解析不到，
  // 于是品牌槽与委派卡一起缺席。这里给临时 profile 补最小安装形状：node_modules 符号链接 + bundles 声明。
  mkdirSync(join(profileDir, 'node_modules'), { recursive: true })
  symlinkSync(join(ROOT, 'packages', 'company-pack'), join(profileDir, 'node_modules', 'dsh-company-pack'), 'dir')
  // 批3（harvest）：pack 的 dependencies 声明 schedule-bundle，真实安装由 reconcile 自动启用为
  // profile layer；临时 profile 镜像该形状——bundle 进 node_modules（vendor 工作区包自带依赖闭包）
  // + bundles 列表。缺它则 time-context/schedule/ui-schedule 三行全体缺席（pack 侧只剩 config 钉行）。
  mkdirSync(join(profileDir, 'node_modules', '@deepseek-ai'), { recursive: true })
  symlinkSync(join(ROOT, 'vendor', 'dsh', 'packages', 'experimental', 'schedule-bundle'), join(profileDir, 'node_modules', '@deepseek-ai', 'dsh-experimental-schedule-bundle'), 'dir')
  writeFileSync(join(profileDir, 'package.json'), `${JSON.stringify({
    name: 'dsh-replay-profile',
    private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', '@deepseek-ai/dsh-experimental-schedule-bundle', 'dsh-company-pack'] } },
  }, null, 2)}\n`, 'utf8')
  const patch = materializeProfilePatch(patchSource, runRoot, 'web', patchRoot, 0)
  if (env.credentials) {
    copyFileSync(env.credentials, join(runRoot, '.dsh', '.credentials.yaml'))
    delete env.credentials
  }
  const child = spawn(process.execPath,
    ['--import', 'tsx/esm', 'vendor/dsh/apps/cli/src/bin.ts', 'web', '--patch', patch, ...PRESET_PATCHES, '--', '--port', '0', '--no-open'],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        DSH_HOME: join(runRoot, '.dsh'),
        DSH_AGENTS_HOME: join(runRoot, '.agents'),
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
    const sessionRoot = join(runRoot, '.dsh', 'sessions')
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
      // lead 在前；child 之间按 header createdAt 升序——与 fixture 序号 / llm-replay 绑定序
      // 同一排序（vendor llm-replay index.ts:845）。目录遍历序在多 child 场景会错位
      // （r2 实证：4 child 的归一化比对全对不上行）。
      .sort((a, b) => ((a.header.parentSession ? 1 : 0) - (b.header.parentSession ? 1 : 0))
        || Number(a.header.createdAt ?? 0) - Number(b.header.createdAt ?? 0))
    return { workspace, runRoot, child, parsed, sessionId, url, baseUrl: base }
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
  const credentials = join(ROOT, 'runtime/harness-home/.credentials.yaml')
  if (!existsSync(credentials)) { console.error('replay-smoke --record: 需要 dev home 凭据（真模型认证档）'); process.exit(2) }
  console.log(`--record：场景组合下重录（任务来源 ${basename(taskSource)}，真模型，${String(tasks.length)} 段）`)
  const { workspace, runRoot, child, parsed } = await driveScenario({
    patchSource: join(replayDir, 'cordis.yml'),
    env: { credentials },
    tasks,
  })
  child.kill('SIGTERM'); await sleep(300)
  try {
    if (parsed.length < 2) {
      console.error(`--record：期望 lead + ≥1 child，实际 ${String(parsed.length)}：${parsed.map(p => JSON.stringify(p.header)).join('\n')}`)
      process.exit(1)
    }
    mkdirSync(join(replayDir, 'raw'), { recursive: true })
    // child 按 header createdAt 排序（llm-replay 绑定序；与 childRaws()/fixture 序号一致）。
    // ⚠ 先清掉旧 raw child（任意命名）再写新集：childRaws() 枚举 raw/ 全部非 lead 的 .jsonl，
    //   残留旧 child 会让 fixture 期望数与实写数错位（2026-09-24 重录实测：旧 vp-eng-child.jsonl
    //   与新 child-1.jsonl 并存 ⇒ replay 报"缺 session.2"）。
    for (const stale of readdirSync(join(replayDir, 'raw')).filter(n => n !== 'lead.jsonl' && n.endsWith('.jsonl'))) {
      rmSync(join(replayDir, 'raw', stale), { force: true })
    }
    const ordered = [parsed[0], ...parsed.slice(1).sort((a, b) => Number(a.header.createdAt ?? 0) - Number(b.header.createdAt ?? 0))]
    const raws = ordered.map(p => p.text)
    writeFileSync(rawLead, raws[0], 'utf8')
    for (const [index, text] of raws.slice(1).entries()) {
      writeFileSync(join(replayDir, 'raw', `child-${String(index + 1)}.jsonl`), text, 'utf8')
    }
    const normalized = normalizeFixtures(raws)
    writeFileSync(fixLead, normalized[0], 'utf8')
    for (const [index, text] of normalized.slice(1).entries()) {
      writeFileSync(childFixture(index + 1), text, 'utf8')
    }
    writeSidecars(raws)
    console.log(`--record：录制 + fixture + sidecar 完成（1 lead + ${String(raws.length - 1)} child；lead ${String(records(raws[0]).length)} 行）`)
  } finally {
    if (!KEEP) rmSync(runRoot, { recursive: true, force: true })
  }
  process.exit(0)
}

// ── replay（默认）──
/**
 * 判据档位：场景 snapshot.yml 的 `replayJudges: full | presence`（缺省 full）。
 *   full     = 归一化日志逐行零 diff + sidecar 零 diff（录制与当前内容同代的场景，r3-delegation）。
 *   presence = team/* 事件行零 diff + 事件类型序列零 diff + 在场板同形（R5b 提案验收 4），
 *              归一化全量与 sidecar 记 SKIP——历史录制（r2 = 2026-09-22 内容快照）里的
 *              persona/手册/R3 委托工具已演进，重放忠实用当前组合 ⇒ 逐字节零 diff 必然红
 *              （那三类 diff 恰好是重放灵敏度的证据，不是缺陷）。组合漂移检测归 full 档场景。
 */
const JUDGES = metadata.replayJudges === 'presence' ? 'presence' : 'full'
console.log(`  判据档位 = ${JUDGES}（${SCENARIO}）`)
const workspaceScope = oracle ? '完整 workspace 文件树（before → expected）' : '仅会话/读模型；workspace 未认证'
console.log(`  范围 = ${workspaceScope}`)
if (!oracle) console.log('  SKIP workspace：未声明 workspace.final: true + before/expected；历史 expected 归档不构成重放成功证据')
// Replay consumes committed normalized fixtures; raw recordings are optional prepare inputs.
const childFixtures = readdirSync(replayDir)
  .map(name => ({ name, ordinal: /^session\.([1-9]\d*)\.v3\.jsonl$/.exec(name)?.[1] }))
  .filter(entry => entry.ordinal !== undefined)
  .sort((a, b) => Number(a.ordinal) - Number(b.ordinal))
  .map((entry, index) => {
    if (Number(entry.ordinal) !== index + 1) throw new Error(`Non-contiguous child fixture ordinal: ${entry.name}`)
    return join(replayDir, entry.name)
  })
for (const p of [fixLead, ...childFixtures, join(replayDir, 'cordis.snapshot.yml')]) {
  if (!existsSync(p)) { console.error(`replay-smoke: 缺 ${p}（先 --record 或 --prepare）`); process.exit(2) }
}
const leadFixture = readFileSync(fixLead, 'utf8')
const childFixtureTexts = childFixtures.map(p => readFileSync(p, 'utf8'))
const fixtures = [leadFixture, ...childFixtureTexts]
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
  // rc.2：过程计数来自会话读模型——**没有过程的轮次**其 toggle 带 `disabled`（点不动）。
  // 只点启用的；并给读模型一点时间把有过程的轮次变 enabled（重放会话首帧可能还没折完）。
  const enabled = page.locator('[data-turn-process]:not([disabled])')
  await enabled.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
  const count = await enabled.count()
  for (let index = 0; index < count; index++) {
    const control = enabled.nth(index)
    if (await control.getAttribute('aria-expanded') !== 'true') await control.click()
  }
  // rc.2 新增一层：工具调用收进**步骤过程分组**（文案 `message.stepProcess.done.tools` = "Called tools"，
  // 旧 pin 无此层）——委派卡就在这个折叠组里，必须再点开它，否则卡在 DOM 里但 hidden。
  const calledTools = page.getByRole('button', { name: 'Called tools', exact: true })
  const groups = await calledTools.count()
  for (let index = 0; index < groups; index++) {
    const group = calledTools.nth(index)
    if (await group.getAttribute('aria-expanded') !== 'true') await group.click()
  }
}

/** 委派卡端到端（P1.3 主判据）：金样 + 双轨断言。 */
async function uiPhase({ url, workspace }) {
  const chromiumApi = await loadChromium(ROOT)
  const browser = await launchChromium(chromiumApi)
  try {
    // vendor newEnglishPage：英文锚点（可访问名/占位符都是英文文案）+ 固定视口时区。
    const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, locale: 'en-US', timezoneId: 'Asia/Shanghai' })
    // console/pageerror/导航 全量留档（诊断 ui 断言失败的浏览器侧根因；正常跑不读它）。
    const consoleLog = []
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleLog.push(`[${m.type()}] ${m.text()}`) })
    page.on('pageerror', (e) => { consoleLog.push(`[pageerror] ${String(e)}`) })
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) consoleLog.push(`[navigated] ${f.url()}`) })
    try {
      await runUiFlow(page, { url, workspace })
    } catch (error) {
      // 失败现场保留（vendor support.ts saveFailureShot 先例）：截图 + 全页 aria，落 /tmp。
      await page.screenshot({ path: '/tmp/replay-ui-fail.png', fullPage: false }).catch(() => {})
      writeFileSync('/tmp/replay-ui-fail.aria', await page.locator('body').ariaSnapshot().catch(() => ''), 'utf8')
      throw error
    } finally {
      writeFileSync('/tmp/replay-ui-console.log', consoleLog.join('\n'), 'utf8')
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
    // 0.2.0 新增首启通告：Preview Notice（vendor ui-settings-models locales welcomeTitle，
    // 按钮同为 Continue；welcome-notice.client.spec 同款）——fresh home 首访必弹，同款等出现再关。
    const preview = page.getByRole('dialog', { name: 'Preview Notice' })
    await preview.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {})
    if (await preview.isVisible()) {
      await preview.getByRole('button', { name: 'Continue' }).click()
      await preview.waitFor({ state: 'detached', timeout: 10_000 })
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
    const searchText = SCENARIO === 'r2-motion' ? '动议（R2 正式场）' : '只回复两个字'
    const searchButton = page.getByRole('button', { name: 'Search sessions' })
    if (await searchButton.getAttribute('aria-expanded') !== 'true') await searchButton.click()
    // rc.2：`search.placeholder` 文案由 'Search sessions...' 改为 'Search session names'
    // （aria 标签 `search.sessions.aria` 未变，仍是 'Search sessions'）——按新占位符定位。
    const search = page.getByPlaceholder('Search session names')
    await search.fill(searchText)
    const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: searchText })
    await result.first().waitFor({ timeout: 15_000 })
    await result.first().click()
    await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
    if (SCENARIO === 'r2-motion') {
      await runCockpitFlow(page)
      return
    }
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
    // 金样：centerCol（会话中列，vendor present.e2e 同款区域）；展开轮次组后捕获。
    // 场景自有归一化：①用量按钮数字随工具面大小漂（批1→批3 三刷金样的教训）；②Think 按钮
    // 文本 = 模型 reasoning 摘要，每次重录必然变（批4→批5 两连红实证）——均掩码成占位，
    // 写金样与比对同管道（webUrl 替换同款先例）；按钮在场性仍被金样断言。
    const aria = (await captureStableAria(page, '[class*="centerCol"]', workspace))
      .replace(/Usage [\d.]+[KM]? tok/g, 'Usage {{tokens}} tok')
      .replace(/- button "Think (?:[^"\\]|\\.)*"/g, '- button "Think {{reasoning}}"')
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

/**
 * 在场页签端到端（r2-motion 场景；原 R5b 驾驶舱，条目 ② 起升级为平台页签「在场」）：
 * 右栏打开 → guide 胶囊进「在场」页签 → 在场板 5 行（D-a：lead + 4 分身；D-c：团队内状态列头）
 * → 点 VP-Eng 行 → 断言当前会话切进该成员的空间（D-d；行可点 = 提案验收 5）。
 * 锚点（en 页面 + 本包中文文案）：'Open right sidebar' / guide '在场' /
 * list '组织在场板' / text '团队内状态' / 行 aria-label 'wochen <角色>，…' /
 * 成员会话标记 = lineage tree 'Subagent sessions' 或 read-only composer。
 */
async function runCockpitFlow(page) {
  const expand = page.getByRole('button', { name: 'Open right sidebar' })
  if (await expand.count() > 0) await expand.click()
  const capsule = page.getByRole('button', { name: /^在场/ }).first()
  await capsule.waitFor({ state: 'visible', timeout: 15_000 })
  await capsule.click()
  const board = page.getByRole('list', { name: '组织在场板' })
  await board.waitFor({ state: 'visible', timeout: 15_000 })
  const rows = board.getByRole('listitem')
  const rowCount = await rows.count()
  check('「在场」页签打开且在场板渲染（平台页签形态，提案验收 2）', rowCount === 5, `${String(rowCount)} 行`)
  for (const role of ['wochen CEO', 'wochen VP-Sales', 'wochen VP-Eng', 'wochen COO', 'wochen CFO']) {
    const hit = await rows.filter({ has: page.getByText(role, { exact: false }) }).count()
    check(`在场板行：${role}`, hit === 1, `${String(hit)} 行命中`)
  }
  const columnHeader = await page.getByText('团队内状态', { exact: true }).count()
  check('状态列头带「团队内」限定（D-c 文案）', columnHeader === 1, `${String(columnHeader)} 处`)
  // D-d：点 VP-Eng 行 → 该成员会话成为当前会话。实证锚点（2026-09-23）：child 视图的
  // 会话头出现 "Session hierarchy" 面包屑，含 "Switch subagent: <成员 label>"——
  // 直接断言目标成员身份（不只断言"切走了"）。只读 composer 仅 persisted-only child 才有。
  const engRow = rows.filter({ has: page.getByText('wochen VP-Eng', { exact: false }) }).first()
  console.log(`  （ui 诊断）点击前 URL = ${page.url()}`)
  await engRow.click()
  await sleep(1_500)
  console.log(`  （ui 诊断）点击后 URL = ${page.url()}`)
  const memberMarker = page.getByRole('navigation', { name: 'Session hierarchy' })
    .or(page.getByRole('button', { name: /Switch subagent: VP-Eng/ }))
    .or(page.getByText('This subagent is read-only for now'))
  try {
    await memberMarker.first().waitFor({ state: 'visible', timeout: 15_000 })
    const hierarchy = await page.getByRole('button', { name: /Switch subagent: VP-Eng/ }).count()
    check('点行进成员空间：VP-Eng 会话成为当前会话（D-d，提案验收 5）', hierarchy >= 1, `面包屑 "Switch subagent: VP-Eng…" ×${String(hierarchy)}`)
  } catch {
    writeFileSync('/tmp/replay-ui-after-click.aria', await page.locator('body').ariaSnapshot().catch(() => ''), 'utf8')
    console.log(`  （ui 诊断）失败现场 URL = ${page.url()}；aria 已落 /tmp/replay-ui-after-click.aria`)
    check('点行进成员空间：VP-Eng 会话成为当前会话（D-d，提案验收 5）', false, '15s 内未出现成员会话面包屑（Session hierarchy / Switch subagent）')
  }
}

let workspace
let runRoot
let parsed = []
let webChild
let replayUrl = ''
let replayBase = ''
try {
  ;({ workspace, runRoot, parsed, child: webChild, url: replayUrl, baseUrl: replayBase } = await driveScenario({
    patchSource: join(replayDir, 'cordis.snapshot.yml'),
    env: {
      DSH_SNAPSHOT: 'replay',
      DSH_SNAPSHOT_PROVIDER: provider,
      DSH_SNAPSHOT_MODEL: model,
      DSH_SNAPSHOT_FILE: fixLead,
      DSH_SNAPSHOT_CHILD_FILES: childFixtures.join(':'),
      DSH_TELEMETRY_DISABLED: '1',
    },
    tasks,
  }))
  if (oracle) {
    const differences = compareWorkspace(oracle.expected, workspace)
    check('完整 workspace 文件树零 diff（missing/extra/content）', differences.length === 0, differences.join('; '))
  }
  const expectedSessions = 1 + childFixtures.length
  check(`持久化会话数 = ${String(expectedSessions)}（lead + ${String(childFixtures.length)} child）`, parsed.length === expectedSessions, `实际 ${String(parsed.length)}${parsed.length !== expectedSessions ? `：${parsed.map(p => p.header.id).join(', ')}` : ''}`)
  if (REFRESH) {
    if (failures.length > 0) throw new Error('Refusing refresh after workspace/session failure')
    const raws = parsed.map(p => p.text)
    writeFileSync(rawLead, raws[0], 'utf8')
    fixtures[0] = normalizeFixtures(raws)[0]
    writeFileSync(fixLead, fixtures[0], 'utf8')
    writeSidecars(raws)
    console.log('  --refresh：keyless session + sidecars refreshed; independent workspace oracle untouched')
  }
  if (parsed.length !== expectedSessions) {
    for (const p of parsed) {
      const counts = {}
      for (const r of records(p.text)) counts[r.type] = (counts[r.type] ?? 0) + 1
      console.log(`  ── 诊断：${p.header.parentSession ? 'child' : 'lead'} 事件 = ${JSON.stringify(counts)}`)
    }
    console.log('  （会话数不足，仍对比已有会话以定位差异行）')
  }
  // 归一化比对（vendor 对位：两侧各自 ctx；{{cwd}}/{{system}}/{{tools}} + id redaction 吸收波动）
  // 重放侧先过场景自有 time-context 归一化（fixture 落盘时已同管道归一化，两侧对称）。
  const ctxOf = (items) => ({
    sessionIds: items.map(i => String(i.header.id)).filter(id => id !== ''),
    cwd: typeof items[0]?.header.cwd === 'string' ? items[0].header.cwd : '',
  })
  const actualN = normalizeSessionSnapshots(parsed.map(p => normalizeTimeContext(p.text)), ctxOf(parsed))
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
  if (JUDGES === 'full') {
    check('归一化日志零 diff', sessionDiffs === 0, sessionDiffs === 0 ? `${String(actualN.length)} 个会话逐行一致` : diffLine)
  } else {
    // presence 档：**member/task 集合等价**（= 在场板 rows 的数据路径，验收判据 4 的合同面）
    // + 在场板终态同形。queued（动态流数据源）不作判据、只显式记录差异——重放时序下尾部
    // 投递有固有差（r2 五轮实证：COO 最后 2 条收口消息在重放里被拒，27 → 25；录制侧为真
    // 模型节奏）。delivered（投递确认竞态面）、逐行交错序（TeamJournal 并发 append）、
    // 事件类型序列（title-llm 代差）同理不作判据；全量形态保真归 r3-delegation full 档。
    let teamDiffs = 0
    for (const [index, actual] of actualN.entries()) {
      const a = records(actual)
      const e = records(expectedN[index] ?? '')
      const pick = (rows) => rows
        .filter(r => typeof r.type === 'string' && ['team/member', 'team/task'].includes(r.type))
        .map(r => JSON.stringify(r)).sort()
      const aTeam = pick(a)
      const eTeam = pick(e)
      if (JSON.stringify(aTeam) !== JSON.stringify(eTeam)) {
        teamDiffs++
        const at = aTeam.findIndex((r, i) => r !== eTeam[i])
        console.log(`    team 集合差异：session#${index} 第 ${String(at + 1)} 条（排序后）`)
        if (eTeam[at] !== undefined) console.log(`      期望: ${eTeam[at].slice(0, 500)}`)
        if (aTeam[at] !== undefined) console.log(`      实际: ${aTeam[at].slice(0, 500)}`)
      }
    }
    check('member/task 事件集合等价（在场板数据路径，验收判据 4）', teamDiffs === 0, teamDiffs === 0 ? '' : `${String(teamDiffs)} 个会话的 member/task 事件集合不同`)
    // queued 差异显式记录（不判据、不静默）：见上方注释。
    for (const [index, actual] of actualN.entries()) {
      const a = records(actual).filter(r => r.type === 'team/message/queued')
      const eQueued = records(expectedN[index] ?? '').filter(r => r.type === 'team/message/queued')
      if (a.length !== eQueued.length) {
        const key = (r) => `${r.data.message.senderName}→${String(r.data.message.content?.[0]?.text ?? '').split('\n')[0].slice(0, 30)}`
        const aKeys = new Set(a.map(key))
        const missing = [...new Set(eQueued.map(key))].filter(k => !aKeys.has(k))
        console.log(`  （记录）session#${index} queued ${String(eQueued.length)} → ${String(a.length)}：${missing.map(k => `缺「${k}」`).join('、')}`)
      }
    }
    check(`归一化全量比对 SKIP（presence 档：录制早于内容演进，理由见脚本头注）`, true)
  }
  // sidecar 比对（P1.3）：system prompt 与 tool schemas 离开 fixture 后的真值对照
  const sidecarCtx = runCtx(parsed.map(p => p.text))
  if (JUDGES === 'presence') {
    check(`sidecar SKIP（presence 档，共 ${String(parsed.length * 2)} 份：persona/手册/工具表的历史漂移不适用，见脚本头注）`, true)
  } else {
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
  }
  // 在场板判据（R5b 提案验收 4）：重放 lead 会话的 team/* 事件喂读模型，产出与录制侧
  // **同形**的非空在场板——team 事件全丢=空板红；成员/任务折错=行不同红。
  const { presenceFromEvents } = await import(join(ROOT, 'packages/company-pack/lib/index.js'))
  const boardOf = (text) => presenceFromEvents(records(text).filter(r => typeof r.type === 'string' && r.type.startsWith('team/')))
  const replayBoard = boardOf(parsed[0]?.text ?? '')
  const recordedBoard = boardOf(leadFixture)
  const shape = (board) => board.rows.map(row => `${row.role}:${row.displayName}:${row.currentTask ?? '—'}`)
  if (recordedBoard.rows.length === 0) {
    check(`在场板（判据 4）：录制无 team 事件，跳过`, true)
  } else {
    check(`在场板非空且与录制同形（判据 4；${String(recordedBoard.rows.length)} 行）`,
      replayBoard.rows.length === recordedBoard.rows.length && JSON.stringify(shape(replayBoard)) === JSON.stringify(shape(recordedBoard)),
      `录制 ${JSON.stringify(shape(recordedBoard))} / 重放 ${JSON.stringify(shape(replayBoard))}`)
  }
  check('全程无 key（DSH_SNAPSHOT=replay + 真 LLM 已禁用）', true)
  // 浏览器档（P1.3 / R5b）：r3 = 委派卡端到端；r2 = 驾驶舱端到端（页签 + 行可点）。
  if (UI) {
    if (SCENARIO !== 'r3-delegation' && SCENARIO !== 'r2-motion') {
      check(`ui 档（${SCENARIO}）：暂只支持 r3-delegation / r2-motion`, false, '用 --scenario r3-delegation 或 r2-motion 跑 ui 档')
    } else {
      console.log(`  ── ui 档（真浏览器${SCENARIO === 'r2-motion' ? '驾驶舱' : '委派卡'}端到端）──`)
      await uiPhase({ url: replayUrl, workspace })
    }
  }
} catch (error) {
  failures.push(`异常: ${error.message}`)
  console.log(`  FAIL 异常: ${error.message.split('\n')[0]}`)
  console.log(error.stack?.split('\n').slice(1, 4).join('\n') ?? '')
} finally {
  webChild?.kill('SIGTERM')
  await sleep(300)
  if (KEEP) console.log(`  （--keep：现场保留 ${workspace ?? '(未建立)'}）`)
  else if (runRoot) rmSync(runRoot, { recursive: true, force: true })
}

console.log(failures.length === 0
  ? `\nreplay-smoke: ALL PASS（${SCENARIO} 无 key 重放${UI ? ` + ${SCENARIO === 'r2-motion' ? '驾驶舱' : '委派卡'}端到端` : ''}，${JUDGES === 'presence' ? 'member/task 集合等价 + 在场板同形' : '归一化零 diff'}，${workspaceScope}，${String(Math.round((Date.now() - startedAt) / 1000))}s）`
  : `\nreplay-smoke: ${String(failures.length)} FAILURE(S)\n  ${failures.join('\n  ')}`)
process.exit(failures.length === 0 ? 0 : 1)
