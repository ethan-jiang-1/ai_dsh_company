#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 VP-Eng 组队/委派行、preset 组合或根门语义后；B1 验收。
// 为什么存在：`spawn_teammate` 只有 Team Lead 能调；如果 `vp-eng` 根会话不在 team 里当 Lead，
//   VP-Eng 的「持久研发小队」就是空的。本探针只证**投影**（root = lead + tasks 数组），不证 spawn 成功
//   （spawn 成功由 B2 的真模型 probe 证）。
// 成本修正（2026-11-07 实测）：`agentTeam` 投影在**首个 turn 之后**才发布；session/create 后直接读
//   是 undefined（同一机制在 CEO 两件套 smoke 里也靠轮询）。所以本探针发一条「只回复在岗、不要调用工具」
//   的极短 prompt（≈3s、不调工具），再读投影。
// 判据（任一不成立 ⇒ exit 1）：
//   ① members.length === 1
//   ② members[0].role === 'lead' 且 members[0].name === 'lead'
//   ③ tasks 是数组（空数组也算）
// 成本：boot ~10–20s + 一次极短模型调用（≈3s）；不进 `pnpm test`。
// 用法：source run/env.sh && node probes/team/vp-eng-root-lead-probe.mjs [--keep]
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const KEEP = process.argv.includes('--keep')
let home
try { home = requireDevHome('vp-eng-root-lead-probe') } catch (error) { console.error(error.message); process.exit(2) }
const rehearsal = ensureRehearsalWorkspace(ROOT)

const pass = (label, ok, detail = '') => console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
const { child, base, token } = await startWeb({ spawn, root: ROOT, home })
console.log(`web up: ${base}`)
let exitCode = 0
try {
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'vpeng-root-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  // agentTeam 投影在首个 turn 后发布（见头注成本修正）：发一句不调工具的 ping 逼出首个 turn。
  await rpc('session/prompt', {
    request: {
      requestId: `vpeng-root-${String(Date.now())}`, sessionId: created.sessionId, mode: 'queue',
      content: [{ type: 'text', text: '只回复两个字：在岗。不要调用任何工具。' }], clientTimeZone: 'Asia/Shanghai',
    },
  })
  let team
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const projection = await rpc('session/projections', { request: { sessionId: created.sessionId } })
    team = projection?.values?.agentTeam
    if (team !== undefined) break
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  const members = Array.isArray(team?.members) ? team.members : undefined
  const lead = members?.length === 1 ? members[0] : undefined
  const ok = lead !== undefined && lead.role === 'lead' && lead.name === 'lead' && Array.isArray(team?.tasks)
  pass('vp-eng 根会话 = Team Lead（投影：单成员 lead + tasks 数组）', ok,
    ok ? `members=${JSON.stringify(members)}` : `agentTeam=${JSON.stringify(team)}`)
  console.log(`  session: ${created.sessionId}`)
  console.log(ok
    ? '\nvp-eng-root-lead-probe: ALL PASS（只证投影；spawn 成功归 B2）'
    : '\nvp-eng-root-lead-probe: FAIL（vp-eng 根门不再是 Lead——spawn_teammate 会不可执行）')
  exitCode = ok ? 0 : 1
} catch (error) {
  console.error(`probe error: ${error.message}`)
  exitCode = 2
} finally {
  if (!KEEP) child.kill('SIGTERM')
}
process.exit(exitCode)
