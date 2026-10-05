/**
 * 经营仪表（驾驶舱线 · 呈现叙事切片一）的读模型：动议台账表 → 面板行。
 *
 * 台账唯一事实家 = `kb/motion-ledger.md`（维护规矩见该文件头注——当轮收敛时维护者追加一行）；
 * 本模块只做**纯解析**（表行 → 领域行），渲染与文件读取分离。keyless 单测 = `tests/company/ledger.spec.ts`。
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
const HEADER = ['slug', '日期', '类型', '参与', '墙钟', '成品', '一句话结论']

/**
 * 解析台账 markdown 表。容错规则：跳过非表行；列数不符的行跳过（不猜）；表头不符返回空
 * （台账被改坏时面板显示空态而不是渲染错行——fail-loud 留给文件级校验，解析侧宁可少渲染）。
 * @param text - `kb/motion-ledger.md` 全文。
 * @returns 台账行（保持文件顺序 = 时间顺序）。
 */
export function parseMotionLedger(text: string): readonly MotionRow[] {
  const lines = text.split('\n')
  let headerSeen = false
  const rows: MotionRow[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined).split('|').map(cell => cell.trim())
    if (!headerSeen) {
      if (cells.length === HEADER.length && HEADER.every((name, i) => cells[i] === name)) headerSeen = true
      continue
    }
    if (cells.every(cell => /^[-: ]*$/.test(cell))) continue // 分隔行
    if (cells.length !== HEADER.length) continue
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
  return rows
}

/** 统计：总场数 / 成品数 / 未记墙钟数（面板头部的三个数）。 */
export function ledgerStats(rows: readonly MotionRow[]): { total: number; finals: number; untimed: number } {
  return {
    total: rows.length,
    finals: rows.filter(row => row.final.includes('✅')).length,
    untimed: rows.filter(row => row.wallClock === '未记' || row.wallClock === '—').length,
  }
}
