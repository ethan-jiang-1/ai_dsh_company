#!/usr/bin/env node
// 状态：常驻
// 「分身自己也能提案」的真模型验收：`cultivation_propose` **端到端**——agent 自己调工具 ⇒ 记录落公司盘
// ⇒ 进目标角色收件箱（人侧展示由 keyless/浏览器档覆盖）。
//
// 何时跑：改 host 的 `cultivation_propose` 定义、改 presets 的工具行、升 pin 触碰 tools 注册面，或复核
//   「分身自己也能提案」这句承诺时。**keyless 只证得了记录形状**（探针种子同形），工具真的被模型调用只有真模型能证。
// 成本：真模型，约 1–3 分钟、≈2–4 次调用（用户自付 key）；凭据取自 DSH 凭据库
//   （`runtime/harness-home/.credentials.yaml`，**不是**环境变量；自检 = `pnpm orient` 的「凭据」行）。
// 前置：`source run/env.sh`（dev home）+ 前端/host 已构建。
// 用法：source run/env.sh && node probes/session-context/cultivation-propose-probe.mjs [--keep]
//
// 判据（全过 = 这句承诺成立）：
//   ① 会话日志出现 `tool/call` name=`cultivation_propose`（模型**自己**调的）；
//   ② 公司盘出现**新**记录文件（探测前后做 id 快照对比）；
//   ③ frontmatter：`proposerKind: agent`、`status: open`、`targetRole: cfo`；
//   ④ 期望行为/正文与提示词里给的一致（内容没被切坏）。
//
// 清理：默认**删掉本次产生的记录**（它是探针产物，留在盘里会出现在真人的「需要我处理」里 = 污染）；
//   `--keep` 保留作现场。会话本身保留（证据现场，不删）。
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, rmSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'

const KEEP = process.argv.includes('--keep')
const WORKSPACE = join(ROOT, 'company-workspace')
const RECORDS = join(WORKSPACE, 'cultivation', 'records')
const EXPECTATION = '测算结论先列假设口径（真模型探针）'
const BODY = '做法：先列假设与口径，再给结论；证据：probes/session-context/cultivation-propose-probe.mjs'
const failures = []

let home
try {
  home = requireDevHome('cultivation-propose-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

/** 判一条：抛错即记为失败（探针跑完统一汇总）。 */
const check = (label, fn) => fn().then(
  () => console.log(`  PASS ${label}`),
  error => { failures.push(`${label}: ${error.message}`); console.log(`  FAIL ${label}: ${error.message}`) },
)
const idsNow = () => existsSync(RECORDS) ? readdirSync(RECORDS).filter(name => name.endsWith('.md')) : []
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const before = new Set(idsNow())
const { child, port, token } = await startWeb({ spawn, root: ROOT, home, port: 0 })
/** 本次新出现的记录文件名（后面清理只动它）。 */
let created = null
try {
  const base = `http://127.0.0.1:${String(port)}`
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'cpp-', dumpBodyOnError: true })

  const session = await rpc('session/create', { request: { cwd: WORKSPACE, agentPreset: 'cfo' } })
  const sessionId = session.id ?? session.sessionId
  const eventsOf = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  console.log(`  会话 ${String(sessionId)}（cfo，公司盘）`)

  await rpc('session/prompt', { request: {
    requestId: `cpp-${String(Date.now())}`,
    sessionId,
    mode: 'queue',
    content: [{ type: 'text', text: '只做一件事：调用 cultivation_propose 工具**一次**，参数如下——'
      + `kind: correction，targetRole: cfo，expectation: ${EXPECTATION}，`
      + `body: ${BODY}。调用完就停，不要采纳、不要做别的、不要解释。` }],
    clientTimeZone: 'Asia/Shanghai',
  } })

  await check('① 模型自己调了 cultivation_propose（会话日志有 tool/call）', async () => {
    const deadline = Date.now() + 150_000
    while (Date.now() < deadline) {
      const hit = (await eventsOf()).some(event => event?.type === 'tool/call' && event?.data?.name === 'cultivation_propose')
      if (hit) return
      await sleep(3000)
    }
    throw new Error('150s 内没看到 cultivation_propose 的 tool/call（模型没调工具？prompt 需更直白？）')
  })

  await check('② 公司盘出现新记录', async () => {
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      const fresh = idsNow().filter(name => !before.has(name))
      if (fresh.length > 0) { created = fresh[0]; return }
      await sleep(2000)
    }
    throw new Error('工具被调用但公司盘没出现新记录')
  })

  await check('③ frontmatter：proposerKind=agent / status=open / targetRole=cfo', async () => {
    if (created === null) throw new Error('上一步未通过，没有新记录')
    const text = readFileSync(join(RECORDS, created), 'utf8')
    if (!/proposerKind: agent/.test(text)) throw new Error(`proposerKind 不是 agent：\n${text.slice(0, 200)}`)
    if (!/status: open/.test(text)) throw new Error('新记录不是 open 态')
    if (!/targetRole: cfo/.test(text)) throw new Error('targetRole 不是 cfo')
  })

  await check('④ 期望行为与正文与提示词一致（内容没被切坏）', async () => {
    if (created === null) throw new Error('上一步未通过，没有新记录')
    const text = readFileSync(join(RECORDS, created), 'utf8')
    if (!text.includes(EXPECTATION)) throw new Error(`期望行为对不上：\n${text.slice(0, 300)}`)
    if (!text.includes('先列假设与口径')) throw new Error(`正文对不上：\n${text.slice(0, 300)}`)
    console.log('  ——记录现场——')
    console.log(text.split('\n').map(line => `  │ ${line}`).join('\n'))
  })
} catch (error) {
  failures.push(`准备/收尾: ${String(error.message).slice(0, 300)}`)
  console.log(`  FAIL 准备/收尾: ${error.message}`)
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

// 清理：只删本次新产生的记录（探针产物留在盘里会出现在真人面板上）
if (created !== null && !KEEP && existsSync(join(RECORDS, created))) {
  unlinkSync(join(RECORDS, created))
  console.log(`  （已清理探针产物 ${created}${KEEP ? '' : '；--keep 可保留'}）`)
}
for (const name of idsNow()) {
  if (!before.has(name) && name.includes('propose')) rmSync(join(RECORDS, name), { force: true })
}

console.log(failures.length === 0
  ? '\ncultivation-propose-probe: ALL PASS（「分身自己也能提案」真模型端到端成立）'
  : `\ncultivation-propose-probe: ${String(failures.length)} FAILURE(S)\n${failures.join('\n')}`)
process.exit(failures.length === 0 ? 0 : 1)
