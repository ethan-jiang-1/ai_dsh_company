/**
 * presented 审计账本的宿主状态通道（2026-10-28 数据设计硬化 M2）。
 *
 * 为什么搬：账本是操作员审计权威，却住在公司盘 W（模型 fs/bash 可写）——「审计」只是文案。
 * DSH 的 `ctx.storageDomain` 是 schema 校验、版本化、宿主可写的 KV；账本正好是 P3 宿主账本。
 *
 * 形状：domain `company_deliverables`（`UNIT_NAME_RE` 只认下划线，不是连字符），`single` 布局，
 * `ledger` 表一条 `state` 记录；底层由 storage-json 落在 `<DSH_HOME>/storages/company_deliverables.json`。
 * 读是同步内存；写 async；`storageDomain` 缺席/打不开时回退旧公司盘文件并在日志里明示降级。
 */
import type { Context } from '@deepseek-ai/cordis'
import {
  defineDomain,
  domainTable,
  type Domain,
  type DomainFacility,
} from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import { join } from 'node:path'
import {
  auditRelPath,
  emptyPresentedLedger,
  mergePresented,
  presentedFromLegacyCatalog,
  presentedLedgerPath,
  readCatalog,
  readPresentedLedger,
  writePresentedLedger,
  type LedgerBootstrap,
  type PresentedLedger,
  type PresentedLedgerState,
  type PresentedObservation,
} from './catalog.ts'

/** 账本 domain 的存储文件名（storage-json `single` 布局）。 */
export const PRESENTED_DOMAIN_FILE = 'company_deliverables.json'

/** 账本记录 schema；domain 版本与记录 `schema` 都钉 1。 */
const ledgerSchema = z.object({
  schema: z.literal(1),
  updatedAt: z.string(),
  paths: z.record(z.string(), z.boolean()),
  slugs: z.record(z.string(), z.boolean()),
})

/** 声明的 domain；模块加载时由 vendor `defineDomain` 校验名称/版本/schema。 */
export const presentedDomain = defineDomain({
  name: 'company_deliverables',
  version: 1,
  layout: 'single',
  tables: { ledger: domainTable(ledgerSchema) },
})

/** domain 文件的人可读路径（storage-json 默认根 = `<DSH_HOME>/storages`）。 */
export const presentedDomainPath = (dshHome: string): string => join(dshHome, 'storages', PRESENTED_DOMAIN_FILE)

/** 账本读写面：domain 与旧文件两种实现；读同步、写 async。 */
export interface PresentedLedgerStore {
  readonly kind: 'domain' | 'legacy'
  read(): PresentedLedgerState
  write(ledger: PresentedLedger): Promise<{ readonly ledger?: PresentedLedger; readonly warning?: string }>
  close(): void
}

/** 旧 W 文件实现（fallback/测试）。 */
function legacyStore(companyHome: string): PresentedLedgerStore {
  return {
    kind: 'legacy',
    read: () => readPresentedLedger(companyHome),
    async write(ledger) {
      try {
        writePresentedLedger(companyHome, ledger)
        return { ledger }
      } catch (error) {
        return { warning: `presented 账本写入失败（${(error as Error).message}）` }
      }
    },
    close: () => {},
  }
}

/** domain 实现；`get` 同步、`put` async、`close` 由 effect 负责。 */
function domainStore(handle: Domain<typeof presentedDomain>, dshHome: string): PresentedLedgerStore {
  const table = handle.table('ledger')
  const path = presentedDomainPath(dshHome)
  return {
    kind: 'domain',
    read: () => {
      try {
        const ledger = table.get('state')
        return ledger === undefined ? { status: 'missing', path } : { status: 'ok', path, ledger }
      } catch (error) {
        return { status: 'corrupt', path, error: (error as Error).message }
      }
    },
    async write(ledger) {
      try {
        await table.put('state', ledger)
        return { ledger }
      } catch (error) {
        return { warning: `presented 账本 domain 写入失败（${(error as Error).message}）` }
      }
    },
    close: () => { void handle.close().catch(() => {}) },
  }
}

/** 取 `ctx.storageDomain`（可选服务；缺席/迟到都不抛）。 */
export function storageDomainOf(ctx: Context): DomainFacility | undefined {
  try {
    const get = (ctx as unknown as { get?: (name: string) => unknown }).get
    return typeof get === 'function' ? get.call(ctx, 'storageDomain') as DomainFacility | undefined : undefined
  } catch {
    return undefined
  }
}

/**
 * 打开账本 domain；打不开/服务缺席 → 旧文件降级并告警。
 * 返回的 store 由调用方持有；domain 句柄的 close 挂在本 fiber 的 effect 上。
 * @param ctx - Host 上下文。
 * @param dshHome - DSH home（domain 文件路径与告警用）。
 * @param companyHome - 公司盘根（旧账本 fallback 路径）。
 */
