// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { parseMarkdownAst } from '../../tools/lib/core/markdown-links.mjs'

// ── 2c-bis-2. 文档层规范门禁（doc-taxonomy，2026-10-09 N1 立；2026-11-10 DSH 步 2 改；2026-11-27 扩架构层与单向依赖）──
// 为什么：docs/ 有地图（README.md）但**没有分层规矩的家**——「哪层放什么」写在 README §文档组织原则里
// （表只有「性质」列，没有「不属于这层」列），而 DSH docs/AGENTS.md 的 tier 表**必须有一列说反例**
// （"Does NOT belong there"）：只写正向职责，边界就靠读的人自己猜，实测后果 = docs/design/ 长出
// 「动工前的设计决策记录」（已落地决定的叙述留在设计层，正是 tier 表说该归 Note 的那一格）。
//
// 2026-11-10（DSH 步 2）：文档入口从“逐文档登记”改成“书架 + 入口”（树就是 inventory）。
// 2026-11-27（16 文件标准骨架收口）：统一为顶层 6 文件 + 三分区（contracts/、guides/、reference/），
// 目录深度上限 2 且分区内禁建子 README.md；禁止 `docs/` 出现指向 `_backlog/` 的 Markdown 链接。
// 本门禁守六件事：
// ① docs/AGENTS.md 在场且带「不属于这层」列（分层的**反例半边**不许丢）；
// ② **顶层门/宪法**（docs/*.md，除 README.md）必须在 docs/README.md 书架逐项列出；
// ③ **tier 文档**（contracts/guides/reference/）只要求 tier 目录被 docs/README.md 链接，不逐份登记；
//    任何 docs/ 下的 md 不在三分区或顶层 → 红（防新层长歪）；
// ④ 目录深度 ≤ 2（禁止 `docs/<tier>/<sub>/<file>.md`）且分区内禁止子 `README.md`；
// ⑤ `docs/**/*.md`（AST 扫描 link/definition/image）不得出现指向 `_backlog/` 的相对 Markdown 链接。
// 负例留证（实跑，红→还原→绿）：
// ① `docs/zz-taxonomy-probe.md` → `FAIL … 顶层门/宪法未在 docs/README.md 书架列出：zz-taxonomy-probe.md`；删 → 绿。
// ② `docs/zz-tier/zz.md` → `FAIL … 不在 tier 目录（contracts/guides/reference）或顶层：zz-tier/zz.md`；删 → 绿。
// ③ 从 docs/README.md 删 `[contracts/](./contracts/)` → `FAIL … tier 目录未在 docs/README.md 书架链接：contracts`；还原 → 绿。
// ④ `docs/contracts/sub/deep.md` 或 `docs/contracts/README.md` → `FAIL … 超过最大深度 2 / 分区目录禁止子 README.md`；删 → 绿。
// ⑤ 2026-11-27：`docs/README.md` 临时植入 `[probe](../_backlog/README.md)` → `FAIL doc-taxonomy: docs/README.md:… → 禁止 docs/ 链接 _backlog/…`；删 → 绿。
// 旧负例仍有效：删 docs/AGENTS.md / 删「不属于这层」表头 → 红。
const TIER_DIRS = new Set(['contracts', 'guides', 'reference'])

function visitAst(node, fn) {
  fn(node)
  for (const child of node.children ?? []) visitAst(child, fn)
}

function backlogLinkViolations(root, docsFiles) {
  const backlogRoot = resolve(root, '_backlog')
  const backlogPrefix = `${backlogRoot}${sep}`
  const hits = []
  for (const rel of docsFiles) {
    const fullPath = join(root, 'docs', rel)
    const tree = parseMarkdownAst(readFileSync(fullPath, 'utf8'))
    visitAst(tree, (node) => {
      if (node.type !== 'link' && node.type !== 'definition' && node.type !== 'image') return
      const url = node.url
      if (typeof url !== 'string' || url.startsWith('/') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return
      let cleanPath
      try {
        cleanPath = decodeURIComponent(url.split('#')[0].split('?')[0])
      } catch {
        return
      }
      if (cleanPath === '') return
      const target = resolve(dirname(fullPath), cleanPath)
      if (target === backlogRoot || target.startsWith(backlogPrefix)) {
        const line = node.position?.start?.line ?? 1
        hits.push(`docs/${rel}:${String(line)} → 禁止 docs/ 链接 _backlog/（${url}；_backlog 为上游探索区，重要结论请先升格 notes/ 再引用）`)
      }
    })
  }
  return hits
}

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
  const indexPath = join(root, 'docs/README.md')
  if (!existsSync(indexPath)) {
    fail('doc-taxonomy', 'docs/README.md 缺失——docs/ 总入口与书架不许消失')
    return
  }
  const indexForDocs = readFileSync(indexPath, 'utf8')
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
  const docs = allDocsMd.filter(rel => rel !== 'README.md')
  const topLevel = docs.filter(rel => !rel.includes('/'))
  const tierDocs = docs.filter(rel => rel.includes('/'))
  const unregisteredTop = topLevel
    .filter(rel => !indexForDocs.includes(`./${rel}`) && !indexForDocs.includes(`](${rel})`))
    .sort()
  const stray = tierDocs
    .filter(rel => !TIER_DIRS.has(rel.split('/')[0]))
    .sort()
  const tooDeep = tierDocs
    .filter(rel => TIER_DIRS.has(rel.split('/')[0]) && rel.split('/').length > 2)
    .sort()
  const subReadmes = tierDocs
    .filter(rel => TIER_DIRS.has(rel.split('/')[0]) && rel.endsWith('/README.md'))
    .sort()
  // 只认“目录链接”（目标以 / 结尾），不认 ./contracts/foo.md 这类文件链接的子串。
  const linkedTiers = new Set([...TIER_DIRS].filter(tier =>
    indexForDocs.includes(`](./${tier}/)`) || indexForDocs.includes(`](${tier}/)`) || indexForDocs.includes(`](${tier})`)))
  const unlinkedTiers = [...new Set(tierDocs.map(rel => rel.split('/')[0]))]
    .filter(tier => TIER_DIRS.has(tier) && !linkedTiers.has(tier))
    .sort()
  if (unregisteredTop.length) {
    docTaxProblems.push(`顶层门/宪法未在 docs/README.md 书架列出：${unregisteredTop.join('、')}`)
  }
  if (stray.length) {
    docTaxProblems.push(`这些 docs/ 文件不在 tier 目录（contracts/guides/reference）或顶层：${stray.join('、')}`)
  }
  if (tooDeep.length) {
    docTaxProblems.push(`这些 docs/ 文件超过最大深度 2（须平铺在 contracts/guides/reference 下）：${tooDeep.join('、')}`)
  }
  if (subReadmes.length) {
    docTaxProblems.push(`分区目录禁止子 README.md（目录树即清单）：${subReadmes.join('、')}`)
  }
  if (unlinkedTiers.length) {
    docTaxProblems.push(`tier 目录未在 docs/README.md 书架链接：${unlinkedTiers.join('、')}`)
  }
  docTaxProblems.push(...backlogLinkViolations(root, allDocsMd))
  docTaxProblems.length === 0
    ? ok(`doc-taxonomy（分层规矩在场 + ${topLevel.length} 顶层门/宪法 + ${tierDocs.length} tier 文档由目录承载 + 零 _backlog 链接）`)
    : fail('doc-taxonomy', docTaxProblems.join('；'))
}
