// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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
const unapproved = proposals.filter(name => {
  const head = readFileSync(join(proposedDir, name), 'utf8').split('\n').slice(0, 12).join('\n')
  return !(head.includes('批准：') || head.includes('批准:'))
})
const noAcceptance = proposals.filter(name =>
  !/^##\s*验收/m.test(readFileSync(join(proposedDir, name), 'utf8')))
const scheduledProblems = [
  ...unapproved.map(name => `${name} 缺「批准：」标记（未批准的思考住 _backlog/issues/ 推敲卡）`),
  ...noAcceptance.map(name => `${name} 缺「## 验收」节（验收 = RFC 三件之一，「怎么测」先行的载体——见 notes/proposed/README 生命周期段）`),
]
scheduledProblems.length === 0
  ? ok(`proposal-scheduled ×${proposals.length}（批准标记 + 验收节）`)
  : fail('proposal-scheduled', `这些 RFC 不合规：${scheduledProblems.join('；')}`)

/** 终态字：提案的状态行里出现这些，说明它已经被消化，该毕业了。 */
const DIGESTED_MARKERS = ['已消化', '已交付', '部分交付']
/**
 * 取提案的「状态：」**逻辑行**——含其后的缩进续行（到空行为止）。
 * 为什么不能只读第一个物理行（2026-09-26 修盲区）：状态行常写成两行（首行给去向、续行给
 * "执行待批准"之类的补充），只读首行时，把「已消化」落在续行就能**逃过毕业门禁**。
 * 现行 RFC 的 `状态：` 就是跨两行写的——这不是假想风险。
 */
const statusBlockOf = (text) => {
  const lines = text.split('\n')
  const start = lines.findIndex(line => line.startsWith('状态：'))
  if (start === -1) return ''
  const block = [lines[start]]
  for (let i = start + 1; i < lines.length && lines[i].trim() !== ''; i++) block.push(lines[i])
  return block.join('\n')
}
const notGraduated = proposals.filter(name =>
  DIGESTED_MARKERS.some(marker => statusBlockOf(readFileSync(join(proposedDir, name), 'utf8')).includes(marker)))
notGraduated.length === 0
  ? ok('proposal-graduated (proposed/ 里只剩未落地的)')
  : fail('proposal-graduated', `这些提案已消化却仍在 notes/proposed/（搬到 notes/implemented/ 并写明条目去向）：${notGraduated.join(', ')}`)
}
