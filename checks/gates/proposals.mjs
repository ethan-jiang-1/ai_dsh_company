// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sectionStructuralText } from '../../packages/company-pack/src/lib/markdown-shape-core.js'
import { noteStatusBlock, structuralLines } from '../../tools/lib/repo-markdown.mjs'

// ── 9. 提案纪律：notes/proposed/ 只收已批 RFC，且该毕业的必须毕业 ─────────────
// 负例留证 2026-09-27：无归宿提案 → proposal-scheduled 红；「已交付」状态滞留 proposed → proposal-graduated 红。
// 2026-09-28 D32 重构（队列层退役）：原判据「提案必须在 ROADMAP 出现」的防病机理 = 防"登记了但没人做"。
// 队列没了，病根不变 ⇒ 判据换成等价物：**每份 RFC 状态行必须带「批准」标记**（用户令 / Plan Mode 通过 +
// 日期）——没批准的思考属于 _backlog/issues/ 推敲卡，不配住 proposed/；
//   ① proposal-scheduled：状态行（逻辑行，含缩进续行）带「批准」；
//   ② proposal-graduated（不变）：已消化的不许赖在 proposed/——毕业 ≠ 全部实现，而是"每一条都有归宿"。
//   ③ proposal-scheduled 扩展（2026-10-05 TDD 环立，用户令「一定 TDD 手段、全程证据、不随性发挥」）：
//      RFC 必须带「## 验收」节——「怎么测」先行的载体；红绿环序列合同 = notes/proposed/README 生命周期段。
//      负例留证：无验收节的 fixture RFC → red → 还原 → green（三步 = archived/2026-10-05-rfc-tdd-loop.md）。
// ⚠ 门禁只保证"被批准 + 该毕业的毕业"，不保证"会实现"——实施由用户指令逐条进入。
export function run({ root, ok, fail }) {
  const proposedDir = join(root, 'notes/proposed')
  // README.md 是文件夹说明书（curated entry point，非提案）——DSH 同款：notes 层的 README 不在提案命名空间
  const proposals = existsSync(proposedDir)
    ? readdirSync(proposedDir).filter(n => n.endsWith('.md') && n !== 'README.md')
    : []
  const sectionBody = (text, heading) => (sectionStructuralText(text, heading) ?? '').trim()
  const dateOf = name => /^(\d{4}-\d{2}-\d{2})-/.exec(name)?.[1]

  const unapproved = proposals.filter(name => {
    const head = structuralLines(readFileSync(join(proposedDir, name), 'utf8'))
      .slice(0, 12)
      .filter(line => line.structural)
      .map(line => line.text)
      .join('\n')
    return !(head.includes('批准：') || head.includes('批准:'))
  })
  const noAcceptance = proposals.filter(name =>
    sectionBody(readFileSync(join(proposedDir, name), 'utf8'), '验收') === '')
  const noFact = proposals.filter(name => {
    const date = dateOf(name)
    if (date === undefined || date < '2026-11-14') return false
    return sectionBody(readFileSync(join(proposedDir, name), 'utf8'), '状态事实与载体') === ''
  })
  const scheduledProblems = [
    ...unapproved.map(name => `${name} 缺「批准：」标记（未批准的思考住 _backlog/issues/ 推敲卡）`),
    ...noAcceptance.map(name => `${name} 缺非空「## 验收」节（验收 = RFC 三件之一，「怎么测」先行的载体——见 notes/proposed/README 生命周期段）`),
    ...noFact.map(name => `${name} 缺非空「## 状态事实与载体」节（事实/唯一入口/读载体/写载体）`),
  ]
  scheduledProblems.length === 0
    ? ok(`proposal-scheduled ×${proposals.length}（批准标记 + 验收节）`)
    : fail('proposal-scheduled', `这些 RFC 不合规：${scheduledProblems.join('；')}`)

  /** 终态字：提案的状态行里出现这些，说明它已经被消化，该毕业了。 */
  const DIGESTED_MARKERS = ['已消化', '已交付', '部分交付']
  const notGraduated = proposals.filter(name =>
    DIGESTED_MARKERS.some(marker => noteStatusBlock(readFileSync(join(proposedDir, name), 'utf8')).includes(marker)))
  notGraduated.length === 0
    ? ok('proposal-graduated (proposed/ 里只剩未落地的)')
    : fail('proposal-graduated', `这些提案已消化却仍在 notes/proposed/（搬到 notes/implemented/ 并写明条目去向）：${notGraduated.join(', ')}`)
}
