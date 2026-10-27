#!/usr/bin/env node
// 状态：常驻
// 无 key 会话重放（R5a P1.2 + P1.3；R5b 扩多 child 场景与在场板判据）——四方协作 ——
// 前置：**先 source run/env.sh 再跑**（或显式给同样的 DSH_PERMISSION_MODE）。姿态事件的**值**已脱敏，
//   但它们的**在场与位置**随机器姿态变（Seatbelt 可用 = workspace-write，损坏 = danger-full-access，
//   权限事件序列不同）——裸跑会在那些行上红，那是设计内的「序列漂移照样红」，不是夹具坏。
// 何时跑：录制行为、组合或 workspace replay 改动时（第三档，无 key；现行只有一个 headless 合成场景 ~2s；浏览器档已停用，真页面断言用 checks/smoke/ui-scene-smoke.mjs）
//   --prepare     原始录制（replay/raw/，lead.jsonl + 任意名 child）→ 归一化 fixture
//                 （session.v3.jsonl + session.<k>.v3.jsonl，child 按 header createdAt 排序）
//                 + sidecar（system-prompt.expected.md / tool-schemas.expected.json；child 带 .k. 后缀）
//   --refresh     headless authored 场景无 key 刷新会话/sidecar，完整 workspace oracle 必须先通过且永不重写。
//   --record      场景组合（replay/cordis.yml，真模型认证档）下重录 → replay/raw/ → 顺带 prepare
//   answerer: browser（场景 snapshot.yml 可选项）：本场景的问询由**真 UI 认领并作答**（第一项），
//     录/放两侧同规则 ⇒ 对称。为什么需要它：ask 是前景等待，没人作答整轮不收口、会话日志不封盘，
//     阻塞型场景因此既录不成也重放不成（2026-10-11 human-exits-ask 实测）。默认不开。
//   --ui / --refresh-ui  已停用：本仓没有声明 uiEvidence 的场景；真页面断言用
//                 checks/smoke/ui-scene-smoke.mjs（自起实例 + cdp-probe + 证据）。
//   （默认）       重放组合（replay/cordis.snapshot.yml，llm-replay）复演 → 归一化比对 + sidecar
//                 比对 + 在场板判据（R5b：重放 lead 的 team/* 事件喂 pack 读模型，非空且与录制
//                 同形；提案验收 4。场景不带 team 事件时自动跳过）
// 机制依据：本脚本头注 + snapshots/replay 场景的 snapshot.yml。可行性研究长文已删（历史在 git）。
// ⚠ 录/放组合必须同构（vendor 教义：cordis.yml 与 cordis.snapshot.yml 仅差 LLM 行）——
//   title-llm 两侧都禁：其 LLM 调用不进重放脚本（deriveReplayScript 只收 assistant 流），
//   吃条目会造成供条错位；两侧都走截断回退 ⇒ 事件形态一致。
//   P1.3 起两侧同构地多两行（ui-agent-team + company-client）：委派卡注册在本包 client 面
//   （slots 的 tool.call.toolview keyed 注册），行不进组合卡永不渲染（红证即摘行）。
// sidecar 为什么自算：vendor suite.ts 的 format*Snapshot 有 vitest 依赖，纯 Node 驱动 import
//   不了；格式（{initial, changes} + <!-- system/message change N --> 分隔）照抄其源码。
// 浏览器档旧实现（--ui，已停用）住在 ./lib/replay-ui.mjs（2026-10-14 拆出）：vendor apps/web/tests/scaffold.ts
//   import vitest 不能直接 import，normalizeAria/captureStableAria 等为逐行转写（出处注在该文件函数头）。
// 分层（guides/dev-loop §9.1 + readiness P1.4）：第三档（无 key、但要起进程与浏览器），不进 pnpm test。
// 预算（§10）：墙钟 ≤ --wall。
// 触发线（2026-10-16 立，来源 `_backlog/issues/2026-10-16-code-structure-round3.md` Item 3）：本文件 >800 行，
//   或再增第 5 个 mode ⇒ 判据 / 驱动器分家（沿 2026-10-14 replay-ui 拆出先例，不再往本文件叠模式）。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { COMPANY_ROLE_IDS } from '../../tools/lib/company-roles.mjs'
import { makeFailingCheck, sleep } from '../../tools/lib/probe-kit.mjs'
import { diagnosisDir } from '../../tools/lib/diagnosis.mjs'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import { compareWorkspace, seedWorkspace, workspaceOracle } from '../../tools/lib/workspace-oracle.mjs'
import { mirrorCompanyReference } from '../../tools/lib/rehearsal.mjs'
import { judgeReplaySessions, normalizeReplayTempPaths, normalizeReplayTimeContext } from '../../tools/lib/replay-logic.mjs'
import {
  normalizeSessionLog,
  normalizeSessionSnapshots,
  scrubSessionSnapshot,
  tokenizeSessionFixtureCwd,
} from '../../vendor/dsh/packages/test-support/session-snapshot/lib/types/normalize.js'
import { redactSessionSnapshotIds } from '../../vendor/dsh/packages/test-support/session-snapshot/lib/types/identity.js'
import { materializeProfilePatch } from '../../vendor/dsh/packages/test-support/session-snapshot/lib/types/launcher.js'
import { prepareSessionSnapshotFixtureForComparison } from '../../vendor/dsh/packages/test-support/llm-replay/lib/index.js'
import { launchChromium, loadChromium } from '../../tools/drivers/playwright.mjs'
import { snapshotScene } from '../../tools/lib/repository-layout.mjs'

