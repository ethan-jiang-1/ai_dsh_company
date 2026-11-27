/**
 * 仓库治理面（门禁 / 背压 / 笔记 / 审计）的唯一 Markdown + YAML frontmatter 解析原语。
 * 状态：常驻
 * 何时跑：改本文件或任一门禁读卡/读节逻辑后 → `pnpm verify && pnpm test:checks && npx vitest run tests/tools/repo-markdown.spec.ts`
 *
 * 为什么单独成模块：
 * - `tools/lib/` 是 keyless 纯逻辑层（不能反向 import `packages/company-pack`）；
 * - 复用 `vendor/dsh` 已声明的 `mdast-util-from-markdown` + GFM（经 `./markdown-links.mjs`）与 `js-yaml`，零外部新依赖；
 * - 门禁与 `tools/lib/` 严禁再手写裸 `/^---\r?\n/` 或裸 `/^##\s+/` 切分（由 `company-root-carriers` 静态门强制）。
 */
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { parseMarkdownAst, renderedNodeText } from './markdown-links.mjs'
import { repositoryRoot } from './repository-layout.mjs'

// js-yaml 由 vendor 根声明（根 install 后 hoisted 亦可解析）；解析一次、两个 schema 共用。
// 解析不到 = install 未完成：让 Node 抛 MODULE_NOT_FOUND（报错点名 js-yaml 与下面的解析基），
// 不另造一条永远不可达的「友好错误」分支——死语句会永久压低本文件覆盖且从不被执行。
// 解析基从仓库根派生（单源 = repository-layout），不按本文件深度算。
const yamlJs = createRequire(join(repositoryRoot, 'vendor/dsh/package.json'))('js-yaml')

const loadYaml = text => yamlJs.load(text, { schema: yamlJs.CORE_SCHEMA })

/** Cordis 组合方言：`!!js` Loader 表达式收成标量字符串（门禁只做结构/依赖判断，不求值）。 */
const CORDIS_SCHEMA = yamlJs.CORE_SCHEMA.extend({
  explicit: [new yamlJs.Type('tag:yaml.org,2002:js', { kind: 'scalar', construct: s => s })],
})

/**
 * Cordis 组合 YAML（bundle patch / preset `agent.cordis.yml`）的**唯一**加载器。
 * 与文档 frontmatter 的区别只有一处：组合文件带 `!!js`（`tag:yaml.org,2002:js`），
 * `CORE_SCHEMA` 会直接抛错。为什么住这里而不是各门禁各写一份：`!!js` 是 DSH 组合方言
 * （Loader 契约），两处手写必漂。
 */
export function loadCordisYaml(text) {
  return yamlJs.load(text, { schema: CORDIS_SCHEMA })
}

/** 组合条目树展平：`insert` 行、group 的 `config` 子条目、preset 行的 `config.plugins` 都算行。 */
export function flattenCordisRows(operations) {
  if (!Array.isArray(operations)) return []
  const rows = []
  const walk = list => {
    for (const row of list) {
      rows.push(row)
      if (row?.group === true && Array.isArray(row.config)) walk(row.config)
      if (Array.isArray(row?.config?.plugins)) walk(row.config.plugins)
    }
  }
  for (const op of operations) {
    if (Array.isArray(op?.insert)) walk(op.insert)
    if (Array.isArray(op?.config?.plugins)) walk(op.config.plugins)
  }
  return rows
}

