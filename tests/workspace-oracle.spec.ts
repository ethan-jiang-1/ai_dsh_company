import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { captureWorkspace, compareWorkspace, seedWorkspace, workspaceOracle } from '../scripts/lib/workspace-oracle.mjs'

let root: string
beforeEach(() => {
  const parent = join(import.meta.dirname, '../dev/harness-home/oracle-tests')
  mkdirSync(parent, { recursive: true })
  root = mkdtempSync(join(parent, 'case-'))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))
const file = (path: string, text = 'unchanged\n') => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, text)
}
const tree = (name: string, text = 'unchanged\n') => {
  const dir = join(root, name)
  file(join(dir, 'nested/file.txt'), text)
  return dir
}

describe('independent capture oracle', () => {
  it('captures the complete live tree to actual while preserving legacy expected bytes', () => {
    const cwd = tree('live', 'live\n')
    const out = join(root, 'scenario')
    tree('scenario/workspace.expected', 'authored\n')
    file(join(cwd, '.hidden'), 'hidden')
    const metadata = captureWorkspace({ cwd, out })
    expect(metadata).toEqual({ final: false, actual: 'workspace.actual/' })
    expect(compareWorkspace(cwd, join(out, 'workspace.actual'))).toEqual([])
    expect(readFileSync(join(out, 'workspace.expected/nested/file.txt'), 'utf8')).toBe('authored\n')
  })

  it('does not delete expected on --no-workspace', () => {
    const out = join(root, 'scenario')
    tree('scenario/workspace.expected')
    expect(captureWorkspace({ cwd: join(root, 'absent'), out, noWorkspace: true })).toEqual({ final: false })
    expect(existsSync(join(out, 'workspace.expected/nested/file.txt'))).toBe(true)
  })

  it('imports independent before/expected once and refuses later changed expected input', () => {
    const cwd = tree('live', 'actual')
    const expectedSource = tree('authored', 'expected')
    const beforeSource = tree('before', 'before')
    const out = join(root, 'scenario')
    expect(captureWorkspace({ cwd, out, expectedSource, beforeSource }).final).toBe(true)
    expect(compareWorkspace(expectedSource, join(out, 'workspace.expected'))).toEqual([])
    file(join(expectedSource, 'nested/file.txt'), 'changed')
    expect(() => captureWorkspace({ cwd, out, expectedSource, beforeSource })).toThrow('Refusing to overwrite')
    expect(readFileSync(join(out, 'workspace.expected/nested/file.txt'), 'utf8')).toBe('expected')
  })

  it.each(['live', 'live/nested', '.'])('rejects expected sources overlapping live: %s', name => {
    const cwd = tree('live')
    expect(() => captureWorkspace({ cwd, out: join(root, 'scenario'), expectedSource: join(root, name) })).toThrow('overlap')
    expect(existsSync(join(root, 'scenario'))).toBe(false)
  })

  it('rejects output overlap and symlinks in source, target, or ancestors before writes', () => {
    const cwd = tree('live')
    expect(() => captureWorkspace({ cwd, out: join(cwd, 'snapshot') })).toThrow('overlap')
    const source = tree('authored')
    symlinkSync(source, join(root, 'alias'), 'dir')
    expect(() => captureWorkspace({ cwd, out: join(root, 'scenario'), expectedSource: join(root, 'alias') })).toThrow('Symlink')
    symlinkSync(join(source, 'nested/file.txt'), join(source, 'linked'))
    expect(() => captureWorkspace({ cwd, out: join(root, 'scenario'), expectedSource: source })).toThrow('Symlink')
    expect(() => captureWorkspace({ cwd, out: join(root, 'alias/new') })).toThrow('Symlink')
    rmSync(join(source, 'linked'))
    mkdirSync(join(root, 'scenario'))
    symlinkSync(source, join(root, 'scenario/workspace.expected'), 'dir')
    expect(() => captureWorkspace({ cwd, out: join(root, 'scenario') })).toThrow('Symlink')
  })
})

describe('complete workspace replay assertion', () => {
  it('checks missing, extra, changed, hidden, binary, and unchanged files', () => {
    const expected = tree('expected')
    const actual = tree('actual')
    file(join(expected, '.hidden'), 'hidden')
    file(join(actual, '.hidden'), 'hidden')
    writeFileSync(join(expected, 'bytes'), Buffer.from([0, 255]))
    writeFileSync(join(actual, 'bytes'), Buffer.from([0, 255]))
    expect(compareWorkspace(expected, actual)).toEqual([])
    rmSync(join(actual, '.hidden'))
    file(join(actual, 'extra'))
    writeFileSync(join(actual, 'bytes'), Buffer.from([0, 254]))
    expect(compareWorkspace(expected, actual)).toEqual(['missing: .hidden', 'extra: extra', 'content: bytes'])
  })

  it('seeds the complete before tree, handles empty markers, and rejects nonempty destinations', () => {
    const before = tree('before')
    file(join(before, '.empty'), '')
    const actual = join(root, 'actual')
    seedWorkspace(before, actual)
    expect(compareWorkspace(before, actual)).toEqual([])
    expect(existsSync(join(actual, '.empty'))).toBe(false)
    expect(() => seedWorkspace(before, actual)).toThrow('must be empty')
    rmSync(join(actual, 'nested'), { recursive: true })
    const empty = join(root, 'empty')
    file(join(empty, '.empty'), '')
    expect(compareWorkspace(empty, actual)).toEqual([])
  })

  it('requires explicit local disjoint before/expected for workspace.final and leaves legacy scenes uncertified', () => {
    const scenario = join(root, 'scenario')
    tree('scenario/workspace.before')
    tree('scenario/workspace.expected')
    expect(workspaceOracle(scenario, { workspace: { expected: 'workspace.expected' } })).toBeUndefined()
    expect(() => workspaceOracle(scenario, { workspace: { final: true } })).toThrow('requires workspace.before')
    expect(() => workspaceOracle(scenario, { workspace: { final: true, before: '../outside', expected: 'workspace.expected' } })).toThrow('scenario-local')
    const oracle = workspaceOracle(scenario, { workspace: { final: true, before: 'workspace.before', expected: 'workspace.expected' } })
    expect(oracle).toEqual({ before: join(scenario, 'workspace.before'), expected: join(scenario, 'workspace.expected') })
    expect(() => workspaceOracle(scenario, { workspace: { final: true, before: 'workspace.before', expected: 'workspace.before' } })).toThrow('overlap')
  })
})
