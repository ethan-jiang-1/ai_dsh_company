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
//   R2 域判定表：**同一份稿**里 ≥5 个域行、每行有 在/不在，且全稿有「依据」（默认五行；任务书另有划分按任务书的）
//   R3 纯软件方向：该表里软件=在、电气/机械=不在；SA 稿含 ≥2 个软件镜头（状态机/并发/契约/可观测/迁移回滚）
//   R4 SQA 域审计在场：vv-plan/sqa-review 出现「域审计」并核对 SA 判定
//   R5 任务书声明域：现场边界 + 物理件（执行器/市电/承力）+ 产物用途
//   R6 不写 final.md
// 两种用法：
//   真跑（真模型，8–15 分钟）：source run/env.sh && node probes/team/sa-sqa-domain-routing-probe.mjs [--wall 1500]
//   零模型审计（对已产出的动议目录）：node probes/team/sa-sqa-domain-routing-probe.mjs --audit <动议目录>
// 真跑停表 = 五份产物齐 + 稳定 75s；只看"新目录"会漏掉「模型接着上次动议往下写」的轮次（2026-11-08 实跑 3：
//   第 3 轮把产物写进了第 1 轮的 v4 目录，只认新目录的停表条件永远等不到）——所以候选目录 = 新目录 **或**
//   启动后 drafts 有改动的目录。
import { execFileSync, spawn } from 'node:child_process'
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
  // 结构化判据：域判定必须是一张「一行一个域 + 在/不在」的表；只数名字会让「差异声明」里的五个名字
  // 冒充整张表（2026-11-08 评审实锤：v4 的固件/系统测试只出现在散文里，旧 R2 仍假绿）。
  // 表必须落在**架构稿**（skill 说「落进架构稿」）；用「任一 SA 稿的最大表」会让 syrs 的承接表顶包
  //（2026-11-08 复审实锤：删掉架构稿一行后 R2 仍绿）。
  const rowsOf = text => text.split('\n')
    .filter(line => line.trim().startsWith('|'))
    .map(line => line.split('|').slice(1, -1).map(cell => cell.trim().replace(/\*\*/g, '')))
  // 学科列允许带括号注释（`固件（MCU / RTOS …）`），按前缀认学科；追加行不参与判定。
  const disciplineOf = cells => DISCIPLINES.find(name => (cells[0] ?? '').startsWith(name))
  const statusOk = cell => /^(在|不在)(?:\s*\/\s*(?:在|不在))?(?=\s|（|\(|$)/.test(cell ?? '')
  const architecture = domainDocs.find(entry => entry.name === 'system-architecture.md')
  const tableDoc = architecture ?? domainDocs[0]
  const allRows = tableDoc === undefined ? [] : rowsOf(tableDoc.text)
  const rows = allRows.filter(cells => disciplineOf(cells) !== undefined)
  const headerHasBasis = allRows.some(cells => (cells[0] ?? '').includes('学科') && (cells.join(' ')).includes('依据'))
  const complete = DISCIPLINES.every(name => {
    const row = rows.find(cells => disciplineOf(cells) === name)
    return row !== undefined && statusOk(row[1]) && (row[2] ?? '').length > 0
  })
  // 五学科固定行必须**逐行**出现（允许追加行）；只数名字会让「差异声明」里的五个名字冒充整张表。
  pass('R2 架构稿域判定表：五学科固定行 + 每行 在/不在 + 非空依据',
    rows.length >= 5 && complete && headerHasBasis,
    `doc=${tableDoc?.name ?? '—'} rows=${String(rows.length)} complete=${String(complete)} header=${String(headerHasBasis)}`)

  // R3：只看五学科那五行（追加行不参与方向判定）。
  const statusOf = (name) => {
    const row = rows.find(cells => disciplineOf(cells) === name)
    if (row === undefined) return 'unknown'
    const cell = row[1] ?? ''
    return /^不在/.test(cell) ? 'out' : /^在/.test(cell) ? 'in' : 'unknown'
  }
  const swIn = statusOf('软件') === 'in'
  const eeOut = statusOf('电气') === 'out'
  const meOut = statusOf('机械') === 'out'
  const lenses = ['状态机', '并发', '契约', '可观测', '迁移', '回滚'].filter(word => saText.includes(word))
  pass('R3 纯软件方向：软件=在、电气/机械=不在、含软件镜头', swIn && eeOut && meOut && lenses.length >= 2,
    `sw=${String(swIn)} ee=${String(eeOut)} me=${String(meOut)} lenses=${lenses.join(',')}`)

  const sqaDocs = texts.filter(entry => /vv-plan|sqa-review/.test(entry.name))
  const sqaText = sqaDocs.map(entry => entry.text).join('\n')
  // 域审计不能只出现一个词：同段（±200 字）里必须有裁决词和排除/举证判据。
  const auditIndex = sqaText.indexOf('域审计')
  const auditBlock = auditIndex === -1 ? '' : sqaText.slice(Math.max(0, auditIndex - 200), auditIndex + 600)
  const auditJudged = /不通过|通过|待验/.test(auditBlock) && /排除|举证|依据|逐行/.test(auditBlock) && /(SA|架构|系统架构)/.test(auditBlock)
  pass('R4 SQA 域审计有裁决（域审计 + 排除/举证 + 通过/不通过/待验）', sqaDocs.length > 0 && auditJudged,
    sqaDocs.map(entry => entry.name).join(',') || '没有 vv-plan/sqa-review')

  const taskBook = texts.find(entry => /vp-eng-task|任务书|ceo\.md/.test(entry.name))?.text ?? ''
  const hasBoundary = /现场边界/.test(taskBook)
  const hasPhysical = /执行器/.test(taskBook) && /市电/.test(taskBook) && /承力/.test(taskBook)
  const hasPurpose = /产物用途/.test(taskBook)
  const hasFive = DISCIPLINES.every(name => taskBook.includes(name))
  pass('R5 任务书声明域（现场边界 + 物理件 + 产物用途 + 固定五行）', hasBoundary && hasPhysical && hasPurpose && hasFive,
    `boundary=${String(hasBoundary)} physical=${String(hasPhysical)} purpose=${String(hasPurpose)} five=${String(hasFive)}`)

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
  // 只返回退出码：真跑模式下若在这里 process.exit，finally 的 child.kill 就永远不执行
  // ⇒ 孤儿 web 进程占着 home 的 writer lease（2026-11-08 实踩：连跑后 dataBlocked 假红）。
  return failures.length === 0 ? 0 : 1
}

