/**
 * Markdown 文档形状的唯一实现（2026-11-14，单状态机收口）。
 *
 * 为什么是 .js：同一份判据要被 **pack（TS）** 与 **门禁（.mjs）** 同时消费；TS 侧只做类型包装，
 * 门禁直接 import 本文件。全文件仅保留单一扫描状态机 `scanDocumentDetailed`；`sectionRange` 与
 * `sectionStructuralText` 一律从 `scanDocumentDetailed` 的结构行视图派生，消除第二状态机分叉。
 */

const ASCII_PUNCTUATION = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/

/**
 * 按 CommonMark / GFM §4.10 反斜杠转义切表格行（BUG-165/172）。
 *
 * 两条规则按顺序吃：`\\` 是字面反斜杠（吃掉两个字符），`\|` 是字面竖线（吃掉两个字符）；
 * 未转义的 `|` 才是列分隔（GFM 表格在行内代码解析前切列）。
 * @param {string} line 一行表格文本（可带首尾竖线）。
 * @returns {string[]} 单元格文本（已 trim，转义已还原）。
 */
export function splitTableRow(line) {
  let body = line.trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|')) {
    let backslashes = 0
    let cursor = body.length - 2
    while (cursor >= 0 && body[cursor] === '\\') {
      backslashes += 1
      cursor -= 1
    }
    if (backslashes % 2 === 0) body = body.slice(0, -1)
  }
  const cells = []
  let cell = ''
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index] ?? ''
    if (char === '\\' && body[index + 1] === '\\') {
      cell += '\\'
      index += 1
      continue
    }
    if (char === '\\' && body[index + 1] === '|') {
      cell += '|'
      index += 1
      continue
    }
    if (char === '|') {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += char
  }
  cells.push(cell.trim())
  return cells
}

/**
 * 平台差异归一：去 UTF-8 BOM、CRLF 与孤立 CR → LF。
 * @param {string} text 原始文档文本。
 * @returns {string} 归一化后的文本（行号不变）。
 */
export function normalizeDocument(text) {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  return withoutBom.replace(/\r\n?/g, '\n')
}

/**
 * CommonMark §4.5 围栏开行：最多 3 个前导空格 + 三连以上反引号/波浪号；
 * 反引号围栏的信息串不得再含反引号（否则如 ```` ```foo``` ```` 属于行内代码）。
 * @param {string} line 单行文本。
 */
