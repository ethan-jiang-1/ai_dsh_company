// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
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
export function run({ root, ok, fail }) {
  const NOTES_EFFECTIVE_DATE = '2026-10-05'
  const DECISION_EFFECTIVE_DATE = '2026-11-04'
  const implDir = join(root, 'notes/implemented')
  const implNotes = existsSync(implDir)
    ? readdirSync(implDir).filter(n => n.endsWith('.md'))
    : []
  const dateOf = name => /^(\d{4}-\d{2}-\d{2})-/.exec(name)?.[1]
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
  const problems = []
  if (badNotes.length > 0) {
    problems.push(`前 6 行缺合规「状态：」行（须以 implemented/已交付/已消化 开头）：${badNotes.join(', ')}`)
  }
  if (badDecision.length > 0) {
    problems.push(`日期 ≥ ${DECISION_EFFECTIVE_DATE} 但缺 \`## 决定\` 节（收据/流水请进 archived/receipts/）：${badDecision.join(', ')}`)
  }
  problems.length === 0
    ? ok(`notes-liveness ×${freshNotes.length}（状态行；决定节生效日 ${DECISION_EFFECTIVE_DATE} 起 ×${decisionNotes.length}）`)
    : fail('notes-liveness', problems.join('；'))
}
