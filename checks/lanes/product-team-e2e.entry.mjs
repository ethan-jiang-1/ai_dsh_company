#!/usr/bin/env node
// 状态：常驻
// 产品定义动议的 CEO 组队回归（真模型）：一场「只要 CMO+VP-Eng，出 MRD+PRD」的动议，
// CEO 必须用 spawn_teammate 组队 + 任务板/DAG，而不是用 vp_cmo/vp_eng 命名委托走捷径。
// 何时跑：CEO 组队判据 / assembling-the-team / 命名委托快捷路径改动，或验收明确要求时；真模型 ~$1
//
// 为什么存在：2026-11-06 用户实证——两件套（MRD+PRD）被 CEO 用 vp_* 快捷委托拆成两份单职能稿，
// 没有 team/task 投影，右侧看板/依赖图/在场全空。presence-e2e 证明宿主投影活着，本脚本证明
// **CEO 的组队判断**在真实模型下能过；两件套走快捷 = 红。
//
// 端到端：排练场起 CEO 会话 → 发产品定义 prompt → 轮询 session/projections 的 agentTeam：
//   - members 含 cmo + vp-eng（role=teammate），且不出现 vp-sales/coo/cfo 越编；
//   - tasks ≥ 2，cmo/vp-eng 各有 owner 任务；
//   - PRD 任务 blockedBy MRD 任务（依赖图有边）。
// 分层：认证档第三档（真模型、起进程），**不进 pnpm test**。
// 预算：~$1 / 3–7 分钟（--wall 封顶墙钟）。
// 前置：DSH_HOME + 模型凭据（dev home）；cwd 写死 runtime/rehearsal-workspace（产物落排练场）。
// 用法：source run/env.sh && node checks/lanes/product-team-e2e.entry.mjs [--wall 600]
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { REHEARSAL_REL } from '../../tools/lib/rehearsal.mjs'
import { spawn } from 'node:child_process'
import { join } from 'node:path'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const WALL_MS = Number(arg('wall', '600')) * 1000
const POLL_MS = 2_000
const REHEARSAL = join(ROOT, REHEARSAL_REL)

let home
try {
  home = requireDevHome('product-team-e2e-smoke')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const { child, base, token } = await startWeb({ spawn, root: ROOT, home })
console.log(`web up: ${base}（cwd = ${REHEARSAL_REL}）`)

const startedAt = Date.now()
let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  if (!ok) failures++
}

try {
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'pt2e-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: REHEARSAL, agentPreset: 'ceo' } })
  const lead = created.sessionId
  console.log(`lead session: ${lead}`)
  const prompt = [
    '你要做一场新产品定义（验证用；一轮内完成；任何问题都不要问我，口径以下为准）：',
    '产品 = 「把现有对账能力做成面向 9 家客户的窄口径标准包」。只叫 CMO 和 VP-Eng 两个人，不要叫其他人。',
    '必须：',
    '1) 先用 spawn_teammate 起 **cmo** 和 **vp-eng** 两人（名字就是 cmo / vp-eng；不要用 vp_cmo / vp_eng 命名委托代替组队）；',
    '2) 任务板建两个任务：T1 owner=cmo（出 .dsh-company/deliverables/<slug>/drafts/mrd.md）、T2 owner=vp-eng（接 MRD 出 drafts/prd.md），T2 blockedBy T1；',
    '3) 两人各写一页以内（MVP 级，不写代码、不做定价/排期）；最后你合稿 final.md 并 present；≤ 12 个工具轮。现在开始。',
  ].join('\n')
  await rpc('session/prompt', {
    request: { requestId: `pt2e-${Date.now()}`, sessionId: lead, mode: 'queue', content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai' },
  })
  console.log('prompt sent; polling session/projections.agentTeam …')

  const teamView = async () => {
    const value = await rpc('session/projections', { request: { sessionId: lead } })
    return value?.values?.agentTeam ?? { members: [], tasks: [] }
  }

  let sawCmo = false
  let sawEng = false
  let sawExtra = false
  let sawTasks = 0
  let sawEdge = false
  let viewErr = null
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(POLL_MS)
    let view
    try {
      view = await teamView()
      viewErr = null
    } catch (error) {
      if (viewErr?.message !== error.message) console.log(`  view 尚不可用：${String(error.message).slice(0, 90)}`)
      viewErr = error
      continue
    }
    const teammates = (view.members ?? []).filter(m => m.role === 'teammate')
    const names = teammates.map(m => m.name)
    const tasks = view.tasks ?? []
    sawCmo = names.includes('cmo')
    sawEng = names.includes('vp-eng')
    sawExtra = names.some(n => ['vp-sales', 'coo', 'cfo'].includes(n))
    sawTasks = tasks.length
    const cmoTask = tasks.find(t => t.ownerName === 'cmo')
    const engTask = tasks.find(t => t.ownerName === 'vp-eng')
    sawEdge = cmoTask !== undefined && engTask !== undefined && (engTask.blockedBy ?? []).includes(cmoTask.id)
    console.log(`  ${String(Math.round((Date.now() - startedAt) / 1000))}s members=[${names.join(',')}] tasks=${String(tasks.length)} edge=${String(sawEdge)}`)
    if (sawCmo && sawEng && sawTasks >= 2 && sawEdge) break
  }

  check('team 含 CMO + VP-Eng（不是 vp_* 快捷委托）', sawCmo && sawEng, `cmo=${String(sawCmo)} vp-eng=${String(sawEng)}`)
  check('未越编（无 vp-sales / coo / cfo）', !sawExtra, sawExtra ? '出现越编成员' : '')
  check('任务板 ≥2 且 PRD blockedBy MRD（依赖图有边）', sawTasks >= 2 && sawEdge, `tasks=${String(sawTasks)} edge=${String(sawEdge)}`)
} catch (error) {
  failures++
  console.log(`  FAIL 异常: ${String(error.message).split('\n')[0]}`)
  console.log(error.stack?.split('\n').slice(1, 4).join('\n') ?? '')
} finally {
  child.kill('SIGTERM')
  await sleep(300)
}

console.log(failures === 0
  ? `\nproduct-team-e2e-smoke: ALL PASS（CEO 两件套组队判据，${String(Math.round((Date.now() - startedAt) / 1000))}s）`
  : `\nproduct-team-e2e-smoke: ${String(failures)} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
