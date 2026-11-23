/**
 * Company pack domain static audit (TS Compiler API, zero external dependencies).
 *
 * Rules:
 * - R1 (`must-use-boundary`, blocking): TypeChecker-based check ensuring callers that read data
 *   fields from boundary-bearing types (`WorkspaceTextRead`, `DeliverablesCatalog`, `PendingApprovals`,
 *   `MotionLedger`, `Bounded`, `PendingAcrossSessions`, `HistoryCandidates`, `ContextSourceResult`,
 *   `CultivationPanelData`, or `workspaceFiles.read`) also consume the corresponding diagnostic/boundary
 *   fields (`eof`, `skipped`, `capped`, `truncated`, `badRows`, `headerOk`, ...) or forward the whole container.
 * - R2 (`no-literal-cjk-or-punct`, blocking): AST check ensuring zero literal CJK strings or JSX text
 *   or hardcoded Chinese joiners (`.join('、'|'；')`) inside `src/client/**` (outside explicit dictionaries),
 *   ratchet in `src/lib/**` and `src/host/**` (host ratchet map; host entry `src/index.ts` included).
 * - R3 (`no-type-escape`, blocking for `undefined/null as never`; baseline for remaining): AST check for
 *   type escapes (`undefined/null as never`, general `as never`, and `JSON.parse(...) as T`).
 * - R4 (`hygiene-smells`, read-only): Counts silent catches without `// intentional-fallback:`, JSX
 *   `defaultValue=`, and `x === undefined || ...` fail-open guards.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'

const CLIENT_DICT_FILES = new Set([
  'packages/company-pack/src/client/locales.ts',
  'packages/company-pack/src/client/cultivation/cultivation-copy.ts',
  'packages/company-pack/src/client/ui/list-separator.ts',
])

/** Legacy `src/lib/**` files that host non-UI CLI diagnostics/markdown regexes (ratchet: max literal count). */
export const LIB_CJK_RATCHET = new Map([
  ['packages/company-pack/src/lib/accounting/budget.ts', 4],
  ['packages/company-pack/src/lib/accounting/ledger.ts', 11],
  ['packages/company-pack/src/lib/accounting/signoff.ts', 7],
  ['packages/company-pack/src/lib/cultivation/cultivation-context.ts', 62],
  ['packages/company-pack/src/lib/cultivation/cultivation-inbox.ts', 1],
  ['packages/company-pack/src/lib/cultivation/cultivation-record.ts', 6],
  ['packages/company-pack/src/lib/deliverables/deliverables-catalog.ts', 9],
  ['packages/company-pack/src/lib/docs/prd-check.ts', 120],
  // 46（2026-11-24）：BUG-338 把诊断句成对化后，模板片段计数 +1；en 对已随 `text` 参数走命令面。
  ['packages/company-pack/src/lib/docs/requirements-check.ts', 46],
  ['packages/company-pack/src/lib/presence/board.ts', 11],
  ['packages/company-pack/src/lib/presence/doors.ts', 1],
  ['packages/company-pack/src/lib/presence/presence-status.ts', 6],
  ['packages/company-pack/src/lib/presence/presence.ts', 30],
  ['packages/company-pack/src/lib/shared/role-copy.ts', 18],
  ['packages/company-pack/src/lib/startup/startup-command-copy.ts', 5],
])

const BOUNDARY_SPECS = [
  {
    name: 'WorkspaceTextRead',
    dataProps: ['text'],
    boundaryProps: ['eof'],
  },
  {
    name: 'DeliverablesCatalog',
    dataProps: ['entries'],
    boundaryProps: ['skipped'],
  },
  {
    name: 'Bounded',
    requiredProps: ['items', 'capped', 'truncated'],
    dataProps: ['items'],
    boundaryProps: ['capped', 'truncated'],
  },
  {
    name: 'PendingApprovals',
    dataProps: ['items'],
    boundaryProps: ['capped'],
  },
  {
    name: 'MotionLedger',
    dataProps: ['rows'],
    boundaryProps: ['badRows', 'headerOk'],
    // BUG-340：坏行与表头都不能单丢（badRows=静默少报行；headerOk=false=把空表说成 0 场，BUG-311）。
    requiredBoundaryProps: ['badRows', 'headerOk'],
  },
  {
    // BUG-340：跨会话重建结果（BUG-304/305/318/323）过去不在纳管面。
    name: 'PendingAcrossSessions',
    dataProps: ['items'],
    boundaryProps: ['asksCapped', 'failed', 'window'],
    requireAllBoundaryProps: true,
  },
  {
    name: 'HistoryCandidates',
    dataProps: ['ids'],
    boundaryProps: ['capped', 'total'],
    requireAllBoundaryProps: true,
  },
  {
    name: 'ContextSourceResult',
    dataProps: ['value'],
    boundaryProps: ['skipped', 'capped'],
    // 会话路径只产 capped，skipped 仅成品索引路径；只把共同产物 capped 设为必读（盲审 finding 5）。
    requiredBoundaryProps: ['capped'],
  },
  {
    name: 'CultivationPanelData',
    dataProps: ['journalRows', 'records'],
    boundaryProps: ['recordsProblem', 'brokenRecords', 'unexpandedRecords'],
    requireAllBoundaryProps: true,
  },
]