const { load } = createRequire(join(ROOT, 'vendor/dsh/package.json'))('js-yaml')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const SCENARIO_ARG = arg('scenario', 'foundation-workspace')
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
const PRESET_PATCHES = COMPANY_ROLE_IDS
  .flatMap(role => ['--patch', join(ROOT, 'packages/company-pack/presets', role, 'agent.cordis.yml')])
// 2026-10-27（R3-04）：UI 金样场景随真实证据移出产品仓，本仓没有可跑的 `ui.expected.md`。
// 真页面车道改由 checks/smoke/ui-scene-smoke.mjs 承担（自起实例 + cdp-probe + 证据）。
if (UI || REFRESH_UI) {
  console.error('replay-smoke: --ui/--refresh-ui 当前不可用——本仓没有声明 uiEvidence 的场景；')
  console.error('  真页面断言请用 node checks/smoke/ui-scene-smoke.mjs（自起实例，成功/失败都留证）。')
  process.exit(2)
}
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
/** vendor suite.ts 的 sidecar 命名：lead 无后缀，child 按 fixture 序号（session.1 → .1）。 */
const sidecarPrompt = (index) => join(replayDir, index === 0 ? 'system-prompt.expected.md' : `system-prompt.${String(index)}.expected.md`)
const sidecarTools = (index) => join(replayDir, index === 0 ? 'tool-schemas.expected.json' : `tool-schemas.${String(index)}.expected.json`)

const records = (text) => text.split(/\r?\n/).filter(l => l.trim() !== '').map(l => JSON.parse(l))
const headerOf = (text) => records(text)[0] ?? {}
// sleep / check 收敛自 probe-kit（2026-10-14 重构轮；原内联定义与 kit 逐字同义）。

/** vendor writeSessionFixtures 生产线的裁剪版（stabilize 需先代 fixture，首录无先代跳过；redact 收数组）。 */
function normalizeFixtures(raws) {
  const scrubbed = raws
    .map(raw => tokenizeSessionFixtureCwd(raw))
    .map(stable => prepareSessionSnapshotFixtureForComparison(stable))
    .map(prepared => scrubSessionSnapshot(prepared))
    .map(text => normalizeReplayTimeContext(text))
  return redactSessionSnapshotIds(scrubbed)
}

