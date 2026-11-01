/**
 * presented domain 真设施（2026-11-01 v3）：真 storage hub + DomainFacility + 内存 backend，
 * 证明 `company_run_bundle_ledger` 能 open/put/read，并按 workspace key 分区。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import Storage from '../../vendor/dsh/packages/storage/storage/src/index.ts'
import { DomainFacility } from '../../vendor/dsh/packages/storage/storage-domain/src/index.ts'
import { MemoryStorageBackend } from '../../vendor/dsh/packages/storage/storage-domain/tests/helpers/memory-backend.ts'
import {
  createPresentedLedgerStore,
  ensureLedger,
  ledgerKey,
  recordLedger,
} from '../../packages/company-pack/src/host/presented-domain.ts'
import { RUN_BUNDLE_PATHS } from '../../packages/company-pack/src/lib/run-bundle-paths.ts'
import { createTempEnv, type TempEnv } from '../support/temp-env.ts'

let env: TempEnv
let ctx: Context

beforeEach(() => { env = createTempEnv('presented-domain-real-') })
afterEach(async () => { await ctx?.fiber.dispose(); env.cleanup() })

describe('presented domain 真设施', () => {
  it('真 facility 打开 company_run_bundle_ledger；写入/读取走 domain', async () => {
    ctx = new Context()
    await ctx.plugin(Storage)
    ctx.storage.backend.register('memory', new MemoryStorageBackend() as never)
    const facility = new DomainFacility(ctx, { backend: 'memory', routes: {} } as never)
    ctx.provide('storageDomain', facility as never)

    const rel = `${RUN_BUNDLE_PATHS.deliverables}/2026-10-28-alpha/final.md`
    const store = await createPresentedLedgerStore(ctx as never, env.home, env.workspace)
    expect(store.kind).toBe('domain')
    const bootstrap = await ensureLedger(store)
    expect(bootstrap.needsScan).toBe(true)
    expect(store.read()).toMatchObject({ status: 'ok' })

    await recordLedger(store, { paths: [rel] })
    const state = store.read()
    expect(state.status).toBe('ok')
    expect(state.status === 'ok' ? state.ledger.paths[rel] : undefined).toBe(true)
    expect(ledgerKey(env.workspace)).toHaveLength(32)
  })
})