/**
 * `src/host/**` 的 CJK 基线（BUG-340）：host 命令/日志面向用户时也该随语言，但存量很大。
 * 先按文件棘轮上线（新文件 = 0），确认真实面零误报后再逐文件收紧/阻断。
 */
export const HOST_CJK_RATCHET = new Map([
  ['packages/company-pack/src/index.ts', 88], // host 入口（盲审 finding 7：此前完全跳过扫描；88 = 模板片段计数）
  ['packages/company-pack/src/host/commands/blocked-text.ts', 5],
  ['packages/company-pack/src/host/commands/client-diagnostics.ts', 10],
  ['packages/company-pack/src/host/commands/deliverable-path.ts', 7],
  ['packages/company-pack/src/host/commands/deliverables-command.ts', 12],
  ['packages/company-pack/src/host/commands/delivery-command.ts', 33],
  ['packages/company-pack/src/host/commands/prd-command.ts', 14],
  ['packages/company-pack/src/host/commands/prd-gate.ts', 28],
  ['packages/company-pack/src/host/commands/req-command.ts', 52],
  ['packages/company-pack/src/host/commands/settings-command.ts', 31],
  ['packages/company-pack/src/host/commands/signoff-tool.ts', 3],
  ['packages/company-pack/src/host/cultivation/cultivation-context-read.ts', 21],
  ['packages/company-pack/src/host/cultivation/cultivation-storage.ts', 13],
  ['packages/company-pack/src/host/cultivation/cultivation.ts', 211],
  ['packages/company-pack/src/host/cultivation/revoke-journal.ts', 10],
  ['packages/company-pack/src/host/delegation/subagent-retry.ts', 11],
  ['packages/company-pack/src/host/language/company-language.ts', 7],
  ['packages/company-pack/src/host/ledger/catalog-state.ts', 8],
  ['packages/company-pack/src/host/ledger/catalog.ts', 28],
  ['packages/company-pack/src/host/ledger/governance-export.ts', 6],
  ['packages/company-pack/src/host/ledger/presented-domain.ts', 22],
  ['packages/company-pack/src/host/ledger/presented-ledger.ts', 29],
  ['packages/company-pack/src/host/prompt/contracts.ts', 1],
  ['packages/company-pack/src/host/prompt/delegation-contracts.ts', 1],
  ['packages/company-pack/src/host/prompt/handbook.ts', 7],
  ['packages/company-pack/src/host/prompt/language-policy.ts', 6],
  ['packages/company-pack/src/host/run-bundle/bootstrap.ts', 62],
  ['packages/company-pack/src/host/run-bundle/bundle-manifest.ts', 24],
  ['packages/company-pack/src/host/run-bundle/company-root.ts', 43],
  ['packages/company-pack/src/host/run-bundle/config.ts', 4],
  ['packages/company-pack/src/host/run-bundle/lease.ts', 12],
  ['packages/company-pack/src/host/run-bundle/runtime-guard.ts', 36],
  ['packages/company-pack/src/host/run-bundle/write-gate.ts', 1],
  ['packages/company-pack/src/host/startup/startup-prompt.ts', 20],
  ['packages/company-pack/src/host/startup/startup-watch.ts', 4],
  ['packages/company-pack/src/host/workspace/workspace-resolution.ts', 2],
])

const CJK_RE = /[\u3400-\u9fff\u3001-\u303f\uff00-\uffef]/u
const CHINESE_JOINER_RE = /^[、；]$/

