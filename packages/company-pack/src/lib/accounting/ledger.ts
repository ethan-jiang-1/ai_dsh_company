/**
 * 经营仪表（驾驶舱线 · 呈现叙事切片一）的读模型：动议台账表 → 面板行。
 *
 * 台账唯一事实家 = `kb/motion-ledger.md`（维护规矩见该文件头注——当轮收敛时维护者追加一行）；
 * 本模块只做**纯解析**（表行 → 领域行），渲染与文件读取分离。keyless 单测 = `tests/lib/accounting/ledger.spec.ts`。
 */

/** 一场动议的台账行。 */
export interface MotionRow {
  readonly slug: string
  readonly date: string
  readonly kind: string
  readonly roles: string
  /** 真跑墙钟（未记/— 原样保留）。 */
  readonly wallClock: string
  /** 成品态（✅ = final.md 已 present；— = 无成品〔口径问答类〕）。 */
  readonly final: string
  readonly summary: string
}

/** 表头列名（顺序即解析顺序；台账表头的唯一权威形态）。 */
const HEADER = ['slug', 'date', 'type', 'participants', 'wallClock', 'deliverable', 'summary']
/** Legacy header (read-only for old company disks); canonical is HEADER above. */
const LEGACY_HEADER = ['slug', '日期', '类型', '参与', '墙钟', '成品', '一句话结论']
const HEADERS = [HEADER, LEGACY_HEADER]

/** 一行被跳过的原因（当前只有列数不符；保留联合以便将来扩「日期格式坏」等）。 */
export type LedgerBadReason = 'cell-count'

/** 被跳过的表行：**必须能被面板说出来**（BUG-303：静默丢行 = 台账少报）。 */
export interface LedgerBadRow {
  /** 文件内行号（1 起，便于人去点）。 */
  readonly line: number
  /** 单元格数（用于文案「期望 7 列、实际 8 列」）。 */
  readonly cells: number
  readonly reason: LedgerBadReason
}

/** 解析结果：行 + 坏行 + 表头诊断（`rows` 的「少」才有解释）。 */
export interface MotionLedgerParse {
  readonly rows: readonly MotionRow[]
  readonly badRows: readonly LedgerBadRow[]
  /**
   * 表头是否对得上（两种口径之一）。false = 表里出现了行但表头不认识——
   * 面板必须说「表头不符」，不能显示「共 0 场」假装台账是空的（BUG-311）。
   */
  readonly headerOk: boolean
}

/**
 * 解析台账 markdown 表。容错规则：跳过非表行；列数不符的行**跳过但要记账**（不猜，也不静默）；
 * 表头不符返回空（台账被改坏时面板显示空态而不是渲染错行）。
 * @param text - `kb/motion-ledger.md` 全文。
 * @returns 行（保持文件顺序）与被跳过的坏行（BUG-303）。
 */
export function parseMotionLedger(text: string): MotionLedgerParse {
  const lines = text.split('\n')
  let headerSeen = false
  const rows: MotionRow[] = []
  const badRows: LedgerBadRow[] = []
  let headerOk = true
  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined).split('|').map(cell => cell.trim())
    if (!headerSeen) {
      if (HEADERS.some(header => cells.length === header.length && header.every((name, i) => cells[i] === name))) headerSeen = true
      continue
    }
    if (cells.every(cell => /^[-: ]*$/.test(cell))) continue // 分隔行
    if (cells.length !== HEADER.length) {
      // 坏行不能静默消失：面板据此说「跳过 N 行（格式不符）」，否则 4 行文件声称只有 2 场动议。
      badRows.push({ line: index + 1, cells: cells.length, reason: 'cell-count' })
      continue
    }
    rows.push({
      slug: cells[0]!,
      date: cells[1]!,
      kind: cells[2]!,
      roles: cells[3]!,
      wallClock: cells[4]!,
      final: cells[5]!,
      summary: cells[6]!,
    })
  }
  // 出现过表行（以 `|` 开头）却一个表头都没认出来 ⇒ 表头不符，而不是「台账空」。
  if (!headerSeen && lines.some(line => line.trim().startsWith('|'))) headerOk = false
  return { rows, badRows, headerOk }
}

/** 统计：总场数 / 成品数 / 未记墙钟数（面板头部的三个数）。 */
export function ledgerStats(rows: readonly MotionRow[]): { total: number; finals: number; untimed: number } {
  return {
    total: rows.length,
    finals: rows.filter(row => row.final.includes('✅')).length,
    untimed: rows.filter(row => row.wallClock === 'untimed' || row.wallClock === '未记' || row.wallClock === '—').length,
  }
}
