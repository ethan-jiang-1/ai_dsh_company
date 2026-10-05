/** Repository paths and discovery shared by maintenance entrypoints and their tests. */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The checkout root, independent of an entrypoint's directory depth. */
export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))

const IMPLEMENTATION_DIRS = new Set(['lib', 'drivers', 'node_modules'])

/** Discover executable maintenance scripts, including archived instruments, without following symlinks. */
export function scriptEntries(root) {
  const entries = []
  const walk = (dir, prefix = '') => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || IMPLEMENTATION_DIRS.has(entry.name)) continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), rel)
      else if (entry.isFile() && entry.name.endsWith('.mjs')) entries.push(rel)
    }
  }
  walk(join(root, 'scripts'))
  return entries.sort()
}

/** Check the same header and ephemeral-port requirements at any script depth. */
export function inspectScripts(root) {
  const entries = scriptEntries(root)
  const triggers = entries.filter(name => /-(smoke|probe|audit|check|eval)\.mjs$/.test(name))
  const missingTriggers = []
  const missingStatus = []
  const invalidStatus = []
  const fixedPorts = []
  for (const name of entries) {
    const text = readFileSync(join(root, 'scripts', name), 'utf8')
    const head = text.split('\n').slice(0, 8)
    if (triggers.includes(name) && !head.some(line => line.startsWith('// 何时跑：'))) missingTriggers.push(name)
    const status = head.find(line => line.startsWith('// 状态：'))
    if (!status) missingStatus.push(name)
    else if (!/^\/\/ 状态：(常驻|已耗（\d{4}-\d{2}-\d{2})/.test(status)) invalidStatus.push(`${name}: ${status.slice(3)}`)
    const port = /arg\(\s*'port'\s*,\s*'([^']*)'\s*\)/.exec(text)
    if (port && port[1] !== '0') fixedPorts.push(`${name} → '${port[1]}'`)
  }
  return { entries, triggers, missingTriggers, missingStatus, invalidStatus, fixedPorts }
}

/** Stable evidence types; a scene's sessions, sidecars and workspaces remain together. */
export const SNAPSHOT_KINDS = ['replay', 'visual', 'probes', 'archive', 'corpora']

/**
 * Discover canonical scenes under the five typed roots.
 *
 * A scene is kept as one unit: sessions, replay inputs, sidecars and workspace
 * trees are never discovered independently. Unknown top-level directories are
 * treated as legacy only while a caller is doing a migration; normal consumers
 * should reject them with `canonicalSnapshotScenes`.
 */
export function snapshotScenes(root, { includeLegacy = false } = {}) {
  const base = join(root, 'snapshots')
  if (!existsSync(base)) return []
  const scenes = []
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.isSymbolicLink()) continue
    if (SNAPSHOT_KINDS.includes(entry.name)) {
      for (const scene of readdirSync(join(base, entry.name), { withFileTypes: true })) {
        if (scene.isDirectory() && !scene.name.startsWith('.') && !scene.isSymbolicLink()) {
          scenes.push({ name: scene.name, kind: entry.name, path: join(base, entry.name, scene.name) })
        }
      }
    } else if (includeLegacy) {
      scenes.push({ name: entry.name, kind: 'legacy', path: join(base, entry.name) })
    }
  }
  return scenes.sort((a, b) => a.path.localeCompare(b.path))
}

/** Canonical discovery fails closed on duplicate names or leftover flat scenes. */
export function canonicalSnapshotScenes(root) {
  const base = join(root, 'snapshots')
  if (existsSync(base)) {
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error(`Snapshot symlink is not a canonical scene: ${entry.name}`)
      if (entry.isDirectory() && SNAPSHOT_KINDS.includes(entry.name)) {
        for (const scene of readdirSync(join(base, entry.name), { withFileTypes: true })) {
          if (scene.isSymbolicLink()) throw new Error(`Snapshot symlink is not a canonical scene: ${entry.name}/${scene.name}`)
        }
      }
    }
  }
  const scenes = snapshotScenes(root)
  const legacy = snapshotScenes(root, { includeLegacy: true }).filter(scene => scene.kind === 'legacy')
  if (legacy.length > 0) throw new Error(`Legacy flat snapshot scenes remain: ${legacy.map(scene => scene.name).join(', ')}`)
  const seen = new Map()
  for (const scene of scenes) {
    const previous = seen.get(scene.name)
    if (previous !== undefined) throw new Error(`Duplicate snapshot scene ${scene.name}: ${previous.kind}/${scene.name} and ${scene.kind}/${scene.name}`)
    seen.set(scene.name, scene)
  }
  return scenes
}

/** Resolve a bare scene name or kind/name; reject missing, ambiguous or escaping selections. */
export function snapshotScene(root, selection) {
  if (typeof selection !== 'string' || isAbsolute(selection) || selection.split(/[\\/]/).some(part => part === '..' || part === '.')) throw new Error(`Invalid snapshot scene: ${selection}`)
  const scenes = snapshotScenes(root)
  const matches = scenes.filter(scene => scene.name === selection || `${scene.kind}/${scene.name}` === selection)
  if (matches.length !== 1) throw new Error(`Snapshot scene ${selection}: ${matches.length ? 'ambiguous; use kind/name' : 'not found'}`)
  return matches[0].path
}

/** Default output destination for newly captured evidence. */
export function snapshotOutput(root, kind, name) {
  if (!SNAPSHOT_KINDS.includes(kind) || !name || name.includes('/') || name.includes('\\') || name === '.' || name === '..') throw new Error(`Invalid snapshot destination: ${kind}/${name}`)
  return resolve(root, 'snapshots', kind, name)
}

/** Resolve an explicit output path; isolated fixtures outside snapshots remain supported. */
export function snapshotOutputPath(root, selection) {
  if (typeof selection !== 'string' || !selection) throw new Error('Snapshot output is required')
  const output = resolve(root, selection)
  const inSnapshots = relative(resolve(root, 'snapshots'), output)
  if (inSnapshots === '..' || inSnapshots.startsWith('../') || isAbsolute(inSnapshots)) return output
  const parts = inSnapshots.split(/[\\/]/)
  if (parts.length === 2 && SNAPSHOT_KINDS.includes(parts[0]) && parts[1]) return snapshotOutput(root, parts[0], parts[1])
  if (parts.length === 1 && !SNAPSHOT_KINDS.includes(parts[0])) {
    // Existing historical names have a known destination; new scenes must name their type.
    return snapshotScene(root, parts[0])
  }
  throw new Error(`Snapshot output needs snapshots/<kind>/<scene>: ${selection}`)
}

/** Translate a frozen repository-relative evidence reference without following symlinks. */
export function snapshotReference(root, reference) {
  if (typeof reference !== 'string' || isAbsolute(reference)) throw new Error(`Invalid snapshot reference: ${reference}`)
  const parts = reference.split(/[\\/]/)
  if (parts.some(part => part === '..' || part === '.' || part === '')) throw new Error(`Invalid snapshot reference: ${reference}`)
  if (parts[0] === 'snapshots') parts.shift()
  const typed = SNAPSHOT_KINDS.includes(parts[0])
  const selection = typed ? `${parts.shift()}/${parts.shift() ?? ''}` : parts.shift()
  const scene = snapshotScene(root, selection)
  return join(scene, ...parts)
}
