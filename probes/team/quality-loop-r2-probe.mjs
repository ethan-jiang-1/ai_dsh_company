#!/usr/bin/env node
// 状态：常驻
// 何时跑：质量环 R1 已落盘、要补 R2 复验（改完产物必须重出一份裁决）时；BUG-056 修复后的真回归。
// 成本：真模型 1 会话 / 1 条 prompt / 1 个 verifier child，约 3–8 分钟；不进 pnpm test。
// 用法：source run/env.sh && node probes/team/quality-loop-r2-probe.mjs [--wall 600] [--slug 2026-11-10-probe-qloop]
// 判据：
//   - 新 verifier activation 的最终正文被 VP-Eng 原样写入 quality-loop/verdict-r2.md；
//   - 头行 round=2 / preset=quality-loop-verifier / method=system-architecture@1.0.0 /
//     body-sha256 与正文同口径（走 pack 的 verdict-hash.mjs，不是手算）；
//   - handoff-r2.md 在场；R1 的 F1–F4 在 R2 正文有「已消除/仍成立」闭环（文本观察，缺了只 warn）；
//   - quality-loop-audit 无 problems（warnings 可接受）。
// 不证明：方法本身的正确性、验证者的判断质量、对外签字。
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { splitVerdict, verdictBodyHash } from '../../tools/lib/quality-loop.mjs'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}
const WALL_MS = Number(arg('wall', '600')) * 1000
const SLUG = arg('slug', '2026-11-10-probe-qloop')
const PRODUCER = 'b877f4de-05a3-4c64-91ea-f05d9768a9c7'
const METHOD = 'system-architecture@1.0.0'
const home = requireDevHome('quality-loop-r2-probe')
const rehearsal = ensureRehearsalWorkspace(ROOT)
const deliverable = join(rehearsal, '.dsh-company/deliverables', SLUG)
const sleep = (ms) => new Promise(resolve => { setTimeout(resolve, ms) })
const results = []
const problems = []
const check = (label, ok, detail = '') => {
  results.push({ label, ok })
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) problems.push(label)
}
const warn = (label, detail = '') => console.log(`  WARN ${label}${detail === '' ? '' : `（${detail}）`}`)

if (!existsSync(join(deliverable, 'quality-loop/verdict-r1.md'))) {
  console.error(`quality-loop-r2-probe: ${SLUG} 没有 verdict-r1.md；先跑 R1`)
  process.exit(2)
}

const prompt = [
  `只做 ${SLUG} 的质量环 R2（复验），不要重开 R1、不要新增产物、不要问人。`,
  `cwd = ${rehearsal}；交付目录 = .dsh-company/deliverables/${SLUG}/。`,
  '步骤：',
  '1) 读 quality-loop/brief.md、verdict-r1.md、dispositions-r1.md、handoff-r1.md 与 drafts/probe-system-architecture.md。',
  '2) 核对 R1 的 F1–F4 在当前产物上的状态（已消除 / 仍成立）；F2 是反驳，F3/F3b/F4 是已修/接受，不要重开设计。',
  '3) 写 quality-loop/handoff-r2.md：只给基线、产物路径、约束、method: system-architecture@1.0.0、以及“复验 R1 的 F1–F4”。',
  '4) 调用 quality_loop_verify 一次，brief 指向 handoff-r2.md；等它收工，不要和它并行做别的。',
  '5) 把验证者最终正文原样写入 quality-loop/verdict-r2.md；头行（一行）：',
  `<!-- quality-loop: round=2 session=<verifier session id> preset=quality-loop-verifier depth=<delegationDepth> producer=${PRODUCER} method=${METHOD} body-sha256=待填 -->`,
  '   session/depth 用 list_subagents 对应行；读不到写 unavailable 并在正文说明。',
  `6) 运行 node ${join(ROOT, 'packages/company-pack/presets/_shared/skills/quality-loop/scripts/verdict-hash.mjs')} --fix .dsh-company/deliverables/${SLUG}/quality-loop/verdict-r2.md`,
  '7) 若 R2 有新发现，写 quality-loop/dispositions-r2.md（三选一；接受要写接受人）；没有新发现就不建。',
  '8) 报告 verdict-r2 路径、R2 裁决、audit 预期；不要跑第三轮。',
].join('\n')

