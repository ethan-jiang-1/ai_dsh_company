#!/usr/bin/env node
// 状态：常驻
// Coding entry probe: explicit standard preset + repo cwd + logged coding baseline.
// 何时跑：入口链/执行链文档（AGENTS.md / docs/index.md / dev-loop / _backlog）改动后；真模型认证档
// Machine checks validate per-question routing/evidence, not semantic correctness.
// No keyless regression claim: true-model certification, 不进 pnpm test.
// Usage: source run/env.sh && node checks/smoke/entry-probe-smoke.mjs [--port 0] [--timeout 240000]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isAbsolute, join, relative, sep } from 'node:path'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { assistantMessageText, collectText, readRecords } from '../../tools/lib/session-log.mjs'
import { ENTRY_QUESTIONS, evaluateEntryProbe, assertCodingBaseline } from '../../tools/lib/entry-probe.mjs'
import { expectedTag } from '../gates/lib/pin.mjs'   // Q4 严格档：判据绑定现行 pin（2026-10-27 R3-15）

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
let home
try { home = requireDevHome('entry-probe-smoke') } catch (error) {
  console.error(error.message); process.exit(2)
}
const PORT = Number(arg('port', '0'))
const TURN_TIMEOUT_MS = Number(arg('timeout', '240000'))
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535 || !Number.isFinite(TURN_TIMEOUT_MS) || TURN_TIMEOUT_MS <= 0) {
  console.error('entry-probe: port/timeout 无效'); process.exit(2)
}
// Overriding cwd can silently change the injected instruction chain. Keep this probe repo-specific.
if (process.argv.includes('--cwd')) { console.error('entry-probe: cwd 固定为开发仓库根，不接受 --cwd'); process.exit(2) }
const PROMPT = [
  '你是本仓库的只读审读代理。先读 AGENTS.md、docs/index.md、docs/guides/dev-loop.md；',
  '再按入口指针读取相关 docs/、notes/ 与 _backlog/（无需通读全树）。不要联网、执行命令、修改文件或启动子代理。',
  '这是审读任务，不执行任务，不进入实施；来源矛盾或答不了时明确列出，不编造。',
  '最后只输出一个 JSON 对象，不要输出前后说明，结构如下：',
  '{"answers":[{"id":"Q1","status":"answered","answer":"本题答案","evidence":[{"path":"AGENTS.md","quote":"该文件中逐字原文，至少8字符"}]}],"conflicts":[]}',
  'answers 必须每题恰好一项；status 可为 answered/unresolved；**每题必须带 evidence（path + 该文件逐字原文，≥8 字符）——缺证据按未作答判**。',
  'conflicts 只列**活跃树现行文本之间**的来源冲突——历史面（snapshots/** 档案、notes/archived/、_backlog/_archive/、deliverables-archive/、runtime/）引用的是录制/归档时点原文，与现行合同的时效差异不立矛盾（冻结面按政策不追改）。',
  'JSON 语法：quote 与 answer 里如出现 ASCII 双引号必须写成 \\" 转义（或改写成「」——比对时引号字形与空白、markdown 标记都会被归一化，不影响判分）；务必保证整份输出是合法 JSON（2026-09-26 实证：一处未转义的 " 会让整份不可解析、12 题全判 0）。',
  '引文纪律：quote 优先**整行照抄**；行太长宁可选更短的一整句，也不要用 … 截断长行（首尾 … 会被剥掉后按前缀核对，中间挖空必判不匹配——多轮实证的失分主因）。',
  `每题给出其自己的答案和证据，不以其他题的内容替代。以下 ${ENTRY_QUESTIONS.length} 题：`,
  ...ENTRY_QUESTIONS.map(q => `${q.id}: ${q.ask}`),
].join('\n')
const sourceHashes = new Map()
// 允许面（2026-09-26 两次扩）：根入口 + docs/ + notes/ + **公司手册** + **checks|probes|tools/ + tests/**。
// 为什么加 `company-workspace/AGENTS.md`：Q3 问"交付物三态的事实家在哪个文件"，正确答案就是它
// （D20 点名的合同家、随每个成员会话首帧注入）。旧允许面读不到它 ⇒ **正确答案反而被判"来源不可读"**，
// 而只有引 `docs/index.md` 的代理句才能过——那是在奖励绕路、惩罚直答。首跑实测踩到（基线 8/12 的 Q3）。
// 为什么加 `checks|probes|tools/` 与 `tests/`：③ 把"何时跑"的家搬进了**脚本自己的头注**，于是"该跑哪个脚本"这类
// 问题的最权威证据就是脚本本身；旧允许面只收 .md ⇒ 引脚本一律"来源不可读"（实测 Q4/Q5/Q7/Q10 同挂）。
// **允许面必须跟着事实的家走。** 2026-10-07 再实证同病：Q7/Q10 的正确答案家 = `tests/README.md`
// （改动面→最窄检查）与 `checks/README.md`（脚本索引）——两者都在 AGENTS 入口链里被点名，却是
// .md 不在允许模式里 ⇒ 模型直答被罚"来源不可读"（首跑 9/13 的两题即栽于此）。加两行 README 模式。
// 写成一张模式表（而不是一串 || 条件）：后缀约束与路径约束同处一处，避免"后缀检查排在允许面前面"
// 这类顺序 bug（实测踩过一次：`!path.endsWith('.md')` 把 .mjs 全挡在门外）。
const ALLOWED_SOURCE = [
  /^AGENTS\.md$/, /^company-workspace\/AGENTS\.md$/, /^_backlog\/[\w./-]+\.md$/,
  /^(docs|notes)\/[\w./-]+\.md$/, /^snapshots\/README\.md$/,
  /^tests\/README\.md$/, /^checks\/README\.md$/,
  /^(checks|probes|tools)\/[\w./-]+\.(mjs|ts)$/,
  /^tests\/[\w./-]+\.ts$/,
]
function readSource(path) {
  if (isAbsolute(path) || path.includes('\\') || path.split('/').includes('..') ||
      !ALLOWED_SOURCE.some(pattern => pattern.test(path))) {
    throw new Error('只允许根入口 / docs/ / notes/ / _backlog/ / 公司手册（.md），以及 checks|probes|tools/**（.mjs|.ts）、tests/**（.ts）的仓库相对路径')
  }
  const physical = realpathSync(join(ROOT, path))
  const rel = relative(ROOT, physical)
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('来源越出仓库')
  const text = readFileSync(physical, 'utf8')
  sourceHashes.set(path, createHash('sha256').update(text).digest('hex'))
  return text
}
for (const path of ['AGENTS.md', 'docs/index.md', 'docs/guides/dev-loop.md']) readSource(path)

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise(r => child.once('exit', r))
  child.kill('SIGTERM')
  await Promise.race([exited, sleep(1500)])
  if (child.exitCode === null && child.signalCode === null) { child.kill('SIGKILL'); await exited }
}
// 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：spawn/fetch 注入（tools/lib 是 keyless 纯逻辑缝）。
// 既有差异当参数保留：--patch 钉 entry-probe 场景（string 形态）、env 钉 DSH_PERMISSION_MODE:
// 'read-only'（有意的 fail-closed 档，一个字节不许动）；banner 等待的 error 事件/16000 输出上限/
// 120s 定时器已收进模块，不再本地重复。注入的 spawn 顺手捕获 child——boot 失败（banner 等不到）
// 仍走本函数既有的 stop 收尾再上抛（team-concurrency 先例）。
async function boot() {
  let child
  try {
    const { port, token } = await startWeb({
      spawn: (...args) => (child = spawn(...args)), root: ROOT, home,
      patch: join(ROOT, 'run/entry-probe.patch.yml'), port: PORT,
      env: { ...process.env, DSH_PERMISSION_MODE: 'read-only' },
    })
    return { child, port, token }
  } catch (error) { await stop(child); throw error }
}