export async function createPresentedLedgerStore(
  ctx: Context,
  dshHome: string,
  companyHome: string,
): Promise<PresentedLedgerStore> {
  const facility = storageDomainOf(ctx)
  if (facility === undefined) {
    ctx.logger?.warn?.(`company-pack：storageDomain 未就绪；presented 账本回退公司盘文件（降级）`)
    return legacyStore(companyHome)
  }
  try {
    const handle = await facility.open(presentedDomain)
    const effect = (ctx as unknown as { effect?: (callback: () => () => void) => unknown }).effect
    if (typeof effect === 'function') effect.call(ctx, () => () => { void handle.close().catch(() => {}) })
    return domainStore(handle, dshHome)
  } catch (error) {
    ctx.logger?.warn?.(`company-pack：presented domain 打开失败（${(error as Error).message}）；回退公司盘文件（降级）`)
    return legacyStore(companyHome)
  }
}

/**
 * 启动时准备账本：domain/文件现有值优先；缺时从旧索引迁移（保住 false），
 * 再给空账本并标记回扫。坏/更高 schema 保留原文件、不覆盖。
 * @param companyHome - 公司盘根。
 * @param store - 账本 store。
 * @param now - 时钟（测试注入）。
 */
export async function ensureLedger(
  companyHome: string,
  store: PresentedLedgerStore,
  now: Date = new Date(),
): Promise<LedgerBootstrap> {
  const state = store.read()
  if (state.status === 'ok') return { ledger: state.ledger, needsScan: false, migrated: false }
  if (state.status === 'missing') {
    // 先迁旧 W 账本（它才是 P3 权威；true/false 都在），再退旧索引（0.3.10 及以前）。
    const legacyLedger = readPresentedLedger(companyHome)
    if (legacyLedger.status === 'ok') {
      const written = await store.write(legacyLedger.ledger)
      return written.ledger === undefined
        ? { ledger: legacyLedger.ledger, needsScan: false, migrated: false, ...(written.warning === undefined ? {} : { warning: written.warning }) }
        : { ledger: legacyLedger.ledger, needsScan: false, migrated: true }
    }
    const legacy = readCatalog(companyHome)
    if (legacy !== null) {
      const ledger = presentedFromLegacyCatalog(legacy)
      const written = await store.write(ledger)
      return written.ledger === undefined
        ? { ledger, needsScan: true, migrated: false, ...(written.warning === undefined ? {} : { warning: written.warning }) }
        : { ledger, needsScan: true, migrated: true }
    }
    const empty = emptyPresentedLedger(now)
    const written = await store.write(empty)
    return {
      ledger: empty,
      needsScan: true,
      migrated: false,
      ...(written.warning === undefined ? {} : { warning: written.warning }),
    }
  }
  return {
    ledger: emptyPresentedLedger(now),
    needsScan: false,
    migrated: false,
    warning: state.status === 'unsupported'      ? `presented 审计账本 schema ${String(state.schema)} 高于本包支持（${state.path}）；已保留原文件，presented 暂按未核处理`
      : `presented 审计账本损坏（${state.path}：${state.error}）；已保留原文件，presented 暂按未核处理`,
  }
}

/** 记录一次 live present；坏/未来账本不覆盖。 */
export async function recordLedger(
  companyHome: string,
  store: PresentedLedgerStore,
  observation: PresentedObservation,
  now: Date = new Date(),
): Promise<{ readonly ledger?: PresentedLedger; readonly warning?: string }> {
  const state = store.read()
  if (state.status === 'corrupt' || state.status === 'unsupported') {
    return {
      warning: state.status === 'unsupported'
        ? `presented 账本 schema ${String(state.schema)} 高于本包支持，本次 present 不写账本`
        : `presented 账本损坏（${state.error}），本次 present 不写账本`,
    }
  }
  const base = state.status === 'ok' ? state.ledger : (await ensureLedger(companyHome, store, now)).ledger
  const ledger = mergePresented(base, observation, now)
  const written = await store.write(ledger)
  return written.ledger === undefined ? { warning: written.warning ?? 'presented 账本写入失败' } : { ledger }
}

/** 人侧交付审计：写 true/false；路径校验与旧实现同口径。 */
export async function auditLedger(
  companyHome: string,
  store: PresentedLedgerStore,
  rawPath: string,
  presented: boolean,
  now: Date = new Date(),
): Promise<{ readonly ledger?: PresentedLedger; readonly path?: string; readonly warning?: string }> {
  const resolved = auditRelPath(companyHome, rawPath)
  if (resolved.rel === undefined) return { warning: resolved.warning ?? '审计路径不合法' }
  const rel = resolved.rel
  const state = store.read()
  if (state.status === 'corrupt' || state.status === 'unsupported') {
    return {
      warning: state.status === 'unsupported'
        ? `presented 账本 schema ${String(state.schema)} 高于本包支持，未写`
        : `presented 账本损坏（${state.error}），未写`,
    }
  }
  const base = state.status === 'ok' ? state.ledger : (await ensureLedger(companyHome, store, now)).ledger
  const paths: Record<string, boolean> = { ...base.paths, [rel]: presented }
  let next: PresentedLedger = { schema: 1, updatedAt: now.toISOString(), paths, slugs: base.slugs }
  if (presented) {
    const slug = rel.split('/')[1] ?? ''
    if (slug !== '') next = { ...next, slugs: { ...next.slugs, [slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')]: true } }
  }
  const written = await store.write(next)
  return written.ledger === undefined ? { warning: written.warning ?? 'presented 账本写入失败' } : { ledger: next, path: rel }
}

/** 旧文件路径导出给测试/诊断（不是写入路径）。 */
export { presentedLedgerPath }
