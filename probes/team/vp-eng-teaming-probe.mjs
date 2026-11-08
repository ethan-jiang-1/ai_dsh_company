#!/usr/bin/env node
// 状态：常驻
// 何时跑：B2 验收（VP-Eng 组队包真跑）；改 vp-eng 组队行 / eng-teaming / 委派行后。
// 为什么存在：VP-Eng 根门是 Team Lead ⇒ 应当能带**研发小队**（teammate 工程师）并**命名请专家**
//   （CMO/SA/SQA）。keyless 只能证投影；本探针用一轮真模型证明：① teammate 继承 vp-eng 组合；
//   ② 三个命名 child 各拿自己的 preset；③ 整包产物落盘；④ SQA 结论在场且被包索引点名。
// 判据（任一不成立 ⇒ exit 1）：
//   P1 prd-detail teammate：origin=subagent、depth=1、parent=根、agentPreset=vp-eng
//   P2 命名 child：cmo / system-architect / system-qa 各一，preset 正确、depth=1、同一 parent=根
//   P3 drafts 产物在场：mrd/strs/prd/syrs/irs/vv-plan/sqa-review + vp-eng-package
//   P4 SQA 结论原样（sqa-review 有裁决词）且包索引点名 SQA
//   P5 不写 final.md
// 成本/预算：真模型一轮，约 10–20 分钟；不进 `pnpm test`。
// 用法：source run/env.sh && node probes/team/vp-eng-teaming-probe.mjs [--wall 1500] [--keep]
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureRehearsalWorkspace } from '../../tools/lib/rehearsal.mjs'
import { companyCookie, companyRpc, startWeb } from '../../tools/lib/probe-web.mjs'
import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { requireDevHome } from '../../tools/lib/runtime-home.mjs'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const WALL_MS = Number(arg('wall', '1500')) * 1000
const KEEP = process.argv.includes('--keep')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let home
try { home = requireDevHome('vp-eng-teaming-probe') } catch (error) { console.error(error.message); process.exit(2) }
const rehearsal = ensureRehearsalWorkspace(ROOT)
const DELIV = join(rehearsal, '.dsh-company/deliverables')
const SESSIONS = join(home, 'sessions', `--${rehearsal.replace(/^\/+/, '').replaceAll('/', '-')}--`)
const startedAt = Date.now()
const EXPECTED = ['mrd.md', 'strs.md', 'prd.md', 'syrs.md', 'irs.md', 'vv-plan.md', 'sqa-review.md', 'vp-eng-package.md']

