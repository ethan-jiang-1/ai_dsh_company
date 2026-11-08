#!/usr/bin/env node
// 状态：常驻
// 何时跑：改 SA 的「先判域」/ SQA 的「域审计」/ VP-Eng 任务书的域声明后；SA/SQA 能力组织卡验收。
// 为什么存在（2026-11-08 用户裁定 A+C）：纯软件项目最容易出的不是漏域，而是**硬凑硬件清单**
//   （采样/供电/耐受包络），含物理件项目则容易以"不是我的专业"漏掉电气/机械。文案断言只能证 skill 写了，
//   本探针用一轮**纯软件产品**的真模型动议证明：SA 真的判了五学科、电气/机械判「不在」并给依据，
//   SQA 真的做了域审计，VP-Eng 任务书真的声明了域边界。
// 判据（任一不成立 ⇒ exit 1；`--audit` 与真跑共用同一组）：
//   R0 五份产物在场：syrs / irs / system-architecture / vv-plan / sqa-review
//   R1 SA 域判定文档在场（先判域 / 域判定）
//   R2 域判定：五学科至少覆盖 4 个（固定五行：软件/固件/电气/机械/系统测试）+ 在/不在 + 依据
//   R3 纯软件方向：软件=在、电气/机械=不在；文档含 ≥2 个软件镜头（状态机/并发/契约/可观测/迁移回滚）
//   R4 SQA 域审计在场：vv-plan/sqa-review 出现「域审计」并核对 SA 判定
//   R5 任务书声明域：现场边界 + 物理件（执行器/市电/承力）+ 产物用途
//   R6 不写 final.md
// 两种用法：
//   真跑（真模型，8–15 分钟）：source run/env.sh && node probes/team/sa-sqa-domain-routing-probe.mjs [--wall 1500]
//   零模型审计（对已产出的动议目录）：node probes/team/sa-sqa-domain-routing-probe.mjs --audit <动议目录>
// 真跑停表 = 五份产物齐 + 稳定 75s；只看"新目录"会漏掉「模型接着上次动议往下写」的轮次（2026-11-08 实跑 3：
//   第 3 轮把产物写进了第 1 轮的 v4 目录，只认新目录的停表条件永远等不到）——所以候选目录 = 新目录 **或**
//   启动后 drafts 有改动的目录。
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
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
const AUDIT_DIR = arg('audit', undefined)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const EXPECTED = ['syrs.md', 'irs.md', 'system-architecture.md', 'vv-plan.md', 'sqa-review.md']
const DISCIPLINES = ['软件', '固件', '电气', '机械', '系统测试']

const findings = []
const pass = (label, ok, detail = '') => {
  findings.push({ label, ok: ok === true, detail })
  console.log(`  ${ok === true ? 'PASS' : 'FAIL'} ${label}${detail === '' ? '' : `（${detail}）`}`)
}

