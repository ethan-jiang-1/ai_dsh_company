/**
 * Markdown 文档的「结构行」判据（2026-11-14，BUG-160/162/168/169/172/176/181）。
 *
 * 为什么独立成模块：`/prd check` 与 `/req check` 是同一份文档的两个消费者，对「哪些行算文档结构」
 * 必须只有一个答案。此前两边各有一套行扫描（一个做了围栏状态、一个没有；一个做了 BOM/CRLF、
 * 一个没有），同一份 BOM/围栏文档在两边结论相反——操作员不知道该信哪边。
 *
 * 判据 = 平台差异归一（去 UTF-8 BOM、CRLF/lone-CR → LF）+ 三类「非结构」容器：
 * - 围栏代码块（三反引号 / 三波浪号，闭合要同族、不短于开启、关闭行无其它内容）：整块不算结构，
 *   同时作为顶层围栏块产出（info + content + 行号）——JSON 账本提取只认这个视图，示例围栏不再抢先；
 * - HTML 注释（`<!-- … -->`，可跨行）：注释片段从行文本里移除，行内其余内容仍是结构；
 *   行内代码 span 里的注释记号是字面文本；未闭合的注释要报出行号，不静默吞到 EOF；
 * - 行内代码 span（成对反引号，可跨行）：span 内的结构记号是字面文本；全文无闭合的反引号按字面处理。
 * 围栏里的 HTML 注释记号是字面文本，不参与注释状态（围栏优先）。
 */
export interface DocumentLine {
  /** 去掉 HTML 注释片段后的可见文本；围栏内的行保留原文。 */
  readonly text: string
  /** 能否用于结构解析：围栏内的行为 false；注释片段已从 `text` 移除。 */
  readonly structural: boolean
}

/** 一个顶层围栏块（围栏本身不算结构，但它的内容是有名字的载荷）。 */
export interface DocumentFence {
  /** 开围栏行的信息串（如 `json`、`markdown`）。 */
  readonly info: string
  /** 围栏内容（开/闭行之间，原样）。 */
  readonly content: string
  /** 开围栏行号（1-based）。 */
  readonly startLine: number
}

/** 结构扫描结果；`unclosedCommentLine` = 未闭合 HTML 注释的起始行（1-based）。 */
export interface DocumentScan {
  readonly lines: readonly DocumentLine[]
  readonly unclosedCommentLine?: number
  readonly fences: readonly DocumentFence[]
}

/**
 * 按 CommonMark 反斜杠转义切表格行（BUG-165/172）。
 *
 * 两条规则按顺序吃：`\\` 是字面反斜杠（吃掉两个字符），`\|` 是字面竖线（吃掉两个字符）；
 * 未转义的 `|` 才是列分隔。先判 `\|` 会把 `\\|` 吞进单元格，少切一列。
 * @param line - 一行表格文本（可带首尾竖线）。
 * @returns 单元格文本（已 trim，转义已还原）。
 */
export function splitTableRow(line: string): string[] {
  let body = line.trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|')) {
    let backslashes = 0
    let cursor = body.length - 2
    while (cursor >= 0 && body[cursor] === '\\') { backslashes += 1; cursor -= 1 }
    if (backslashes % 2 === 0) body = body.slice(0, -1)
  }
  const cells: string[] = []
  let cell = ''
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] ?? ''
    if (char === '\\' && body[index + 1] === '\\') { cell += '\\'; index += 1; continue }
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

/** 从 index 起连续反引号的个数（不是反引号 → 0）。 */
function backtickRun(line: string, index: number): number {
  let run = 0
  while (line[index + run] === '`') run += 1
  return run
}

/** 在后续行里找第一个包含 marker 的行号（1-based）；没有 → undefined。 */
function markerLine(source: readonly string[], offset: number, marker: string): number | undefined {
  for (let cursor = offset + 1; cursor < source.length; cursor += 1) {
    if ((source[cursor] ?? '').includes(marker)) return cursor + 1
  }
  return undefined
}

/**
 * 逐行产出结构视图（行数/行号与归一化后的文档一致）。
 * @param text - 文档全文（内部先归一化）。
 * @returns 每行的可见文本、结构标记、未闭合注释行号与顶层围栏块。
 */
export function scanDocumentDetailed(text: string): DocumentScan {
  const source = normalizeDocument(text).split('\n')
  const lines: DocumentLine[] = []
  const fences: DocumentFence[] = []
  let fence: { readonly char: string; readonly length: number; readonly info: string; readonly content: string[]; readonly startLine: number } | undefined
  let inComment = false
  let commentStart: number | undefined
  let spanUntil: number | undefined
  for (const [offset, raw] of source.entries()) {
    const lineNumber = offset + 1
    if (fence !== undefined) {
      lines.push({ text: raw, structural: false })
      const close = fenceAt(raw)
      if (close !== undefined && close.char === fence.char && close.length >= fence.length && close.rest.trim() === '') {
        fences.push({ info: fence.info, content: fence.content.join('\n'), startLine: fence.startLine })
        fence = undefined
      } else {
        fence.content.push(raw)
      }
      continue
    }
    if (spanUntil !== undefined) {
      lines.push({ text: raw, structural: false })
      if (lineNumber >= spanUntil) spanUntil = undefined
      continue
    }
    if (!inComment) {
      const open = fenceAt(raw)
      if (open !== undefined) {
        fence = { char: open.char, length: open.length, info: open.rest.trim(), content: [], startLine: lineNumber }
        lines.push({ text: raw, structural: false })
        continue
      }
    }
    let visible = ''
    let index = 0
    while (index < raw.length) {
      if (inComment) {
        const end = raw.indexOf('-->', index)
        if (end === -1) { index = raw.length; break }
        inComment = false
        commentStart = undefined
        index = end + 3
        continue
      }
      const run = backtickRun(raw, index)
      if (run > 0) {
        const marker = '`'.repeat(run)
        const close = raw.indexOf(marker, index + run)
        if (close !== -1) {
          visible += raw.slice(index, close + run)
          index = close + run
          continue
        }
        const later = markerLine(source, offset, marker)
        if (later !== undefined) spanUntil = later
        visible += raw.slice(index)
        index = raw.length
        continue
      }
      if (raw.startsWith('<!--', index)) {
        inComment = true
        commentStart = lineNumber
        index += 4
        continue
      }
      visible += raw[index] ?? ''
      index += 1
    }
    lines.push({ text: visible, structural: true })
  }
  return { lines, fences, ...(inComment && commentStart !== undefined ? { unclosedCommentLine: commentStart } : {}) }
}

/**
 * 结构扫描的短视图：只要行。
 * @param text - 文档全文。
 * @returns 每行的可见文本与结构标记。
 */
export function scanDocument(text: string): readonly DocumentLine[] {
  return scanDocumentDetailed(text).lines
}
