#!/usr/bin/env node
// 角色连通冒烟（会话级"它通就行"）：boot 真 web → 真挂 preset → 真发一句话 → 断言四件事。
// 何时跑：角色内容/persona/KB 改动后；连通档默认 ~6s，内容档（--full）按需 5–10min
//
// 默认（快速档，约 15–40 秒）：每角色只问一句"在岗吗"，断言
//   ① session/create 成功（preset 行 config 全过 = 挂载没炸）
//   ② 轮次真跑完（日志出现新的 turn/end）
//   ③ 模型真回话（assistant 正文非空）
//   ④ 人格真进 prompt（system/message 含该角色标记）
// ——不考内容对错（那是 `--full` 的事）。
//
// `--full`（全面档，5–10 分钟）：每角色三探针（身份/知识/产出）按 KB 事实断言内容。
// 为什么默认不跑：慢轮次实测 150s+，做门禁太贵；连通性用 ping 就够（2026-09-22 用户裁定）。
//
// 前置：DSH_HOME + 已装 pack + 模型凭据（真模型；ping 档 = 5 次极短调用）。
// 用法：source dev/env.sh && node scripts/probe-smoke.mjs [--port 0] [--concurrency 5] [--full] [--timeout 90000]
//
// 分层门禁的**设计要点（可迁移到别的面）**——2026-09-26 从 dev-loop §9 搬来这里（一处事实一个家：
// 这些是"本脚本为什么这么写"的说明，紧挨范例实现；dev-loop §9 只留指针）：
//   · **"通"不需要考内容**：挂载 + 轮次跑完 + 回话 + 人格进 prompt 已覆盖全部已知失败类
//     （postmortem 0001 preset 挂载失败 / 0003 client 砖死的那一类）。
//   · **能从权威日志读的事实，不要从模型答案推断**：人格是否进 prompt 看 `system/message`，
//     这是 keyless 硬证据；模型答案只用来判"有没有回话"。
//   · **问句要短**：一句 3 秒能答完的 ping 就够；"不要调用工具"能砍掉多步往返（读文件会把一轮拖到几分钟）。
//   · **完成信号用持久事件**（`turn/end`），不要用状态位（`session/list.running` 是"会话有活着的 agent"，
//     idle 也为 true，会让等待永不满足）。
//   · **慢是常态**：内容档超时 ≥5min；快档 90s 足够；失败重试一次（换新会话）。
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureRehearsalWorkspace, REHEARSAL_REL } from './lib/rehearsal.mjs'
import { requireDevHome } from './lib/runtime-home.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const PORT = Number(arg('port', '0'))
// 练习场 ≠ 运行场（轮间待办②）：默认 cwd 在排练场，排练/探针产物不再积进真盘；
// `--cwd` 可显式覆盖（确需指回真盘时）。
const CWD = resolve(arg('cwd', join(ROOT, REHEARSAL_REL)))
const BOOT_TIMEOUT_MS = 120_000
const PROBE_TIMEOUT_MS = Number(arg('timeout', '90000'))
const CONCURRENCY = Number(arg('concurrency', '5'))
const FULL = process.argv.includes('--full')

const ROLES = ['ceo', 'vp-eng', 'vp-sales', 'coo', 'cfo']

/** 人格是否进 prompt 的标记（system/message 里的角色特征串）。 */
const PERSONA_MARKERS = {
  ceo: /的 CEO|动议的唯一入口/,
  'vp-eng': /VP of Engineering/,
  'vp-sales': /VP of Sales/,
  coo: /的 COO|运营职能的化身/,
  cfo: /的 CFO|财务职能的化身/,
}

/** 快速档唯一的问题：越短越便宜；不许调工具（那会把一轮拖到几分钟）。 */
const PING_ASK = '请只回复两个字：在岗（不要调用工具、不要读文件）'

