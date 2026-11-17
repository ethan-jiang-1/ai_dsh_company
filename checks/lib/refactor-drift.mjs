/**
 * 纯搬移等价清单的纯逻辑（唯一家；CLI = `checks/audit/refactor-drift-audit.mjs`）。
 *
 * 为什么需要它：结构轮的验收判据是「零行为漂移」，而机器绿灯证明不了——测试可以全绿而某条被删、
 * 被改名、断言被削弱。本模块把拆前/拆后清单的生成与比较做成可测纯函数：
 *
 * - **名字**：`<文件> :: <归一全名>`；比较时剥掉文件前缀、折叠已登记的 describe 域名（纯搬移放行）。
 * - **指纹**：`--hashes` 的判别面不是标题，而是**测试体**。vitest JSON 只有标题；本模块按
 *   `file.name` 回读源码，用 TypeScript AST 找到 `describe`/`it`/`test` 的字面量标题与回调体，
 *   把回调体归一化（TypeScript printer + 去注释 + 压空白）后 sha256。标题是参数化/非字面量时
 *   退回标题指纹，并在 `manifestFromReport()` 里如实计数——**退回不是证明**。
 * - **比较**：多重集差，不是集合差。拆前同名同指纹两条、拆后一条必须判红（BUG-202）。
 *
 * 边界（明说）：它证明「清单里这些测试体一字未动」，不证明「体里的断言仍有意义」；后者归语义审。
 * 参数化标题（`it.each`）与无法定位的测试只退到标题指纹，清单生成时的 stderr 会点名条数。
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

export const DEFAULT_DESCRIBE_MAP = {
  '交付物三态判据（R4：keyless 行为层）': '交付物判据·域',
  '交付物形状与身份（R4 判据的基座半边）': '交付物判据·域',
  'C1 布局：日期前缀、归档根、meta 形状': '交付物判据·域',
}

/**
 * 默认表 + `--describe-map a=b,c=d` 覆盖（未登记的标题原样保留，不猜）。
 * @param {string} [spec]
 * @returns {Record<string,string>}
 */
export function parseDescribeMap(spec) {
  const map = { ...DEFAULT_DESCRIBE_MAP }
  if (spec === undefined) return map
  for (const pair of spec.split(',')) {
    const eq = pair.indexOf('=')
    if (eq === -1) throw new Error(`--describe-map 要 a=b 形式，收到「${pair}」`)
    map[pair.slice(0, eq)] = pair.slice(eq + 1)
  }
  return map
}

/** 归一一行：剥文件前缀 + 折叠已登记的 describe 标题；其余逐字保留。 */
export function normalizeName(line, map = DEFAULT_DESCRIBE_MAP) {
  const body = line.replace(/^tests\/[^\s]*\.spec\.ts :: /, '')
  for (const [from, to] of Object.entries(map)) {
    if (body.startsWith(`${from} `)) return `${to} ${body.slice(from.length + 1)}`
  }
  return body
}

function hashText(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

/** 去注释 + 压空白（TypeScript scanner；字符串里的 `//` 不会被误删）。 */
export function normalizeCode(text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.Standard, text)
  const tokens = []
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia) continue
    tokens.push(text.slice(scanner.getTokenStart(), scanner.getTokenEnd()))
  }
  return tokens.join(' ').replace(/\s+/g, ' ').trim()
}

const printer = ts.createPrinter()

/** 测试调用的 base 名与修饰（支持 `it.skipIf(x)('...', cb)` 这类嵌套调用形态）。 */
function callName(expression) {
  if (ts.isIdentifier(expression)) return { base: expression.text, modifier: undefined }
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    return { base: expression.expression.text, modifier: expression.name.text }
  }
  if (ts.isCallExpression(expression)) return callName(expression.expression)
  return { base: undefined, modifier: undefined }
}

function literalTitle(argument) {
  if (argument === undefined) return undefined
  return ts.isStringLiteralLike(argument) ? argument.text : undefined
}

function lastFunctionArgument(args) {
  for (let index = args.length - 1; index >= 0; index -= 1) {
    const argument = args[index]
    if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) return argument
  }
  return undefined
}

/**
 * 从测试源码收集 `<describe 链> <测试标题>` → 归一化测试体哈希（同名多条按源码顺序排队）。
 * @param {string} text 源文件全文。
 * @param {string} [fileName] 文件名（决定 TS 的 ScriptKind；默认 `.ts`）。
 * @returns {{hashes:Map<string,string[]>, unresolved:string[]}}
 */
