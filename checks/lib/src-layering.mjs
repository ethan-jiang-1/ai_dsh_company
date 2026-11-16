// 纯逻辑：pack 源码面的分层判据（keyless，无 I/O）。
//
// 为什么（2026-10-27 R3-01）：host/lib/client 的分层今天**只由 tsconfig 的 include 保证**——
//   `pnpm verify` 不跑 tsc、`pnpm test` 是裸 vitest，所以往 client 面板里 import 一个 host 模块，
//   两个标准命令全绿，到构建/发布才炸（TS6307）。分层是这套架构的地基，却没有默认回路守它。
//
// 层定义（唯一家仍 = packages/company-pack/src/README.md；本模块只编码方向，不复述布局）：
//   root（src/index.ts）→ host → lib；client → lib。lib 是双编译面的叶，不许依赖 node: 内建
//   （client 叶会 TS2591，2026-10-13 实证）。client/host 互不相见。
//
// 判据只读**相对 import 的目标层**与 `node:` 前缀；不做符号解析、不跑类型检查——那是 tsc 的活。

/** 相对路径（相对 src/）→ 层；未知返回 null。 */
export function layerOf(relativePath) {
  const parts = String(relativePath).split('/').filter(part => part !== '')
  if (parts.length === 0) return null
  return parts.length === 1 ? 'root' : parts[0]
}

/** 允许的层方向：from → to。 */
export const ALLOWED_EDGES = {
  root: ['root', 'host', 'lib'],
  host: ['host', 'lib'],
  lib: ['lib'],
  client: ['client', 'lib'],
}

/** 目标层是否在 from 的允许集内；不在 → 一句可判的说明，在 → null。 */
export function edgeProblem(fromLayer, toLayer) {
  if (fromLayer === null || toLayer === null) return null   // 非源码面（外部包）不归本判据
  const allowed = ALLOWED_EDGES[fromLayer]
  if (allowed === undefined) return `未知层 ${fromLayer}`
  return allowed.includes(toLayer) ? null : `${fromLayer} → ${toLayer} 不在允许方向（${fromLayer} 允许：${allowed.join(' / ')}）`
}

/** lib 与 client 会编进浏览器叶，node 内建在客户端没有实现（TS2591 的同一类事故）。 */
export function isNodeBuiltinSpecifier(specifier) {
  return String(specifier).startsWith('node:')
}

const SPECIFIER = String.raw`(?:\s*type\s*)?\s*`
/**
 * 去注释但**保持字符位置/行号不变**：注释字符替换为空格，换行保留。
 * 只认字符串/模板字面量里的引号（模板里的 `${}` 不展开）；用于避免把注释里的示例 import 判成违规。
 */
export function stripComments(text) {
  const chars = [...String(text)]
  let quote = null
  let escaped = false
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (quote !== null) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue }
    if (ch === '/' && chars[i + 1] === '/') {
      let j = i
      while (j < chars.length && chars[j] !== '\n') { chars[j] = ' '; j++ }
      i = j - 1
      continue
    }
    if (ch === '/' && chars[i + 1] === '*') {
      let j = i + 2
      chars[i] = ' '
      chars[i + 1] = ' '
      while (j < chars.length && !(chars[j] === '*' && chars[j + 1] === '/')) {
        if (chars[j] !== '\n') chars[j] = ' '
        j++
      }
      if (j < chars.length) { chars[j] = ' '; chars[j + 1] = ' ' }
      i = j + 1
    }
  }
  return chars.join('')
}

/** 从源码文本里取所有模块引用：[{ specifier, line, kind }]（from / 动态 import / 裸 import / require / export-from）。 */
export function importSpecifiers(text) {
  const scan = stripComments(text)
  const found = []
  const push = (specifier, index, kind) => {
    const line = text.slice(0, index).split('\n').length
    found.push({ specifier, line, kind })
  }
  for (const match of scan.matchAll(new RegExp(String.raw`\bfrom\s*['"]([^'"]+)['"]`, 'g'))) push(match[1], match.index ?? 0, 'from')
  for (const match of scan.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) push(match[1], match.index ?? 0, 'dynamic')
  for (const match of scan.matchAll(new RegExp(String.raw`\bimport\s+['"]([^'"]+)['"]`, 'g'))) push(match[1], match.index ?? 0, 'side-effect')
  for (const match of scan.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) push(match[1], match.index ?? 0, 'require')
  return found.sort((left, right) => left.line - right.line)   // 各类正则各扫一遍，按行号还原文本顺序
}

/**
 * 一条引用的判据。
 * @returns {null | string} 问题说明；null = 合法（外部包、同层或允许方向）。
 */
export function importProblem({ fromLayer, relativePath, specifier }) {
  if (!specifier.startsWith('.')) {
    return fromLayer === 'lib' || fromLayer === 'client'
      ? (isNodeBuiltinSpecifier(specifier) ? `${fromLayer} 不许依赖 ${specifier}（会编进浏览器叶）` : null)
      : null
  }
  const depth = relativePath.split('/').length - 1
  const segments = specifier.split('/')
  let up = 0
  while (segments[up] === '..') up += 1
  // ⚠ 不能用 `/^\.\.\//g` 数：`^` 只在串首匹配一次，`../../x` 会被数成 1 段。
  if (up > depth) return `${fromLayer} 的相对引用越出 src/（${specifier}）`
  const resolved = new URL(specifier, `file:///${relativePath}`).pathname.replace(/^\//, '')
  const toLayer = layerOf(resolved)
  return edgeProblem(fromLayer, toLayer)
}
