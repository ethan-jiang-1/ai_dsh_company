import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { canonicalSnapshotScenes, inspectScripts, repositoryRoot, scriptEntries, snapshotOutput, snapshotOutputPath, snapshotReference, snapshotScene, snapshotScenes } from '../../tools/lib/repository-layout.mjs'

let root: string
beforeEach(() => {
  const scratch = join(repositoryRoot, 'node_modules/.cache/company-repository-layout')
  mkdirSync(scratch, { recursive: true })
  root = mkdtempSync(join(scratch, 'fixture-'))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))
const script = (name: string, text = '// 状态：常驻\n// 何时跑：fixture\n') => {
  const path = join(root, name)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
}
const scene = (path: string) => mkdirSync(join(root, 'snapshots', path), { recursive: true })

describe('maintenance entry discovery', () => {
  it('finds nested active and archived entrypoints but excludes implementations and aliases', () => {
    for (const name of ['checks/run-gates.mjs', 'checks/smoke/preset-smoke.mjs', 'probes/team/recovery-probe.mjs', 'tools/archive/harvest-probe.mjs']) script(name)
    for (const name of ['tools/lib/private.mjs', 'tools/drivers/browser.mjs', '.cache/ignored.mjs']) script(name, '')
    symlinkSync('checks/smoke/preset-smoke.mjs', join(root, 'checks/preset-smoke.mjs'))
    expect(scriptEntries(root)).toEqual(['checks/run-gates.mjs', 'checks/smoke/preset-smoke.mjs', 'probes/team/recovery-probe.mjs', 'tools/archive/harvest-probe.mjs'])
  })

  it('rejects bad trigger, lifecycle and fixed-port fields at nested depth', () => {
    script('probes/nested/bad-probe.mjs', "// 状态：obsolete\nconst PORT = arg('port', '3099')\n")
    script('checks/smoke/missing-smoke.mjs', '// 何时跑：fixture\n')
    const report = inspectScripts(root)
    expect(report.missingTriggers).toEqual(['probes/nested/bad-probe.mjs'])
    expect(report.missingStatus).toEqual(['checks/smoke/missing-smoke.mjs'])
    expect(report.invalidStatus).toEqual(['probes/nested/bad-probe.mjs: 状态：obsolete'])
    expect(report.fixedPorts).toEqual(["probes/nested/bad-probe.mjs → '3099'"])
  })

  it('accepts current and dated retired instruments without counting driver code', () => {
    script('tools/export.mjs')
    script('tools/archive/retired-probe.mjs', '// 状态：已耗（2026-10-07 fixture）\n// 何时跑：历史复验\n')
    script('tools/drivers/private.mjs', '')
    const report = inspectScripts(root)
    expect(report.entries).toHaveLength(2)
    expect([report.missingTriggers, report.missingStatus, report.invalidStatus, report.fixedPorts]).toEqual([[], [], [], []])
  })
})

describe('evidence scene discovery', () => {
  it('finds typed and transitional flat scenes without double counting historical symlinks', () => {
    scene('replay/r3-delegation')
    scene('archive/memory-convergence-2026-10-05')
    scene('legacy-scene')
    symlinkSync('replay/r3-delegation', join(root, 'snapshots/r3-delegation'), 'dir')
    const found = snapshotScenes(root)
    expect(found.map(s => s.name).sort()).toEqual(['memory-convergence-2026-10-05', 'r3-delegation'])
    expect(snapshotScenes(root, { includeLegacy: true })).toHaveLength(3)
    expect(() => canonicalSnapshotScenes(root)).toThrow('Snapshot symlink')
    expect(snapshotScene(root, 'r3-delegation')).toBe(join(root, 'snapshots/replay/r3-delegation'))
    expect(snapshotScene(root, 'archive/memory-convergence-2026-10-05')).toBe(join(root, 'snapshots/archive/memory-convergence-2026-10-05'))
  })

  it('rejects missing, escaping and ambiguous names instead of choosing an arbitrary scene', () => {
    scene('replay/shared')
    scene('probes/shared')
    expect(() => snapshotScene(root, 'shared')).toThrow('ambiguous')
    expect(snapshotScene(root, 'probes/shared')).toBe(join(root, 'snapshots/probes/shared'))
    expect(() => snapshotScene(root, 'missing')).toThrow('not found')
    expect(() => snapshotScene(root, '../outside')).toThrow('Invalid snapshot')
    expect(() => snapshotScene(root, '/outside')).toThrow('Invalid snapshot')
  })

  it('resolves frozen evidence references and canonicalizes known legacy writer destinations', () => {
    scene('replay/r2-motion')
    expect(snapshotReference(root, 'snapshots/r2-motion/sessions/lead.jsonl')).toBe(join(root, 'snapshots/replay/r2-motion/sessions/lead.jsonl'))
    expect(snapshotReference(root, 'snapshots/replay/r2-motion/sessions/lead.jsonl')).toBe(join(root, 'snapshots/replay/r2-motion/sessions/lead.jsonl'))
    expect(() => snapshotReference(root, 'r2-motion/../outside')).toThrow('Invalid snapshot')
    expect(snapshotOutputPath(root, 'snapshots/r2-motion')).toBe(join(root, 'snapshots/replay/r2-motion'))
    expect(snapshotOutputPath(root, 'snapshots/archive/new')).toBe(join(root, 'snapshots/archive/new'))
    expect(snapshotOutputPath(root, join(root, 'fixtures/new'))).toBe(join(root, 'fixtures/new'))
    expect(() => snapshotOutputPath(root, 'snapshots/new-flat')).toThrow('not found')
    expect(() => snapshotOutputPath(root, 'snapshots/archive')).toThrow()
  })

  it('rejects leftover flat scenes instead of silently omitting assets', () => {
    scene('legacy')
    expect(() => canonicalSnapshotScenes(root)).toThrow('Legacy flat snapshot')
  })

  it('rejects typed scene aliases instead of silently omitting their evidence', () => {
    scene('replay/real')
    symlinkSync('real', join(root, 'snapshots/replay/alias'), 'dir')
    expect(() => canonicalSnapshotScenes(root)).toThrow('Snapshot symlink')
  })

  it('rejects duplicate canonical scene names and ignores nested replay data as scenes', () => {
    scene('replay/r3/replay/nested')
    expect(canonicalSnapshotScenes(root).map(s => s.name)).toEqual(['r3'])
    scene('probes/r3')
    expect(() => canonicalSnapshotScenes(root)).toThrow('Duplicate snapshot')
  })

  it('creates canonical destinations only for known evidence types and a single scene name', () => {
    expect(snapshotOutput(root, 'archive', 'motion-x')).toBe(join(root, 'snapshots/archive/motion-x'))
    expect(() => snapshotOutput(root, 'other', 'motion-x')).toThrow('Invalid snapshot')
    expect(() => snapshotOutput(root, 'archive', '../motion-x')).toThrow('Invalid snapshot')
  })
})
