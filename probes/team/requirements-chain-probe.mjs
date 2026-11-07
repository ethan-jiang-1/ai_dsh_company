#!/usr/bin/env node
// 状态：常驻
// 何时跑：A8 验收（五层需求链真跑）；改编号合同/五层模板/CMO/VP-Eng/SA/SQA 产出面后。
// 为什么存在（2026-11-07）：五层链（MRD→StRS→PRD→SyRS→IRS→TC）的**模型行为**不能被 keyless 断言替代——
//   文案写对不等于角色照做；本探针用一轮真模型动议证明「产物在场 + 头正确 + checker 绿」。
//   它不证一般可靠性、不证业务价值（单轮样本）。
// 判据（任一不成立 ⇒ exit 1）：
//   C1 五个需求文档 + vv-plan.md 落盘（mrd/strs/prd/syrs/irs/vv-plan）
//   C2 每份头有 layer + definition（PRD=json-ledger；StRS/SyRS/IRS=headings/table-rows；V&V=table-rows）
//   C3 meta 带 `编号体系: identity`；checker 绿（无退役词/重复/悬空/孤儿/覆盖缺口）
//   C4 没有 final.md（成品归 CEO；本探针只看 draft 链）
//   C5 子会话接线：cmo / vp-eng 为 teammate；system-architect / system-qa 为命名 child
//   C6 `/req check <slug>` 命令回执（操作员 RPC；失败只记录，不掩盖 checker 结论）
// 成本/预算：真模型一轮，约 10–20 分钟；不进 `pnpm test`。
// 用法：source run/env.sh && node probes/team/requirements-chain-probe.mjs [--wall 1200] [--keep]
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkRequirements, parseHeader } from '../../packages/company-pack/src/lib/requirements-check.ts'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const WALL_MS = Number(arg('wall', '1800')) * 1000
const KEEP = process.argv.includes('--keep')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let home
try { home = requireDevHome('requirements-chain-probe') } catch (error) { console.error(error.message); process.exit(2) }
const rehearsal = ensureRehearsalWorkspace(ROOT)
const DELIV = join(rehearsal, '.dsh-company/deliverables')
const startedAt = Date.now()
const SESSIONS = join(home, 'sessions', `--${rehearsal.replace(/^\/+/, '').replaceAll('/', '-')}--`)
const EXPECTED = ['mrd.md', 'strs.md', 'prd.md', 'syrs.md', 'irs.md', 'vv-plan.md']
const HEADERS = {
  'mrd.md': ['MRD', 'json-ledger'],
  'strs.md': ['StRS', 'headings'],
  'prd.md': ['PRD', 'json-ledger'],
  'syrs.md': ['SyRS', 'headings'],
  'irs.md': ['IRS', 'headings'],
  'vv-plan.md': ['V&V', 'table-rows'],
}

const PROMPT = [
  '产品定义动议（验证用；一轮内完成；不要问我；产品 = 面向中小制造企业的「银行流水自动对账」SaaS）：',
  '1) 用 spawn_teammate 起 cmo 与 vp-eng（成员名就是 cmo / vp-eng）；任务板建两个任务：T1 CMO 写 drafts/mrd.md + drafts/strs.md；T2 VP-Eng 写 drafts/prd.md（blockedBy T1）；任务书写清产物路径与验收。',
  '2) 任务书写明：这是落地项目——VP-Eng 要**同时**起 system_architect 与 system_qa（两个命名 child 并行，别串行等）。system_architect 出 drafts/syrs.md + drafts/irs.md（SyRS 每条 traces 指 PRD 的 REQ；IRS 每条 traces 指 SyRS 的 REQ）。system_qa 先把 drafts/vv-plan.md 落盘（V&V 表头带 covers 列，覆盖每条 REQ/IF，层级 L1–L4），再写 drafts/sqa-review.md；SQA 结论原样保留。',
  '3) 动议目录的 meta.md 写 `编号体系: identity` 与 `需求层: MRD, StRS, PRD, SyRS, IRS, V&V`；每份需求文档头写 layer 与 definition；编号只用 MR/REQ/IF/TC/AC，层/状态/专业域/验证方不进号；旧号形（层前缀/验证点前缀）不得出现。',
  '4) 不写 final.md；收口把产物清单、裁决与未决写进 drafts/ceo.md。',
  '5) 操作员稍后跑 /req check <slug>；你只负责落盘。≤ 24 个工具轮；现在开始。',
].join('\n')

