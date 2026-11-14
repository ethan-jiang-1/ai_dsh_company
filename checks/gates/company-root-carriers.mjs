// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { CARRIERS, EXEMPT, KNOWN_GAP, MARKDOWN_PRIMITIVES, WORKSPACE_TOOLING } from '../../tools/lib/carrier-registry.mjs'
import { parseFrontmatter } from '../../tools/lib/repo-markdown.mjs'

// ── 公司盘载体与治理面单原语门禁（company-root-carriers，2026-11-13 P0；2026-11-14 W2 扩禁裸解析）──
// 为什么：
//   A) 公司盘面：BUG-144/147/148/149/150 同源——写入口自拼 `.dsh-company` 绕过 company-root。
//   B) 治理文档/门禁面：BUG-175..183 同源——门禁与 tools/lib 各自手写 `/^---\r?\n/` 与 `/^##\s+/` 裸切分，
//      绕过 `repo-markdown.mjs` / `markdown-shape-core.js` 原语（门禁文件总数不净增，并入本载体垄断门）。
// 机械对账：
//   ① src/host 里同时出现「公司盘路径特征」与「写调用」（AST，`WRITE_CALLS` = sync + promises；只 import 写原语不算）
//      的模块，必须在 CARRIERS / EXEMPT / KNOWN_GAP 三档之一；
//   ② 登记项自身必须可解析：module 存在、CARRIERS 的 symbol 在文件里出现、KNOWN_GAP 的 bug 卡存在；
//   ③ checks/gates/*.mjs 与 tools/lib/*.mjs（排除 MARKDOWN_PRIMITIVES）的 AST 正则字面量与 RegExp 构造
//      不得出现裸 YAML frontmatter 正则或裸 Markdown `##` 节切分正则（精确报 file:line）。
//      声明的边界（开放集合，不是穷尽承诺）：只管 ^ 锚 / `\n` 前缀 / `[#]{n}` 的正则字面量与 RegExp 构造，
//      及 `.startsWith/.split` 的 `#…` 字符串字面量；标识符间接传参、slice/replace/match 不扫——靠 gate-change 盲审补位。
//   ④ checks/gates/*.mjs 与 tools/lib/*.mjs（排除登记表与已登记的 WORKSPACE_TOOLING 成员）里，写调用的**路径实参**
//      把 `.dsh-company` 当路径段用（`writeFileSync` 类只判 args[0]，避免内容/错误消息误红）→ 必须在 WORKSPACE_TOOLING
//      登记 module + symbol + reason（policy §P2 的路径单原语）。
//      声明的边界（开放集合）：只认字面量里的路径段形态（`'.dsh-company'`、`'./.dsh-company/kb'`、
//      `` `${ws}/.dsh-company` ``、`` `${ws}/.dsh-company${sub}` ``）；变量拼接（`'.dsh' + '-company'`）、
//      别名/元素访问调用（`import { writeFileSync as wf }`、`fs['writeFileSync']`）与 `WRITE_CALLS` 之外的新写 API
//      不扫；登记粒度 = 整模块（登记后该模块新增裸写不再红），靠 gate-change 盲审复核。
// 负例留证 2026-11-13 / 2026-11-14：
//   - 新建未登记 host writer → `FAIL company-root-carriers: … → 未登记的公司盘写入口`；
//   - 在任一非原语门禁植入 `/^##\s+/` 或 `/^---\r?\n/` → `FAIL company-root-carriers: … → 禁止手写裸 …`。