const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
let code = 1
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'qloop-r2-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  const sessionId = created?.sessionId ?? created?.id
  if (typeof sessionId !== 'string') throw new Error('session/create 没返回 id')
  console.log(`quality-loop-r2-probe: vp=${sessionId} slug=${SLUG}`)
  const address = { kind: 'session', sessionId }
  const before = (await readRecords(page(rpc), address)).filter(record => record.event?.type === 'turn/end').length
  await rpc('session/prompt', {
    request: {
      requestId: `qloop-r2-${String(Date.now())}`,
      sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: prompt }],
      clientTimeZone: 'Asia/Shanghai',
    },
  })
  const deadline = Date.now() + WALL_MS
  let records = []
  for (;;) {
    records = await readRecords(page(rpc), address)
    if (records.filter(record => record.event?.type === 'turn/end').length > before) break
    if (Date.now() > deadline) throw new Error(`墙钟预算用尽（${String(WALL_MS / 1000)}s）`)
    await sleep(1500)
  }
  const last = [...records].reverse().find(record => record.event?.type === 'assistant/message')
  const finalText = JSON.stringify(last?.event?.data ?? '').slice(0, 600)
  console.log(`VP-Eng 收口（尾）：${finalText}`)

  const verdictPath = join(deliverable, 'quality-loop/verdict-r2.md')
  const handoffPath = join(deliverable, 'quality-loop/handoff-r2.md')
  check('handoff-r2.md 在场', existsSync(handoffPath))
  check('verdict-r2.md 在场', existsSync(verdictPath))
  if (existsSync(verdictPath)) {
    const text = readFileSync(verdictPath, 'utf8')
    const { header, body } = splitVerdict(text)
    check('verdict-r2 有头行', header !== null)
    if (header !== null) {
      check('头 round=2', String(header.round) === '2', String(header.round))
      check('头 preset=quality-loop-verifier', header.preset === 'quality-loop-verifier', String(header.preset))
      check('头 producer=R1 producer', header.producer === PRODUCER, String(header.producer))
      check('头 method 正确', header.method === METHOD, String(header.method))
      check('头 depth 不是 unavailable', header.depth !== 'unavailable' && header.depth !== undefined, String(header.depth))
      check('body-sha256 与正文同口径', verdictBodyHash(body) === header.bodySha256, `${String(header.bodySha256).slice(0, 12)}… vs ${verdictBodyHash(body).slice(0, 12)}…`)
    }
    check('R2 正文覆盖 F1–F4 闭环（文本观察）', ['F1', 'F2', 'F3', 'F4'].every(id => text.includes(id)), '缺了只说明正文没逐条列')
    const audit = spawnSync(process.execPath, [join(ROOT, 'checks/audit/quality-loop-audit.mjs'), '--deliverable', deliverable], { encoding: 'utf8' })
    const output = `${audit.stdout ?? ''}${audit.stderr ?? ''}`.trim()
    console.log(output.split('\n').slice(-8).join('\n'))
    check('quality-loop-audit 无 problems', audit.status === 0 && !/body-modified/.test(output), `exit=${String(audit.status)}`)
  }
  code = problems.length === 0 ? 0 : 1
} catch (error) {
  console.error(`quality-loop-r2-probe: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  child.kill('SIGTERM')
  await sleep(500)
}
console.log(`\nquality-loop-r2-probe: ${problems.length === 0 ? 'ALL PASS' : `FAIL ${String(problems.length)}`}`)
process.exit(code)

/** `readRecords` 要 `(request) => rpc('session/page', {request})`。 */
function page(rpcFn) {
  return request => rpcFn('session/page', { request })
}