const toPosix = (p) => p.replace(/\\/g, '/')

function lineOf(sf, node) {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf))
  return { line: line + 1, col: character + 1 }
}

/** Parse tsconfig and throw loudly on errors so broken configs cannot silently pass empty audits. */
export function loadTsProgram(tsconfigPath) {
  const absConfig = resolve(tsconfigPath)
  const raw = ts.readConfigFile(absConfig, (path) => readFileSync(path, 'utf8'))
  if (raw.error) {
    throw new Error(`tsconfig read failed (${absConfig}): ${ts.flattenDiagnosticMessageText(raw.error.messageText, '\n')}`)
  }
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, resolve(absConfig, '..'))
  if (parsed.errors.length > 0) {
    const msg = parsed.errors.map(e => ts.flattenDiagnosticMessageText(e.messageText, '\n')).join('; ')
    throw new Error(`tsconfig parse failed (${absConfig}): ${msg}`)
  }
  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: { ...parsed.options, noEmit: true, skipLibCheck: true, skipDefaultLibCheck: true },
  })
}

/** Create an in-memory TypeScript program for negative-control testing without touching repo files. */
export function createVirtualProgram(filesMap, compilerOptions = {}) {
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    jsx: ts.JsxEmit.ReactJSX,
    noEmit: true,
    ...compilerOptions,
  }
  const defaultHost = ts.createCompilerHost(options)
  const normFiles = new Map()
  for (const [k, v] of Object.entries(filesMap)) normFiles.set(resolve(k), v)
  const host = {
    ...defaultHost,
    fileExists: (fileName) => normFiles.has(resolve(fileName)) || defaultHost.fileExists(fileName),
    readFile: (fileName) => normFiles.get(resolve(fileName)) ?? defaultHost.readFile(fileName),
    getSourceFile: (fileName, lang, onError, shouldCreate) => {
      const text = normFiles.get(resolve(fileName))
      if (text !== undefined) return ts.createSourceFile(fileName, text, lang, true)
      return defaultHost.getSourceFile(fileName, lang, onError, shouldCreate)
    },
  }
  return ts.createProgram([...normFiles.keys()], options, host)
}

function unwrapPromiseType(checker, type) {
  return checker.getAwaitedType(type) ?? type
}

function hasBoundaryPropsOf(member, spec) {
  return spec.requireAllBoundaryProps === true
    ? spec.boundaryProps.every(p => member.getProperty(p) !== undefined)
    : spec.boundaryProps.some(p => member.getProperty(p) !== undefined)
}

function matchBoundarySpec(checker, type, callExpr) {
  const target = unwrapPromiseType(checker, type)
  // Direct or nullable union of named boundary interface (e.g. DeliverablesCatalog | null)
  const members = target.isUnion() ? target.types : [target]
  for (const member of members) {
    if (member.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined)) continue
    for (const spec of BOUNDARY_SPECS) {
      const hasRequired = (spec.requiredProps ?? []).every(p => member.getProperty(p) !== undefined)
      const hasData = spec.dataProps.some(p => member.getProperty(p) !== undefined)
      // 盲审 finding 2：匹配口径必须与判据一致，否则「只带部分边界」的无关类型会被永久误报。
      const hasBoundary = (hasBoundaryPropsOf(member, spec)) &&
        (spec.requiredBoundaryProps ?? []).every(p => member.getProperty(p) !== undefined)
      if (hasRequired && hasData && hasBoundary) return { ...spec, viaValueWrapper: false }
    }
    // Check workspaceFiles.read style wrapper: { ok: true; value: { text: string; eof?: boolean } }
    const okProp = member.getProperty('ok')
    const valProp = member.getProperty('value')
    if (okProp !== undefined && valProp !== undefined) {
      const loc = valProp.valueDeclaration ?? member.symbol?.valueDeclaration ?? callExpr
      const valType = checker.getTypeOfSymbolAtLocation(valProp, loc)
      if (valType && valType.getProperty('text') !== undefined && valType.getProperty('eof') !== undefined) {
        return { name: 'WorkspaceReadResult', dataProps: ['text'], boundaryProps: ['eof'], viaValueWrapper: true }
      }
    }
  }
  return null
}

