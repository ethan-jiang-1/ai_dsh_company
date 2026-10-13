// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c-bis-2. 文档层规范门禁（doc-taxonomy，2026-10-09 N1 立）─────────────────────
// 为什么：docs/ 有地图（index.md）但**没有分层规矩的家**——「哪层放什么」写在 index §文档组织原则里
// （表只有「性质」列，没有「不属于这层」列），而 DSH docs/AGENTS.md 的 tier 表**必须有一列说反例**
// （"Does NOT belong there"）：只写正向职责，边界就靠读的人自己猜，实测后果 = docs/design/ 长出
// 「动工前的设计决策记录」（已落地决定的叙述留在设计层，正是 tier 表说该归 Note 的那一格）。
// 本门禁守两件事：① docs/AGENTS.md 在场且带「不属于这层」列（分层的**反例半边**不许丢）；
// ② docs/ 下每个 .md 都在 index §现有文档 登记（实测漏登 2 份：cdp-probe / runtime-map）。
// 负例留证（实跑，红→还原→绿）：① 删 docs/AGENTS.md → 红；② 删「不属于这层」表头 → 红；
// ③ 新建一个未登记的 docs/*.md → 红（点名该文件）→ 还原 → 绿。
export function run({ root, ok, fail }) {
  const taxonomyPath = join(root, 'docs/AGENTS.md')
  const docTaxProblems = []
  if (!existsSync(taxonomyPath)) {
    docTaxProblems.push('docs/AGENTS.md 缺失——docs/ 分层规矩没有家（规矩会散回 index 与各文件的散文里）')
  } else {
    const taxonomy = readFileSync(taxonomyPath, 'utf8')
    if (!taxonomy.includes('不属于这层')) {
      docTaxProblems.push('docs/AGENTS.md 的 tier 表缺「不属于这层」列——只写正向职责则边界靠猜（DSH tier 表的反例半边）')
    }
  }
  const indexForDocs = readFileSync(join(root, 'docs/index.md'), 'utf8')
  const allDocsMd = []
  const walkDocs = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const next = join(dir, entry.name)
      const relNext = rel ? `${rel}/${entry.name}` : entry.name
      if (entry.isDirectory()) walkDocs(next, relNext)
      else if (entry.name.endsWith('.md')) allDocsMd.push(relNext)
    }
  }
  walkDocs(join(root, 'docs'), '')
  const unregistered = allDocsMd
    .filter(rel => rel !== 'index.md')
    .filter(rel => !indexForDocs.includes(`./${rel}`) && !indexForDocs.includes(`](${rel})`))
    .sort()
  if (unregistered.length) {
    docTaxProblems.push(`这些 docs/ 文件未在 index.md §现有文档 登记（登记是路由，一件一行）：${unregistered.join('、')}`)
  }
  docTaxProblems.length === 0
    ? ok(`doc-taxonomy（分层规矩在场 + ${allDocsMd.length} 份 docs 全登记）`)
    : fail('doc-taxonomy', docTaxProblems.join('；'))
}
