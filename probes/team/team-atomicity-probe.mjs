#!/usr/bin/env node
// 状态：常驻
// 团队写完整性与 scope 警告探针（C 系 C4+C5，多用户 BDD 第二批，2026-10-04；真模型 ≈$2–4 / 5–10min，排练场）
// 何时跑：fs-local 原子发布/agent-team 任务视图（writeScopeWarnings）语义要复核时；
//         vendor 升 pin 涉及其上时复跑
//
// 采样观测而非全过程证明：验证终态六行、每次成功追加后的完整read结果；不证明任意读者永不见半截行。
// 判据仅来自真实事件及终态文件：
//   C4a 六个预期行各一次，无重复/额外行
//   C4b 两成员各三轮成功追加后、下次追加前有完整read结果，所有返回行均合法且不重复
//   C5a 成功team_task_list结果含scope重叠warning，指向另一项in_progress任务
//   C5b Lead与两成员最新turn均completed；一次Lead轮足够，超时exit2，不以部分数据判绿
// 用法：source run/env.sh && node probes/team/team-atomicity-probe.mjs
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { atomicityEvidence, teamRunComplete } from '../../tools/lib/collaboration-evidence.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)
const TARGET = join(REHEARSAL, 'journal', 'atomicity-probe.md')
mkdirSync(dirname(TARGET), { recursive: true })
const sleep = ms => new Promise(r => setTimeout(r, ms))
const results = []
const check = (label, ok, detail = '') => { results.push({ label, ok }); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`) }

try { rmSync(TARGET, { force: true }); rmSync(join(REHEARSAL, 'journal', 'w1-scope.md'), { force: true }); rmSync(join(REHEARSAL, 'journal', 'w2-scope.md'), { force: true }) } catch {}
let home
try { home = (await import('../../tools/lib/runtime-home.mjs')).requireDevHome('team-atomicity-probe') } catch (e) { console.error(e.message); process.exit(2) }

let child
try {
  // 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：前缀 `tap-` 由调用方传入；spawn/fetch 注入
  // （tools/lib 是 keyless 纯逻辑缝）。下方 finally 兜杀引用 child ⇒ 经注入的 spawn 顺手捕获：
  // startWeb 起进程先于等 banner，boot 失败时 child 已在手，清理路径与原实现一致。
  const { base, token } = await startWeb({ spawn: (...args) => (child = spawn(...args)), root: ROOT, home })
  console.log(`web up: ${base}`)
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'tap-', errorFallback: '?' })
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const sessionId = created.sessionId
  console.log('ceo session', sessionId)

  const MEMBER_PROMPT = name => `你是 ${name}（本次排练的成员之一）。工作目录 = 排练盘共享根。
你的任务（按序四步，做完立即收口）：
a) 用 team_task_list 找到主题含「${name === 'w1' ? 'scope-a' : 'scope-b'}」的任务；通过 task get 核对自己的任务描述，使用当前 revision claim（被拒则 re-list 并如实报告）。
b) 做 3 轮追加（i = 1,2,3）：每轮把一行「${name} round i」追加进 journal/atomicity-probe.md（不存在创建；已存在读出再追加），每轮追加后读全文。
c) 把一行「${name} scope-note」写进 journal/${name}-scope.md（新建）。
d) 用 send_message 给 lead 回报三轮读回的总行数、任何写入被拒与错误原文；完成后把自己认领的任务标记 complete。`

  const memberPromptA = MEMBER_PROMPT('w1')
  const memberPromptB = MEMBER_PROMPT('w2')
  const MOTION = `排练动议（写完整性与 scope 警告观察）：
1. 用 team_task_create 建立两个任务：scope-a（description 明确其 owner w1 要执行 MEMBER_PROMPT 的三轮追加及 scope-note 步骤，writeScopes=["journal"]）；scope-b（description 明确其 owner w2 做相同步骤，writeScopes=["journal/notes"]）。两个 scope 有前缀重叠；scope 仅为 advisory。
2. 连续 spawn_teammate 两个成员：w1 指令为「${memberPromptA}」，w2 指令为「${memberPromptB}」。不要改动任务范围或代成员写文件/认领任务。
3. wait_agent 等两位成员都回报。
4. 用 team_task_list 检查真实状态与writeScopeWarnings，并读出 journal/atomicity-probe.md 全文原样回复。`

  await rpc('session/prompt', { request: { requestId: `tap-${Date.now()}`, sessionId, mode: 'queue',
    content: [{ type: 'text', text: MOTION }], clientTimeZone: 'Asia/Shanghai' } })
  console.log('motion sent（写完整性 + scope 警告观察）')

  const deadline = Date.now() + 15 * 60_000
  let evs = []
  let memberEvents = {}
  let complete = false
  const readMemberEvents = async events => {
    const members = new Map(events.filter(event => event?.type === 'team/member' && event.data?.member?.name && event.data?.member?.id)
      .map(event => [event.data.member.name, event.data.member.id]))
    const collected = {}
    for (const name of ['w1', 'w2']) {
      const id = members.get(name)
      if (id) collected[name] = (await readRecords(request => rpc('session/page', { request }), { kind: 'subagent', parentSessionId: sessionId, childSessionId: id, mode: 'continuable' }))
        .map(record => record.event).filter(Boolean)
    }
    return { members, collected }
  }
  while (Date.now() < deadline) {
    evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(record => record.event).filter(Boolean)
    const memberState = await readMemberEvents(evs)
    memberEvents = memberState.collected
    complete = teamRunComplete(evs, memberEvents, ['w1', 'w2'], existsSync(TARGET))
    if (complete) break
    await sleep(4_000)
  }
  evs = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId })).map(record => record.event).filter(Boolean)
  const memberState = await readMemberEvents(evs)
  memberEvents = memberState.collected
  complete = teamRunComplete(evs, memberEvents, ['w1', 'w2'], existsSync(TARGET))
  if (!complete) throw new Error('15 分钟内未满足 lead 与 w1/w2 completed 且目标文件存在')

  const file = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : ''
  const evidence = atomicityEvidence({ leadEvents: evs, memberEvents, file })
  check('C4a 共享文件恰含六个预期行（无重复/额外行）', evidence.fileExact, JSON.stringify(file))
  check('C4b w1/w2 各三轮均有追加后真实读回', evidence.readbacks.w1 && evidence.readbacks.w2, JSON.stringify(evidence.readbacks))
  check('C5a 成功 team_task_list 结果含 scope overlap warning', evidence.warningVisible, '')
  check('C5b lead 与两成员 turn 均正常结束', complete, '')
  const failed = results.filter(result => !result.ok)
  console.log(failed.length === 0
    ? `\nteam-atomicity-probe: ALL PASS（${results.length}/${results.length}）`
    : `\nteam-atomicity-probe: ${failed.length} FAILURE(S)（${results.length - failed.length}/${results.length}）`)
  process.exitCode = failed.length === 0 ? 0 : 1
  console.log('\natomicity-probe.md：\n' + (file || '(不存在)'))
} catch (error) {
  console.error('ERROR:', error.message)
  process.exitCode = 2
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), sleep(5_000)])
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL')
  }
}