function findEnclosingScope(node) {
  let cur = node.parent
  while (cur) {
    if (
      ts.isBlock(cur) ||
      ts.isArrowFunction(cur) ||
      ts.isFunctionDeclaration(cur) ||
      ts.isFunctionExpression(cur) ||
      ts.isMethodDeclaration(cur) ||
      ts.isSourceFile(cur)
    ) {
      return cur
    }
    cur = cur.parent
  }
  return node.getSourceFile()
}

function isDiagnosticSinkCall(callExpr, argNode) {
  if (!callExpr.arguments.includes(argNode)) return false
  const callee = callExpr.expression
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    const owner = callee.expression.text
    if (owner === 'console' || owner === 'JSON') return true
  }
  return false
}

function isPassedOrReturnedWhole(idNode) {
  const p = idNode.parent
  if (!p) return false
  if (ts.isReturnStatement(p) && p.expression === idNode) return true
  if (ts.isArrowFunction(p) && p.body === idNode) return true
  if (ts.isCallExpression(p) && p.arguments.includes(idNode)) return !isDiagnosticSinkCall(p, idNode)
  if (ts.isSpreadAssignment(p) && p.expression === idNode) return true
  if (ts.isShorthandPropertyAssignment(p) && p.name === idNode) return true
  if (ts.isPropertyAssignment(p) && p.initializer === idNode) return true
  if (ts.isJsxExpression(p) && p.expression === idNode) return true
  if (ts.isArrayLiteralExpression(p) && p.elements.includes(idNode)) return true
  if (ts.isConditionalExpression(p) && (p.whenTrue === idNode || p.whenFalse === idNode)) return true
  return false
}

function collectObjectBindingProps(bindingPattern, acc = new Set(), valueBindings = []) {
  if (!ts.isObjectBindingPattern(bindingPattern)) return acc
  for (const el of bindingPattern.elements) {
    const propName = el.propertyName && ts.isIdentifier(el.propertyName)
      ? el.propertyName.text
      : (ts.isIdentifier(el.name) ? el.name.text : null)
    if (propName) acc.add(propName)
    if (ts.isObjectBindingPattern(el.name)) {
      collectObjectBindingProps(el.name, acc, valueBindings)
    } else if (propName === 'value' && ts.isIdentifier(el.name)) {
      valueBindings.push(el.name)
    }
  }
  return acc
}

function scanSymbolProps(checker, scope, symNodes, spec, accessedProps) {
  let forwarded = false
  const symbols = new Set(symNodes.map(n => checker.getSymbolAtLocation(n)).filter(Boolean))
  if (symbols.size === 0) return true

  function scanUsage(node) {
    if (symNodes.includes(node)) {
      ts.forEachChild(node, scanUsage)
      return
    }
    if (ts.isIdentifier(node) && symbols.has(checker.getSymbolAtLocation(node))) {
      const p = node.parent
      if (ts.isPropertyAccessExpression(p) && p.expression === node) {
        const propName = p.name.text
        accessedProps.add(propName)
        if (spec.viaValueWrapper && propName === 'value') {
          if (ts.isPropertyAccessExpression(p.parent) && p.parent.expression === p) {
            accessedProps.add(p.parent.name.text)
          } else if (ts.isVariableDeclaration(p.parent) && ts.isObjectBindingPattern(p.parent.name)) {
            collectObjectBindingProps(p.parent.name, accessedProps)
          } else if (isPassedOrReturnedWhole(p)) {
            forwarded = true
          }
        }
      } else if (ts.isVariableDeclaration(p) && ts.isObjectBindingPattern(p.name)) {
        const nestedValues = []
        collectObjectBindingProps(p.name, accessedProps, nestedValues)
        for (const nv of nestedValues) symNodes.push(nv)
        for (const nv of nestedValues) {
          const s = checker.getSymbolAtLocation(nv)
          if (s) symbols.add(s)
        }
      } else if (isPassedOrReturnedWhole(node)) {
        forwarded = true
      }
    }
    ts.forEachChild(node, scanUsage)
  }
  ts.forEachChild(scope, scanUsage)
  return forwarded
}

function findEnclosingArrow(node) {
  let cur = node.parent
  while (cur) {
    if (ts.isArrowFunction(cur) || ts.isFunctionDeclaration(cur) || ts.isFunctionExpression(cur)) return cur
    cur = cur.parent
  }
  return null
}

