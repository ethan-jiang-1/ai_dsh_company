#!/usr/bin/env node
// 状态：常驻
// S5 任务板跨门共享性探针（多人 UX bug 猎捕第二轮第 1/4 题，2026-10-06 用户立项）。
// 何时跑：multi-human.md §0 机制事实表或手册「动议任务板」行改动时；真模型 ≈$0.1、排练场。
// 退出码：0 = CFO create/list、COO isolation 两项都由工具结果证明；1 = 任一验收项失败；2 = 环境/工具错误。
//
// CFO 与 COO 是不同 root Team。探针核对 create、两门 list 的成对 tool call/result，模型回答只用于诊断。
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { taskboardScopeEvidence } from '../../tools/lib/recovery-scope-evidence.mjs'
import { sleep } from '../../tools/lib/probe-kit.mjs'

const REHEARSAL = join(ROOT, REHEARSAL_REL)

let home
try {
  const { requireDevHome } = await import('../../tools/lib/runtime-home.mjs')
  home = requireDevHome('taskboard-scope-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

let child
try {
  const run = async () => {
    // 启动块收成 tools/lib/probe-web.mjs（2026-10-10 卡）：前缀 `tsp-` 由调用方传入；spawn/fetch 注入
    // （tools/lib 是 keyless 纯逻辑缝）。外层 finally 兜杀引用 child ⇒ 经注入的 spawn 顺手捕获：
    // startWeb 起进程先于等 banner，boot 失败时 child 已在手，清理路径与原实现一致。
    const { base, token } = await startWeb({ spawn: (...args) => (child = spawn(...args)), root: ROOT, home })
    console.log(`web up: ${base}`)
    const cookie = await companyCookie({ fetch, base, token })
    const rpc = companyRpc({ fetch, base, cookie, prefix: 'tsp-' })

    async function runDoor(role, prompt) {
      const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: role } })
      const sessionId = created.sessionId
      await rpc('session/prompt', { request: {
        requestId: `tsp-${Date.now()}-${role}`, sessionId, mode: 'queue',
        content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
      } })
      const deadline = Date.now() + 240_000
      let events = []
      while (Date.now() < deadline) {
        events = (await readRecords(request => rpc('session/page', { request }), { kind: 'session', sessionId }))
          .map(record => record.event).filter(Boolean)
        if (events.some(event => event?.type === 'turn/end' && event.data?.reason?.kind === 'completed')) break
        await sleep(2_000)
      }
      const ended = events.some(event => event?.type === 'turn/end' && event.data?.reason?.kind === 'completed')
      const lastAssistant = events.filter(event => event?.type === 'assistant/message').at(-1)
      const answer = String(lastAssistant?.data?.message?.content?.map(block => block?.text ?? '').join('\n') ?? '')
      return { sessionId, events, ended, answer: answer.slice(0, 800) }
    }

    console.log('taskboard-scope-probe: CFO 创建并列出 renewal-z，COO 独立列出任务板')
    const cfo = await runDoor('cfo',
      '排练指令：用 team_task_create 创建一条任务 subject="renewal-z 测算"、description="合同额 $96k，成本 $69k，给毛利口径与结论"。然后必须调用 team_task_list，报告结果。')
    console.log(`  CFO ${cfo.sessionId}: ended=${String(cfo.ended)}; 摘要=${cfo.answer.slice(0, 180)}`)
    const coo = await runDoor('coo',
      '排练指令：调用 team_task_list 列出你当前能看到的所有任务，并报告结果。')
    console.log(`  COO ${coo.sessionId}: ended=${String(coo.ended)}; 摘要=${coo.answer.slice(0, 180)}`)

    const evidence = taskboardScopeEvidence({ cfoEvents: cfo.events, cooEvents: coo.events })
    const b1 = cfo.ended && evidence.b1
    const b2 = coo.ended && evidence.b2
    const b3 = coo.ended && evidence.b3
    console.log(`  B1 CFO create 成功且 list 同一 taskId: ${String(b1)}`)
    console.log(`  B2 COO 成功 list 不含 renewal-z: ${String(b2)}`)
    console.log(`  B3 所有 COO list 结果未包含 CFO 创建任务的 subject+description identity: ${String(b3)}`)
    console.log(`taskboard-scope-probe: ${b1 && b2 && b3 ? 'PASS' : 'FAIL'}（${[b1, b2, b3].filter(Boolean).length}/3）`)
    process.exitCode = b1 && b2 && b3 ? 0 : 1
  }
  await run()
} catch (error) {
  console.error(`taskboard-scope-probe: ERROR ${error.message}`)
  process.exitCode = 2
} finally {
  if (child && child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await Promise.race([
      child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve)),
      sleep(5_000),
    ])
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL')
      await Promise.race([
        child.exitCode !== null || child.signalCode !== null ? Promise.resolve() : new Promise(resolve => child.once('exit', resolve)),
        sleep(5_000),
      ])
    }
  }
}
