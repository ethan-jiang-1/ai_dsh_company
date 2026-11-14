/**
 * Markdown 文档的「结构行」判据（2026-11-14，BUG-160/162）。
 *
 * 为什么独立成模块：`/prd check` 与 `/req check` 是同一份文档的两个消费者，对「哪些行算文档结构」
 * 必须只有一个答案。此前两边各有一套行扫描（一个做了围栏状态、一个没有；一个做了 BOM/CRLF、
 * 一个没有），同一份 BOM/围栏文档在两边结论相反——操作员不知道该信哪边。
 *
 * 判据 = 平台差异归一（去 UTF-8 BOM、CRLF/lone-CR → LF）+ 两种非定义容器：
 * - 围栏代码块（三反引号 / 三波浪号，闭合要同族、不短于开启、关闭行无其它内容）：整块不算结构；
 * - HTML 注释（`<!-- … -->`，可跨行）：注释片段从行文本里移除，行内其余内容仍是结构。
 * 围栏里的 HTML 注释记号是字面文本，不参与注释状态（围栏优先）。
 */
export interface DocumentLine {
  /** 去掉 HTML 注释片段后的可见文本；围栏内的行保留原文。 */
  readonly text: string
  /** 能否用于结构解析：围栏内的行为 false；注释片段已从 `text` 移除。 */
  readonly structural: boolean
}

/**
 * 按未转义 `|` 切表格行；`\|` 还原为字面竖线（BUG-165）。
 *
 * Markdown 表格用 `\|` 表示单元格里的竖线；直接 `split('|')` 会把 `A \| B` 拆成两列，
 * 后续把 `B` 当 REQ id 报错——错误信息指向内容，实际是切分。
 * @param line - 一行表格文本（可带首尾竖线）。
 * @returns 单元格文本（已 trim，转义竖线已还原）。
 */
export function splitTableRow(line: string): string[] {
  let body = line.trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1)
  const cells: string[] = []
  let cell = ''
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] ?? ''
    if (char === '\\' && body[index + 1] === '|') { cell += '|'; index += 1; continue }
    if (char === '|') { cells.push(cell.trim()); cell = ''; continue }
    cell += char
  }
  cells.push(cell.trim())
  return cells
}

/**
 * 平台差异归一：去 UTF-8 BOM、CRLF 与孤立 CR → LF。
 * @param text - 原始文档文本。
 * @returns 归一化后的文本（行号不变）。
 */
export function normalizeDocument(text: string): string {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  return withoutBom.replace(/\r\n?/g, '\n')
}

/** 围栏开合行：最多 3 个前导空格 + 三连以上反引号/波浪号，后跟信息串。 */
function fenceAt(line: string): { readonly char: string; readonly length: number; readonly rest: string } | undefined {
  const match = /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line)
  if (match === null) return undefined
  const marker = match[1] ?? ''
  return { char: marker[0] ?? '`', length: marker.length, rest: match[2] ?? '' }
}

/**
 * 逐行产出结构视图（行数/行号与归一化后的文档一致）。
 * @param text - 文档全文（内部先归一化）。
 * @returns 每行的可见文本与结构标记。
 */
export function scanDocument(text: string): DocumentLine[] {
  const lines: DocumentLine[] = []
  let fence: { readonly char: string; readonly length: number } | undefined
  let inComment = false
  for (const raw of normalizeDocument(text).split('\n')) {
    if (fence !== undefined) {
      lines.push({ text: raw, structural: false })
      const close = fenceAt(raw)
      if (close !== undefined && close.char === fence.char && close.length >= fence.length && close.rest.trim() === '') {
        fence = undefined
      }
      continue
    }
    let visible = ''
    let index = 0
    while (index < raw.length) {
      if (inComment) {
        const end = raw.indexOf('-->', index)
        if (end === -1) { index = raw.length; break }
        inComment = false
        index = end + 3
        continue
      }
      const start = raw.indexOf('<!--', index)
      if (start === -1) { visible += raw.slice(index); break }
      visible += raw.slice(index, start)
      inComment = true
      index = start + 4
    }
    const open = fenceAt(visible)
    if (open !== undefined) {
      fence = { char: open.char, length: open.length }
      lines.push({ text: visible, structural: false })
      continue
    }
    lines.push({ text: visible, structural: true })
  }
  return lines
}
