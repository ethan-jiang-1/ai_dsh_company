/**
 * presented 账本 v3（per-workspace，host-only）：
 * - domain `company_run_bundle_ledger` v1，按 workspace key 分区；
 * - storageDomain 缺席/打开失败 → `<DSH_HOME>/company/ledger/<hash>.json`（仍不在 workspace）；
 * - `record`/`audit` 只写 store；模型写 workspace 文件不会改账本；
 * - 两个 workspace 的账本不串。
 */
// 负例留证 2026-11-23：去掉 presented-domain.ts 的 store 串行队列或 fileStore 临时文件 randomUUID() ⇒ BUG-346 并发写入丢更与 EEXIST 用例红；还原即绿。BUG-346
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  auditLedger,
  createPresentedLedgerStore,
  ensureLedger,
  ledgerFilePath,
  ledgerKey,
  presentedDomain,
  recordLedger,
  type PresentedLedgerStore,
} from '../../../packages/company-pack/src/host/ledger/presented-domain.ts'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/shared/run-bundle-paths.ts'
import { createTempEnv, type TempEnv } from '../../support/temp-env.ts'

let env: TempEnv
beforeEach(() => { env = createTempEnv('presented-domain-') })
afterEach(() => { env.cleanup() })

const rel = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-28-alpha/final.md`

function fakeDomain(): { records: Map<string, unknown>; handle: unknown } {
  const records = new Map<string, unknown>()
  const table = {
    get: (key: string) => records.get(key),
    put: async (key: string, value: unknown) => { records.set(key, value) },
  }
  return {
    records,
    handle: {
      name: presentedDomain.name,
      table: () => table,
      close: async () => {},
    },
  }
}

function ctxWith(facility: unknown): { ctx: unknown; warns: string[] } {
  const warns: string[] = []
  return {
    warns,
    ctx: {
      get: (name: string) => name === 'storageDomain' ? facility : undefined,
      effect: (callback: () => () => void) => callback,
      logger: { warn: (message: string) => { warns.push(message) } },
    },
  }
}

async function domainStoreWith(facility: unknown, workspace = env.workspace): Promise<PresentedLedgerStore> {
  const { ctx } = ctxWith(facility)
  return await createPresentedLedgerStore(ctx as never, env.home, workspace)
}

describe('presented domain v3', () => {
  it('domain 名/版本/按 workspace 的表是稳定契约', () => {
    expect(presentedDomain.name).toBe('company_run_bundle_ledger')
    expect(presentedDomain.version).toBe(1)
    expect(Object.keys(presentedDomain.tables)).toEqual(['ledgers'])
  })

  it('missing → 空账本 + needsScan；domain 记录按 workspace key 写入', async () => {
    const domain = fakeDomain()
    const store = await domainStoreWith({ open: async () => domain.handle })
    expect(store.kind).toBe('domain')
    const bootstrap = await ensureLedger(store)
    expect(bootstrap.needsScan).toBe(true)
    expect(domain.records.get(ledgerKey(env.workspace))).toMatchObject({ workspace: env.workspace, paths: {} })
  })

  it('record 后 domain 是权威；模型写 workspace 旧文件不影响 store', async () => {
    const domain = fakeDomain()
    const store = await domainStoreWith({ open: async () => domain.handle })
    await ensureLedger(store)
    await recordLedger(store, { paths: [rel] })
    expect((store.read() as { ledger: { paths: Record<string, boolean> } }).ledger.paths[rel]).toBe(true)
    mkdirSync(join(env.workspace, RUN_BUNDLE_PATHS.kb), { recursive: true })
    writeFileSync(join(env.workspace, RUN_BUNDLE_PATHS.presented), JSON.stringify({ schema: 1, updatedAt: 'x', paths: { [rel]: false }, slugs: {} }))
    expect((store.read() as { ledger: { paths: Record<string, boolean> } }).ledger.paths[rel]).toBe(true)
  })

  it('人侧 audit 写 store；true 带 slug、false 只认 path；非法路径拒绝', async () => {
    const domain = fakeDomain()
    const store = await domainStoreWith({ open: async () => domain.handle })
    await ensureLedger(store)
    mkdirSync(join(env.workspace, RUN_BUNDLE_PATHS.deliverables, '2026-10-28-alpha'), { recursive: true })
    writeFileSync(join(env.workspace, rel), '# final\n')
    const audited = await auditLedger(env.workspace, store, rel, false)
    expect(audited.path).toBe(rel)
    const state = store.read() as { ledger: { paths: Record<string, boolean>; slugs: Record<string, boolean> } }
    expect(state.ledger.paths[rel]).toBe(false)
    expect(state.ledger.slugs).toEqual({})
    const flipped = await auditLedger(env.workspace, store, rel, true)
    expect(flipped.ledger?.slugs.alpha).toBe(true)
    expect((await auditLedger(env.workspace, store, 'notes/not-final.md', false)).warning).toContain('deliverables')
  })

  it('storageDomain 缺席 → host-only 文件 store + 告警', async () => {
    const { ctx, warns } = ctxWith(undefined)
    const store = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    expect(store.kind).toBe('file')
    expect(store.workspace).toBe(env.workspace)
    expect(warns.some(message => message.includes('storageDomain'))).toBe(true)
    expect(ledgerFilePath(env.home, env.workspace)).toContain(join(env.home, 'company/ledger'))
    expect(existsSync(ledgerFilePath(env.home, env.workspace))).toBe(false)
  })

  it('domain 打开失败 → host-only 文件 store + 告警（降级不静默）', async () => {
    const { ctx, warns } = ctxWith({ open: async () => { throw new Error('backend down') } })
    const store = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    expect(store.kind).toBe('file')
    expect(warns.some(message => message.includes('domain 打开失败'))).toBe(true)
  })

  it('文件 fallback 可读写，且两个 workspace 的账本不串', async () => {
    const other = join(env.dir, 'other-workspace')
    mkdirSync(other, { recursive: true })
    const { ctx } = ctxWith(undefined)
    const a = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    const b = await createPresentedLedgerStore(ctx as never, env.home, other)
    await ensureLedger(a)
    await ensureLedger(b)
    await recordLedger(a, { paths: [rel] })
    expect((a.read() as { ledger: { paths: Record<string, boolean> } }).ledger.paths[rel]).toBe(true)
    expect((b.read() as { ledger: { paths: Record<string, boolean> } }).ledger.paths[rel]).toBeUndefined()
  })

  it('BUG-346：异步 domainStore 下并发 recordLedger/auditLedger 串行落盘不丢更，fileStore 同毫秒并发不撞 EEXIST', async () => {
    const records = new Map<string, unknown>()
    const slowTable = {
      get: (key: string) => records.get(key),
      put: async (key: string, value: unknown) => {
        await Promise.resolve()
        await new Promise(resolve => setTimeout(resolve, 10))
        records.set(key, value)
      },
    }
    const { ctx } = ctxWith({ open: async () => ({ name: presentedDomain.name, table: () => slowTable, close: async () => {} }) })
    const dStore = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    const relA = `${RUN_BUNDLE_PATHS.deliverables}/2026-11-23-a/final.md`
    const relB = `${RUN_BUNDLE_PATHS.deliverables}/2026-11-23-b/final.md`
    const relC = `${RUN_BUNDLE_PATHS.deliverables}/2026-11-23-c/final.md`
    mkdirSync(join(env.workspace, RUN_BUNDLE_PATHS.deliverables, '2026-11-23-c'), { recursive: true })
    writeFileSync(join(env.workspace, relC), '# final c\n')

    await Promise.all([
      recordLedger(dStore, { paths: [relA] }),
      recordLedger(dStore, { paths: [relB] }),
      auditLedger(env.workspace, dStore, relC, true),
    ])
    const dState = dStore.read()
    expect(dState.status).toBe('ok')
    if (dState.status === 'ok') {
      expect(dState.ledger.paths[relA]).toBe(true)
      expect(dState.ledger.paths[relB]).toBe(true)
      expect(dState.ledger.paths[relC]).toBe(true)
    }

    const fCtx = ctxWith(undefined)
    const fStore = await createPresentedLedgerStore(fCtx.ctx as never, env.home, env.workspace)
    const fStorePeer = await createPresentedLedgerStore(fCtx.ctx as never, env.home, env.workspace)
    const writes = await Promise.all([
      recordLedger(fStore, { paths: [relA] }),
      recordLedger(fStore, { paths: [relB] }),
    ])
    expect(writes.every(w => w.warning === undefined)).toBe(true)
    const directWrites = await Promise.all([
      fStore.write({ schema: 1, updatedAt: '2026-11-23T00:00:00.000Z', paths: { [relA]: true, [relB]: true }, slugs: {} }),
      fStorePeer.write({ schema: 1, updatedAt: '2026-11-23T00:00:00.000Z', paths: { [relA]: true, [relB]: true }, slugs: {} }),
    ])
    expect(directWrites.every(w => w.warning === undefined)).toBe(true)
    const fState = fStore.read()
    expect(fState.status).toBe('ok')
    if (fState.status === 'ok') {
      expect(fState.ledger.paths[relA]).toBe(true)
      expect(fState.ledger.paths[relB]).toBe(true)
    }
  })
})
