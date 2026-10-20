// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ── 2c-bis. 决策台账路由门禁（ledger-routing，2026-10-09 D36 立）────────────────
// 为什么：docs/decisions.md 的 D 台账（2026-10-20 自 index 迁出）曾是**第三本账**——D34 以「内容 100% 派生自 Note 状态行 +
// 胖行病史 + 违反上游 no-index 教义」退役 intents.md，而台账是同一个病的主犯（实测 33 行 8.8KB，
// 最长行 644 字符，D1–D17 共 16 行**没有任何可解析的家**——决定的唯一住处就是那张表）。
// 处置与 D34 同款：降级为**纯路由表**（D 号 → 一句话 → 链接），决定正文归各自 Note。
// 本门禁挡住回潮——没有它，「一句话」会再次长回段落。
// 负例留证（实跑，红→还原→绿）：① 任一行「一句话」超过 100 字符 → 红；② 任一行「家」格无
// 可解析链接/路径 → 红；③ 删表头行 → 红；④ 把某行加成四列 → 红。四例均还原即绿。
// ⚠ 形状守卫必须锚定表头：首版只查「行数 ≥ 20」是**假守卫**——数据行的正则与表头无关，删掉表头
//   照样 34 行全解析、门禁全绿。红 C 实证该漏洞后改为「表头在场 + 表头下面才是数据行 + 恰三列」。
export function run({ root, ok, fail }) {
  const LEDGER_CELL_MAX = 100
  const LEDGER_MIN_ROWS = 20
  const LEDGER_HEADER = /^\|\s*#\s*\|\s*一句话\s*\|\s*决定的家\s*\|\s*$/
  const LEDGER_SEPARATOR = /^\|(?:\s*-{3,}\s*\|){3}\s*$/
  const dataRow = /^\|\s*(D\d+(?:\+D\d+)?)\s*\|(.*)\|\s*$/
  const indexLines = readFileSync(join(root, 'docs/decisions.md'), 'utf8').split('\n')
  const headerAt = indexLines.findIndex(line => LEDGER_HEADER.test(line))
  const problems = []
  if (headerAt === -1) {
    problems.push('找不到台账表头「| # | 一句话 | 决定的家 |」——表头是本门禁的形状锚，删了它下面的行就不再是台账')
  } else if (!LEDGER_SEPARATOR.test(indexLines[headerAt + 1] ?? '')) {
    problems.push(`台账表头下一行不是三列分隔行（第 ${headerAt + 2} 行）`)
  }
  // 数据行只从表头之后算起，防止别处的 | D 号 | 形式的表格蹭进来。
  const rows = headerAt === -1 ? [] : indexLines
    .slice(headerAt + 1)
    .map((line, i) => ({ line, no: headerAt + 2 + i }))
    .filter(({ line }) => dataRow.test(line))
  const tooLong = []
  const malformed = []
  const noHome = []
  for (const { line, no } of rows) {
    const cells = line.split('|').map(c => c.trim())
    // cells[0]/[cells.length-1] 为空段（来自行首尾的 |）⇒ 合法列数 = 5 段
    if (cells.length !== 5) {
      malformed.push(`第 ${no} 行（${cells.length - 2} 列）`)
      continue
    }
    const summary = cells[2]
    const home = cells[3]
    if (summary.length > LEDGER_CELL_MAX) tooLong.push(`第 ${no} 行（${summary.length} 字符）`)
    const targets = [...home.matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]).filter(p => !p.startsWith('http'))
    const resolvable = targets.some(p => existsSync(join(root, 'docs', p)) || existsSync(join(root, p)))
    if (targets.length === 0 || !resolvable) noHome.push(`第 ${no} 行`)
  }
  if (headerAt !== -1 && rows.length < LEDGER_MIN_ROWS) {
    problems.push(`表头之下只解析到 ${rows.length} 行（< ${LEDGER_MIN_ROWS}）——台账被削或行形状被改坏`)
  }
  problems.push(
    ...(malformed.length ? [`行必须是三列（# / 一句话 / 决定的家）：${malformed.join('、')}`] : []),
    ...(tooLong.length ? [`「一句话」超 ${LEDGER_CELL_MAX} 字符（决定正文归 Note，本表只路由）：${tooLong.join('、')}`] : []),
    ...(noHome.length ? [`「家」格无可解析链接（决定的唯一住处不许是本表）：${noHome.join('、')}`] : []),
  )
  problems.length === 0
    ? ok(`ledger-routing ×${rows.length}（表头锚在场，每行三列、一句话 ≤${LEDGER_CELL_MAX} 字符、家可解析）`)
    : fail('ledger-routing', problems.join('；'))
}