/** 全面档：内容题（慢，按需跑）。 */
const PROBES = {
  ceo: [
    { id: '身份', ask: '你是谁?你在这家公司对什么有最终决定权?', expect: [/全局/, /不做了|唯一|只有我/] },
    { id: '知识', ask: '公司的三条决策原则是什么?逐条说。', expect: [/一页纸/, /分歧/, /不代笔/] },
    { id: '产出', ask: '销售判断"没人买",研发说技术可行,两边都要推。你怎么办?两句话以内,不要调用工具。', expect: [/证据|验证|验收/, /预算|立项|决策|拍板|不动|不投/] },
  ],
  'vp-eng': [
    { id: '身份', ask: '你是谁?你对什么有 veto?', expect: [/可行性|技术/, /veto|否决|说不/] },
    { id: '知识', ask: '研发条线现在多少人?有没有专职 DBA?AI 试点项目每月 API 预算上限是多少美元?', expect: [/18/, /无 DBA|没有 DBA|后端兼管|无专职|没有专职/, /200/] },
    { id: '产出', ask: '提案:让财务 agent 自动写凭证并直接入账,省人力。你的技术立场?两句话以内。', expect: [/否决|不同意|反对|veto|风险/, /人审|风险|影子账|合规|审计|直接/] },
  ],
  'vp-sales': [
    { id: '身份', ask: '你是谁?你对什么有 veto?', expect: [/客户|市场|定价/, /没人买|veto|说不/] },
    { id: '知识', ask: '我们现在有几个客户?几家带年费维护合同?折扣下限是多少?', expect: [/9/, /6/, /9 折|九折/] },
    { id: '产出', ask: '客户要求 5 折,否则走人。这单你接不接?两句话以内。', expect: [/9 折|九折|底线/, /CFO|双签|CEO/] },
  ],
  coo: [
    { id: '身份', ask: '你是谁?你对什么有 veto?', expect: [/落地|预算|流程/, /接不住|veto|说不/] },
    { id: '知识', ask: '我们并行最多能接几个交付项目?新增一个 $600/月的固定订阅,要谁签字?', expect: [/8/, /CEO/] },
    { id: '产出', ask: '研发提出自建一套监控平台,需要 2 人长期值守。你怎么核查?两句话以内。', expect: [/人|值守|维护|编制/, /接不住|有条件|veto|上限|排期/] },
  ],
  cfo: [
    { id: '身份', ask: '你是谁?你对什么有 veto?', expect: [/现金|成本|合规/, /veto|否决|说不/] },
    { id: '知识', ask: '项目毛利底线是多少?出纳能记账吗?', expect: [/30/, /不能|不做账|禁止|分离|SoD|不相容/] },
    { id: '产出', ask: '一单 50 万的集成合同,预计 6 人·周交付,外包与云成本约 8 万。签不签?两句话以内。', expect: [/毛利|成本|人·周|人力/, /签|不签|条件/] },
  ],
}

let home
try {
  home = requireDevHome('probe-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
if (!process.argv.includes('--cwd')) ensureRehearsalWorkspace(ROOT)

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let rpcId = 0

/** 向运行中的 web 实例发一条 Typert RPC（与 preset-smoke 同一封套）。 */
async function rpc(base, cookie, endpoint, args) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: `probe-${++rpcId}`, method: endpoint, payload: { args } }),
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

/** 深提取所有 `{type:'text'}` 片段（跳过 reasoning / tool-call）。 */
function collectText(value, out) {
  if (Array.isArray(value)) { for (const item of value) collectText(item, out); return }
  if (value !== null && typeof value === 'object') {
    if (value.type === 'text' && typeof value.text === 'string') out.push(value.text)
    for (const item of Object.values(value)) collectText(item, out)
  }
}

/**
 * 读该会话日志窗口：完成轮数 + assistant 正文 + system 正文。
 *
 * ⚠ 两步读法：`session/page` 的 `throughSeq` 必须是**有效 seq**（`-1` 实测返回 0 条），
 * 而"当前游标"没有独立 RPC——越界调用会在错误里吐出它（`… is past cursor N`），用 N 再读一次。
 */
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
  if (cursor < 0) return { turnEnds: 0, text: '', systemText: '' }
  const page = await rpc(base, cookie, 'session/page', {
    request: { address, throughSeq: cursor, maxMessages: 500 },
  })
  let turnEnds = 0
  const parts = []
  const systemParts = []
  for (const record of page.records ?? []) {
    const event = record.event
    if (event?.type === 'turn/end') { turnEnds++; continue }
    if (event?.type === 'system/message') { collectText(event.data, systemParts); continue }
    if (event?.type !== 'assistant/message') continue
    collectText(event.data, parts)
  }
  return { turnEnds, text: parts.join('\n'), systemText: systemParts.join('\n') }
}