function unwrapBoundaryWrapper(callExpr) {
  let valueExpr = callExpr
  while (valueExpr.parent) {
    const p = valueExpr.parent
    if (
      ts.isAwaitExpression(p) ||
      ts.isParenthesizedExpression(p) ||
      ts.isNonNullExpression(p) ||
      ts.isAsExpression(p) ||
      ts.isSatisfiesExpression(p)
    ) {
      valueExpr = p
      continue
    }
    if (ts.isConditionalExpression(p) && (p.whenTrue === valueExpr || p.whenFalse === valueExpr)) {
      valueExpr = p
      continue
    }
    if (
      ts.isBinaryExpression(p) &&
      (p.operatorToken.kind === ts.SyntaxKind.BarBarToken || p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) &&
      // BUG-340：`call() ?? fallback` 的左枝同样是「消费边界结果」，过去只解右枝。
      (p.right === valueExpr || p.left === valueExpr)
    ) {
      valueExpr = p
      continue
    }
    if (
      ts.isArrowFunction(p) &&
      p.body === valueExpr &&
      ts.isCallExpression(p.parent) &&
      ts.isIdentifier(p.parent.expression) &&
      p.parent.expression.text === 'useMemo'
    ) {
      valueExpr = p.parent
      continue
    }
    if (ts.isReturnStatement(p) && p.expression === valueExpr) {
      const fn = findEnclosingArrow(p)
      if (fn && ts.isArrowFunction(fn) && ts.isCallExpression(fn.parent) && ts.isIdentifier(fn.parent.expression) && fn.parent.expression.text === 'useMemo') {
        valueExpr = fn.parent
        continue
      }
    }
    break
  }
  return valueExpr
}