const PROMPT = [
  '研发包动议（验证用；一轮内完成；不要问我；产品 = 面向中小制造企业的「银行流水自动对账」SaaS）：',
  '1) 先加载 eng-teaming skill 并按四档决策树执行。用 spawn_teammate 起一个工程师 prd-detail——任务：拆 PRD 的 S1 细节 + 一致性检查；**成员是你带的工程师，不是 VP-Eng 本人，也不是别的角色**。',
  '2) 用 vp_cmo 请 CMO 出 drafts/mrd.md + drafts/strs.md；用 system_architect 出 drafts/syrs.md + drafts/irs.md；用 system_qa 出 drafts/vv-plan.md + drafts/sqa-review.md。',
  '3) 任务书写明：MRD/StRS 署 CMO；PRD 署 VP-Eng；SQA 结论原样、不得删；成员不得冒充 SQA/CMO；每份需求文档头写 layer 与 definition（编号合同 = content/state/process-docs.md）。',
  '4) 写 drafts/vp-eng-package.md 包索引（每份产物 / owner / 状态 / 未决），并点名 SQA 的原始结论；不写 final.md。',
  '5) ≤ 20 个工具轮；现在开始。',
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
const pass = (label, ok, detail = '') => {
  findings.push({ label, ok: ok === true, detail })
  console.log(`  ${ok === true ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
}

const { child, base, token } = await startWeb({ spawn, root: ROOT, home, env: { ...process.env, DSH_COMPANY_HOME: rehearsal } })
console.log(`web up: ${base}`)
let exitCode = 0
try {
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'vpeng-team-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  const rootId = created.sessionId
  console.log(`vp-eng root session: ${rootId}`)
  await rpc('session/prompt', {
    request: {
      requestId: `vpeng-team-${String(Date.now())}`, sessionId: rootId, mode: 'queue',
      content: [{ type: 'text', text: PROMPT }], clientTimeZone: 'Asia/Shanghai',
    },
  })
  console.log('prompt sent; polling for children + package drafts …')

  const known = new Set(existsSync(DELIV) ? readdirSync(DELIV) : [])
  let slug
  let lastSignature = ''
  let stableSince = 0
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(8000)
    if (existsSync(DELIV)) {
      for (const dir of readdirSync(DELIV).filter(name => !known.has(name)).sort()) {
        const drafts = join(DELIV, dir, 'drafts')
        if (!existsSync(drafts)) continue
        const files = readdirSync(drafts).filter(name => EXPECTED.includes(name))
        if (files.length === 0) continue
        const signature = files.sort().map(name => `${name}:${String(statSync(join(drafts, name)).mtimeMs)}`).join('|')
        if (signature !== lastSignature) { lastSignature = signature; stableSince = Date.now() }
        slug = dir
      }
    }
    if (slug !== undefined && lastSignature.split('|').length >= EXPECTED.length && Date.now() - stableSince > 60_000) break
  }

  if (slug === undefined) {
    pass('找到本轮研发包目录', false, `${String(Math.round((Date.now() - startedAt) / 1000))}s 内没有新动议落盘`)
    console.log('\nvp-eng-teaming-probe: FAIL（未产出）')
    exitCode = 1
  } else {
    const dir = join(DELIV, slug)
    const drafts = join(dir, 'drafts')
    const textOf = name => existsSync(join(drafts, name)) ? readFileSync(join(drafts, name), 'utf8') : undefined
    console.log(`motion: ${slug}`)

    const children = existsSync(SESSIONS)
      ? readdirSync(SESSIONS).map(name => sessionHeader(name)).filter(info => info !== undefined)
      : []
    const isTeammate = info => info.origin === 'subagent' && info.delegationDepth === 1 && info.parentSession === rootId.replace(/^session-/, '')
    // 会话 header 的 parentSession 是裸 id（无 `session-` 前缀）；兼容两种写法。
    const parentMatches = info => {
      const parent = String(info.parentSession ?? '')
      return parent === rootId || parent === rootId.replace(/^session-/, '')
    }
    const teammates = children.filter(info => info.origin === 'subagent' && info.delegationDepth === 1 && parentMatches(info))
    const vpEngTeammate = teammates.find(info => info.agentPreset === 'vp-eng')
    pass('P1 teammate prd-detail（继承 vp-eng 组合 / depth 1 / parent=根）', vpEngTeammate !== undefined,
      `teammates=${String(teammates.length)} presets=${teammates.map(info => info.agentPreset).join(',')}`)

    const named = preset => children.find(info => info.agentPreset === preset && String(info.delegationDepth) === '1' && parentMatches(info))
    const namedFound = ['cmo', 'system-architect', 'system-qa'].map(preset => named(preset) === undefined ? `${preset}✗` : `${preset}✓`)
    pass('P2 命名专家 cmo / system-architect / system-qa（各拿自己 preset，depth 1，同一 parent）',
      !namedFound.some(item => item.endsWith('✗')), namedFound.join(' '))

    const texts = Object.fromEntries(EXPECTED.map(name => [name, textOf(name)]))
    const present = EXPECTED.filter(name => texts[name] !== undefined)
    pass('P3 研发包产物在场', present.length === EXPECTED.length,
      `present=${String(present.length)}/${String(EXPECTED.length)}；缺 ${EXPECTED.filter(name => texts[name] === undefined).join(',') || '无'}`)

    const sqa = texts['sqa-review.md'] ?? ''
    const pkg = texts['vp-eng-package.md'] ?? ''
    const hasVerdict = /不通过|否决|通过|待验/.test(sqa)
    pass('P4 SQA 结论原样在场且包索引点名 SQA', hasVerdict && /SQA|system_qa/i.test(pkg),
      `sqa 裁决词=${String(hasVerdict)}；包索引点名=${String(/SQA|system_qa/i.test(pkg))}`)

    pass('P5 不写 final.md', !existsSync(join(dir, 'final.md')))

    const failures = findings.filter(finding => !finding.ok)
    mkdirSync(join(ROOT, 'runtime/vp-eng-teaming-probe'), { recursive: true })
    writeFileSync(join(ROOT, 'runtime/vp-eng-teaming-probe/last-run.json'), JSON.stringify({
      at: new Date().toISOString(), slug, sessionId: rootId, findings,
      children: children.map(info => ({ id: info.id, preset: info.agentPreset, depth: info.delegationDepth, parent: info.parentSession, origin: info.origin })),
    }, null, 2))
    console.log(failures.length === 0
      ? '\nvp-eng-teaming-probe: ALL PASS（一轮样本；不证一般可靠性）'
      : `\nvp-eng-teaming-probe: FAIL（${String(failures.length)} 条判据不成立）`)
    exitCode = failures.length === 0 ? 0 : 1
  }
} catch (error) {
  console.error(`probe error: ${error.message}`)
  exitCode = 2
} finally {
  if (!KEEP) {
    // SIGTERM 异步：立刻 process.exit 会把子 web 留成孤儿并占 home 的 writer lease（2026-11-08 修）。
    child.kill('SIGTERM')
    await sleep(1500)
    if (child.exitCode === null) child.kill('SIGKILL')
  }
}
process.exit(exitCode)
