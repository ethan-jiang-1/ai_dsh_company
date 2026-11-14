// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
// 何时跑：pnpm verify（每次）；改 docs/reference/decisions.md 或本门禁判据后跑 pnpm test:checks。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { headingSections, structuralLines } from '../../tools/lib/repo-markdown.mjs'

// ── 2c-bis. 决策台账路由门禁（ledger-routing，2026-10-09 D36 立；2026-11-14 扩双表+锚点+表外控长）──
// 为什么：
//   1. D36（2026-10-09）：台账曾长成 8.8KB 第三本账（最长单行 644 字，16 行无可解析家），故降级为
//      纯路由表（D 号 → 一句话 ≤100 字 → 可解析家链接），决定正文归各自 Note / 合同。
//   2. 跨仓对齐（2026-11-14）：
//      - 拆为「## 现行决定」+「## 已退役」双表，现行表禁残留删除线 `~~` 或 `已退役`/`**历史**`，消除废止项扫读噪音；
//      - 每行首列强制 `<a id="dN"></a>DN` 行级锚点（合并行双锚点，禁前导零），跨两表检验 D1..Dmax 唯一且连续不断档；
//      - 解除 doc-budget 对本文件的逐行死卡（曾逼出 6 次 `+1` 改门禁与跳过新 D 号），改由本门锁死单 H1 + 双 H2、
//        禁代码块/块级 HTML/frontmatter/H3+、表外散文 ≤10 行 + 单格 ≤100 字（含行尾闭合竖线校验）。
// 负例留证（实跑，红→还原→绿）：
//   - 2026-10-09：① 一句话 >100 字 → 红；② 家格无可解析链接 → 红；③ 删表头行 → 红；④ 四列（含漏尾竖线四列） → 红。
//   - 2026-11-14：⑤ 旧单表无双节/无锚点 → `FAIL ledger-routing: 二级标题须依次为「## 现行决定」「## 已退役」（实为：无）`；
//     ⑥ 现行表植入 `~~旧方案~~`（及首稿第 41 行误含「现行/已退役」）→ `FAIL ledger-routing: 「## 现行决定」含删除线或已退役/历史残留…：第 10 行`；
//     ⑦ 去掉 `<a id="d1"></a>` → `FAIL ledger-routing: D1–D61 编号断档…：缺 D1；首列须带匹配的行锚点 <a id="dN"></a>DN：第 10 行`；
//     ⑧ 表外散文加至 11 行 + 单格 105 字 → `FAIL ledger-routing: 表外散文 11 行超上限 10 行（第 14 行起…）；「一句话」须非空且 ≤ 100 字符…：第 20 行（105 字符）`；
//     ⑨ 正当追加合法 `<a id="d62"></a>D62` 不改任何门禁文件 → `PASS ledger-routing（现行 ×55 + 已退役 ×5，D1–D62…）` + `verify: ALL PASS`；还原后绿。
export const LEDGER_CELL_MAX = 100
export const LEDGER_MAX_PROSE_LINES = 10
export const LEDGER_MIN_ACTIVE_ROWS = 20
export const LEDGER_MIN_RETIRED_ROWS = 3

const LEDGER_REL = 'docs/reference/decisions.md'
const LEDGER_DIR = 'docs/reference'
const EXPECTED_SECTIONS = ['现行决定', '已退役']
const ALLOWED_SECTION_FRAGMENTS = new Set(EXPECTED_SECTIONS)
const LEDGER_HEADER = /^\|\s*#\s*\|\s*一句话\s*\|\s*决定的家\s*\|\s*$/
const LEDGER_SEPARATOR = /^\|(?:\s*-{3,}\s*\|){3}\s*$/
const ACTIVE_FORBIDDEN = /~~|已退役|\*\*历史\*\*/

function splitTableCells(line) {
  return line.trim().split(/(?<!\\)\|/).map(cell => cell.trim())
}

