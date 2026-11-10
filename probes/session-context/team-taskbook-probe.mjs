#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 assembling-the-team 的角色包 / 任务书 / 署名行契约后；或要复核 team 成员产出的
//         provenance 指针是否可回溯。
// 用法：node 本脚本 [--role coo|cfo] [--wall 240]
// 成本：真模型 1–2 轮（≈$0.05–0.2）；cwd = 排练场（绝不写 live 公司盘）。
// 判据（Given/When/Then）：
//   Given 一个单域交付承接动议，CEO 按 assembling-the-team 组一个 COO/CFO 成员；
//   When  成员出稿；
//   Then  ① `drafts/ceo.md` 存在（任务书在 spawn 前/时落盘）；
//         ② `drafts/<role>.md` 的署名行 `任务书 = <路径>` 指向盘上真实文件（不是编造的默认路径）；
//         ③ 任务书里带对应角色包（CHARTER / 产出路径），成员稿与它同目录。
// 退出码：0 = 三条全过；1 = 任一条红；2 = 前置缺失（凭据 / web 起不来）。
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { startWeb, companyCookie, companyRpc } from '../../tools/lib/probe-web.mjs'
import { readRecords } from '../../tools/lib/session-log.mjs'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? fallback : process.argv[index + 1]
}
const WALL_MS = Number(arg('wall', '240')) * 1000
const ROLE = arg('role', 'coo')
const ROLE_SPEC = {
  coo: {
    label: 'COO',
    motion: '单域交付承接核查，只问交付侧接不接得住',
    skills: ['ops-feasibility', 'budget-check'],
    charter: 'coo/CHARTER.md',
  },
  cfo: {
    label: 'CFO',
    motion: '单职能毛利测算，只问钱与合规接不接得住',
    skills: ['cfo-workflow', 'finance-compliance', 'project-economics'],
    charter: 'cfo/CHARTER.md',
  },
}
const SPEC = ROLE_SPEC[ROLE]
if (SPEC === undefined) {
  console.error('team-taskbook-probe: --role 只支持 coo / cfo')
  process.exit(2)
}
const sleep = (ms) => new Promise(resolveSleep => setTimeout(resolveSleep, ms))
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
const SLUG = `${today}-taskbook-${ROLE}-probe`

let home
try {
  home = requireDevHome('team-taskbook-probe')
} catch (error) {
  console.error(error.message)
  process.exit(2)
}
const rehearsal = ensureRehearsalWorkspace(ROOT)
rmSync(join(rehearsal, '.dsh-company/deliverables', SLUG), { recursive: true, force: true })

const startedAt = Date.now()
const evidence = { startedAt: new Date().toISOString(), rehearsal, slug: SLUG, checks: {}, files: {} }
let failures = 0
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
  evidence.checks[label] = { ok, detail }
  if (!ok) failures++
}