const HOST = 'packages/company-pack/src/host'
const GOVERNANCE_DIRS = ['checks/gates', 'tools/lib']
const COMPANY_REF = /\.dsh-company|companyHomeOf|companyFilePath|RUN_BUNDLE_PATHS/
const RAW_FRONTMATTER_RE = /^\^(?:\(\?:(?:\\uFEFF|\\ufeff|\\xEF\\xBB\\xBF|\uFEFF)\)\?|(?:\\uFEFF|\\ufeff|\\xEF\\xBB\\xBF|\uFEFF)\?)?---(?:\\r\?\\n|\\n|\\s|\s|\$)/
const LEADING_WS_TOKEN = String.raw`(?:\(\?:|\()?(?:\\s| |\\t|\[[^\]]+\])(?:[*+?]|\\?\{\d+(?:,\d*)?\\?\})?\)?\??`
const RAW_HEADING_SPLIT_RE = new RegExp(
  String.raw`^\^(?:${LEADING_WS_TOKEN}){0,3}\(?(?:\[#\]|#)(?:\{\d+(?:,\d*)?\}|\+|#(?:\s|\\s|\[|\^|\$|\)|#|[^#])|\{)`,
)
/** 非 `^` 锚的裸节正则：`\n## `、`(?=^## )`、`(?<=\n)## `（字面量源文本里 `\n` 是反斜杠加 n）。 */
const RAW_HEADING_ANYWHERE_RE = /(?:\\n|\(\?=\^|\(\?<=\\n|\^\|\\n\))\(?(?:\[#\]|#)(?:#|\{|\\s| |\[|\))/
/** 字符串形态的裸节判据：`'## x'` / `'\n## x'` / `'# '`（startsWith/split 的参数；URL 锚 `#` 与 includes/indexOf 存在性探测不在此列）。 */
const RAW_HEADING_STRING_RE = /^\n?(?:#{1,6} |#{2,6}$)/
const RAW_STRING_CALLS = new Set(['startsWith', 'split'])
const RAW_FRONTMATTER_PREFIX_RE = /^(?:\uFEFF)?---\r?\n/
const RAW_SCAN_SELF = 'checks/gates/company-root-carriers.mjs'

/** 去掉块注释与整行注释；行内 `//` 保留（误报由「同时要有写原语」挡住）。 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, block => block.replace(/[^\n]/g, ''))
    .replace(/^\s*\/\/.*$/gm, '')
}

function walk(dir, ext) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path, ext))
    else if (entry.name.endsWith(ext)) out.push(path)
  }
  return out.sort()
}

/** 写调用集合（sync + promises，按 callee 名判、不看 import 行）。开放集合：新 API 由盲审补入。 */
const WRITE_CALLS = new Set([
  'writeFileSync', 'appendFileSync', 'renameSync', 'mkdirSync', 'rmSync', 'cpSync', 'unlinkSync', 'linkSync', 'writeCompanyAtomic',
  'writeFile', 'appendFile', 'rename', 'mkdir', 'rm', 'cp', 'unlink', 'link',
])

/** 首参是「内容」而非路径的写调用：只判 args[0]（否则错误消息里出现 `.dsh-company` 会误红）。 */
const CONTENT_LAST = new Set(['writeFileSync', 'appendFileSync', 'writeFile', 'appendFile'])

function callName(node) {
  if (!ts.isCallExpression(node)) return undefined
  const callee = node.expression
  if (ts.isIdentifier(callee)) return callee.text
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.name)) return callee.name.text
  return undefined
}

/** 首个写调用所在行（1-based）；没有写调用 = undefined（只读模块不误判）。 */
function firstWriteCallLine(sf) {
  let line
  const visit = node => {
    if (line !== undefined) return
    const name = callName(node)
    if (name !== undefined && WRITE_CALLS.has(name)) {
      line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return line
}

/** 写调用**路径实参**里出现 `.dsh-company` 的位置；只在写目标上判，内容/错误消息不算。 */
function companyDirWritePos(sf, text) {
  let pos
  const visit = node => {
    if (pos !== undefined) return
    const name = callName(node)
    if (name !== undefined && WRITE_CALLS.has(name)) {
      const targets = CONTENT_LAST.has(name) ? node.arguments.slice(0, 1) : node.arguments.slice(0, 2)
      for (const arg of targets) {
        if (RAW_COMPANY_DIR_LITERAL.test(text.slice(arg.getStart(sf), arg.getEnd()))) {
          pos = arg.getStart(sf)
          return
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return pos
}

function bugCardExists(root, id) {
  const buckets = ['_backlog/bugs', '_backlog/_archive/fixed_bugs', '_backlog/_archive/suspended_bugs', '_backlog/_archive/settled_issues']
  for (const bucket of buckets) {
    const dir = join(root, bucket)
    if (!existsSync(dir)) continue
    if (readdirSync(dir).some(name => name.startsWith(`${id}-`) && name.endsWith('.md'))) return true
  }
  return false
}

function extractStringPattern(expr) {
  if (!expr) return undefined
  if (ts.isParenthesizedExpression(expr)) return extractStringPattern(expr.expression)
  if (ts.isStringLiteralLike(expr)) return expr.text
  if (ts.isTemplateExpression(expr)) {
    return expr.head.text + expr.templateSpans.map(span => `X${span.literal.text}`).join('')
  }
  if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = extractStringPattern(expr.left)
    const right = extractStringPattern(expr.right)
    if (left !== undefined || right !== undefined) return `${left ?? 'X'}${right ?? 'X'}`
  }
  return undefined
}

function scanRawParsingProblems(root, primitives) {
  const allowed = new Set(primitives)
  const problems = []
  let scanned = 0
  for (const dirRel of GOVERNANCE_DIRS) {
    const absDir = join(root, dirRel)
    if (!existsSync(absDir)) continue
    for (const absFile of walk(absDir, '.mjs')) {
      const rel = absFile.slice(root.length + 1).replaceAll('\\', '/')
      if (allowed.has(rel) || rel === RAW_SCAN_SELF) continue
      scanned += 1
      const sourceText = readFileSync(absFile, 'utf8')
      const sf = ts.createSourceFile(rel, sourceText, ts.ScriptTarget.Latest, true)
      const checkPattern = (pattern, pos) => {
        if (pattern === undefined) return
        const line = sf.getLineAndCharacterOfPosition(pos).line + 1
        if (RAW_FRONTMATTER_RE.test(pattern)) {
          problems.push(`${rel}:${String(line)} → 禁止手写裸 frontmatter 正则 /${pattern}/（改调 tools/lib/repo-markdown.mjs 的 parseFrontmatter）`)
        } else if (RAW_HEADING_SPLIT_RE.test(pattern) || RAW_HEADING_ANYWHERE_RE.test(pattern)) {
          problems.push(`${rel}:${String(line)} → 禁止手写裸 Markdown 节切分正则 /${pattern}/（改调 repo-markdown.mjs 或 markdown-shape-core.js）`)
        }
      }
      const visit = node => {
        if (ts.isRegularExpressionLiteral(node)) {
          const text = node.text
          const lastSlash = text.lastIndexOf('/')
          checkPattern(lastSlash > 0 ? text.slice(1, lastSlash) : text, node.getStart(sf))
        } else if ((ts.isNewExpression(node) || ts.isCallExpression(node))
          && ts.isIdentifier(node.expression) && node.expression.text === 'RegExp') {
          checkPattern(extractStringPattern(node.arguments?.[0]), node.getStart(sf))
        } else if (ts.isCallExpression(node)
          && ts.isPropertyAccessExpression(node.expression)
          && RAW_STRING_CALLS.has(node.expression.name.text)) {
          const prefix = extractStringPattern(node.arguments?.[0])
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
          if (prefix !== undefined && node.expression.name.text === 'startsWith' && RAW_FRONTMATTER_PREFIX_RE.test(prefix)) {
            problems.push(`${rel}:${String(line)} → 禁止手写裸 frontmatter 前缀判据 .startsWith(${JSON.stringify(prefix)})（改调 tools/lib/repo-markdown.mjs 的 parseFrontmatter）`)
          } else if (prefix !== undefined && RAW_HEADING_STRING_RE.test(prefix)) {
            problems.push(`${rel}:${String(line)} → 禁止手写裸 Markdown 节判据 .${node.expression.name.text}(${JSON.stringify(prefix)})（改调 repo-markdown.mjs 的 headingSections）`)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
  }
  return { problems, scanned }
}

const TOOLING_SKIP = new Set([RAW_SCAN_SELF, 'tools/lib/carrier-registry.mjs'])
/** 字面量里把 `.dsh-company` 当**路径段**用：`'.dsh-company'`、`'./.dsh-company/kb'`、`` `${ws}/.dsh-company` ``、`` `${ws}/.dsh-company${sub}` ``。 */
const RAW_COMPANY_DIR_LITERAL = /['"`](?:[^'"`\n]*?[\\/])?\.dsh-company(?:[\\/]|['"`$])/

/** 维护工具直写工作区 `.dsh-company` 而未登记 → 红；登记表与已登记成员跳过。 */
function scanToolingProblems(root, tooling) {
  const registered = new Set(tooling.map(entry => entry.module))
  const problems = []
  for (const dirRel of GOVERNANCE_DIRS) {
    const absDir = join(root, dirRel)
    if (!existsSync(absDir)) continue
    for (const absFile of walk(absDir, '.mjs')) {
      const rel = absFile.slice(root.length + 1).replaceAll('\\', '/')
      if (TOOLING_SKIP.has(rel) || registered.has(rel)) continue
      const text = stripComments(readFileSync(absFile, 'utf8'))
      if (!text.includes('.dsh-company')) continue
      const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true)
      const pos = companyDirWritePos(sf, text)
      if (pos === undefined) continue
      const line = sf.getLineAndCharacterOfPosition(pos).line + 1
      problems.push(`${rel}:${String(line)} → 禁止手写裸 .dsh-company 路径拼接（登记到 tools/lib/carrier-registry.mjs 的 WORKSPACE_TOOLING 并写理由）`)
    }
  }
  return problems
}

export function run({
  root,
  ok,
  fail,
  carriers = CARRIERS,
  exempt = EXEMPT,
  knownGap = KNOWN_GAP,
  markdownPrimitives = MARKDOWN_PRIMITIVES,
  tooling = WORKSPACE_TOOLING,
}) {
  const hostDir = join(root, HOST)
  if (!existsSync(hostDir)) {
    fail('company-root-carriers', `源码面缺失：${HOST}`)
    return
  }
  let files
  try { files = walk(hostDir, '.ts') } catch {
    fail('company-root-carriers', `源码面不可读：${HOST}`)
    return
  }

  const registered = new Set([
    ...carriers.filter(entry => entry.kind === 'writer').map(entry => entry.module),
    ...exempt.map(entry => entry.module),
    ...knownGap.map(entry => entry.module),
    ...tooling.map(entry => entry.module),
  ])
  const problems = []
  let writers = 0

  for (const absolute of files) {
    const rel = absolute.slice(root.length + 1)
    const text = stripComments(readFileSync(absolute, 'utf8'))
    if (!COMPANY_REF.test(text)) continue
    const sf = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true)
    const line = firstWriteCallLine(sf)
    if (line === undefined) continue
    writers += 1
    if (!registered.has(rel)) {
      problems.push(`${rel}:${String(line)} → 未登记的公司盘写入口（登记到 tools/lib/carrier-registry.mjs 的 CARRIERS / EXEMPT / KNOWN_GAP）`)
    }
  }

  for (const entry of [...carriers, ...exempt, ...knownGap, ...tooling]) {
    const path = join(root, entry.module)
    if (!existsSync(path)) {
      problems.push(`${entry.module} → 登记项指向的模块不存在`)
      continue
    }
    if (entry.symbol !== undefined && !readFileSync(path, 'utf8').includes(entry.symbol)) {
      problems.push(`${entry.module} → 登记符号 ${entry.symbol} 不在文件里`)
    }
    if (entry.bug !== undefined && !bugCardExists(root, entry.bug)) {
      problems.push(`${entry.module} → KNOWN_GAP 指向的 ${entry.bug} 卡不存在（活跃/归档均无）`)
    }
  }

  for (const entry of tooling) {
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      problems.push(`${entry.module} → WORKSPACE_TOOLING 必须写 reason（为什么这个工具绕 company-root）`)
    }
    if (typeof entry.symbol !== 'string' || entry.symbol.trim() === '') {
      problems.push(`${entry.module} → WORKSPACE_TOOLING 必须写 symbol（登记入口里出现的锚字符串）`)
    }
  }

  for (const primRel of markdownPrimitives) {
    if (existsSync(join(root, 'tools/lib')) && !existsSync(join(root, primRel))) {
      problems.push(`${primRel} → 注册的 Markdown 原语模块不存在`)
    }
  }
  const rawScan = scanRawParsingProblems(root, markdownPrimitives)
  problems.push(...rawScan.problems, ...scanToolingProblems(root, tooling))

  for (const skillRoot of ['packages/company-pack', '.agents/skills']) {
    const absSkillRoot = join(root, skillRoot)
    if (!existsSync(absSkillRoot)) continue
    for (const skillPath of walk(absSkillRoot, 'SKILL.md')) {
      const rel = skillPath.slice(root.length + 1)
      const parsed = parseFrontmatter(readFileSync(skillPath, 'utf8'))
      if (!parsed.present || parsed.error !== undefined) {
        problems.push(`${rel}:1 → SKILL.md YAML frontmatter 不可解析（DSH 运行时会静默丢弃该技能）：${parsed.error ?? '缺 frontmatter'}`)
      }
    }
  }

  const gaps = knownGap.map(entry => entry.bug).filter((bug, index, all) => all.indexOf(bug) === index)
  const gapText = knownGap.length === 0 ? 'knownGap 0' : `knownGap ${String(knownGap.length)}：${gaps.join('、')}`
  const rawNote = rawScan.scanned > 0 ? ` / 禁裸解析 ×${String(rawScan.scanned)}` : ''
  const toolingNote = tooling.length > 0 ? ` / 工具盘入口 ${String(tooling.length)}` : ''
  problems.length === 0
    ? ok(`company-root-carriers ×${String(files.length)} 文件（写面文件 ${String(writers)} / ${gapText}${rawNote}${toolingNote}）`)
    : fail('company-root-carriers', problems.join('；'))
}
