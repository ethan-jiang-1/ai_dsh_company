// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 9-bis. Note 活状态门禁（notes-liveness，2026-10-05 D35 立；notes/ 分类 owner = notes/README.md）──
// implemented/ 新写 Note（文件名日期 ≥ 生效日）前 6 行须有「状态：」行且以生命周期词开头
// （implemented/已交付/已消化——词表唯一家 = notes/README §一）；存量按生效日祖父豁免
// （存量不回扫 = 状态行规矩的既有口径，2026-09-24）。
// 负例留证（2026-10-05 实跑，红→还原→绿三步）：fixture A 无状态行 / fixture B 状态词错位
// （proposed 开头）双红 → 删 fixture 还原 → green；收据 = archived/2026-10-05-notes-taxonomy-owner.md。
export function run({ root, ok, fail }) {
  const NOTES_EFFECTIVE_DATE = '2026-10-05'
  const implDir = join(root, 'notes/implemented')
  const implNotes = existsSync(implDir)
    ? readdirSync(implDir).filter(n => n.endsWith('.md'))
    : []
  const freshNotes = implNotes.filter(n => {
    const m = /^(\d{4}-\d{2}-\d{2})-/.exec(n)
    return m !== null && m[1] >= NOTES_EFFECTIVE_DATE
  })
  const LIFECYCLE_WORD = /^状态：\s*\**\s*(implemented|已交付|已消化)/m
  const badNotes = freshNotes.filter(name =>
    !LIFECYCLE_WORD.test(readFileSync(join(implDir, name), 'utf8').split('\n').slice(0, 6).join('\n')))
  badNotes.length === 0
    ? ok(`notes-liveness ×${freshNotes.length}（implemented/ 新写 Note 状态行；生效日前存量豁免）`)
    : fail('notes-liveness', `这些 implemented/ Note 前 6 行缺合规「状态：」行（须以 implemented/已交付/已消化 开头——词表与规则 = notes/README）：${badNotes.join(', ')}`)
}