const { child, base, token } = await startWeb({ spawn, root: ROOT, home, profile: 'company' })
try {
  const cookie = await companyCookie({ fetch, base, token, onEmptyCookie: 'throw' })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'tb-probe-', dumpBodyOnError: true })
  const page = request => rpc('session/page', { request })

  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'ceo' } })
  const sessionId = created?.sessionId ?? created?.id
  evidence.sessionId = sessionId
  const address = { kind: 'session', sessionId }
  const before = (await readRecords(page, address)).filter(record => record.event?.type === 'turn/end').length

  const prompt = [
    '按 assembling-the-team 的六步组队（验证用；一轮内完成，任何问题都不要问我）：',
    `动议 = ${SPEC.motion}。`,
    `只叫 ${ROLE} 一个成员；不要叫别人、不要开 workflow、不要建多个成员。交付目录固定为 .dsh-company/deliverables/${SLUG}/。`,
    '硬要求：',
    `1) spawn_teammate 之前，先把任务书落 .dsh-company/deliverables/${SLUG}/drafts/ceo.md——目标/约束/验收、在屋名单、${SPEC.label} 角色包、派活行都写进去；`,
    `2) spawn prompt 带 ${SPEC.label} 角色包，其中「任务书」指上面这份真实文件；`,
    `3) 让 ${ROLE} 先 read .dsh-company/kb/${SPEC.charter} 与 ${SPEC.skills.map(skill => `presets/${ROLE}/skills/${skill}/SKILL.md`).join('、')}，`,
    `   再写 .dsh-company/deliverables/${SLUG}/drafts/${ROLE}.md，稿首署名行照抄任务书路径；`,
    `4) 完成后回我 ${ROLE} 的产出路径。≤ 8 个工具轮。`,
  ].join('\n')
  await rpc('session/prompt', {
    request: {
      requestId: `tb-probe-${String(Date.now())}`,
      sessionId, mode: 'queue',
      content: [{ type: 'text', text: prompt }], clientTimeZone: 'Asia/Shanghai',
    },
  })
  console.log(`prompt sent; workspace = ${relative(ROOT, rehearsal)}; waiting for taskbook + member draft …`)

  const deliverableDir = join(rehearsal, '.dsh-company/deliverables', SLUG)
  const taskbookPath = join(deliverableDir, 'drafts/ceo.md')
  const memberPath = join(deliverableDir, `drafts/${ROLE}.md`)
  let turnEnded = false
  let turnEndedAt
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(1_500)
    try {
      const records = await readRecords(page, address)
      turnEnded = records.filter(record => record.event?.type === 'turn/end').length > before
    } catch { /* 页面尚未可读 */ }
    if (turnEnded && turnEndedAt === undefined) turnEndedAt = Date.now()
    if (turnEnded && existsSync(taskbookPath) && existsSync(memberPath)) break
    // CEO 收口后成员仍可能在自己的 turn 里写稿：给成员留足 180s，别把「还没出稿」误判成红。
    if (turnEndedAt !== undefined && Date.now() - turnEndedAt > 180_000) break
  }

  check('CEO 已落任务书 drafts/ceo.md', existsSync(taskbookPath), relative(ROOT, taskbookPath))
  check(`成员稿 drafts/${ROLE}.md 已出`, existsSync(memberPath), relative(ROOT, memberPath))
  check('CEO 轮已收口（有 turn/end）', turnEnded, turnEnded ? '' : `wall ${String(Math.round((Date.now() - startedAt) / 1000))}s`)

  if (existsSync(memberPath)) {
    const text = readFileSync(memberPath, 'utf8')
    const head = text.split('\n').slice(0, 8)
    const signatureLine = head.find(line => line.startsWith('出稿：')) ?? ''
    evidence.files.memberSignatureLine = signatureLine
    check('稿首是「出稿：」署名行', signatureLine !== '', head[0]?.slice(0, 180) ?? '')
    const match = /任务书\s*=\s*([^\s（(]+)/.exec(signatureLine)
    check('署名行带任务书路径', match !== null, signatureLine.slice(0, 180))
    const declared = match?.[1]
    if (declared !== undefined) {
      const resolved = resolve(rehearsal, declared)
      evidence.files.declaredTaskbook = resolved
      check('署名行指向盘上真实文件', existsSync(resolved), relative(ROOT, resolved))
      check('署名行指向 CEO 的任务书', resolve(resolved) === resolve(taskbookPath), relative(ROOT, taskbookPath))
    }
  }
  if (existsSync(taskbookPath)) {
    const taskbook = readFileSync(taskbookPath, 'utf8')
    evidence.files.taskbookChars = taskbook.length
    check(`任务书含 ${SPEC.label} 角色包`, new RegExp(ROLE, 'i').test(taskbook) && /CHARTER/.test(taskbook), `${String(taskbook.length)} chars`)
    check('任务书点名署名锚（任务书路径）', /任务书|署名/.test(taskbook), '')
  }
  evidence.checks.failureCount = failures
} catch (error) {
  failures += 1
  console.error(`  FAIL 异常：${String(error.message).split('\n')[0]}`)
  evidence.error = String(error.message)
} finally {
  child.kill('SIGTERM')
  await sleep(300)
  const evidencePath = join(ROOT, `runtime/team-taskbook-${ROLE}-probe-${today}.json`)
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(`evidence: ${relative(ROOT, evidencePath)}`)
}

console.log(failures === 0
  ? `\nteam-taskbook-probe: ALL PASS（${String(Math.round((Date.now() - startedAt) / 1000))}s）`
  : `\nteam-taskbook-probe: ${String(failures)} FAILURE(S)`)
process.exit(failures === 0 ? 0 : 1)