/** R1: Inspect a variable/expression receiving a boundary-bearing call result. */
function checkCallBoundaryUse(checker, sf, relFile, callExpr, spec, violations) {
  // BUG-340：`const [a] = await Promise.all([readA(), readB()])` 的位置绑定也要追踪。
  let tracked = callExpr
  let promiseAllIndex = -1
  const container = callExpr.parent
  if (ts.isArrayLiteralExpression(container) && container.elements.includes(callExpr)) {
    // `Promise.all([...])`：数组字面量的 parent 就是 all(...) 调用，callee 在它上面。
    const allCall = container.parent
    if (ts.isCallExpression(allCall) && allCall.arguments.includes(container)) {
      const callee = allCall.expression
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'all' &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'Promise'
      ) {
        const index = container.elements.indexOf(callExpr)
        // 盲审 finding 4：前面有 spread 时源码下标 ≠ 运行时下标，按位置追踪会误判。
        if (container.elements.slice(0, index).some(element => ts.isSpreadElement(element))) {
          promiseAllIndex = -2
          tracked = allCall
        } else {
          promiseAllIndex = index
          tracked = allCall
        }
      }
    }
  }
  if (promiseAllIndex === -2) return
  const valueExpr = unwrapBoundaryWrapper(tracked)
  const parent = valueExpr.parent
  // Case 1: Inline property access: `(parseCatalog(x))?.entries`
  if (ts.isPropertyAccessExpression(parent) && parent.expression === valueExpr) {
    const prop = parent.name.text
    if (spec.dataProps.includes(prop) || (spec.viaValueWrapper && prop === 'value')) {
      const { line, col } = lineOf(sf, callExpr)
      violations.push({
        rule: 'R1:must-use-boundary',
        file: relFile,
        line,
        col,
        message: `${spec.name} reads '.${prop}' inline without checking ${spec.boundaryProps.join('/')}`,
      })
    }
    return
  }

  // Case 2: Bound to variable or destructured
  let varDecl = null
  if (ts.isVariableDeclaration(parent) && parent.initializer === valueExpr) {
    varDecl = parent
  } else if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken && parent.right === valueExpr) {
    varDecl = { name: parent.left, initializer: valueExpr, parent: parent.parent }
  }
  if (!varDecl) return

  const scope = findEnclosingScope(valueExpr)
  const accessedProps = new Set()

  // Case 2a: Direct destructuring `const { entries } = parseCatalog(x)` or `const { value } = await remoteRead()`
  if (ts.isObjectBindingPattern(varDecl.name)) {
    const valueBindings = []
    collectObjectBindingProps(varDecl.name, accessedProps, valueBindings)
    const forwarded = valueBindings.length > 0 && spec.viaValueWrapper
      ? scanSymbolProps(checker, scope, valueBindings, spec, accessedProps)
      : false
    if (forwarded) return
    const readsData = spec.dataProps.some(p => accessedProps.has(p))
    const readsBoundary = (spec.requireAllBoundaryProps === true
      ? spec.boundaryProps.every(p => accessedProps.has(p))
      : spec.boundaryProps.some(p => accessedProps.has(p)))
      && (spec.requiredBoundaryProps ?? []).every(p => accessedProps.has(p))
    if (readsData && !readsBoundary) {
      const { line, col } = lineOf(sf, callExpr)
      violations.push({
        rule: 'R1:must-use-boundary',
        file: relFile,
        line,
        col,
        message: `${spec.name} destructures data without ${spec.boundaryProps.join('/')}`,
      })
    }
    return
  }

  // Case 2b: Array destructuring from Promise.all — track the element at the same position.
  if (ts.isArrayBindingPattern(varDecl.name) && promiseAllIndex >= 0) {
    const element = varDecl.name.elements[promiseAllIndex]
    if (element === undefined) return
    // 盲审 finding 3：`const [{ rows }] = await Promise.all([...])` 也要按对象解构判。
    if (ts.isObjectBindingPattern(element.name)) {
      collectObjectBindingProps(element.name, accessedProps)
      const readsDataNested = spec.dataProps.some(p => accessedProps.has(p))
      const readsBoundaryNested = (spec.requireAllBoundaryProps === true
        ? spec.boundaryProps.every(p => accessedProps.has(p))
        : spec.boundaryProps.some(p => accessedProps.has(p)))
        && (spec.requiredBoundaryProps ?? []).every(p => accessedProps.has(p))
      if (readsDataNested && !readsBoundaryNested) {
        const { line, col } = lineOf(sf, callExpr)
        violations.push({
          rule: 'R1:must-use-boundary',
          file: relFile,
          line,
          col,
          message: `${spec.name} destructures data from Promise.all without ${spec.boundaryProps.join('/')}`,
        })
      }
      return
    }
    if (!ts.isIdentifier(element.name)) return
    const forwardedArray = scanSymbolProps(checker, scope, [element.name], spec, accessedProps)
    if (forwardedArray) return
    const readsDataArray = spec.dataProps.some(p => accessedProps.has(p))
    const readsBoundaryArray = (spec.requireAllBoundaryProps === true
      ? spec.boundaryProps.every(p => accessedProps.has(p))
      : spec.boundaryProps.some(p => accessedProps.has(p)))
      && (spec.requiredBoundaryProps ?? []).every(p => accessedProps.has(p))
    if (readsDataArray && !readsBoundaryArray) {
      const { line, col } = lineOf(sf, callExpr)
      violations.push({
        rule: 'R1:must-use-boundary',
        file: relFile,
        line,
        col,
        message: `${spec.name} destructures data from Promise.all without ${spec.boundaryProps.join('/')}`,
      })
    }
    return
  }

  if (!ts.isIdentifier(varDecl.name)) return
  const forwarded = scanSymbolProps(checker, scope, [varDecl.name], spec, accessedProps)
  if (forwarded) return
  const readsData = spec.dataProps.some(p => accessedProps.has(p))
  const readsBoundary = (spec.requireAllBoundaryProps === true
    ? spec.boundaryProps.every(p => accessedProps.has(p))
    : spec.boundaryProps.some(p => accessedProps.has(p)))
    && (spec.requiredBoundaryProps ?? []).every(p => accessedProps.has(p))
  if (readsData && !readsBoundary) {
    const { line, col } = lineOf(sf, callExpr)
    violations.push({
      rule: 'R1:must-use-boundary',
      file: relFile,
      line,
      col,
      message: `${spec.name} reads data (${spec.dataProps.filter(p => accessedProps.has(p)).join(', ')}) without reading ${spec.boundaryProps.join('/')}`,
    })
  }
}

function isInTypeContext(node) {
  let cur = node.parent
  while (cur) {
    if (ts.isTypeNode(cur) || ts.isImportDeclaration(cur) || ts.isExportDeclaration(cur)) return true
    if (ts.isExpression(cur) || ts.isStatement(cur) || ts.isJsxElement(cur) || ts.isJsxSelfClosingElement(cur)) return false
    cur = cur.parent
  }
  return false
}

