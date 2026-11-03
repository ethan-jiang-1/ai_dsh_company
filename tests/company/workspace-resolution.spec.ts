/**
 * workspace 解析（v3）的直测：env → cwd → saved → none，以及危险落点拒绝。
 *
 * 病类（2026-11-03 七维 D5）：`host/workspace-resolution.ts` 决定公司盘落点，此前 27% stmt /
 * 19% branch 且无直接 spec；选错 = 公司状态写进 $HOME 或数据分裂成两个 workspace。
 * 本档只证解析与拒绝；真实登记/初始化归 bootstrap/catalog 的集成 spec。
 * 证明边界：不证 DSH workspaceRegistry 的登记行为（→ company-entry-smoke）。
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  readSavedWorkspace,
  resolveWorkspace,
  settingsPath,
  writeSavedWorkspace,
} from '../../packages/company-pack/src/host/workspace-resolution.ts'

let root: string
let dshHome: string
let ws: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'company-ws-resolution-'))
  dshHome = join(root, 'home')
  ws = join(root, 'workspace')
  mkdirSync(dshHome, { recursive: true })
  mkdirSync(ws, { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const canonical = (path: string): string => realpathSync(path)

describe('resolveWorkspace：优先级与危险落点', () => {
  it('env 优先：显式 DSH_COMPANY_HOME 有效则直接用，不回看 cwd/saved', () => {
    const result = resolveWorkspace({ dshHome, envWorkspace: ws, cwd: '/' })
    expect(result).toEqual({ workspace: canonical(ws), source: 'env' })
  })

  it('env 等于 DSH_HOME：fail loud，不回落 cwd/saved', () => {
    const result = resolveWorkspace({ dshHome, envWorkspace: dshHome, cwd: ws })
    expect(result.source).toBe('env')
    expect(result.workspace).toBeUndefined()
    expect(result.error).toContain('不能等于 DSH_HOME')
  })

  it('env 指向不存在的目录：报不存在，不静默回落', () => {
    const missing = join(root, 'missing')
    const result = resolveWorkspace({ dshHome, envWorkspace: missing, cwd: ws })
    expect(result.source).toBe('env')
    expect(result.workspace).toBeUndefined()
    expect(result.error).toContain('不存在')
  })

  it('cwd 有效目录 → cwd', () => {
    const result = resolveWorkspace({ dshHome, envWorkspace: '', cwd: ws })
    expect(result).toEqual({ workspace: canonical(ws), source: 'cwd' })
  })

  it.each([
    ['OS home', () => homedir()],
    ['文件系统根', () => '/'],
    ['DSH_HOME', () => dshHome],
  ])('cwd = %s 时跳过，无 saved 则 none', (_label, cwdOf) => {
    const result = resolveWorkspace({ dshHome, envWorkspace: '', cwd: cwdOf() })
    expect(result.workspace).toBeUndefined()
    expect(result.source).toBe('none')
  })

  it('saved 有效：cwd 不可用时回退到最近选择', () => {
    mkdirSync(join(dshHome, 'company'), { recursive: true })
    writeFileSync(settingsPath(dshHome), `${JSON.stringify({ v: 1, workspace: ws, updatedAt: '2026-11-03T00:00:00.000Z' })}\n`)
    const result = resolveWorkspace({ dshHome, envWorkspace: '', cwd: '/' })
    expect(result).toMatchObject({ workspace: canonical(ws), source: 'saved', savedPath: settingsPath(dshHome) })
  })

  it('saved 失效（路径已不存在）：none，并保留 savedPath 供诊断', () => {
    mkdirSync(join(dshHome, 'company'), { recursive: true })
    writeFileSync(settingsPath(dshHome), `${JSON.stringify({ v: 1, workspace: join(root, 'gone'), updatedAt: '2026-11-03T00:00:00.000Z' })}\n`)
    const result = resolveWorkspace({ dshHome, envWorkspace: '', cwd: '/' })
    expect(result.source).toBe('none')
    expect(result.workspace).toBeUndefined()
    expect(result.savedPath).toBe(settingsPath(dshHome))
  })

  it('gone 的 saved 不阻断 env/cwd 优先级（env 仍赢）', () => {
    mkdirSync(join(dshHome, 'company'), { recursive: true })
    writeFileSync(settingsPath(dshHome), `${JSON.stringify({ v: 1, workspace: join(root, 'gone'), updatedAt: '2026-11-03T00:00:00.000Z' })}\n`)
    const result = resolveWorkspace({ dshHome, envWorkspace: ws, cwd: '/' })
    expect(result).toEqual({ workspace: canonical(ws), source: 'env' })
  })
})

describe('readSavedWorkspace / writeSavedWorkspace', () => {
  it('坏 JSON 不抛，返回 path 无 workspace', () => {
    mkdirSync(join(dshHome, 'company'), { recursive: true })
    writeFileSync(settingsPath(dshHome), '{not json')
    expect(readSavedWorkspace(dshHome)).toEqual({ path: settingsPath(dshHome) })
  })

  it('缺文件返回 path；写回后读得到 canonical 路径', () => {
    expect(readSavedWorkspace(dshHome)).toEqual({ path: settingsPath(dshHome) })
    writeSavedWorkspace(dshHome, ws)
    expect(readSavedWorkspace(dshHome).workspace).toBe(canonical(ws))
  })
})