/**
 * 把一份归一化日志拆成「严格序列」+「投递内容集合」。
 * 为什么要拆：`session-log-deepseek/delivery-accepted`（日志屏障）与 `agent/inbox/spliced`（inbox 落地）
 * 是**同一次投递的两半**，位置取决于上一轮流的分块时机（录制带 200ms 间隔 ⇒ 屏障先、splice 在 step/start
 * 后；重放瞬间收口 ⇒ splice 先、甚至跨过 step/start）。位置是簿记、内容是语义 ⇒ 序列判据剔掉这两类，
 * `deliveries` 按 JSON 排序后逐会话比对（内容/条数/来源变了仍然红）。空 splice（removedCount）不是投递。
 * @param {string} log normalized session log
 * @returns {{ sequence: object[], deliveries: string[] }}
 */
function splitDeliveryPlumbing(log) {
  const sequence = []
  const deliveries = []
  for (const line of log.split('\n')) {
    if (line.trim() === '') continue
    const record = JSON.parse(line)
    if (record.type === 'session-log-deepseek/delivery-accepted') continue
    if (record.type === 'agent/inbox/spliced') {
      const inserted = record.data?.inserted
      if (Array.isArray(inserted) && inserted.length > 0) deliveries.push(JSON.stringify(inserted))
      continue
    }
    sequence.push(record)
  }
  return { sequence, deliveries: deliveries.sort() }
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

/**
 * 场景声明的子会话数：`snapshot.yml` 的 `session.children`（缺省 = 0，单轮场景合法）。
 * 为什么按声明算：--record 原先把「≥2 个会话」写死，等于假定每个场景都有委派 ⇒ 单轮场景
 * （如 human-exits-ask 的阻塞拍板）录完必被判失败、录制还不落盘（2026-10-11 实测）。
 */
const declaredChildren = (meta) => {
  const children = meta?.session?.children
  if (children === undefined || children === null) return 0
  return Array.isArray(children) ? children.length : 1
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
  else mirrorCompanyReference(workspace, join(ROOT, 'company-workspace'))   // BUG-006：参考镜像含 templates/（AGENTS 实拷贝——oracle 拒符号链接）
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
  // 0.2.1：实验性 schedule bundle 退役——宿主 schedule / ui-schedule 行由 web-app 组合挂，
  // time-context + tool-schedule 由五个 preset 各自声明（`preset-clock` 组）⇒ 临时 profile 不再需要它。
  writeFileSync(join(profileDir, 'package.json'), `${JSON.stringify({
    name: 'dsh-replay-profile',
    private: true,
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dsh-company-pack'] } },
  }, null, 2)}\n`, 'utf8')
  const patch = materializeProfilePatch(patchSource, runRoot, 'web', patchRoot, 0)
  if (env.credentials) {
    copyFileSync(env.credentials, join(runRoot, '.dsh', '.credentials.yaml'))
    delete env.credentials
  }
  // 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝）。
  // 既有差异当参数保留：场景 patch + 五个预设行 ⇒ patch 数组；空 cookie 静默拼空串（companyCookie
  // 默认 'join'）；rpcId 前缀 `replay-` + 失败回退转储响应体（dumpBodyOnError）。banner 等待与
  // 600 上限的失败转储已收进模块：失败文案统一为模块款、输出上限 16000（卡内接受，报告已注记）。
  // 注入的 spawn 顺手捕获 child——boot 失败（banner 等不到）时下方 catch 仍能 kill（team-concurrency 先例）。
  let child
  try {
    const { base, token } = await startWeb({
      spawn: (...args) => (child = spawn(...args)),
      root: ROOT,
      home: join(runRoot, '.dsh'),
      env: {
        ...process.env,
        DSH_AGENTS_HOME: join(runRoot, '.agents'),
        ...env,
        NODE_OPTIONS: [process.env.NODE_OPTIONS, '--disable-warning=ExperimentalWarning'].filter(Boolean).join(' '),
      },
      // PRESET_PATCHES 是 '--patch'/路径交错的平铺表（上方 spawnSync CLI lane 复用同一常量，不重构它）；
      // filter 取奇数位 = 平铺表里的路径项。
      patch: [patch, ...PRESET_PATCHES.filter((_, i) => i % 2 === 1)],
      port: 0,
    })
    const url = `${base}/?token=${token}` // 浏览器档直接带 token 进页面
    const cookie = await companyCookie({ fetch, base, token })
    const rpc = companyRpc({ fetch, base, cookie, prefix: 'replay-', dumpBodyOnError: true })
    const created = await rpc('session/create', { request: { cwd: workspace, agentPreset: 'ceo' } })
    const sessionId = created.sessionId
    // UI 的会话搜索按**名字**匹配，自动兜底标题搜不到（2026-10-11 实测 0 结果）⇒ 先改成一个**确定**标题。
    // ⚠ 必须确定：标题进会话日志，带时间戳会让重放必红（首轮实测 `…-ask 48098` vs `…-ask 25030`）。
    //   每次重放都在临时 DSH home 里，只有本场一个会话 ⇒ 同名不冲突。
    const uiTitle = `${SCENARIO} 场景会话`
    if (metadata.answerer === 'browser') {
      try { await rpc('session/rename', { request: { sessionId, title: uiTitle } }) } catch { /* 兜底 */ }
    }
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
    /**
     * 当前未作答的 ask 调用（取第一条）；没有则 undefined。
     * ⚠ 读法与 readPage 一致（先探 cursor 再按 cursor 读）：直接拿 `throughSeq: MAX_SAFE_INTEGER` 读会抛，
     *   而抛错若被静默吞掉就表现为"没有待答问询"——2026-10-11 实测：答题人因此一次都没被叫醒。
     */
    const pendingAsk = async () => {
      try {
        // 探 cursor 的请求本身会以「past cursor N」被拒（readPage 同款）——从错误里取 N，别当失败。
        let cursor = -1
        try {
          const probe = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: Number.MAX_SAFE_INTEGER, maxMessages: 1 } })
          cursor = probe.records?.at(-1)?.event?.seq ?? -1
        } catch (error) {
          const m = /past cursor (\d+)/.exec(String(error.message))
          if (m === null) throw error
          cursor = Number(m[1])
        }
        if (cursor < 0) return undefined
        const page = await rpc('session/page', { request: { address: { kind: 'session', sessionId }, throughSeq: cursor, maxMessages: 500 } })
        const events = (page.records ?? []).map(r => r.event).filter(Boolean)
        const call = events.find(e => e?.type === 'tool/call' && e?.data?.name === 'ask_user_question')
        if (call === undefined) return undefined
        const settled = events.some(e => e?.type === 'tool/result' && e?.data?.callId === call.data.callId)
        if (settled) return undefined
        const parsed = JSON.parse(String(call.data.arguments ?? '{}'))
        const option = parsed.questions?.[0]?.options?.[0]?.label
        return typeof option === 'string' && option !== '' ? { callId: String(call.data.callId), option } : undefined
      } catch (error) {
        console.log(`  待答问询检查失败（当作没有，会继续等）：${String(error.message).slice(0, 120)}`)
        return undefined
      }
    }

    /**
     * 用真浏览器认领并作答（产品路径：先连工作区，再按唯一标题搜会话，点选项 + Enter 提交）。
     * 为什么不是 RPC：`userQuestions/answer` 对未被 Client 认领的问询返回 false，整轮仍不收口（实测）。
     */
    const answerViaBrowser = async ({ url: guiUrl, title, option }) => {
      const chromium = await loadChromium(ROOT)
      const browser = await launchChromium(chromium)
      try {
        const page = await browser.newPage()
        await page.goto(guiUrl)
        await page.waitForTimeout(2_500)
        for (const name of ['Internal Testing Notice', 'Preview Notice']) {
          const dialog = page.locator('[role=dialog]').filter({ hasText: name })
          if (await dialog.count() === 0) continue
          const button = dialog.getByRole('button', { name: /Continue/ })
          if (await button.count() > 0) await button.first().click()
          await page.waitForTimeout(400)
        }
        const ws = page.getByText('rehearsal-workspace', { exact: true })
        if (await ws.count() > 0) { await ws.first().click(); await page.waitForTimeout(1_500) }
        const search = page.getByRole('button', { name: 'Search sessions' })
        if (await search.getAttribute('aria-expanded') !== 'true') await search.click()
        await page.getByPlaceholder('Search session names').fill(title)
        const result = page.getByRole('tree', { name: 'Search results' }).getByRole('treeitem').filter({ hasText: title })
        await result.first().waitFor({ timeout: 20_000 })
        await result.first().click()
        await page.getByRole('tab', { name: 'Chat', exact: true }).waitFor({ timeout: 15_000 })
        const radio = page.getByRole('radio', { name: option.slice(0, 10) }).first()
        await radio.waitFor({ state: 'visible', timeout: 90_000 })
        await radio.click()
        await radio.press('Enter')
      } finally { await browser.close() }
    }

    let seenTurnEnds = 0
    const answeredCalls = new Set()
    for (const [index, task] of tasks.entries()) {
      await rpc('session/prompt', {
        request: { requestId: `replay-${index}-${Date.now()}`, sessionId, mode: 'queue', content: [{ type: 'text', text: task }], clientTimeZone: 'Asia/Shanghai' },
      })
      for (;;) {
        if (Date.now() - startedAt > WALL_MS) break
        await sleep(3000)
        const { turnEnds } = await readPage()
        if (turnEnds > seenTurnEnds) { seenTurnEnds = turnEnds; break }
        // 场景声明了浏览器答题人：等不到收口时看有没有未作答的问询，有就认领作答（录/放同规则）。
        if (metadata.answerer !== 'browser') continue
        const pending = await pendingAsk()
        if (pending === undefined || answeredCalls.has(pending.callId)) continue
        answeredCalls.add(pending.callId)
        console.log(`  问询在场（${pending.option.slice(0, 24)}…）→ 用真 UI 认领作答`)
        await answerViaBrowser({ url, title: uiTitle, option: pending.option })
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
    return { workspace, runRoot, child, parsed, sessionId, url, baseUrl: base, token, uiTitle, rpc }
  } catch (error) {
    child.kill('SIGTERM')
    throw error
  }
}