const sessionHeader = dir => {
  const file = join(SESSIONS, dir, 'session.v4.jsonl.zstd')
  if (!existsSync(file)) return undefined
  try {
    const first = execFileSync('zstd', ['-dc', file], { maxBuffer: 64 * 1024 * 1024 }).toString().split('\n')[0]
    const info = JSON.parse(first)
    if (typeof info?.createdAt !== 'number' || info.createdAt < startedAt) return undefined
    return info
  } catch { return undefined }
}

const findings = []
const pass = (label, condition, detail = '') => {
  findings.push({ label, ok: condition === true, detail })
  console.log(`  ${condition === true ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
}

const { child, base, token } = await startWeb({ spawn, root: ROOT, home })
console.log(`web up: ${base}`)
let exitCode = 0
let slug
try {
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'reqchain-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'ceo' } })
  console.log(`lead session: ${created.sessionId}`)
  await rpc('session/prompt', {
    request: {
      requestId: `reqchain-${String(Date.now())}`, sessionId: created.sessionId, mode: 'queue',
      content: [{ type: 'text', text: PROMPT }], clientTimeZone: 'Asia/Shanghai',
    },
  })
  console.log('prompt sent; polling for five-layer drafts …')

  const known = new Set(existsSync(DELIV) ? readdirSync(DELIV) : [])
  let lastSignature = ''
  let stableSince = 0
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(8000)
    if (!existsSync(DELIV)) continue
    for (const dir of readdirSync(DELIV).filter(name => !known.has(name)).sort()) {
      const drafts = join(DELIV, dir, 'drafts')
      if (!existsSync(drafts)) continue
      const files = readdirSync(drafts).filter(name => EXPECTED.includes(name))
      if (files.length === 0) continue
      const signature = files.sort().map(name => `${name}:${String(statSync(join(drafts, name)).mtimeMs)}`).join('|')
      if (signature !== lastSignature) { lastSignature = signature; stableSince = Date.now() }
      slug = dir
    }
    if (slug !== undefined && lastSignature.split('|').length >= EXPECTED.length && Date.now() - stableSince > 60_000) break
  }

  if (slug === undefined) {
    pass('找到本轮动议目录', false, `${String(Math.round((Date.now() - startedAt) / 1000))}s 内没有新动议落盘`)
    console.log('\nrequirements-chain-probe: FAIL（未产出）')
    exitCode = 1
  } else {
    const dir = join(DELIV, slug)
    const drafts = join(dir, 'drafts')
    const textOf = name => existsSync(join(drafts, name)) ? readFileSync(join(drafts, name), 'utf8') : undefined
    console.log(`motion: ${slug}`)

    const texts = Object.fromEntries(EXPECTED.map(name => [name, textOf(name)]))
    const present = EXPECTED.filter(name => texts[name] !== undefined)
    pass('C1 五层 + V&V 落盘', present.length === EXPECTED.length, `present=${String(present.length)}/${String(EXPECTED.length)}；缺 ${EXPECTED.filter(name => texts[name] === undefined).join(',') || '无'}`)

    const headerProblems = []
    for (const [name, [layer, definition]] of Object.entries(HEADERS)) {
      const text = texts[name]
      if (text === undefined) { headerProblems.push(`${name} 缺失`); continue }
      const header = parseHeader(text)
      if (header === null) { headerProblems.push(`${name} 缺头`); continue }
      if (header.layer !== layer) headerProblems.push(`${name} layer=${String(header.layer)}≠${layer}`)
      if (header.definition !== definition) headerProblems.push(`${name} definition=${String(header.definition)}≠${definition}`)
    }
    pass('C2 头（layer/definition）正确', headerProblems.length === 0, headerProblems.slice(0, 4).join('；') || 'ok')

    const metaText = existsSync(join(dir, 'meta.md')) ? readFileSync(join(dir, 'meta.md'), 'utf8') : undefined
    pass('C3a meta 带 编号体系: identity', metaText !== undefined && /^编号体系:\s*identity\b/m.test(metaText), metaText === undefined ? '缺 meta.md' : '')
    const docs = EXPECTED
      .map(name => ({ name, text: texts[name] }))
      .filter(entry => entry.text !== undefined)
      .map(entry => ({ rel: `drafts/${entry.name}`, text: entry.text }))
    const result = checkRequirements({ docs, ...(metaText === undefined ? {} : { meta: { rel: 'meta.md', text: metaText } }) })
    pass('C3b checker 绿（无退役/重复/悬空/孤儿/覆盖缺口）', result.ok && !result.skipped,
      result.skipped ? `skipped：${result.reason}` : (result.ok ? `MR ${String(result.index.counts.MR)} / REQ ${String(result.index.counts.REQ)} / IF ${String(result.index.counts.IF)} / TC ${String(result.index.counts.TC)}` : result.errors.slice(0, 4).join('；')))

    pass('C4 不写 final.md', !existsSync(join(dir, 'final.md')), existsSync(join(dir, 'final.md')) ? '出现了 final.md（成品归 CEO，探针只看 draft）' : '')

    const children = []
    if (existsSync(SESSIONS)) {
      for (const name of readdirSync(SESSIONS)) {
        const info = sessionHeader(name)
        if (info !== undefined) children.push(info)
      }
    }
    const presets = new Set(children.map(info => info.agentPreset))
    // teammate 继承 Lead（ceo）组合：cmo/vp-eng 作为团队成员时 agentPreset = ceo（机制事实）；
    // 命名 child 才由 agentPreset 给真人格。C5 = 两个命名专家在场 + 至少两个 teammate 会话。
    const teammates = children.filter(info => info.origin === 'subagent' && info.delegationDepth === 1)
    const wiring = presets.has('system-architect') && presets.has('system-qa') && teammates.length >= 2
    pass('C5 子会话接线（两个 teammate + SA/SQA 命名 child）', wiring,
      `presets=${[...presets].sort().join(',')} teammates=${String(teammates.length)}`)

    let commandNote = '未执行'
    try {
      const reply = await rpc('commands/execute', {
        agentId: created.sessionId, line: `/req check ${slug}`, submittedAttachments: [],
      })
      commandNote = JSON.stringify(reply).slice(0, 300)
      console.log(`  INFO /req check 回执：${commandNote}`)
    } catch (error) {
      commandNote = `RPC 失败：${error.message}`
      console.log(`  INFO /req check RPC 未接通（不影响 checker 证据）：${error.message}`)
    }
    findings.push({ label: 'C6 /req check 命令回执', ok: commandNote.startsWith('{'), detail: commandNote })

    const failures = findings.filter(finding => !finding.ok)
    mkdirSync(join(ROOT, 'runtime/requirements-chain-probe'), { recursive: true })
    writeFileSync(join(ROOT, 'runtime/requirements-chain-probe/last-run.json'), JSON.stringify({
      at: new Date().toISOString(), slug, sessionId: created.sessionId, findings,
      checkerErrors: result.errors, counts: result.index.counts,
    }, null, 2))
    console.log(failures.length === 0
      ? '\nrequirements-chain-probe: ALL PASS（一轮样本；不证一般可靠性）'
      : `\nrequirements-chain-probe: FAIL（${String(failures.length)} 条判据不成立）`)
    exitCode = failures.length === 0 ? 0 : 1
  }
} catch (error) {
  console.error(`probe error: ${error.message}`)
  exitCode = 2
} finally {
  if (!KEEP) child.kill('SIGTERM')
}
process.exit(exitCode)
