// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { normalizeDocument, sectionRange } from '../../packages/company-pack/src/lib/markdown-shape-core.js'
import { join } from 'node:path'

// ── 9-bis. Note 活状态门禁（notes-liveness，2026-10-05 D35 立；notes/ 分类 owner = notes/README.md）──
// implemented/ 新写 Note（文件名日期 ≥ 生效日）前 6 行须有「状态：」行且以生命周期词开头
// （implemented/已交付/已消化——词表唯一家 = notes/README §一）；存量按生效日祖父豁免
// （存量不回扫 = 状态行规矩的既有口径，2026-09-24）。
// 负例留证（2026-10-05 实跑，红→还原→绿三步）：fixture A 无状态行 / fixture B 状态词错位
// （proposed 开头）双红 → 删 fixture 还原 → green；收据 = archived/2026-10-05-notes-taxonomy-owner.md。
// 2026-11-03 加：日期 ≥ 2026-11-04 的 implemented Note 还须有 `## 决定` 节——notes:audit 在
// 2026-11-03 抓到 2 篇“有状态行、无决定节”的新 Note（D6 修复 / review 修补），收据/流水应进
// archived/receipts/，不该以 implemented 身份出现。负例 = 临时 fixture 2026-11-04-zz-no-decision.md → 红。
// 2026-11-10 加：`*-rationale.md` 必须有 `## 现行语义（canonical）` 节且带链接——
// rationale Note 只留决定/理由/证据，现行语义指向 contract/architecture，防第二权威。
// 负例（2026-11-10 实跑）：临时删 ui-demo rationale 的 canonical 节 →
//   `FAIL notes-liveness: rationale Note 缺「## 现行语义（canonical）」节或节内无链接…`；还原 → 绿。
export function run({ root, ok, fail }) {
  const NOTES_EFFECTIVE_DATE = '2026-10-05'
  const FACT_EFFECTIVE_DATE = '2026-11-14'
  const DECISION_EFFECTIVE_DATE = '2026-11-04'
  const implDir = join(root, 'notes/implemented')
  const implNotes = existsSync(implDir)
    ? readdirSync(implDir).filter(n => n.endsWith('.md'))
    : []
  const dateOf = name => /^(\d{4}-\d{2}-\d{2})-/.exec(name)?.[1]
  const sectionBody = (text, heading) => {
    const range = sectionRange(text, heading)
    if (range === undefined) return ''
    return normalizeDocument(text).split('\n').slice(range.start + 1, range.end).join('\n').trim()
  }
  const freshNotes = implNotes.filter(n => {
    const date = dateOf(n)
    return date !== undefined && date >= NOTES_EFFECTIVE_DATE
  })
  const LIFECYCLE_WORD = /^状态：\s*\**\s*(implemented|已交付|已消化)/m
  const badNotes = freshNotes.filter(name =>
    !LIFECYCLE_WORD.test(readFileSync(join(implDir, name), 'utf8').split('\n').slice(0, 6).join('\n')))
  const decisionNotes = implNotes.filter(n => {
    const date = dateOf(n)
    return date !== undefined && date >= DECISION_EFFECTIVE_DATE
  })
  const badDecision = decisionNotes.filter(name =>
    !/^##\s+决定\s*$/m.test(readFileSync(join(implDir, name), 'utf8')))
  const factNotes = implNotes.filter(name => {
    const date = dateOf(name)
    return date !== undefined && date >= FACT_EFFECTIVE_DATE
  })
  const badFact = factNotes.filter(name =>
    sectionBody(readFileSync(join(implDir, name), 'utf8'), '状态事实与载体') === '')
  const rationaleNotes = implNotes.filter(name => name.endsWith('-rationale.md'))
  const badRationale = rationaleNotes.filter(name => {
    const body = readFileSync(join(implDir, name), 'utf8')
    const at = body.search(/^##\s+现行语义（canonical）\s*$/m)
    if (at < 0) return true
    const next = body.indexOf('\n## ', at + 1)
    const section = body.slice(at, next < 0 ? body.length : next)
    return !/\]\([^)]+\)/.test(section)
  })
  const problems = []
  if (badNotes.length > 0) {
    problems.push(`前 6 行缺合规「状态：」行（须以 implemented/已交付/已消化 开头）：${badNotes.join(', ')}`)
  }
  if (badFact.length > 0) {
    problems.push(`日期 ≥ ${FACT_EFFECTIVE_DATE} 但缺非空 \`## 状态事实与载体\`：${badFact.join(', ')}`)
  }
  if (badDecision.length > 0) {
    problems.push(`日期 ≥ ${DECISION_EFFECTIVE_DATE} 但缺 \`## 决定\` 节（收据/流水请进 archived/receipts/）：${badDecision.join(', ')}`)
  }
  if (badRationale.length > 0) {
    problems.push(`rationale Note 缺「## 现行语义（canonical）」节或节内无链接（现行语义只住 contract/architecture）：${badRationale.join(', ')}`)
  }
  problems.length === 0
    ? ok(`notes-liveness ×${freshNotes.length}（状态行；决定节生效日 ${DECISION_EFFECTIVE_DATE} 起 ×${decisionNotes.length}；rationale 现行语义 ×${rationaleNotes.length}）`)
    : fail('notes-liveness', problems.join('；'))
}
