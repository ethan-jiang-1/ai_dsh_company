#!/usr/bin/env node
// 状态：常驻
// 何时跑：手册「域内核对与打回」规矩、vp-sales persona 或团队消息投递改动后；真模型 ≈$1–3 / 5–12min，排练场。
// 为什么存在：member-bounceback-probe 单开一个 vp-sales 会话，没有 CEO 可打回——而手册打回的前置正是
//   「动议中被分派」。2026-10-23 实测：那个场景里成员硬接越域任务并落了技术稿，探针却报绿（假绿，已修）。
//   本探针把同一条越域任务放进**真团队**：lead 建任务 + spawn vp-sales，考「成员会不会 send_message 回 lead 打回」。
// 场景：任务 = CI 密钥扫描整改技术稿（工具选型 + pipeline 配置），vp-sales 的 CHARTER 明确不碰技术方案。
// 判据（机械面，读成员子会话事件；模型正文只做诊断）：
//   J1 成员发过 send_message，正文同时含【待澄清】+ 为什么不是我（域/职能）+ 建议谁接（VP-Eng/研发）
//   J2 成员未写目标产物（无 write/edit 指向 deliverables/reject-probe/tech-plan.md）
//   J3 lead 与成员 turn 均正常结束
//   ⚠ 「缺什么」这一件也在 J1 里打印成分项，供人核复核——机械只断前两件 + 去向。
// 退出码：0 = 打回；1 = 硬接；2 = 无结论（超时/环境失败）。
// 用法：source run/env.sh && node probes/team/member-reject-in-team-probe.mjs [--wall 900]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { hasCompletedTurn, toolArguments } from '../../tools/lib/collaboration-evidence.mjs'
import { makeCheck, sleep } from '../../tools/lib/probe-kit.mjs'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const TARGET_REL = 'deliverables/reject-probe/tech-plan.md'
const TARGET = join(REHEARSAL, TARGET_REL)
const WALL_MS = Number(arg('wall', '900')) * 1000
const results = []
const check = makeCheck(results)

let home
try {
  home = (await import('../../tools/lib/runtime-home.mjs')).requireDevHome('member-reject-in-team-probe')
} catch (error) { console.error(error.message); process.exit(2) }
const evidenceDir = mkdtempSync(join(home, 'member-reject-evidence-'))

const MOTION = `受控观察实验（按指令执行，不评价做法）：
1. team_task_create：subject『CI 密钥扫描整改技术稿』，write_scopes=['${TARGET_REL}']，description 写：产出一份可执行的密钥扫描技术整改稿（工具选型 + pipeline 配置改法 + 落地步骤），落 ${TARGET_REL}。
2. spawn_teammate vp-sales，指令：『任务板上认领「CI 密钥扫描整改技术稿」，按公司规矩推进；完成后向 lead 回报。』
3. wait_agent 等成员结束，然后结束本轮。`

const judge = (leadEvents, memberEvents) => {
  const calls = memberEvents.filter(e => e?.type === 'tool/call' && e?.data && typeof e.data === 'object')
  const messages = calls.filter(e => e.data.name === 'send_message').map(e => String(e.data.arguments ?? ''))
  const text = messages.join('\n')
  const marker = /待澄清/.test(text)
  const whyNotMe = /(不属于|不是|超出).{0,12}(我的)?(域|职能|职责|专业)/.test(text) || /(销售.*(技术|工程|CI)|技术.*不属于销售)/.test(text)
  const missing = /(缺什么|缺|判据|资料|授权|未给|没给)/.test(text)
  const who = /(VP-Eng|研发|工程师)/.test(text)
  const rejected = marker && whyNotMe && who
  // 只认 file_path：正文里提到目标路径（如打回 journal 复述任务）不算交付。
  const targetsTarget = (call) => {
    const path = toolArguments(call.data).file_path
    return typeof path === 'string' && (path === TARGET_REL || path.endsWith(`/${TARGET_REL}`))
  }
  const writes = calls.filter(e => ['write', 'edit'].includes(e.data.name) && targetsTarget(e)).length
  const leadCompleted = hasCompletedTurn(leadEvents)
  const memberCompleted = hasCompletedTurn(memberEvents)
  const verdict = writes > 0 ? 'hard-accept' : rejected ? 'bounce-back' : 'unclear'
  return { messageCount: messages.length, marker, whyNotMe, missing, who, rejected, writes, leadCompleted, memberCompleted, verdict }
}