// ── 零模型审计模式（对已产出的目录；不 boot web）──────────────────────────────
if (AUDIT_DIR !== undefined) {
  const dir = resolve(AUDIT_DIR)
  if (!existsSync(dir)) { console.error(`--audit 目录不存在：${dir}`); process.exit(2) }
  auditMotion(dir.split('/').filter(Boolean).at(-1) ?? dir, dir)
  process.exit(finish('audit', dir, { dir }))
}

// ── 真跑模式 ───────────────────────────────────────────────────────────────
let home
try { home = requireDevHome('sa-sqa-domain-routing-probe') } catch (error) { console.error(error.message); process.exit(2) }
const rehearsal = ensureRehearsalWorkspace(ROOT)
const DELIV = join(rehearsal, '.dsh-company/deliverables')
const startedAt = Date.now()

const PROMPT = [
  '研发包动议（验证用；一轮内完成；不要问我；新建一个动议目录，slug 用 2026-11-08-domain-routing-v1；产品 = 面向中小制造企业的「银行流水自动对账」SaaS，**纯软件**：无物理执行器、无市电、无承力件）：',
  '1) 先写任务书 drafts/vp-eng-task.md，必须声明三件事：① 现场边界（公有云 SaaS，无现场硬件）；② 物理件（无执行器 / 无市电 / 无承力件）；③ 产物用途（对账记录用于财务留档，不需司法举证）。任务书还要**原样带上固定五行**：软件 / 固件 / 电气 / 机械 / 系统测试（可加产品细分，但不得替换这五行）。',
  '2) 用 system_architect 出 drafts/syrs.md + drafts/irs.md + drafts/system-architecture.md；SA 必须先判域：**固定五行逐行**（软件/固件/电气/机械/系统测试，每行 在/不在 + 依据），可追加细分行；纯软件不硬凑电气/机械条目。',
  '3) 用 system_qa 出 drafts/vv-plan.md + drafts/sqa-review.md；SQA 必须做域审计（逐行核五行、核排除依据、核任务书边界冲突）。',
  '4) 不写 final.md；≤ 16 个工具轮；现在开始。',
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
  const sessionDir = join(home, 'sessions', `--${rehearsal.replace(/^\/+/, '').replaceAll('/', '-')}--`, created.sessionId)
  const turnEnded = async () => {
    // 先读会话日志（硬事实）：`turn/end` 出现在启动之后即算这一轮结束。
    try {
      const file = join(sessionDir, 'session.v4.jsonl.zstd')
      if (existsSync(file)) {
        const text = execFileSync('zstd', ['-dc', file], { maxBuffer: 128 * 1024 * 1024 }).toString()
        const done = text.split('\n').some(line => line.includes('"turn/end"') && line.includes('"completed"'))
        if (done) return true
      }
    } catch { /* fall through to RPC */ }
    try {
      const list = await rpc('session/list', { _request: {} })
      const row = (list?.sessions ?? []).find(item => item.sessionId === created.sessionId)
      return row !== undefined && row.running === false
    } catch { return false }
  }
  let slug
  let lastSignature = ''
  let stableSince = 0
  let ended = false
  while (Date.now() - startedAt < WALL_MS) {
    await sleep(8000)
    if (!existsSync(DELIV)) continue
    // 候选 = 启动后 drafts 有改动的目录（含新目录）；取**最近改动**的那个，而不是排序最后一个。
    let bestMtime = 0
    for (const dir of readdirSync(DELIV)) {
      const mtime = mtimeOf(dir)
      if (mtime <= startedAt || mtime < bestMtime) continue
      const drafts = join(DELIV, dir, 'drafts')
      if (!existsSync(drafts)) continue
      const files = readdirSync(drafts).filter(name => name.endsWith('.md'))
      const signature = files.sort().join('|')
      if (signature !== lastSignature) { lastSignature = signature; stableSince = Date.now() }
      bestMtime = mtime
      slug = dir
    }
    if (!ended) ended = await turnEnded()
    const complete = slug !== undefined && EXPECTED.every(name => existsSync(join(DELIV, slug, 'drafts', name)))
    // 停表 = 五份产物齐 + root turn 已结束 + 30s 稳定；只靠 mtime 会把别的动议的旧产物当成这一轮。
    if (complete && ended && Date.now() - stableSince > 30_000) break
  }

  if (slug === undefined) {
    pass('R0 五份产物在场', false, `${String(Math.round((Date.now() - startedAt) / 1000))}s 内没有新动议/改动动议`)
    pass('R7 root turn 结束', false, '没有可评估的动议')
    exitCode = finish('live', undefined, { sessionId: created.sessionId })
  } else {
    auditMotion(slug, join(DELIV, slug))
    pass('R7 root turn 结束（不是只靠 mtime 判绿）', ended, ended ? '' : '墙钟内 root turn 未结束——按无结论处理')
    exitCode = finish('live', slug, { sessionId: created.sessionId })
  }
} catch (error) {
  console.error(`probe error: ${error.message}`)
  exitCode = 2
} finally {
  if (!KEEP) {
    // SIGTERM 是异步的：立刻 process.exit 会把父进程先杀死，子 web 变孤儿并占着 home 的 writer lease
    //（2026-11-08 实踩：短跑测试后仍有 web 进程存活）。等它退出，超时再 SIGKILL。
    child.kill('SIGTERM')
    await sleep(1500)
    if (child.exitCode === null) child.kill('SIGKILL')
  }
}
process.exit(exitCode)