/** 对一份已完成动议目录跑 R0–R6（零模型；真跑与审计共用）。 */
function auditMotion(slug, dir) {
  const drafts = join(dir, 'drafts')
  console.log(`motion: ${slug}`)
  if (!existsSync(drafts)) {
    pass('R0 五份产物在场', false, `缺 drafts/：${drafts}`)
    return findings
  }
  const files = readdirSync(drafts).filter(name => name.endsWith('.md'))
  const texts = files.map(name => ({ name, text: readFileSync(join(drafts, name), 'utf8') }))

  pass('R0 五份产物在场', EXPECTED.every(name => files.includes(name)),
    `present=${String(EXPECTED.filter(name => files.includes(name)).length)}/${String(EXPECTED.length)}；所有=${files.join(',')}`)

  // 只认 SA 的三份稿：任务书/SQA 评审也会写「域判定」，把它们算进来会让 R2 假绿。
  const isSaDoc = entry => /^(syrs|irs|system-architecture)\.md$/.test(entry.name)
  const domainDocs = texts.filter(entry => isSaDoc(entry) && /先判域|域判定/.test(entry.text))
  pass('R1 SA 域判定文档在场', domainDocs.length > 0,
    domainDocs.length === 0 ? '没有任何稿件写「先判域/域判定」' : domainDocs.map(entry => entry.name).join(','))

  const saText = domainDocs.map(entry => entry.text).join('\n')
  const disciplines = DISCIPLINES.filter(name => saText.includes(name))
  pass('R2 域判定含五学科 + 在/不在 + 依据', disciplines.length >= 4 && /在\s*\/\s*不在|在\/不在/.test(saText) && saText.includes('依据'),
    `disciplines=${disciplines.join(',')} docs=${domainDocs.map(entry => entry.name).join(',')}`)

  // 表格行解析：取含该域名的 `| ... |` 行，看同一行的判定格（容忍「软件与数据」「机械·结构」这类细分名）。
  const rowOf = name => saText.split('\n').find(line => line.trim().startsWith('|') && line.includes(name)) ?? ''
  const statusIn = row => /不在/.test(row) ? 'out' : /在/.test(row) ? 'in' : 'unknown'
  const swIn = statusIn(rowOf('软件')) === 'in'
  const eeOut = statusIn(rowOf('电气')) === 'out'
  const meOut = statusIn(rowOf('机械')) === 'out'
  const lenses = ['状态机', '并发', '契约', '可观测', '迁移', '回滚'].filter(word => saText.includes(word))
  pass('R3 纯软件方向：软件=在、电气/机械=不在、含软件镜头', swIn && eeOut && meOut && lenses.length >= 2,
    `sw=${String(swIn)} ee=${String(eeOut)} me=${String(meOut)} lenses=${lenses.join(',')}`)

  const sqaDocs = texts.filter(entry => /vv-plan|sqa-review/.test(entry.name))
  const sqaText = sqaDocs.map(entry => entry.text).join('\n')
  pass('R4 SQA 域审计在场并核对 SA 判定', sqaDocs.length > 0 && /域审计/.test(sqaText) && /(SA|架构|系统架构)/.test(sqaText) && /在|不在/.test(sqaText),
    sqaDocs.map(entry => entry.name).join(',') || '没有 vv-plan/sqa-review')

  const taskBook = texts.find(entry => /vp-eng-task|任务书|ceo\.md/.test(entry.name))?.text ?? ''
  const hasBoundary = /现场边界/.test(taskBook)
  const hasPhysical = /执行器/.test(taskBook) && /市电/.test(taskBook) && /承力/.test(taskBook)
  const hasPurpose = /产物用途/.test(taskBook)
  pass('R5 任务书声明域（现场边界 + 物理件 + 产物用途）', hasBoundary && hasPhysical && hasPurpose,
    `boundary=${String(hasBoundary)} physical=${String(hasPhysical)} purpose=${String(hasPurpose)}`)

  pass('R6 不写 final.md', !existsSync(join(dir, 'final.md')))
  return findings
}

function writeReport(mode, slug, extra = {}) {
  mkdirSync(join(ROOT, 'runtime/sa-sqa-domain-routing-probe'), { recursive: true })
  writeFileSync(join(ROOT, 'runtime/sa-sqa-domain-routing-probe/last-run.json'), JSON.stringify({
    at: new Date().toISOString(), mode, slug, findings, ...extra,
  }, null, 2))
}

function finish(mode, slug, extra) {
  const failures = findings.filter(finding => !finding.ok)
  writeReport(mode, slug, extra)
  console.log(failures.length === 0
    ? `\nsa-sqa-domain-routing-probe: ALL PASS（${mode}；一轮样本不证一般可靠性）`
    : `\nsa-sqa-domain-routing-probe: FAIL（${mode}；${String(failures.length)} 条判据不成立）`)
  process.exit(failures.length === 0 ? 0 : 1)
}

// ── 零模型审计模式（对已产出的目录；不 boot web）──────────────────────────────
if (AUDIT_DIR !== undefined) {
  const dir = resolve(AUDIT_DIR)
  if (!existsSync(dir)) { console.error(`--audit 目录不存在：${dir}`); process.exit(2) }
  auditMotion(dir.split('/').filter(Boolean).at(-1) ?? dir, dir)
  finish('audit', dir, { dir })
}

