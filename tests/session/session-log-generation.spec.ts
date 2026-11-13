// 会话日志世代选择合同（RFC log-generation，2026-10-05 红→绿落地）。
// 何时跑：pnpm test 全量（keyless，毫秒级——纯文件名选择逻辑，零进程/解压/网络）。
// 状态：常驻
// 证明：pickSessionLog 的世代选择语义——v3+v4 并存取 v4（本 RFC 修的 bug 判据）、数值序（v4+v10
//   取 10，反 journal-audit 字典序之例）、版本化优先于无版本、同代 zstd 优先、child（session.k[.vN]）
//   与无关文件排除、缺失返回 undefined（跳过/报错政策归调用方）。
// 不证明：解压与坏压缩处理（留在调用方——各站已有 fail-loud/report 逻辑）；child 日志的读取
//   （replay-smoke 等自带专用发现逻辑，不经本模块）。
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { pickSessionLog } from '../../tools/lib/session-log-generation.mjs'

let dir: string
beforeEach(() => {
  const scratch = join(repositoryRoot, 'node_modules/.cache/company-session-log-generation')
  mkdirSync(scratch, { recursive: true })
  dir = mkdtempSync(join(scratch, 'fixture-'))
})
afterEach(() => rmSync(dir, { recursive: true, force: true }))
const touch = (name: string) => writeFileSync(join(dir, name), '')

describe('pickSessionLog 世代选择', () => {
  it('v3+v4 并存取 v4（本 RFC 的 bug 判据）', () => {
    touch('session.v3.jsonl.zstd')
    touch('session.v4.jsonl.zstd')
    expect(pickSessionLog(dir)?.name).toBe('session.v4.jsonl.zstd')
  })

  it('仅 v3 取 v3', () => {
    touch('session.v3.jsonl.zstd')
    expect(pickSessionLog(dir)?.name).toBe('session.v3.jsonl.zstd')
  })

  it('数值序：v4+v10 取 v10（字典序会排错）', () => {
    touch('session.v10.jsonl.zstd')
    touch('session.v4.jsonl.zstd')
    expect(pickSessionLog(dir)?.name).toBe('session.v10.jsonl.zstd')
    expect(pickSessionLog(dir)?.generation).toBe(10)
  })

  it('版本化优先于无版本（升级期混装）', () => {
    touch('session.jsonl')
    touch('session.v3.jsonl.zstd')
    expect(pickSessionLog(dir)?.name).toBe('session.v3.jsonl.zstd')
  })

  it('同代双形态取 zstd', () => {
    touch('session.v3.jsonl')
    touch('session.v3.jsonl.zstd')
    expect(pickSessionLog(dir)?.name).toBe('session.v3.jsonl.zstd')
  })

  it('无版本单文件取 session.jsonl（legacy 快照形状，如 r1）', () => {
    touch('session.jsonl')
    const picked = pickSessionLog(dir)
    expect(picked?.name).toBe('session.jsonl')
    expect(picked?.versioned).toBe(false)
  })

  it('child 与无关文件排除：只有 child = 没有会话日志', () => {
    touch('session.1.v3.jsonl')
    touch('session.2.jsonl')
    touch('header.json')
    touch('readme.txt')
    expect(pickSessionLog(dir)).toBeUndefined()
  })

  it('child 不干扰主日志选择', () => {
    touch('session.1.v3.jsonl')
    touch('session.v3.jsonl.zstd')
    touch('session.v4.jsonl.zstd')
    expect(pickSessionLog(dir)?.name).toBe('session.v4.jsonl.zstd')
  })

  it('空目录与不存在的目录返回 undefined', () => {
    expect(pickSessionLog(dir)).toBeUndefined()
    expect(pickSessionLog(join(dir, 'no-such-dir'))).toBeUndefined()
  })

  it('元数据形态：versioned / generation / zstd', () => {
    touch('session.v4.jsonl.zstd')
    expect(pickSessionLog(dir)).toMatchObject({ name: 'session.v4.jsonl.zstd', versioned: true, generation: 4, zstd: true })
  })

  it('无版本形态的元数据（generation = 0）', () => {
    touch('session.jsonl')
    expect(pickSessionLog(dir)).toMatchObject({ name: 'session.jsonl', versioned: false, generation: 0, zstd: false })
  })
})
