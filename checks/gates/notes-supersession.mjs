// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：每次 verify；改 notes/implemented，或新增说“取代/部分取代”的 Note 后。
// 为什么：2026-10-30 notes 分诊发现“新文说取代、旧文没有回链”是反复出现的漂移形状——
//   旧文仍以现行口吻留在 implemented，读者会照旧行动。写侧规则住 notes/README §五；
//   这条门禁只守一条可机械判的硬项：**implemented 旧文必须出现取代者的文件名**。
//   archived 目标豁免（冻结层不回写，由新 Note 单侧承载）。
// 判据：扫 notes/implemented/*.md 中含“取代”的行；若该行链接另一篇 implemented Note，
//   目标全文必须出现源文件名（`YYYY-MM-DD-<slug>`）；否则红并点名 file:line → target。
// 负例留证 2026-10-30：新建 `notes/implemented/2026-10-30-zz-supersession-probe.md`，写
//   “**取代** [case-entry](./2026-10-30-cultivation-case-entry.md)”且目标不提该文件名
//   → `FAIL notes-supersession: …:5 → … 缺 \`2026-10-30-zz-supersession-probe\` 指针`；
//   删文件 → `PASS notes-supersession ×N（取代均有回链）`。
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { supersessionBacklinks } from '../../tools/lib/notes-audit.mjs'

export function run({ root, ok, fail }) {
  const dir = join(root, 'notes', 'implemented')
  if (!existsSync(dir)) { fail('notes-supersession', 'notes/implemented 不在盘上——取代回链无从检查'); return }
  const notes = []
  for (const file of readdirSync(dir).filter(name => name.endsWith('.md') && name !== 'README.md')) {
    try {
      notes.push({ file: `notes/implemented/${file}`, text: readFileSync(join(dir, file), 'utf8') })
    } catch (error) {
      fail('notes-supersession', `notes/implemented/${file} 读取失败：${String(error.message).slice(0, 120)}`)
      return
    }
  }
  if (notes.length === 0) { fail('notes-supersession', 'notes/implemented 为空——取代回链无从检查'); return }
  const missing = supersessionBacklinks(notes)
  missing.length === 0
    ? ok(`notes-supersession ×${String(notes.length)} 篇（取代均有回链）`)
    : fail('notes-supersession', missing
      .map(item => `${item.file}:${String(item.line)} → ${item.target} 缺 \`${basename(item.file, '.md')}\` 指针`)
      .join('；'))
}