function checkCjkInFile(sf, relFile, violations, libCounts) {
  const isClient = relFile.startsWith('packages/company-pack/src/client/')
  const isLib = relFile.startsWith('packages/company-pack/src/lib/')
  const isHost = relFile.startsWith('packages/company-pack/src/host/') || relFile === 'packages/company-pack/src/index.ts'
  if (!isClient && !isLib && !isHost) return
  const isClientDict = CLIENT_DICT_FILES.has(relFile)

  let cjkCount = 0

  function visit(node) {
    // Skip RegExp literals and import/export paths and pure TypeScript type literals
    if (ts.isRegularExpressionLiteral(node)) return

    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) &&
      !isInTypeContext(node)
    ) {
      const rawText = node.text
      const text = relFile === 'packages/company-pack/src/client/ui/styles.ts'
        ? rawText.replace(/\/\*[\s\S]*?\*\//g, '')
        : rawText
      if (
        isClient &&
        !isClientDict &&
        CHINESE_JOINER_RE.test(text) &&
        ts.isCallExpression(node.parent) &&
        ts.isPropertyAccessExpression(node.parent.expression) &&
        node.parent.expression.name.text === 'join'
      ) {
        const { line, col } = lineOf(sf, node)
        violations.push({
          rule: 'R2:no-literal-cjk-or-punct',
          file: relFile,
          line,
          col,
          message: `Hardcoded Chinese join separator .join(${JSON.stringify(text)}) — use listSeparator(t) / clauseSeparator(t)`,
        })
      } else if (CJK_RE.test(text)) {
        cjkCount += 1
        if (isClient && !isClientDict) {
          const { line, col } = lineOf(sf, node)
          violations.push({
            rule: 'R2:no-literal-cjk-or-punct',
            file: relFile,
            line,
            col,
            message: `Hardcoded CJK string in src/client: ${JSON.stringify(text.slice(0, 40))}`,
          })
        }
      }
    } else if (ts.isJsxText(node)) {
      const trimmed = node.getText(sf).trim()
      if (trimmed !== '' && CJK_RE.test(trimmed)) {
        cjkCount += 1
        if (isClient && !isClientDict) {
          const { line, col } = lineOf(sf, node)
          violations.push({
            rule: 'R2:no-literal-cjk-or-punct',
            file: relFile,
            line,
            col,
            message: `Hardcoded CJK JSX text in src/client: ${JSON.stringify(trimmed.slice(0, 40))}`,
          })
        }
      }
    }

    ts.forEachChild(node, visit)
  }
  ts.forEachChild(sf, visit)

  if (isLib || isHost) {
    libCounts.set(relFile, cjkCount)
    const allowed = isHost ? (HOST_CJK_RATCHET.get(relFile) ?? 0) : (LIB_CJK_RATCHET.get(relFile) ?? 0)
    if (cjkCount > allowed) {
      violations.push({
        rule: 'R2:no-literal-cjk-or-punct',
        file: relFile,
        line: 1,
        col: 1,
        message: `${isHost ? 'src/host' : 'src/lib'} CJK count ${cjkCount} exceeds ratchet ${allowed} — render user-visible text in client locales`,
      })
    }
  }
}

function isUndefinedOrNullExpr(expr) {
  if (expr.kind === ts.SyntaxKind.NullKeyword) return true
  if (ts.isIdentifier(expr) && expr.text === 'undefined') return true
  if (ts.isParenthesizedExpression(expr)) return isUndefinedOrNullExpr(expr.expression)
  return false
}

function isJsonParseCall(expr) {
  const inner = ts.isParenthesizedExpression(expr) ? expr.expression : expr
  if (!ts.isCallExpression(inner)) return false
  const callee = inner.expression
  return (
    ts.isPropertyAccessExpression(callee) &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'JSON' &&
    callee.name.text === 'parse'
  )
}