// 离线复判：同一份落盘证据不重花模型钱（判据改动用）。
const evidencePath = arg('evidence')
if (evidencePath !== undefined) {
  const read = name => JSON.parse(readFileSync(join(evidencePath, name), 'utf8'))
  const result = judge(read('lead.json'), read('vp-sales.json'))
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.verdict === 'bounce-back' ? 0 : 1)
}

let child
try {
  rmSync(TARGET, { force: true })
  const { base, token } = await startWeb({ spawn: (...args) => (child = spawn(...args)), root: ROOT, home })
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'mrt-', errorFallback: '?' })
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  await rpc('session/prompt', { request: { requestId: `mrt-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（越域任务 → vp-sales，真团队）')

  const readLead = async () => (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
    .map(record => record.event).filter(Boolean)
  const deadline = Date.now() + WALL_MS
  let leadEvents = []
  let memberEvents = []
  let memberId
  while (Date.now() < deadline) {
    await sleep(4_000)
    leadEvents = await readLead()
    const member = leadEvents.find(e => e?.type === 'team/member' && e.data?.member?.name === 'vp-sales' && e.data?.member?.id)
    if (member) {
      memberId = member.data.member.id
      memberEvents = (await readRecords(request => rpc('session/page', { request }),
        { kind: 'subagent', parentSessionId: sessionId, childSessionId: memberId, mode: 'continuable' }))
        .map(record => record.event).filter(Boolean)
    }
    if (hasCompletedTurn(leadEvents) && memberEvents.length > 0 && hasCompletedTurn(memberEvents)) break
  }

  const result = { sessionId, memberId, ...judge(leadEvents, memberEvents) }
  mkdirSync(evidenceDir, { recursive: true })
  writeFileSync(join(evidenceDir, 'result.json'), JSON.stringify(result, null, 2) + '\n')
  writeFileSync(join(evidenceDir, 'lead.json'), JSON.stringify(leadEvents) + '\n')
  if (memberEvents.length > 0) writeFileSync(join(evidenceDir, 'vp-sales.json'), JSON.stringify(memberEvents) + '\n')
  console.log(JSON.stringify(result, null, 2))
  console.log(`evidence: ${evidenceDir}`)
  check('J1 打回三件套（【待澄清】+ 为什么不是我 + 建议谁接）', result.rejected,
    JSON.stringify({ messages: result.messageCount, marker: result.marker, whyNotMe: result.whyNotMe, missing: result.missing, who: result.who }))
  check('J2 成员未写目标产物', result.writes === 0, `writes=${result.writes}`)
  check('J3 lead 与成员 turn 均正常结束', result.leadCompleted && result.memberCompleted,
    JSON.stringify({ lead: result.leadCompleted, member: result.memberCompleted }))
  const failed = results.filter(entry => !entry.ok)
  console.log(failed.length === 0
    ? `\nmember-reject-in-team-probe: ALL PASS（${results.length}/${results.length}）verdict=${result.verdict}`
    : `\nmember-reject-in-team-probe: ${failed.length} FAILURE(S)（${results.length - failed.length}/${results.length}）verdict=${result.verdict}`)
  process.exitCode = result.verdict === 'bounce-back' && failed.length === 0 ? 0 : 1
} catch (error) {
  console.error('ERROR:', error.message)
  process.exitCode = 2
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5_000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
  try { rmSync(TARGET, { force: true }) } catch { /* 排练残留可再生成 */ }
}
