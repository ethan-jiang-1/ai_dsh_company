/** Read-only local import checks; package internals and computed module names are not proven. */
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const FORBIDDEN_MODULES = new Set(['child_process', 'http', 'https', 'net', 'dgram'])
const FORBIDDEN_CALLS = new Set(['spawn', 'spawnSync', 'execSync', 'execFile', 'execFileSync', 'fork', 'fetch'])
const FORBIDDEN_DIRECT_CALLS = new Set(['exec'])

/** Parse source without evaluating it; string fixtures and comments are not executable imports/calls. */
export function parseKeylessImports(text, fileName = 'module.mjs') {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true)
  const imports = []
  const forbiddenCalls = []
  const unresolvedImports = []
  const add = (argument, kind) => {
    if (argument && ts.isStringLiteralLike(argument)) imports.push({ specifier: argument.text, kind })
    else unresolvedImports.push(argument?.getText(source) ?? '<missing>')
  }
  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) add(node.moduleSpecifier, 'static')
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression
      if (callee.kind === ts.SyntaxKind.ImportKeyword) add(node.arguments[0], 'dynamic')
      else if (ts.isIdentifier(callee) && callee.text === 'require') add(node.arguments[0], 'require')
      const name = ts.isIdentifier(callee) ? callee.text
        : ts.isPropertyAccessExpression(callee) ? callee.name.text
          : ts.isElementAccessExpression(callee) && callee.argumentExpression && ts.isStringLiteralLike(callee.argumentExpression)
            ? callee.argumentExpression.text : undefined
      const forbidden = ts.isIdentifier(callee)
        ? FORBIDDEN_DIRECT_CALLS.has(name) || FORBIDDEN_CALLS.has(name)
        : FORBIDDEN_CALLS.has(name)
      if (forbidden) forbiddenCalls.push(name)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return {
    imports, forbiddenCalls, unresolvedImports,
    syntaxErrors: source.parseDiagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')),
  }
}

/** Reject process/network builtin imports, including Node's unprefixed spelling. */
export function isForbiddenKeylessModule(specifier) {
  return FORBIDDEN_MODULES.has(specifier.replace(/^node:/, '').split('/')[0])
}

const inside = (root, path) => {
  const part = relative(root, path)
  return part !== '..' && !part.startsWith(`..${sep}`) && !isAbsolute(part)
}

/** Resolve only local literal module references; package names stay outside this bounded graph. */
export function localImportPath(file, specifier) {
  if (specifier.startsWith('file:')) return fileURLToPath(specifier)
  if (!specifier.startsWith('.') && !isAbsolute(specifier)) return undefined
  return resolve(dirname(file), specifier.replace(/[?#].*$/, ''))
}

/**
 * Inspect each reachable local file once, following static/dynamic literals and re-exports.
 * Defaults read bytes and real paths only; injected readers permit pure fixture graphs.
 * Returned unresolved expressions are observations, not certified-safe dependencies.
 */
export function inspectKeylessGraph(entries, {
  libRoot,
  readSource = file => readFileSync(file, 'utf8'),
  canonicalPath = file => realpathSync(file),
}) {
  const root = canonicalPath(resolve(libRoot))
  const visited = new Set()
  const violations = []
  const unresolvedImports = []
  const visit = (candidate, chain) => {
    let file
    try {
      file = canonicalPath(candidate)
    } catch (error) {
      violations.push({ file: candidate, reason: `unreadable local dependency: ${error.message}`, chain: [...chain, candidate] })
      return
    }
    const report = reason => violations.push({ file, reason, chain: [...chain, file] })
    /* canonicalPath is applied before containment so filesystem aliases cannot
       make an external dependency look like a lib-local file. */
    if (!inside(root, file)) { report('local dependency leaves scripts/lib'); return }
    if (visited.has(file)) return
    visited.add(file)
    let text
    try {
      text = readSource(file)
    } catch (error) {
      report(`unreadable local dependency: ${error.message}`)
      return
    }
    const parsed = parseKeylessImports(text, file)
    for (const error of parsed.syntaxErrors) report(`syntax error: ${error}`)
    for (const name of parsed.forbiddenCalls) report(`forbidden runtime call: ${name}`)
    for (const expression of parsed.unresolvedImports) unresolvedImports.push({ file, expression })
    for (const { specifier } of parsed.imports) {
      if (isForbiddenKeylessModule(specifier)) report(`forbidden builtin: ${specifier}`)
      const target = localImportPath(file, specifier)
      if (target !== undefined) visit(target, [...chain, file])
    }
  }
  for (const entry of entries) visit(resolve(entry), [])
  return { files: [...visited], violations, unresolvedImports }
}