function parseIdCell(idCell) {
  const anchors = [...idCell.matchAll(/<a id="d([1-9]\d*)"><\/a>/g)].map(m => Number(m[1]))
  const rest = idCell.replace(/<a id="d[1-9]\d*"><\/a>/g, '').trim()
  if (!/^D[1-9]\d*(?:\+D[1-9]\d*)*$/.test(rest)) return null
  const numbers = [...rest.matchAll(/D([1-9]\d*)/g)].map(m => Number(m[1]))
  if (anchors.length !== numbers.length || anchors.some((a, i) => a !== numbers[i])) return null
  for (let i = 1; i < numbers.length; i += 1) {
    if (numbers[i] <= numbers[i - 1]) return null
  }
  return numbers
}

export function ledgerRoutingProblems(root) {
  const fullPath = join(root, LEDGER_REL)
  if (!existsSync(fullPath)) {
    return { problems: [`${LEDGER_REL} 不在盘上——决策台账路由表不许消失`], activeCount: 0, retiredCount: 0 }
  }
  const text = readFileSync(fullPath, 'utf8')
  const lines = structuralLines(text)
  const allHeadings = headingSections(text)
  const h1Sections = allHeadings.filter(h => h.depth === 1)
  const h2Sections = allHeadings.filter(h => h.depth === 2)
  const deepHeadings = allHeadings.filter(h => h.depth >= 3)

  const problems = []

  // 1. 禁非结构块（围栏/缩进代码块、块级 HTML、YAML frontmatter）与标题层级漂移，锁死表外膨胀通道
  const nonStructural = lines.filter(item => !item.structural)
  if (nonStructural.length > 0) {
    problems.push(`台账只放路由表与极薄说明，不许出现代码块、块级 HTML 或 frontmatter（第 ${String(nonStructural[0].lineNumber)} 行起）`)
  }
  if (h1Sections.length !== 1) {
    problems.push(`一级标题须恰好 1 个（实为 ${String(h1Sections.length)} 个）`)
  }
  if (deepHeadings.length > 0) {
    problems.push(`台账不许出现三级及以下标题（第 ${deepHeadings.map(h => String(h.startLine)).join('、')} 行）`)
  }

  const allowedHeadingLines = new Set([
    ...h1Sections.slice(0, 1).map(h => h.startLine),
    ...h2Sections.map(h => h.startLine),
  ])

  const proseLines = lines.filter(item => {
    if (!item.structural) return false
    const trimmed = item.text.trim()
    if (trimmed === '' || allowedHeadingLines.has(item.lineNumber)) return false
    return !trimmed.startsWith('|')
  })
  if (proseLines.length > LEDGER_MAX_PROSE_LINES) {
    problems.push(`表外散文 ${String(proseLines.length)} 行超上限 ${String(LEDGER_MAX_PROSE_LINES)} 行（第 ${String(proseLines[LEDGER_MAX_PROSE_LINES].lineNumber)} 行起——台账只放路由表与极薄说明）`)
  }

  // 2. 必须且只能由「## 现行决定」「## 已退役」两节承载表格
  const titles = h2Sections.map(sec => sec.title)
  if (titles.length !== EXPECTED_SECTIONS.length || titles.some((t, i) => t !== EXPECTED_SECTIONS[i])) {
    problems.push(`二级标题须依次为「## 现行决定」「## 已退役」（实为：${titles.length ? titles.join(' / ') : '无'}）`)
    return { problems, activeCount: 0, retiredCount: 0 }
  }

  const firstH2Line = h2Sections[0].startLine
  const strayBeforeH2 = lines.find(item => item.structural && item.lineNumber < firstH2Line && item.text.trim().startsWith('|'))
  if (strayBeforeH2) {
    problems.push(`第 ${String(strayBeforeH2.lineNumber)} 行在「## 现行决定」之前出现表格行`)
  }

  const malformed = []
  const badAnchor = []
  const tooLong = []
  const activeDirty = []
  const noHome = []
  const orderProblems = []
  const seenNumbers = new Map()
  const duplicateProblems = []
  const fragmentRefs = []
  const rowCounts = { 现行决定: 0, 已退役: 0 }

  for (const sec of h2Sections) {
    const secLines = lines.slice(sec.startLine, sec.endLine).filter(item => item.structural)
    const headerIdx = secLines.findIndex(item => LEDGER_HEADER.test(item.text))
    if (headerIdx === -1) {
      problems.push(`「## ${sec.title}」缺表头「| # | 一句话 | 决定的家 |」——表头是形状锚`)
      continue
    }
    const sepItem = secLines[headerIdx + 1]
    if (!sepItem || !LEDGER_SEPARATOR.test(sepItem.text)) {
      const at = sepItem ? sepItem.lineNumber : secLines[headerIdx].lineNumber + 1
      problems.push(`「## ${sec.title}」表头下一行不是三列分隔行（第 ${String(at)} 行）`)
      continue
    }

    const beforeHeaderPipe = secLines.slice(0, headerIdx).find(item => item.text.trim().startsWith('|'))
    if (beforeHeaderPipe) {
      problems.push(`「## ${sec.title}」表头之前有游离管道行（第 ${String(beforeHeaderPipe.lineNumber)} 行）`)
    }

    // 连续数据行：防止表内空行把 GFM 表格静默切成两半
    let endIdx = headerIdx + 2
    while (endIdx < secLines.length && secLines[endIdx].text.trim().startsWith('|')) {
      endIdx += 1
    }
    const tableRows = secLines.slice(headerIdx + 2, endIdx)
    const strayPipe = secLines.slice(endIdx).find(item => item.text.trim().startsWith('|'))
    if (strayPipe) {
      problems.push(`「## ${sec.title}」表内出现空行或表尾有游离管道行（第 ${String(strayPipe.lineNumber)} 行）`)
    }

    rowCounts[sec.title] = tableRows.length
    const minRows = sec.title === '现行决定' ? LEDGER_MIN_ACTIVE_ROWS : LEDGER_MIN_RETIRED_ROWS
    if (tableRows.length < minRows) {
      problems.push(`「## ${sec.title}」只解析到 ${String(tableRows.length)} 行（< ${String(minRows)}）——台账被削或行形状被改坏`)
    }

    let previous = 0
    for (const row of tableRows) {
      const no = row.lineNumber
      const cells = splitTableCells(row.text)
      const closedLeft = cells[0] === ''
      const closedRight = cells.length > 1 && cells[cells.length - 1] === ''
      if (cells.length !== 5 || !closedLeft || !closedRight) {
        const start = closedLeft ? 1 : 0
        const end = closedRight ? cells.length - 1 : cells.length
        const colCount = Math.max(0, end - start)
        const tailNote = !closedRight ? '，缺行尾闭合竖线' : ''
        malformed.push(`第 ${String(no)} 行（${String(colCount)} 列${tailNote}）`)
        continue
      }
      const [, idCell, summary, home] = cells
      const numbers = parseIdCell(idCell)
      if (!numbers) {
        badAnchor.push(`第 ${String(no)} 行`)
      } else {
        if (numbers[0] <= previous) {
          orderProblems.push(`「## ${sec.title}」第 ${String(no)} 行（D${String(numbers[0])} 排在 D${String(previous)} 之后）`)
        } else {
          previous = numbers[0]
        }
        for (const n of numbers) {
          const prevLine = seenNumbers.get(n)
          if (prevLine !== undefined) {
            duplicateProblems.push(`D${String(n)}（第 ${String(prevLine)} 行与第 ${String(no)} 行）`)
          } else {
            seenNumbers.set(n, no)
          }
        }
      }

      if (summary.length === 0 || summary.length > LEDGER_CELL_MAX) {
        tooLong.push(`第 ${String(no)} 行（${String(summary.length)} 字符）`)
      }
      if (sec.title === '现行决定' && ACTIVE_FORBIDDEN.test(summary)) {
        activeDirty.push(`第 ${String(no)} 行`)
      }

      const rawTargets = [...home.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]).filter(p => !/^https?:/.test(p))
      const filePaths = []
      for (const target of rawTargets) {
        if (target.startsWith('#')) {
          fragmentRefs.push({ fragment: target.slice(1), line: no })
          continue
        }
        const cleanPath = decodeURIComponent(target.split('#')[0].split('?')[0])
        if (cleanPath !== '') filePaths.push(cleanPath)
      }
      const allResolvable = filePaths.length > 0 && filePaths.every(
        p => existsSync(join(root, LEDGER_DIR, p)) || existsSync(join(root, p)),
      )
      if (!allResolvable) noHome.push(`第 ${String(no)} 行`)
    }
  }

  if (duplicateProblems.length) {
    problems.push(`D 号跨表必须全局唯一，出现重复：${duplicateProblems.join('、')}`)
  }
  if (seenNumbers.size > 0) {
    const maxD = Math.max(...seenNumbers.keys())
    const missing = []
    for (let n = 1; n <= maxD; n += 1) {
      if (!seenNumbers.has(n)) missing.push(`D${String(n)}`)
    }
    if (missing.length) {
      problems.push(`D1–D${String(maxD)} 编号断档（退役请移入「## 已退役」，不删号不跳号）：缺 ${missing.join('、')}`)
    }
    const brokenFragments = fragmentRefs
      .filter(({ fragment }) => {
        if (ALLOWED_SECTION_FRAGMENTS.has(fragment)) return false
        if (/^d[1-9]\d*$/.test(fragment)) return !seenNumbers.has(Number(fragment.slice(1)))
        return true
      })
      .map(({ fragment, line }) => `第 ${String(line)} 行 → #${fragment}`)
    if (brokenFragments.length) {
      problems.push(`台账内部锚点引用不存在或格式非法：${brokenFragments.join('、')}`)
    }
  }
  if (orderProblems.length) problems.push(`各表内部编号必须严格递增：${orderProblems.join('、')}`)
  if (malformed.length) problems.push(`行必须是闭合三列（| # | 一句话 | 决定的家 |）：${malformed.join('、')}`)
  if (badAnchor.length) problems.push(`首列须带匹配的行锚点 <a id="dN"></a>DN（无前导零）：${badAnchor.join('、')}`)
  if (tooLong.length) problems.push(`「一句话」须非空且 ≤ ${String(LEDGER_CELL_MAX)} 字符（决定正文归 Note，本表只路由）：${tooLong.join('、')}`)
  if (activeDirty.length) problems.push(`「## 现行决定」含删除线或已退役/历史残留（废止项移入「## 已退役」，现行项只写当前有效口径）：${activeDirty.join('、')}`)
  if (noHome.length) problems.push(`「决定的家」缺可解析文件链接或目标不存在（决定的唯一住处不许是本表）：${noHome.join('、')}`)

  return {
    problems,
    activeCount: rowCounts.现行决定,
    retiredCount: rowCounts.已退役,
    totalIds: seenNumbers.size,
  }
}

export function run({ root, ok, fail }) {
  const { problems, activeCount, retiredCount, totalIds } = ledgerRoutingProblems(root)
  problems.length === 0
    ? ok(`ledger-routing（现行 ×${String(activeCount)} + 已退役 ×${String(retiredCount)}，D1–D${String(totalIds)} 锚点连续唯一，每格 ≤${String(LEDGER_CELL_MAX)} 字、表外散文 ≤${String(LEDGER_MAX_PROSE_LINES)} 行、家全可解析）`)
    : fail('ledger-routing', problems.join('；'))
}