export function sourceBodyHashes(text, fileName = 'module.ts') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true)
  const hashes = new Map()
  const unresolved = []
  const visit = (node, ancestors) => {
    if (ts.isCallExpression(node)) {
      const { base, modifier } = callName(node.expression)
      if (base === 'describe') {
        const title = literalTitle(node.arguments[0])
        const callback = lastFunctionArgument(node.arguments)
        if (title === undefined || callback === undefined || modifier === 'each') {
          unresolved.push(`describe ${node.getText(source).slice(0, 72)}`)
          return
        }
        ts.forEachChild(callback, child => visit(child, [...ancestors, title]))
        return
      }
      if (base === 'it' || base === 'test') {
        const title = literalTitle(node.arguments[0])
        const callback = lastFunctionArgument(node.arguments)
        if (title === undefined || callback === undefined || modifier === 'each' || modifier === 'todo') {
          unresolved.push(`${base} ${node.getText(source).slice(0, 72)}`)
          return
        }
        const fullName = [...ancestors, title].join(' ')
        const printed = printer.printNode(ts.EmitHint.Unspecified, callback.body ?? callback, source)
        const body = normalizeCode(printed)
        const prior = hashes.get(fullName) ?? []
        prior.push(hashText(body))
        hashes.set(fullName, prior)
        return
      }
    }
    ts.forEachChild(node, child => visit(child, ancestors))
  }
  visit(source, [])
  return { hashes, unresolved }
}

function relativeTestName(fileName) {
  return String(fileName ?? '').replace(/^.*\/tests\//, 'tests/')
}

/** vitest JSON 的 assertion 全名（v4 用空格连接 describe 与标题；兼容旧 reporter 的 titlePath）。 */
function assertionName(assertion) {
  if (typeof assertion.fullName === 'string' && assertion.fullName !== '') return assertion.fullName
  if (Array.isArray(assertion.titlePath) && assertion.titlePath.length > 0) return assertion.titlePath.join(' ')
  return String(assertion.title ?? '')
}

/**
 * vitest JSON → 清单条目。
 * @param {{testResults?:{name?:string,assertionResults?:{fullName?:string,title?:string,titlePath?:string[],status?:string}[]}[]}} report
 * @param {{readSource?:(file:string)=>string,withBodies?:boolean}} [options]
 * @returns {{entries:{name:string,hash:string,resolved:boolean}[], resolvedCount:number, unresolvedCount:number, unresolvedSource:string[]}}
 */
export function manifestFromReport(report, { readSource = file => readFileSync(file, 'utf8'), withBodies = true } = {}) {
  const entries = []
  const unresolvedSource = []
  let resolvedCount = 0
  let unresolvedCount = 0
  for (const file of report.testResults ?? []) {
    let sourceHashes = new Map()
    let sourceOk = false
    if (withBodies) {
      try {
        const parsed = sourceBodyHashes(readSource(file.name), file.name)
        sourceHashes = parsed.hashes
        unresolvedSource.push(...parsed.unresolved)
        sourceOk = true
      } catch {
        sourceOk = false
      }
    }
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === 'skipped') continue
      const fullName = assertionName(assertion)
      const name = `${relativeTestName(file.name)} :: ${fullName.replace(/\n/g, '\\n')}`
      const queue = sourceOk ? sourceHashes.get(fullName) : undefined
      const resolved = Array.isArray(queue) && queue.length > 0
      const hash = resolved ? queue.shift() : hashText(fullName)
      if (resolved) resolvedCount += 1
      else unresolvedCount += 1
      entries.push({ name, hash, resolved })
    }
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return { entries, resolvedCount, unresolvedCount, unresolvedSource }
}

/** 清单文件正文（一行一条；`--hashes` 带指纹，`--names` 只有名字）。 */
export function renderManifest(entries, { withHashes = true } = {}) {
  return `${entries.map(entry => (withHashes ? `${entry.name}\t${entry.hash}` : entry.name)).join('\n')}\n`
}

/** 读清单文本为可比较的行：只归一名字列，指纹原样保留。 */
export function parseManifest(text, map = DEFAULT_DESCRIBE_MAP) {
  return String(text).split('\n').filter(line => line !== '').map(line => {
    const tab = line.indexOf('\t')
    return tab === -1 ? normalizeName(line, map) : `${normalizeName(line.slice(0, tab), map)}\t${line.slice(tab + 1)}`
  }).sort()
}

/** 多重集差：重复行按出现次数扣减，不是 `Array.includes` 的集合差。 */
export function diffManifests(before, after) {
  const counts = new Map(after.map(line => [line, 0]))
  for (const line of after) counts.set(line, (counts.get(line) ?? 0) + 1)
  const onlyA = []
  for (const line of before) {
    const remaining = counts.get(line) ?? 0
    if (remaining > 0) counts.set(line, remaining - 1)
    else onlyA.push(line)
  }
  const back = new Map(before.map(line => [line, 0]))
  for (const line of before) back.set(line, (back.get(line) ?? 0) + 1)
  const onlyB = []
  for (const line of after) {
    const remaining = back.get(line) ?? 0
    if (remaining > 0) back.set(line, remaining - 1)
    else onlyB.push(line)
  }
  return { onlyA, onlyB }
}
