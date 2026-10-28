/**
 * presented 账本 domain 通道（2026-10-28 数据设计硬化 M2）：
 * - 声明合法（name/version/layout）；
 * - 旧 W 账本一次性迁入 domain，旧文件保留（回滚/只读）；
 * - 迁移后 domain 是权威：模型写旧 W 文件不改变账本；
 * - storageDomain 缺席/打开失败 → 旧文件降级并告警。
 */
import { existsSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  auditLedger,
  createPresentedLedgerStore,
  ensureLedger,
  presentedDomain,
  recordLedger,
  type PresentedLedgerStore,
} from '../../packages/company-pack/src/host/presented-domain.ts'
import {
  readPresentedLedger,
  writePresentedLedger,
  type PresentedLedger,
} from '../../packages/company-pack/src/host/catalog.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'

let env: TempEnv

beforeEach(() => { env = createTempEnv('presented-domain-') })
afterEach(() => { env.cleanup() })

const legacyLedger: PresentedLedger = {
  schema: 1,
  updatedAt: '2026-10-28T00:00:00.000Z',
  paths: { 'deliverables/2026-10-28-alpha/final.md': false },
  slugs: {},
}

/** 最小假 domain：只实现 store 用到的 get/put/close。 */
function fakeDomain(): { records: Map<string, unknown>; handle: unknown } {
  const records = new Map<string, unknown>()
  const table = {
    get: (key: string) => records.get(key),
    put: async (key: string, value: unknown) => { records.set(key, value) },
  }
  return {
    records,
    handle: {
      name: 'company_deliverables',
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

async function domainStoreWith(facility: unknown): Promise<PresentedLedgerStore> {
  const { ctx } = ctxWith(facility)
  return await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
}

describe('presented domain 声明与 store', () => {
  it('domain 名/版本/布局是稳定契约', () => {
    expect(presentedDomain.name).toBe('company_deliverables')
    expect(presentedDomain.version).toBe(1)
    expect(presentedDomain.layout).toBe('single')
  })

  it('旧 W 账本迁入 domain：false 保留、旧文件仍在', async () => {
    writePresentedLedger(env.workspace, legacyLedger)
    const domain = fakeDomain()
    const store = await domainStoreWith({ open: async () => domain.handle })
    expect(store.kind).toBe('domain')
    const bootstrap = await ensureLedger(env.workspace, store)
    expect(bootstrap.migrated).toBe(true)
    expect(bootstrap.ledger.paths['deliverables/2026-10-28-alpha/final.md']).toBe(false)
    expect(domain.records.get('state')).toMatchObject({ paths: { 'deliverables/2026-10-28-alpha/final.md': false } })
    expect(existsSync(`${env.workspace}/kb/deliverables-presented.json`)).toBe(true)
  })

  it('迁移后 domain 是权威：模型改旧 W 文件不影响 store', async () => {
    writePresentedLedger(env.workspace, legacyLedger)
    const domain = fakeDomain()
    const store = await domainStoreWith({ open: async () => domain.handle })
    await ensureLedger(env.workspace, store)
    await recordLedger(env.workspace, store, { paths: ['deliverables/2026-10-28-alpha/final.md'] })
    expect(store.read()).toMatchObject({ status: 'ok' })
    expect((store.read() as { ledger: PresentedLedger }).ledger.paths['deliverables/2026-10-28-alpha/final.md']).toBe(true)

    // 模拟模型 fs 写旧 W 账本（false）——domain 不应被改。
    writePresentedLedger(env.workspace, { ...legacyLedger, paths: { 'deliverables/2026-10-28-alpha/final.md': false } })
    expect((store.read() as { ledger: PresentedLedger }).ledger.paths['deliverables/2026-10-28-alpha/final.md']).toBe(true)
  })

  it('人侧 audit 写 domain；true 带 slug、false 只认 path', async () => {
    const domain = fakeDomain()
    const store = await domainStoreWith({ open: async () => domain.handle })
    await ensureLedger(env.workspace, store)
    const audited = await auditLedger(env.workspace, store, 'deliverables/2026-10-28-alpha/final.md', false)
    expect(audited.path).toBe('deliverables/2026-10-28-alpha/final.md')
    const record = domain.records.get('state') as PresentedLedger
    expect(record.paths['deliverables/2026-10-28-alpha/final.md']).toBe(false)
    expect(record.slugs).toEqual({})
  })

  it('storageDomain 缺席 → legacy store + 告警', async () => {
    const { ctx, warns } = ctxWith(undefined)
    const store = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    expect(store.kind).toBe('legacy')
    expect(warns.some(message => message.includes('storageDomain'))).toBe(true)
  })

  it('domain 打开失败 → legacy store + 告警（降级不静默）', async () => {
    const { ctx, warns } = ctxWith({ open: async () => { throw new Error('backend down') } })
    const store = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    expect(store.kind).toBe('legacy')
    expect(warns.some(message => message.includes('domain 打开失败'))).toBe(true)
  })

  it('legacy fallback 仍可读写旧 W 账本（回退路径）', async () => {
    writePresentedLedger(env.workspace, legacyLedger)
    const { ctx } = ctxWith(undefined)
    const store = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    const bootstrap = await ensureLedger(env.workspace, store)
    expect(bootstrap.ledger.paths['deliverables/2026-10-28-alpha/final.md']).toBe(false)
    await recordLedger(env.workspace, store, { paths: ['deliverables/2026-10-28-alpha/final.md'] })
    expect(readPresentedLedger(env.workspace)).toMatchObject({ status: 'ok' })
    expect((readPresentedLedger(env.workspace) as { ledger: PresentedLedger }).ledger.paths['deliverables/2026-10-28-alpha/final.md']).toBe(true)
  })
})
