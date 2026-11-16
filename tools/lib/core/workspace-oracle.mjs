import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

function contains(parent, child) {
  const rel = relative(parent, child)
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))
}

function checkedPath(path) {
  const absolute = resolve(path)
  for (let cursor = absolute; ; cursor = dirname(cursor)) {
    try {
      if (lstatSync(cursor).isSymbolicLink()) throw new Error(`Symlink refused: ${cursor}`)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
    if (dirname(cursor) === cursor) break
  }
  return existsSync(absolute) ? realpathSync(absolute) : absolute
}

function disjoint(a, b) {
  if (contains(a, b) || contains(b, a)) throw new Error(`Workspace paths overlap: ${a} / ${b}`)
}

/** Read every regular file as bytes. Symlinks and special files fail closed; .empty is a fixture-only marker. */
export function workspaceTree(root, { emptyMarker = false } = {}) {
  const tree = new Map()
  const absolute = checkedPath(root)
  if (!lstatSync(absolute).isDirectory()) throw new Error(`Workspace tree must be a directory: ${root}`)
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name)
      const name = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isSymbolicLink()) throw new Error(`Symlink refused: ${path}`)
      if (entry.isDirectory()) walk(path, name)
      else if (entry.isFile()) {
        if (!(emptyMarker && name === '.empty')) tree.set(name, readFileSync(path))
      } else throw new Error(`Special file refused: ${path}`)
    }
  }
  walk(absolute, '')
  return tree
}

/** Compare the complete file inventory and bytes, including files unchanged by a scenario. */
export function compareWorkspace(expected, actual) {
  const wanted = workspaceTree(expected, { emptyMarker: true })
  const found = workspaceTree(actual)
  return [
    ...[...wanted.keys()].filter(name => !found.has(name)).map(name => `missing: ${name}`),
    ...[...found.keys()].filter(name => !wanted.has(name)).map(name => `extra: ${name}`),
    ...[...wanted].filter(([name, bytes]) => found.has(name) && !bytes.equals(found.get(name))).map(([name]) => `content: ${name}`),
  ]
}

function validateImport(source, destination, cwd, out) {
  const src = checkedPath(source)
  disjoint(src, cwd)
  if (src !== destination) disjoint(src, out)
  const sourceTree = workspaceTree(src)
  if (existsSync(destination)) {
    const destinationTree = workspaceTree(destination)
    if (sourceTree.size !== destinationTree.size || [...sourceTree].some(([name, bytes]) => !destinationTree.get(name)?.equals(bytes))) {
      throw new Error(`Refusing to overwrite independent workspace oracle: ${destination}`)
    }
  }
  return src
}

/** Capture live bytes only to workspace.actual; import explicitly authored trees once, never refresh them. */
export function captureWorkspace({ cwd, out, expectedSource, beforeSource, noWorkspace = false }) {
  const live = checkedPath(cwd)
  const target = checkedPath(out)
  disjoint(live, target)
  if (noWorkspace) {
    if (expectedSource || beforeSource) throw new Error('--no-workspace cannot import expected/before trees')
    return { final: false }
  }
  workspaceTree(live)
  const actual = checkedPath(join(target, 'workspace.actual'))
  const expected = checkedPath(join(target, 'workspace.expected'))
  const before = checkedPath(join(target, 'workspace.before'))
  if (existsSync(expected)) workspaceTree(expected)
  if (existsSync(before)) workspaceTree(before)
  if (beforeSource && !expectedSource) throw new Error('--workspace-before requires --workspace-expected')
  const wanted = expectedSource && validateImport(expectedSource, expected, live, target)
  const seed = beforeSource && validateImport(beforeSource, before, live, target)
  if (wanted && seed) disjoint(wanted, seed)
  mkdirSync(target, { recursive: true })
  if (wanted && !existsSync(expected)) cpSync(wanted, expected, { recursive: true })
  if (seed && !existsSync(before)) cpSync(seed, before, { recursive: true })
  rmSync(actual, { recursive: true, force: true })
  cpSync(live, actual, { recursive: true })
  return {
    final: Boolean(wanted && seed),
    actual: 'workspace.actual/',
    ...(wanted ? { expected: 'workspace.expected/' } : {}),
    ...(seed ? { before: 'workspace.before/' } : {}),
  }
}

/** Require both scenario-local inputs for an explicitly declared complete workspace assertion. */
export function workspaceOracle(scenarioDir, metadata) {
  const declaration = metadata?.workspace
  if (declaration?.final !== true) return undefined
  const root = checkedPath(scenarioDir)
  const paths = {}
  for (const key of ['before', 'expected']) {
    const value = declaration[key]
    if (typeof value !== 'string' || value.trim() === '') throw new Error(`workspace.final requires workspace.${key}`)
    const path = checkedPath(resolve(root, value))
    if (path === root || !contains(root, path)) throw new Error(`workspace.${key} must be scenario-local`)
    workspaceTree(path, { emptyMarker: true })
    paths[key] = path
  }
  disjoint(paths.before, paths.expected)
  return paths
}

/** Seed a fresh isolated workspace with all authored input files; never copy .empty. */
export function seedWorkspace(before, target) {
  const destination = checkedPath(target)
  disjoint(checkedPath(before), destination)
  const tree = workspaceTree(before, { emptyMarker: true })
  if (existsSync(destination) && readdirSync(destination).length > 0) throw new Error(`Seed destination must be empty: ${target}`)
  mkdirSync(destination, { recursive: true })
  for (const name of tree.keys()) {
    mkdirSync(dirname(join(destination, name)), { recursive: true })
    cpSync(join(before, name), join(destination, name))
  }
}