function checkTypeEscapesAndSmells(sf, relFile, violations, metrics) {
  const fullText = sf.getFullText()

  function visit(node) {
    // R3: `as never` & `JSON.parse(...) as T`
    if (ts.isAsExpression(node)) {
      if (node.type.kind === ts.SyntaxKind.NeverKeyword) {
        if (isUndefinedOrNullExpr(node.expression)) {
          const { line, col } = lineOf(sf, node)
          violations.push({
            rule: 'R3:no-type-escape',
            file: relFile,
            line,
            col,
            message: 'Forbidden `undefined as never` / `null as never` — fix the contract or use an explicit test fixture',
          })
        } else {
          metrics.asNever += 1
        }
      } else if (isJsonParseCall(node.expression)) {
        metrics.jsonParseAs += 1
      }
    }

    // R4 read-only hygiene smells
    if (ts.isCatchClause(node)) {
      const stmts = node.block.statements
      const rawBlock = fullText.slice(node.block.getStart(sf), node.block.getEnd())
      const hasFallbackTag = rawBlock.includes('intentional-fallback:')
      if (stmts.length === 0 && !hasFallbackTag) {
        metrics.silentCatch += 1
      }
    }
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && node.name.text === 'defaultValue') {
      metrics.jsxDefaultValue += 1
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
      const left = node.left
      if (
        ts.isBinaryExpression(left) &&
        left.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
        ((ts.isIdentifier(left.right) && left.right.text === 'undefined') ||
          (ts.isIdentifier(left.left) && left.left.text === 'undefined'))
      ) {
        metrics.failOpenUndefined += 1
      }
    }

    ts.forEachChild(node, visit)
  }
  ts.forEachChild(sf, visit)
}

/**
 * Run R1/R2/R3/R4 static audit across one or more TypeScript programs.
 * @param {string} root - Repository root.
 * @param {{ tsconfigs?: readonly string[]; programs?: readonly ts.Program[] }} [options]
 */
export function runStaticAudit(root, options = {}) {
  const tsconfigRelPaths = options.tsconfigs ?? [
    'packages/company-pack/tsconfig.client.json',
    'packages/company-pack/tsconfig.host.json',
  ]
  const programs = options.programs ?? tsconfigRelPaths.map((rel) => loadTsProgram(join(root, rel)))

  const seenR1 = new Set()
  const seenAstFiles = new Set()
  const violations = []
  const libCounts = new Map()
  const metrics = { asNever: 0, jsonParseAs: 0, silentCatch: 0, jsxDefaultValue: 0, failOpenUndefined: 0 }

  for (const program of programs) {
    const checker = program.getTypeChecker()
    for (const sf of program.getSourceFiles()) {
      if (sf.isDeclarationFile) continue
      const absFile = resolve(sf.fileName)
      const relFile = toPosix(relative(root, absFile))
      if (!relFile.startsWith('packages/company-pack/src/')) continue

      // R1 runs per-program/call because host and client programs can resolve distinct surfaces
      function walkR1(node) {
        if (ts.isCallExpression(node)) {
          const sigKey = `${relFile}:${node.getStart(sf)}:${node.getEnd()}`
          if (!seenR1.has(sigKey)) {
            const retType = checker.getTypeAtLocation(node)
            const spec = matchBoundarySpec(checker, retType, node)
            if (spec !== null) {
              seenR1.add(sigKey)
              checkCallBoundaryUse(checker, sf, relFile, node, spec, violations)
            }
          }
        }
        ts.forEachChild(node, walkR1)
      }
      ts.forEachChild(sf, walkR1)

      if (seenAstFiles.has(relFile)) continue
      seenAstFiles.add(relFile)

      checkCjkInFile(sf, relFile, violations, libCounts)
      checkTypeEscapesAndSmells(sf, relFile, violations, metrics)
    }
  }

  return {
    scannedFiles: seenAstFiles.size,
    violations,
    libCjkCounts: Object.fromEntries([...libCounts.entries()].sort(([a], [b]) => a.localeCompare(b))),
    metrics,
  }
}

export function formatStaticAuditReport(report) {
  const lines = [
    `company-static-audit: scanned=${report.scannedFiles} violations=${report.violations.length}`,
    `  metrics(baseline): asNever=${report.metrics.asNever} jsonParseAs=${report.metrics.jsonParseAs} silentCatch=${report.metrics.silentCatch} jsxDefaultValue=${report.metrics.jsxDefaultValue} failOpenUndefined=${report.metrics.failOpenUndefined}`,
  ]
  for (const v of report.violations) {
    lines.push(`  FAIL [${v.rule}] ${v.file}:${v.line}:${v.col} — ${v.message}`)
  }
  return lines.join('\n')
}