function openFenceAt(line) {
  const match = /^([ ]{0,3})(`{3,}|~{3,})(.*)$/.exec(line)
  if (match === null) return undefined
  const indent = (match[1] ?? '').length
  const marker = match[2] ?? ''
  const char = marker[0] ?? '`'
  const rest = match[3] ?? ''
  if (char === '`' && rest.includes('`')) return undefined
  return { char, length: marker.length, indent, rest }
}

function stripUpToSpaces(line, count) {
  let index = 0
  while (index < count && line[index] === ' ') index += 1
  return line.slice(index)
}

/** CommonMark §4.5 围栏闭行：最多 3 个前导空格 + 同字符且不少于开行长度 + 仅尾随空白。 */
function isClosingFence(line, fence) {
  const match = /^[ ]{0,3}(`{3,}|~{3,})\s*$/.exec(line)
  if (match === null) return false
  const marker = match[1] ?? ''
  return marker[0] === fence.char && marker.length >= fence.length
}

/** 计算行首空白列宽（空格=1，Tab 按 4 列制表位对齐）。 */
function leadingColumns(line) {
  let cols = 0
  for (let index = 0; index < line.length; index += 1) {
    const ch = line[index]
    if (ch === ' ') cols += 1
    else if (ch === '\t') cols += 4 - (cols % 4)
    else break
  }
  return cols
}

function isThematicBreak(line) {
  return /^[ ]{0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line)
}

/** 识别顶层列表项开头的正文缩进列宽（CommonMark §5.2）；非顶层列表项返回 0。 */
function topListContentIndent(line) {
  if (isThematicBreak(line)) return 0
  const match = /^([ ]{0,3})([-+*]|\d{1,9}[.)])(?:([ \t]+)(.*)|$)/.exec(line)
  if (match === null) return 0
  const prefixCols = (match[1] ?? '').length + (match[2] ?? '').length
  const spaces = match[3] ?? ''
  if (spaces === '' || (match[4] ?? '').trim() === '') return prefixCols + 1
  let spaceCols = 0
  for (let index = 0; index < spaces.length; index += 1) {
    spaceCols += spaces[index] === '\t' ? 4 - ((prefixCols + spaceCols) % 4) : 1
  }
  return spaceCols >= 5 ? prefixCols + 1 : prefixCols + spaceCols
}

/** 从 index 起连续反引号的个数（不是反引号 → 0）。 */
function backtickRun(line, index) {
  let run = 0
  while (line[index + run] === '`') run += 1
  return run
}

/** 在单行 from 起找**恰好等于** run 长度的反引号串起始下标（CommonMark §6.1）；无 → -1。 */
function exactBacktickClose(line, from, run) {
  for (let index = from; index < line.length; index += 1) {
    if (line[index] !== '`') continue
    const actual = backtickRun(line, index)
    if (actual === run) return index
    index += actual - 1
  }
  return -1
}

/**
 * 在当前段落后续行（遇空行或新围栏即止）找恰好等于 run 长度的闭合反引号行号（1-based）；
 * 兼顾 BUG-181 跨行 code span 与 CommonMark 段落边界（未闭合反引号不跨空行吞后文）。
 */
function multilineSpanCloseLine(source, offset, run) {
  for (let cursor = offset + 1; cursor < source.length; cursor += 1) {
    const line = source[cursor] ?? ''
    if (line.trim() === '' || openFenceAt(line) !== undefined) return undefined
    if (exactBacktickClose(line, 0, run) !== -1) return cursor + 1
  }
  return undefined
}

/**
 * 行内 HTML 注释（CommonMark §6.6）：仅在同一段落内存在 `-->` 时才构成注释；
 * 若直到空行/块边界/EOF 都无 `-->`（如卡片散文把 `<!--` 当字面示例），按字面文本保留，不吞后文。
 */
function inlineCommentClose(source, offset, fromCol) {
  const sameLine = (source[offset] ?? '').indexOf('-->', fromCol)
  if (sameLine !== -1) return { endOffset: offset, endCol: sameLine + 3 }
  for (let cursor = offset + 1; cursor < source.length; cursor += 1) {
    const line = source[cursor] ?? ''
    if (line.trim() === '' || openFenceAt(line) !== undefined || /^[ ]{0,3}#{1,6}(?:\s|$)/.test(line)) {
      return undefined
    }
    const end = line.indexOf('-->')
    if (end !== -1) return { endOffset: cursor, endCol: end + 3 }
  }
  return undefined
}

/** 识别文档首行起的紧凑 YAML frontmatter 结束行下标（无空行且含键值行，不误伤 `---` 分隔线）。 */
function frontmatterEndOffset(source) {
  if ((source[0] ?? '') !== '---') return -1
  let hasField = false
  for (let index = 1; index < source.length; index += 1) {
    const line = source[index] ?? ''
    if (line === '---') return hasField ? index : -1
    if (line.trim() === '') return -1
    if (/^[A-Za-z_][\w-]*\s*:/.test(line.trim())) hasField = true
  }
  return -1
}

/**
 * 逐行产出结构视图（行数/行号与归一化后的文档一致）。
 * @param {string} text 文档全文（内部先归一化）。
 * @returns {{ lines: { text: string, structural: boolean }[], fences: { info: string, content: string, startLine: number }[], unclosedCommentLine?: number }}
 */
export function scanDocumentDetailed(text) {
  const source = normalizeDocument(text).split('\n')
  const fmEnd = frontmatterEndOffset(source)
  const lines = []
  const fences = []
  let fence
  let inBlockComment = false
  let commentStart
  let inlineCommentUntil
  let spanUntil
  let inParagraph = false
  let inTable = false
  let listIndent = 0
  let inIndentedCode = false

  for (const [offset, raw] of source.entries()) {
    const lineNumber = offset + 1
    if (offset <= fmEnd) {
      lines.push({ text: raw, structural: false })
      inParagraph = false
      inTable = false
      listIndent = 0
      inIndentedCode = false
      continue
    }
    if (fence !== undefined) {
      lines.push({ text: raw, structural: false })
      if (isClosingFence(raw, fence)) {
        fences.push({ info: fence.info, content: fence.content.join('\n'), startLine: fence.startLine })
        fence = undefined
      } else {
        fence.content.push(stripUpToSpaces(raw, fence.indent))
      }
      inParagraph = false
      inTable = false
      inIndentedCode = false
      continue
    }
    if (inBlockComment) {
      lines.push({ text: '', structural: false })
      if (raw.includes('-->')) {
        inBlockComment = false
        commentStart = undefined
      }
      inParagraph = false
      inTable = false
      inIndentedCode = false
      continue
    }
    if (spanUntil !== undefined) {
      lines.push({ text: raw, structural: false })
      if (lineNumber >= spanUntil) {
        spanUntil = undefined
        inParagraph = true
      }
      continue
    }
    if (inlineCommentUntil !== undefined) {
      lines.push({ text: '', structural: false })
      if (offset >= inlineCommentUntil.endOffset) {
        inlineCommentUntil = undefined
        inParagraph = true
      }
      continue
    }

    const leadCols = leadingColumns(raw)
    const requiredIndent = listIndent > 0 ? listIndent + 4 : 4
    if (inIndentedCode) {
      if (raw.trim() === '') {
        let nextNonBlank = offset + 1
        while (nextNonBlank < source.length && (source[nextNonBlank] ?? '').trim() === '') nextNonBlank += 1
        const nextCols = nextNonBlank < source.length ? leadingColumns(source[nextNonBlank] ?? '') : 0
        if (nextNonBlank < source.length && nextCols >= requiredIndent) {
          lines.push({ text: raw, structural: false })
          continue
        }
        inIndentedCode = false
      } else if (leadCols >= requiredIndent) {
        lines.push({ text: raw, structural: false })
        continue
      } else {
        inIndentedCode = false
      }
    }

    if (raw.trim() === '') {
      inParagraph = false
      inTable = false
      if (listIndent > 0) {
        let nextNonBlank = offset + 1
        while (nextNonBlank < source.length && (source[nextNonBlank] ?? '').trim() === '') nextNonBlank += 1
        const nextLine = source[nextNonBlank] ?? ''
        if (nextNonBlank >= source.length || (leadingColumns(nextLine) < listIndent && topListContentIndent(nextLine) === 0)) {
          listIndent = 0
        }
      }
      lines.push({ text: raw, structural: true })
      continue
    }

    if (listIndent > 0 && leadCols < listIndent) {
      listIndent = topListContentIndent(raw)
      inParagraph = false
      inTable = false
    } else if (listIndent === 0) {
      const openedList = topListContentIndent(raw)
      if (openedList > 0) {
        listIndent = openedList
        inParagraph = false
        inTable = false
      }
    }

    const effectiveRequiredIndent = listIndent > 0 ? listIndent + 4 : 4
    const isNestedListMarker = listIndent > 0 && /^\s*(?:[-+*]|\d{1,9}[.)])(?:\s|$)/.test(raw)
    if (!inParagraph && leadCols >= effectiveRequiredIndent && !isNestedListMarker) {
      inIndentedCode = true
      inTable = false
      lines.push({ text: raw, structural: false })
      continue
    }

    const open = openFenceAt(raw)
    if (open !== undefined) {
      fence = { char: open.char, length: open.length, indent: open.indent, info: open.rest.trim(), content: [], startLine: lineNumber }
      inParagraph = false
      inTable = false
      lines.push({ text: raw, structural: false })
      continue
    }
    if (/^[ ]{0,3}<!--/.test(raw)) {
      lines.push({ text: '', structural: false })
      const startCol = raw.indexOf('<!--') + 4
      if (raw.indexOf('-->', startCol) === -1) {
        inBlockComment = true
        commentStart = lineNumber
      }
      inParagraph = false
      inTable = false
      continue
    }
    let index = 0

    let visible = ''
    while (index < raw.length) {
      const ch = raw[index] ?? ''
      const next = raw[index + 1] ?? ''
      if (ch === '\\' && next !== '' && ASCII_PUNCTUATION.test(next)) {
        visible += ch + next
        index += 2
        continue
      }
      const run = backtickRun(raw, index)
      if (run > 0) {
        const close = exactBacktickClose(raw, index + run, run)
        if (close !== -1) {
          visible += raw.slice(index, close + run)
          index = close + run
          continue
        }
        const later = multilineSpanCloseLine(source, offset, run)
        if (later !== undefined) spanUntil = later
        visible += raw.slice(index)
        index = raw.length
        continue
      }
      if (raw.startsWith('<!--', index)) {
        const closed = inlineCommentClose(source, offset, index + 4)
        if (closed !== undefined) {
          if (closed.endOffset === offset) {
            index = closed.endCol
            continue
          }
          inlineCommentUntil = closed
          index = raw.length
          continue
        }
      }
      visible += ch
      index += 1
    }
    lines.push({ text: visible, structural: true })
    if (/^[ ]{0,3}#{1,6}(?:\s|$)/.test(raw) || isThematicBreak(raw)) {
      inParagraph = false
      inTable = false
    } else if (inTable && raw.includes('|')) {
      inParagraph = false
    } else if (
      offset + 1 < source.length
      && raw.includes('|')
      && /^[ ]{0,3}\|?[\s:|-]+\|[\s:|-]*$/.test(source[offset + 1] ?? '')
    ) {
      inTable = true
      inParagraph = false
    } else {
      inTable = false
      inParagraph = true
    }
  }
  return {
    lines,
    fences,
    ...(fmEnd >= 0 ? { frontmatterEndOffset: fmEnd } : {}),
    ...(inBlockComment && commentStart !== undefined ? { unclosedCommentLine: commentStart } : {}),
  }
}

/**
 * 结构扫描的短视图：只要行。
 * @param {string} text 文档全文。
 * @returns {{ text: string, structural: boolean }[]} 每行的可见文本与结构标记。
 */
export function scanDocument(text) {
  return scanDocumentDetailed(text).lines
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 定位 `## <heading>` 节的起止行（直接从 `scanDocumentDetailed` 单一状态机派生，零第二扫描器）。
 * @param {string} text 文档全文。
 * @param {string} heading 节标题（不含 `## `）。
 * @param {{ readonly lines: readonly { readonly text: string, readonly structural: boolean }[] }} [preScanned] 可选复用已扫描结果。
 * @returns {{ start: number, end: number } | undefined} 归一化行下标；缺节返回 undefined。
 */
export function sectionRange(text, heading, preScanned) {
  const { lines } = preScanned ?? scanDocumentDetailed(text)
  const pattern = new RegExp(`^[ ]{0,3}##\\s+${escapeRegExp(heading)}\\s*$`)
  let start = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line !== undefined && line.structural && pattern.test(line.text)) {
      start = index
      break
    }
  }
  if (start === -1) return undefined
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index]
    if (line !== undefined && line.structural && /^[ ]{0,3}#{1,2}\s+/.test(line.text)) {
      end = index
      break
    }
  }
  return { start, end }
}

/**
 * 取 `## <heading>` 节内的**结构行**文本（非结构行置空以保持行相对位置，围栏/注释/跨行代码内的假字段清零）。
 * @param {string} text 文档全文。
 * @param {string} heading 节标题（不含 `## `）。
 * @returns {string | undefined} 结构行正文；缺节返回 undefined。
 */
export function sectionStructuralText(text, heading) {
  const scan = scanDocumentDetailed(text)
  const range = sectionRange(text, heading, scan)
  if (range === undefined) return undefined
  const out = []
  for (let index = range.start + 1; index < range.end; index += 1) {
    const line = scan.lines[index]
    out.push(line !== undefined && line.structural ? line.text : '')
  }
  return out.join('\n')
}