const FRONTMATTER_BLOCK = /^---\n([\s\S]*?)\n---(?:\n|$)/
const ATX_HEADING_PREFIX = /^\s{0,3}(#{1,6})(?:\s+(.*?))?\s*$/

/** 平台差异归一：去 UTF-8 BOM、CRLF 与孤立 CR → LF。 */
export function normalizeMarkdown(text) {
  const source = String(text ?? '')
  const withoutBom = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source
  return withoutBom.replace(/\r\n?/g, '\n')
}

/**
 * 解析文档首部 YAML frontmatter（`js-yaml` `CORE_SCHEMA`）。
 * 仅当第 1 行是 `---` 且闭合 `---` 前不含 Markdown 标题时按 frontmatter 解析；
 * 若第 1 行 `---` 后紧跟空行 + 正文 + 另一条 `---` 分隔线（无 YAML 键值且含空行段落），不误判为 frontmatter。
 */
export function parseFrontmatter(text) {
  const normalized = normalizeMarkdown(text)
  const match = FRONTMATTER_BLOCK.exec(normalized)
  if (match === null) {
    return { present: false, data: null, body: normalized, bodyStartLine: 1 }
  }
  const rawYaml = match[1] ?? ''
  const firstLine = rawYaml.split('\n')[0] ?? ''
  // `---\n\n...` 在首行是 Markdown 分隔线 `<hr>`，不是 YAML 头（除非含 YAML 键值或注释行）。
  if (rawYaml.trim() !== '' && firstLine.trim() === '' && !/^\s*(?:[A-Za-z_][\w-]*\s*:|#)/m.test(rawYaml)) {
    return { present: false, data: null, body: normalized, bodyStartLine: 1 }
  }
  const fmLineCount = match[0].endsWith('\n')
    ? match[0].slice(0, -1).split('\n').length
    : match[0].split('\n').length
  const body = normalized.slice(match[0].length)
  const bodyStartLine = fmLineCount + 1
  let parsed
  try {
    parsed = loadYaml(rawYaml)
  } catch (error) {
    return {
      present: true,
      data: null,
      error: `frontmatter YAML 不可解析：${String(error).split('\n')[0]}`,
      body,
      bodyStartLine,
    }
  }
  if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      present: true,
      data: null,
      error: 'frontmatter 须为字段映射',
      body,
      bodyStartLine,
    }
  }
  return { present: true, data: parsed, body, bodyStartLine }
}

/**
 * 解析为标准 CommonMark + GFM `mdast` 语法树；
 * 首部 YAML frontmatter 用等量空行占位，既防止 `---` 被误判为 Setext H2，又保持全树 1-based 行号与原文严格一致。
 */
export function parseGfmAst(text) {
  const fm = parseFrontmatter(text)
  const masked = fm.present ? `${'\n'.repeat(fm.bodyStartLine - 1)}${fm.body}` : fm.body
  return parseMarkdownAst(masked)
}

function markNonStructuralBlocks(node, parentType, mask) {
  const isBlockContext = parentType === 'root' || parentType === 'blockquote' || parentType === 'listItem'
  if ((node.type === 'code' || (node.type === 'html' && isBlockContext)) && node.position) {
    const start = Math.max(1, node.position.start.line)
    const end = Math.max(start, node.position.end.line)
    for (let line = start; line <= end; line += 1) {
      if (line - 1 < mask.length) mask[line - 1] = false
    }
    return
  }
  for (const child of node.children ?? []) {
    markNonStructuralBlocks(child, node.type, mask)
  }
}

function stripInlineHtmlComments(rawLines, tree) {
  const out = [...rawLines]
  const visit = (node, parentType) => {
    const isBlockContext = parentType === 'root' || parentType === 'blockquote' || parentType === 'listItem'
    if (node.type === 'html' && !isBlockContext && node.position && node.value?.startsWith('<!--')) {
      const { start, end } = node.position
      if (start.line === end.line) {
        const row = out[start.line - 1] ?? ''
        out[start.line - 1] = `${row.slice(0, start.column - 1)}${' '.repeat(Math.max(0, end.column - start.column))}${row.slice(end.column - 1)}`
      }
    }
    for (const child of node.children ?? []) visit(child, node.type)
  }
  visit(tree, null)
  return out
}

/** 内部共享解析视图（BUG-406）：一次 mdast 解析同时产出 structuralLines 与 AST，消除 headingSections 双解析。 */
function parseStructuralView(text) {
  const normalized = normalizeMarkdown(text)
  const rawLines = normalized.split('\n')
  const fm = parseFrontmatter(normalized)
  const mask = rawLines.map((_, idx) => idx >= fm.bodyStartLine - 1)
  const maskedSource = fm.present ? `${'\n'.repeat(fm.bodyStartLine - 1)}${fm.body}` : fm.body
  const tree = parseMarkdownAst(maskedSource)
  markNonStructuralBlocks(tree, null, mask)
  const cleanedLines = stripInlineHtmlComments(rawLines, tree)
  const lines = rawLines.map((line, idx) => ({
    text: mask[idx] ? cleanedLines[idx] : line,
    lineNumber: idx + 1,
    structural: Boolean(mask[idx]),
  }))
  return { lines, tree }
}

/** 逐行返回结构视图（frontmatter、围栏/缩进代码块、块级 HTML 注释均为 `structural: false`）。 */
export function structuralLines(text) {
  return parseStructuralView(text).lines
}