let child
let reply = ''
let baseline = ''
let sessionId
let result = { passed: 0, failures: [] }
try {
  const booted = await boot(); child = booted.child
  const base = `http://127.0.0.1:${booted.port}`
  // token 交换也收进 companyCookie（2026-10-10 补收，下游卡当时留的 3 行本地块）：onEmptyCookie:
  // 'throw' 保留「空 cookie 即抛」的既有语义；空 cookie 报文从「认证缺 cookie」统一为模块文案
  // （与下游卡已批准的失败路径文本统一同类——只进诊断输出，退出码 2 不变）。
  const cookie = await companyCookie({ fetch, base, token: booted.token, onEmptyCookie: 'throw' })
  // RPC 收成 companyRpc（2026-10-10 卡）：既有差异当参数保留——rpcId 前缀 `entryprobe-` + 失败
  // 回退转储响应体（dumpBodyOnError）、逐调用 15s 超时信号 ⇒ 工厂产物外包一层传 { signal }
  // （member-stale-write 先例）。四参旧签名保留给下方既有调用点，调用点一字不动。
  const rpcFactory = companyRpc({ fetch, base, cookie, prefix: 'entryprobe-', dumpBodyOnError: true })
  const rpc = (b, ck, endpoint, args) => rpcFactory(endpoint, args, { signal: AbortSignal.timeout(15000) })
  const created = await rpc(base, cookie, 'session/create', { request: { cwd: ROOT, agentPreset: 'standard' } })
  if (created.agentPreset !== 'standard') throw new Error(`未创建 coding standard 会话：${created.agentPreset}`)
  sessionId = created.sessionId
  if (typeof sessionId !== 'string') throw new Error('session/create 缺 sessionId')
  await rpc(base, cookie, 'session/prompt', { request: {
    requestId: `entryprobe-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: PROMPT }], clientTimeZone: 'Asia/Shanghai',
  } })
  const deadline = Date.now() + TURN_TIMEOUT_MS
  for (;;) {
    const records = await readRecords(request => rpc(base, cookie, 'session/page', { request }), { kind: 'session', sessionId })
    const events = records.map(r => r.event).filter(Boolean)
    baseline = events.filter(e => e.type === 'user/message' && e.data?.source?.kind === 'agent-instructions' && e.data?.source?.baseline === true)
      .map(e => collectText(e.data).join('\n')).join('\n')
    if (baseline) assertCodingBaseline(baseline)
    if (events.some(e => e.type === 'turn/end')) {
      assertCodingBaseline(baseline)
      const replies = events.filter(e => e.type === 'assistant/message').map(assistantMessageText).filter(Boolean)
      reply = replies.at(-1) ?? ''
      result = evaluateEntryProbe(reply, readSource, { expectedTag })
      break
    }
    if (Date.now() >= deadline) throw new Error('entry-probe: 轮次超时')
    await sleep(1000)
  }
} catch (error) { result.failures.push(`驱动：${error.message}`) } finally { await stop(child) }

const stamp = new Date().toISOString()
const outputDir = join(ROOT, 'snapshots/probes/entry-probe', stamp.slice(0, 10))
mkdirSync(outputDir, { recursive: true })
const outputFile = join(outputDir, `answer-${stamp.slice(11).replaceAll(/[:.]/g, '-')}.md`)
writeFileSync(outputFile, [
  `# 入口链探针归档 · ${stamp}`, '',
  '> 验证范围：standard preset、开发仓库 cwd、coding 指令基线；逐题 JSON / 关键词 / 来源原文。',
  `> 机器结果：${result.passed}/${ENTRY_QUESTIONS.length}；失败项 ${result.failures.length}。**语义审阅：未执行，不代表零过期或零矛盾。**`,
  '', `session: ${sessionId ?? '未建立'}`, '', '## 机器诊断', '',
  ...result.failures.map(f => `- ${f.replaceAll('\n', ' ')}`), '', '## 来源 SHA-256（本次读到的版本）', '',
  ...[...sourceHashes].map(([path, hash]) => `- \`${path}\`：\`${hash}\``), '', '## 原始回答', '', reply.trim() || '（无回答）', '',
].join('\n'), { flag: 'wx' })
console.log(`entry-probe: ${result.failures.length ? 'FAIL' : 'MACHINE CHECKS PASS'} ${result.passed}/${ENTRY_QUESTIONS.length}; semantic review pending\n归档 → ${outputFile}`)
for (const failure of result.failures) console.error(failure)
process.exitCode = result.failures.length ? 1 : 0
