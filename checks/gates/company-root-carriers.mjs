// 状态：常驻（门禁模块，由 run-gates.mjs 装配；跑法 = pnpm verify）
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { CARRIERS, EXEMPT, KNOWN_GAP, MARKDOWN_PRIMITIVES } from '../../tools/lib/carrier-registry.mjs'
import { parseFrontmatter } from '../../tools/lib/repo-markdown.mjs'

// ── 公司盘载体与治理面单原语门禁（company-root-carriers，2026-11-13 P0；2026-11-14 W2 扩禁裸解析）──
// 为什么：
//   A) 公司盘面：BUG-144/147/148/149/150 同源——写入口自拼 `.dsh-company` 绕过 company-root。
//   B) 治理文档/门禁面：BUG-175..183 同源——门禁与 tools/lib 各自手写 `/^---\r?\n/` 与 `/^##\s+/` 裸切分，
//      绕过 `repo-markdown.mjs` / `markdown-shape-core.js` 原语（门禁文件总数不净增，并入本载体垄断门）。
// 机械对账：
//   ① src/host 里同时出现「公司盘路径特征」与「写原语」的模块，必须在 CARRIERS / EXEMPT / KNOWN_GAP 三档之一；
//   ② 登记项自身必须可解析：module 存在、CARRIERS 的 symbol 在文件里出现、KNOWN_GAP 的 bug 卡存在；
//   ③ checks/gates/*.mjs 与 tools/lib/*.mjs（排除 MARKDOWN_PRIMITIVES）的 AST 正则字面量与 RegExp 构造
//      不得出现裸 YAML frontmatter 正则或裸 Markdown `##` 节切分正则（精确报 file:line）。
// 负例留证 2026-11-13 / 2026-11-14：
//   - 新建未登记 host writer → `FAIL company-root-carriers: … → 未登记的公司盘写入口`；
//   - 在任一非原语门禁植入 `/^##\s+/` 或 `/^---\r?\n/` → `FAIL company-root-carriers: … → 禁止手写裸 …`。

const HOST = 'packages/company-pack/src/host'
const GOVERNANCE_DIRS = ['checks/gates', 'tools/lib']
const COMPANY_REF = /\.dsh-company|companyHomeOf|companyFilePath|RUN_BUNDLE_PATHS/
const WRITE_REF = /writeFileSync|appendFileSync|renameSync|mkdirSync|rmSync|cpSync|unlinkSync|linkSync|writeCompanyAtomic/
const RAW_FRONTMATTER_RE = /^\^(?:\(\?:(?:\\uFEFF|\\ufeff|\\xEF\\xBB\\xBF|\uFEFF)\)\?|(?:\\uFEFF|\\ufeff|\\xEF\\xBB\\xBF|\uFEFF)\?)?---(?:\\r\?\\n|\\n|\\s|\s|\$)/
const LEADING_WS_TOKEN = String.raw`(?:\(\?:|\()?(?:\\s| |\\t|\[[^\]]+\])(?:[*+?]|\\?\{\d+(?:,\d*)?\\?\})?\)?\??`
const RAW_HEADING_SPLIT_RE = new RegExp(
  String.raw`^\^(?:${LEADING_WS_TOKEN}){0,3}\(?#(?:\{\d+(?:,\d*)?\}|\+|#(?:\s|\\s|\[|\^|\$|\)|#|[^#]))`,
)
const RAW_FRONTMATTER_PREFIX_RE = /^(?:\uFEFF)?---\r?\n/
const RAW_SCAN_SELF = 'checks/gates/company-root-carriers.mjs'

/** 去掉块注释与整行注释；行内 `//` 保留（误报由「同时要有写原语」挡住）。 */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
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

function firstWriteLine(lines) {
  return lines.findIndex(line => WRITE_REF.test(line) && !/^\s*(import|\} from)/.test(line)) + 1
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
        } else if (RAW_HEADING_SPLIT_RE.test(pattern)) {
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
          && node.expression.name.text === 'startsWith') {
          const prefix = extractStringPattern(node.arguments?.[0])
          if (prefix !== undefined && RAW_FRONTMATTER_PREFIX_RE.test(prefix)) {
            const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
            problems.push(`${rel}:${String(line)} → 禁止手写裸 frontmatter 前缀判据 .startsWith(${JSON.stringify(prefix)})（改调 tools/lib/repo-markdown.mjs 的 parseFrontmatter）`)
          }
        }
        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
  }
  return { problems, scanned }
}

export function run({
  root,
  ok,
  fail,
  carriers = CARRIERS,
  exempt = EXEMPT,
  knownGap = KNOWN_GAP,
  markdownPrimitives = MARKDOWN_PRIMITIVES,
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
  ])
  const problems = []
  let writers = 0

  for (const absolute of files) {
    const rel = absolute.slice(root.length + 1)
    const text = stripComments(readFileSync(absolute, 'utf8'))
    if (!COMPANY_REF.test(text) || !WRITE_REF.test(text)) continue
    writers += 1
    if (!registered.has(rel)) {
      const line = firstWriteLine(text.split('\n'))
      problems.push(`${rel}:${String(line)} → 未登记的公司盘写入口（登记到 tools/lib/carrier-registry.mjs 的 CARRIERS / EXEMPT / KNOWN_GAP）`)
    }
  }

  for (const entry of [...carriers, ...exempt, ...knownGap]) {
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

  for (const primRel of markdownPrimitives) {
    if (existsSync(join(root, 'tools/lib')) && !existsSync(join(root, primRel))) {
      problems.push(`${primRel} → 注册的 Markdown 原语模块不存在`)
    }
  }
  const rawScan = scanRawParsingProblems(root, markdownPrimitives)
  problems.push(...rawScan.problems)

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
  problems.length === 0
    ? ok(`company-root-carriers ×${String(files.length)} 文件（写面文件 ${String(writers)} / ${gapText}${rawNote}）`)
    : fail('company-root-carriers', problems.join('；'))
}