/** 等一个 prompt 轮结束：权威信号 = 日志里出现新的 `turn/end`（不用 list.running，那是"有活 agent"）。 */
async function turnReply(base, cookie, sessionId, before, deadline) {
  while (Date.now() < deadline) {
    await sleep(1500)
    const now = await readLog(base, cookie, sessionId)
    if (now.turnEnds > before.turnEnds && now.text.length > before.text.length) {
      return { reply: now.text.slice(before.text.length).trim(), systemText: now.systemText }
    }
  }
  throw new Error(`等待回复超时（${String(PROBE_TIMEOUT_MS)}ms）`)
}

/** 建会话 → 记基线 → 提问 → 等轮次结束。 */
async function askInNewSession(base, cookie, role, ask) {
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: CWD, agentPreset: role } })
  const sessionId = created.sessionId
  const before = await readLog(base, cookie, sessionId)
  await rpc(base, cookie, 'session/prompt', {
    request: {
      requestId: `probe-${role}-${String(Date.now())}-${String(Math.random()).slice(2, 8)}`,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: ask }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  return await turnReply(base, cookie, sessionId, before, Date.now() + PROBE_TIMEOUT_MS)
}

const failures = []
let passCount = 0

const { child, port, token } = await boot()
try {
  const base = `http://127.0.0.1:${String(port)}`
  const cookie = await authenticate(port, token)

  if (!FULL) {
    // ── 快速档：每角色一句 ping，断言"挂载 + 轮次跑完 + 模型回话 + 人格进 prompt" ──
    let cursor = 0
    async function pingWorker() {
      for (;;) {
        const role = ROLES[cursor++]
        if (role === undefined) return
        const startedAt = Date.now()
        try {
          const { reply, systemText } = await askInNewSession(base, cookie, role, PING_ASK)
          if (reply.length === 0) throw new Error('模型没回正文')
          if (!PERSONA_MARKERS[role].test(systemText)) throw new Error(`人格未进 prompt（system/message 不含 ${String(PERSONA_MARKERS[role])}）`)
          passCount++
          console.log(`  PASS ${role}（挂载+轮次+回话+人格，${String(Math.round((Date.now() - startedAt) / 1000))}s）`)
        } catch (error) {
          failures.push(`${role}: ${error.message}`)
          console.log(`  FAIL ${role}: ${error.message.split('\n')[0]}`)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ROLES.length) }, () => pingWorker()))
  } else {
    // ── 全面档：15 个内容探针（每探针独立会话），断言 KB 事实与 veto 语义 ──
    const jobs = []
    for (const role of ROLES) {
      for (const [index, probe] of PROBES[role].entries()) jobs.push({ role, index, probe })
    }
    let cursor = 0
    async function probeWorker() {
      for (;;) {
        const job = jobs[cursor++]
        if (job === undefined) return
        const label = `${job.role}#${String(job.index + 1)} ${job.probe.id}`
        try {
          const { reply } = await askInNewSession(base, cookie, job.role, job.probe.ask)
          const missing = job.probe.expect.filter(pattern => !pattern.test(reply))
          if (reply.length < 10) throw new Error(`回复过短（${String(reply.length)} 字符）`)
          if (missing.length > 0) {
            throw new Error(`断言未命中: ${missing.map(pattern => String(pattern)).join(' ; ')}\n──回复──\n${reply}`)
          }
          passCount++
          console.log(`  PASS ${label}（${String(reply.length)} 字符）`)
        } catch (error) {
          failures.push(`${label}: ${error.message}`)
          console.log(`  FAIL ${label}\n    ${error.message.split('\n').join('\n    ')}`)
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, () => probeWorker()))
  }
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

const total = FULL ? ROLES.length * 3 : ROLES.length
console.log(failures.length === 0
  ? `\nprobe-smoke: ALL PASS（${String(passCount)}/${String(total)}，${FULL ? '全面档·内容断言' : '快速档·连通性'}）`
  : `\nprobe-smoke: ${String(passCount)}/${String(total)} PASS，${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