/**
 * 提取顶层 ATX 标题节列表（排除代码块/注释/引用块内标题，亦排除 Setext 下划线误判）。
 * 每个节在遇到下一个 `depth <= 当前节 depth` 的顶层 ATX 标题处截断。
 */
export function headingSections(text, options = {}) {
  const { depth } = options
  const { lines, tree } = parseStructuralView(text)
  const allHeadings = []
  for (const node of tree.children ?? []) {
    if (node.type !== 'heading' || !node.position) continue
    const startLine = node.position.start.line
    const rawLine = lines[startLine - 1]?.text ?? ''
    const atx = ATX_HEADING_PREFIX.exec(rawLine)
    if (atx === null) continue
    const rawTitle = (atx[2] ?? '').replace(/\s+#+\s*$/, '').trim()
    allHeadings.push({
      depth: node.depth,
      title: renderedNodeText(node).trim(),
      rawTitle,
      startLine,
      endHeadingLine: node.position.end.line,
    })
  }
  const sections = []
  for (let index = 0; index < allHeadings.length; index += 1) {
    const current = allHeadings[index]
    if (depth !== undefined && current.depth !== depth) continue
    let nextStartLine = lines.length + 1
    for (let cursor = index + 1; cursor < allHeadings.length; cursor += 1) {
      if (allHeadings[cursor].depth <= current.depth) {
        nextStartLine = allHeadings[cursor].startLine
        break
      }
    }
    const bodySlice = lines.slice(current.endHeadingLine, nextStartLine - 1)
    sections.push({
      depth: current.depth,
      title: current.title,
      rawTitle: current.rawTitle,
      startLine: current.startLine,
      endLine: nextStartLine - 1,
      rawBody: bodySlice.map(item => item.text).join('\n'),
      structuralBody: bodySlice.map(item => (item.structural ? item.text : '')).join('\n'),
    })
  }
  return sections
}

/**
 * 按标题名读取单个节正文（默认 depth=2 且只返回结构行，围栏内假字段自动置空）。
 * `matcher` 支持精确字符串、字符串数组（子串匹配之一）或谓词函数。
 */
export function sectionBody(text, matcher, options = {}) {
  const { depth = 2, structuralOnly = true } = options
  const sections = headingSections(text, { depth })
  const matches = typeof matcher === 'function'
    ? matcher
    : Array.isArray(matcher)
      ? sec => matcher.some(item => sec.rawTitle.includes(item) || sec.title.includes(item))
      : sec => sec.rawTitle === matcher || sec.title === matcher
  const target = sections.find(matches)
  if (target === undefined) return undefined
  return structuralOnly ? target.structuralBody : target.rawBody
}

/** 取文档中所有**结构态** `状态：` 行（围栏代码块或注释内的示例 `状态：` 不计入）。 */
export function noteStatusLines(text) {
  return structuralLines(text)
    .filter(item => item.structural && /^状态[:：]/.test(item.text))
    .map(item => ({ lineIndex: item.lineNumber - 1, lineNumber: item.lineNumber, text: item.text }))
}

/** 取首条结构态 `状态：` 逻辑块（含紧随其后的非空结构续行，到空行为止）。 */
export function noteStatusBlock(text) {
  const lines = structuralLines(text)
  const start = lines.findIndex(item => item.structural && /^状态[:：]/.test(item.text))
  if (start === -1) return ''
  const block = [lines[start].text]
  for (let index = start + 1; index < lines.length; index += 1) {
    const item = lines[index]
    if (!item.structural || item.text.trim() === '') break
    block.push(item.text)
  }
  return block.join('\n')
}

/** CommonMark / GFM §4.10 表格行切列（处理 `\\` 与 `\|` 转义）。 */
export function splitGfmTableCells(line) {
  let body = String(line ?? '').trim()
  if (body.startsWith('|')) body = body.slice(1)
  if (body.endsWith('|')) {
    let backslashes = 0
    for (let cursor = body.length - 2; cursor >= 0 && body[cursor] === '\\'; cursor -= 1) backslashes += 1
    if (backslashes % 2 === 0) body = body.slice(0, -1)
  }
  const cells = []
  let cell = ''
  for (let index = 0; index < body.length; index += 1) {
    const ch = body[index] ?? ''
    if (ch === '\\' && (body[index + 1] === '\\' || body[index + 1] === '|')) {
      cell += body[index + 1]
      index += 1
      continue
    }
    if (ch === '|') {
      cells.push(cell.trim())
      cell = ''
      continue
    }
    cell += ch
  }
  cells.push(cell.trim())
  return cells
}