// ── 真跑模式 ───────────────────────────────────────────────────────────────
let home
try { home = requireDevHome('sa-sqa-domain-routing-probe') } catch (error) { console.error(error.message); process.exit(2) }
const rehearsal = ensureRehearsalWorkspace(ROOT)
const DELIV = join(rehearsal, '.dsh-company/deliverables')
const startedAt = Date.now()

const PROMPT = [
  '研发包动议（验证用；一轮内完成；不要问我；产品 = 面向中小制造企业的「银行流水自动对账」SaaS，**纯软件**：无物理执行器、无市电、无承力件）：',
  '1) 先写任务书 drafts/vp-eng-task.md，必须声明三件事：① 现场边界（公有云 SaaS，无现场硬件）；② 物理件（无执行器 / 无市电 / 无承力件）；③ 产物用途（对账记录用于财务留档，不需司法举证）。',
  '2) 用 system_architect 出 drafts/syrs.md + drafts/irs.md + drafts/system-architecture.md；SA 必须先判域（五学科固定五行：软件/固件/电气/机械/系统测试，逐域写 在/不在 + 依据），纯软件不硬凑电气/机械条目。',
  '3) 用 system_qa 出 drafts/vv-plan.md + drafts/sqa-review.md；SQA 必须做域审计（核 SA 的域判定是否成立、排除是否有依据）。',
  '4) 不写 final.md；≤ 14 个工具轮；现在开始。',
].join('\n')

const { child, base, token } = await startWeb({ spawn, root: ROOT, home, env: { ...process.env, DSH_COMPANY_HOME: rehearsal } })
console.log(`web up: ${base}`)
let exitCode = 0
try {
  const cookie = await companyCookie({ fetch, base, token })
  const rpc = companyRpc({ fetch, base, cookie, prefix: 'saqa-domain-', dumpBodyOnError: true })
  const created = await rpc('session/create', { request: { cwd: rehearsal, agentPreset: 'vp-eng' } })
  console.log(`vp-eng root session: ${created.sessionId}`)
  await rpc('session/prompt', {
    request: {
      requestId: `saqa-domain-${String(Date.now())}`, sessionId: created.sessionId, mode: 'queue',
      content: [{ type: 'text', text: PROMPT }], clientTimeZone: 'Asia/Shanghai',
    },
  })
  console.log('prompt sent; polling for drafts …')

  const known = new Set(existsSync(DELIV) ? readdirSync(DELIV) : [])
  const mtimeOf = dir => {
    const drafts = join(DELIV, dir, 'drafts')
    if (!existsSync(drafts)) return 0
    return Math.max(0, ...readdirSync(drafts).filter(name => name.endsWith('.md')).map(name => statSync(join(drafts, name)).mtimeMs))
  }
  let slug
  let lastSignature = ''
  let stableSince = 0
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(8000)
    if (!existsSync(DELIV)) continue
    for (const dir of readdirSync(DELIV).sort()) {
      // 候选 = 新目录，或启动后 drafts 有改动的已有目录（模型可能接着上次动议写）。
      if (known.has(dir) && mtimeOf(dir) <= startedAt) continue
      const drafts = join(DELIV, dir, 'drafts')
      if (!existsSync(drafts)) continue
      const files = readdirSync(drafts).filter(name => name.endsWith('.md'))
      const signature = files.sort().join('|')
      if (signature !== lastSignature) { lastSignature = signature; stableSince = Date.now() }
      slug = dir
    }
    const complete = slug !== undefined && EXPECTED.every(name => existsSync(join(DELIV, slug, 'drafts', name)))
    if (complete && Date.now() - stableSince > 75_000) break
  }

  if (slug === undefined) {
    pass('R0 五份产物在场', false, `${String(Math.round((Date.now() - startedAt) / 1000))}s 内没有新动议/改动动议`)
    finish('live', undefined, { sessionId: created.sessionId })
  } else {
    auditMotion(slug, join(DELIV, slug))
    finish('live', slug, { sessionId: created.sessionId })
  }
} catch (error) {
  console.error(`probe error: ${error.message}`)
  exitCode = 2
} finally {
  if (!KEEP) child.kill('SIGTERM')
}
process.exit(exitCode)