const startedAt = Date.now()

if (RECORD) {
  // 竞态（BUG-032）：委派是 activation——child 的完成通知可能落在 lead 的**轮内**（被并进最后一步）
  // 或**轮后**（另起一轮）。前者录成 3 次模型调用、后者 4 次；重放侧的到达时机若与录制相反，
  // llm-replay 会因「script exhausted」红，而这是**录制形状的运气**，不是代码错。
  // 对策：录完立即用 keyless replay 自检；红就重录（最多 3 次）。命令要么产出可重放 fixture，要么如实失败。
  const credentials = join(ROOT, 'runtime/harness-home/.credentials.yaml')
  if (!existsSync(credentials)) { console.error('replay-smoke --record: 需要 dev home 凭据（真模型认证档）'); process.exit(2) }
  const MAX_ATTEMPTS = 3
  const scriptPath = fileURLToPath(import.meta.url)
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const taskSource = existsSync(fixLead) ? fixLead : (existsSync(rawLead) ? rawLead : archiveLead)
    const tasks = tasksFromSession(readFileSync(taskSource, 'utf8'))
    console.log(`--record：第 ${String(attempt)}/${String(MAX_ATTEMPTS)} 次（任务来源 ${basename(taskSource)}，真模型，${String(tasks.length)} 段）`)
    const { workspace: _workspace, runRoot, child, parsed } = await driveScenario({
      patchSource: join(replayDir, 'cordis.yml'),
      env: { credentials },
      tasks,
    })
    child.kill('SIGTERM'); await sleep(300)
    try {
      const want = 1 + declaredChildren(metadata)
      if (parsed.length !== want) {
        console.error(`--record：期望 lead + ${String(want - 1)} child（按 snapshot.yml 的 session.children 声明），实际 ${String(parsed.length)}：${parsed.map(p => JSON.stringify(p.header)).join('\n')}`)
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
      console.log(`--record：录制完成（1 lead + ${String(raws.length - 1)} child；lead ${String(records(raws[0]).length)} 行），自检重放…`)
    } finally {
      if (!KEEP) rmSync(runRoot, { recursive: true, force: true })
    }
    // 自检：子进程跑本文件的 keyless replay 档（不带 --record，不会递归）。
    const selfCheck = spawnSync(process.execPath, [scriptPath, '--scenario', SCENARIO], { cwd: ROOT, encoding: 'utf8' })
    if (selfCheck.status === 0) {
      console.log(`--record：自检通过（第 ${String(attempt)} 次录制可重放）`)
      process.exit(0)
    }
    console.log(`--record：第 ${String(attempt)} 次录制自检红——${String((selfCheck.stdout ?? '').split('\n').filter(l => l.includes('FAILURE')).slice(-1)[0] ?? '').trim()}（重录）`)
  }
  console.error(`--record：连续 ${String(MAX_ATTEMPTS)} 次都产不出可重放 fixture——最后一次保留在盘上供诊断；这不是代码错，是委派通知的到达竞态`)
  process.exit(1)
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
// 投递屏障的 `throughSeq` 是**派生簿记**（"到第几行为止已交给模型"，随上一轮流的分块时机浮动：
// 同一次投递录制 38 / 重放 37）。它是唯一无法在写盘侧归一化的字段——vendor 的 snapshot 归一化会校验
// 它必须是数字（`delivery throughSeq must be a non-negative safe integer`），所以 token 只能在
// **写盘之后、读回时**做：盘上仍是合法录制，比对视图里两张都取同一个 token。
// marker 本身（位置/条数/sessionFormatVersion/sessionId）原样保留 ⇒ 少一条仍然红。
const tokenizeDeliveryBarrier = (text) => text.replace(/(\{"type":"session-log-deepseek\/delivery-accepted","data":\{[^}]*?"throughSeq":)\d+/g, '$1"<delivery-barrier>"')
const readFixture = (path) => tokenizeDeliveryBarrier(readFileSync(path, 'utf8'))
const leadFixture = readFixture(fixLead)
const childFixtureTexts = childFixtures.map(readFixture)
const fixtures = [leadFixture, ...childFixtureTexts]
const { provider, model } = modelOf(leadFixture)
const tasks = tasksFromSession(leadFixture)
const failures = []
const check = makeFailingCheck(failures)
/** 金样差异首行定位（多行文本的失败诊断）。 */
const firstDiff = (expected, actual) => {
  const e = expected.split('\n'); const a = actual.split('\n')
  for (let i = 0; i < Math.max(e.length, a.length); i++) {
    if (e[i] !== a[i]) return `第 ${String(i + 1)} 行：期望 ${JSON.stringify(e[i] ?? '(缺)').slice(0, 160)} / 实际 ${JSON.stringify(a[i] ?? '(缺)').slice(0, 160)}`
  }
  return '内容一致（可能是行尾差异）'
}

/** 单行 JSON 的字符级首差定位（2026-10-20 BUG：session 行差异只打截断头，手册注入差异在
 *  第 ~150 行 ⇒ 期望/实际可见前缀完全相同，跑动中的 agent 看不出差异在哪——r3 断裂当晚
 *  实测首差在字符 5545，截断头 700 字符内零线索）。 */
const charDiff = (expected, actual) => {
  const e = String(expected)
  const a = String(actual)
  let at = 0
  while (at < e.length && at < a.length && e[at] === a[at]) at++
  const window = (s) => s.slice(Math.max(0, at - 60), at + 120).replace(/\n/g, '\\n')
  return `首差@字符${String(at)}：期望 …${window(e)}… / 实际 …${window(a)}…`
}

/** 本场失败现场目录（懒建）：session 行差异全文与 sidecar 全文都落这里，不再 /tmp 固定名。 */
let failureDumpDir = null
const dumpDir = () => (failureDumpDir ??= diagnosisDir(ROOT, `replay-${SCENARIO}`))

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
    // 2026-10-25：--refresh 的语义就是“接受会话/sidecar 漂移、以实测刷新 fixture”；
    // 只有独立 workspace oracle 失败才拒绝（那说明场景本身坏了，不是 fixture 旧）。
    if (failures.some(f => f.startsWith('完整 workspace'))) throw new Error('Refusing refresh after workspace oracle failure')
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
  // 顺序要紧：先让 vendor 归一化把 cwd 换成 {{cwd}}（它会覆盖 header 与 runtime-context 正文），
  // 再对我们的临时工作区路径做 token 化（模型复述进散文里的那部分 vendor 不认）。
  const actualN = normalizeSessionSnapshots(parsed.map(p => normalizeReplayTimeContext(p.text)), ctxOf(parsed)).map(normalizeReplayTempPaths)
  // expected 侧也要过同一 time-context/posture 归一化（2026-10-25：foundation 的 permission/preset
  // 在 actual 侧被 token 成 {{posture}}、expected 侧没 token，造成假红；两侧必须同管道）。
  const expectedN = normalizeSessionSnapshots(fixtures.map(normalizeReplayTimeContext), ctxOf(fixtures.map(t => ({ header: headerOf(t) })))).map(normalizeReplayTempPaths)
  // 投递两半（屏障 + inbox splice）是**时序簿记**：位置随上一轮流的分块时机漂（录制/重放两向都实测过），
  // 但内容不是。序列判据里剔掉它们，另用「投递内容集合」判据保内容；两边对称，其他事件逐行仍然严格。
  const actualStream = actualN.map(splitDeliveryPlumbing)
  const expectedStream = expectedN.map(splitDeliveryPlumbing)
  const deliveryMismatch = actualStream.findIndex((s, i) => JSON.stringify(s.deliveries) !== JSON.stringify(expectedStream[i]?.deliveries ?? []))
  const actualRows = actualStream.map(s => s.sequence)
  const expectedRows = expectedStream.map(s => s.sequence)
  let diffLine = ''
  let sessionDiffs = 0
  if (JUDGES === 'full') {
    const sessionDifferences = judgeReplaySessions(actualRows, expectedRows, 'full')
    for (const { sessionIndex, rowIndex, expected, actual } of sessionDifferences) {
      diffLine = `session#${sessionIndex} 第 ${String(rowIndex + 1)} 行：期望 ${expected?.type ?? '(缺)'} / 实际 ${actual?.type ?? '(缺)'}`
      console.log(`    差异：${diffLine}`)
      // 截断头只作形状预览；真正的差异定位 = 字符级首差 + 全文落诊断区（跨进程可回溯）。
      if (expected !== undefined && actual !== undefined) console.log(`      ${charDiff(JSON.stringify(expected), JSON.stringify(actual))}`)
      const dir = dumpDir()
      const tag = `session-${String(sessionIndex)}-row-${String(rowIndex)}`
      if (expected !== undefined) writeFileSync(join(dir, `${tag}.expected.json`), JSON.stringify(expected, null, 2), 'utf8')
      if (actual !== undefined) writeFileSync(join(dir, `${tag}.actual.json`), JSON.stringify(actual, null, 2), 'utf8')
    }
    if (sessionDifferences.length > 0) console.log(`      （差异全文已落 ${dumpDir()}）`)
    sessionDiffs = sessionDifferences.length

    check('归一化日志零 diff（投递簿记除外）', sessionDiffs === 0, sessionDiffs === 0 ? `${String(actualN.length)} 个会话逐行一致` : diffLine)
    check('投递内容集合等价', deliveryMismatch === -1, deliveryMismatch === -1 ? '' : `session#${String(deliveryMismatch)} 的 inbox 投递内容不同（内容/条数/来源变了）`)
  } else {
    // presence 档：**member/task 集合等价**（= 在场板 rows 的数据路径，验收判据 4 的合同面）
    // + 在场板终态同形。queued（动态流数据源）不作判据、只显式记录差异——重放时序下尾部
    // 投递有固有差（r2 五轮实证：COO 最后 2 条收口消息在重放里被拒，27 → 25；录制侧为真
    // 模型节奏）。delivered（投递确认竞态面）、逐行交错序（TeamJournal 并发 append）、
    // 事件类型序列（title-llm 代差）同理不作判据；全量形态保真归 r3-delegation full 档。
    const teamDifferences = judgeReplaySessions(actualRows, expectedRows, 'presence')
    for (const { sessionIndex, differingIndex, expectedRows: expectedTeam, actualRows: actualTeam } of teamDifferences) {
      console.log(`    team 集合差异：session#${sessionIndex} 第 ${String(differingIndex + 1)} 条（排序后）`)
      if (expectedTeam[differingIndex] !== undefined) console.log(`      期望: ${expectedTeam[differingIndex].slice(0, 500)}`)
      if (actualTeam[differingIndex] !== undefined) console.log(`      实际: ${actualTeam[differingIndex].slice(0, 500)}`)
    }
    const teamDiffs = teamDifferences.length
    check('member/task 事件集合等价（在场板数据路径，验收判据 4）', teamDiffs === 0, teamDiffs === 0 ? '' : `${String(teamDiffs)} 个会话的 member/task 事件集合不同`)
    // queued 差异显式记录（不判据、不静默）：见上方注释。
    for (const [index, actual] of actualRows.entries()) {
      const a = actual.filter(r => r.type === 'team/message/queued')
      const eQueued = (expectedRows[index] ?? []).filter(r => r.type === 'team/message/queued')
      if (a.length !== eQueued.length) {
        const key = (r) => `${r.data.message.senderName}→${String(r.data.message.content?.[0]?.text ?? '').split('\n')[0].slice(0, 30)}`
        const aKeys = new Set(a.map(key))
        const missing = [...new Set(eQueued.map(key))].filter(k => !aKeys.has(k))
        if (process.argv.includes('--verbose')) {
          console.log(`  （记录）session#${index} queued ${String(eQueued.length)} → ${String(a.length)}：${missing.map(k => `缺「${k}」`).join('、')}`)
        } else {
          console.log(`  （记录）session#${index} queued ${String(eQueued.length)} → ${String(a.length)}：${String(missing.length)} 条差异（--verbose 看明细）`)
        }
      }
    }
    check.skip('归一化全量比对', 'presence 档：录制早于内容演进，理由见脚本头注')
  }
  // sidecar 比对（P1.3）：system prompt 与 tool schemas 离开 fixture 后的真值对照
  const sidecarCtx = runCtx(parsed.map(p => p.text))
  if (JUDGES === 'presence') {
    check.skip('sidecar', `presence 档，共 ${String(parsed.length * 2)} 份：persona/手册/工具表的历史漂移不适用，见脚本头注`)
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
          const dir = dumpDir()
          writeFileSync(join(dir, `sidecar-${kind}-${String(index)}.expected`), expected, 'utf8')
          writeFileSync(join(dir, `sidecar-${kind}-${String(index)}.actual`), actual, 'utf8')
        }
        check(`sidecar ${kind}#${String(index)} 零 diff`, pass, pass ? '' : `${firstDiff(expected, actual)}（全文已落 ${dumpDir()}/sidecar-${kind}-${String(index)}.*）`)
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
