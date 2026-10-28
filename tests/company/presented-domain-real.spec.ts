/**
 * presented domain 的真设施测试（2026-10-28 M2）：真 storage hub + 真 DomainFacility +
 * 内存 backend（vendor 测试夹具）——证明 `company_deliverables` 真能 open/put/read，
 * 不是只有假 handle 的接线。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import Storage from '../../vendor/dsh/packages/storage/storage/src/index.ts'
import { DomainFacility } from '../../vendor/dsh/packages/storage/storage-domain/src/index.ts'
import { MemoryStorageBackend } from '../../vendor/dsh/packages/storage/storage-domain/tests/helpers/memory-backend.ts'
import {
  createPresentedLedgerStore,
  ensureLedger,
  recordLedger,
} from '../../packages/company-pack/src/host/presented-domain.ts'
import { writePresentedLedger, type PresentedLedger } from '../../packages/company-pack/src/host/catalog.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'

let env: TempEnv
let ctx: Context

beforeEach(() => { env = createTempEnv('presented-domain-real-') })
afterEach(async () => { await ctx?.fiber.dispose(); env.cleanup() })

describe('presented domain 真设施', () => {
  it('真 facility 打开 company_deliverables；迁移/写入/读取走 domain', async () => {
    ctx = new Context()
    await ctx.plugin(Storage)
    ctx.storage.backend.register('memory', new MemoryStorageBackend() as never)
    const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} } as never)
    ctx.provide('storageDomain', facility as never)

    const legacy: PresentedLedger = {
      schema: 1,
      updatedAt: '2026-10-28T00:00:00.000Z',
      paths: { 'deliverables/2026-10-28-alpha/final.md': false },
      slugs: {},
    }
    writePresentedLedger(env.workspace, legacy)

    const store = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    expect(store.kind).toBe('domain')
    const bootstrap = await ensureLedger(env.workspace, store)
    expect(bootstrap.migrated).toBe(true)
    expect(bootstrap.ledger.paths['deliverables/2026-10-28-alpha/final.md']).toBe(false)
    expect(store.read()).toMatchObject({ status: 'ok' })

    await recordLedger(env.workspace, store, { paths: ['deliverables/2026-10-28-alpha/final.md'] })
    const state = store.read()
    expect(state.status).toBe('ok')
    expect(state.status === 'ok' ? state.ledger.paths['deliverables/2026-10-28-alpha/final.md'] : undefined).toBe(true)
  })
})
