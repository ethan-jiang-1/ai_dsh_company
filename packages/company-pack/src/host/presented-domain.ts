/**
 * presented 审计账本的宿主状态通道（2026-10-28 M2；2026-11-01 v3 per-workspace）。
 *
 * 为什么住 home：账本是操作员审计权威，不能让模型的 workspace fs/bash 改写（M2）。
 *
 * 形状（v3）：
 * - 新 domain `company_run_bundle_ledger` v1，`ledgers` 表按 **workspace key** 一条记录；
 *   记录内是 `{ schema:1, workspace, updatedAt, paths, slugs }`；
 * - 同一 home 顺序服务多个 workspace 时，各自账本不串；
 * - `storageDomain` 缺席/打不开时回退 `<DSH_HOME>/company/ledger/<hash>.json`（host-only 文件，
 *   仍不在 workspace）；
 * - 旧 `company_deliverables` domain / workspace `kb/deliverables-presented.json` 不做迁移
 *   （0.6.0 破坏性）；旧文件保留，不读不写。
 */
import type { Context } from '@deepseek-ai/cordis'
import {
  defineDomain,
  domainTable,
  type Domain,
  type DomainFacility,
} from '@deepseek-ai/dsh-storage-domain'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  auditRelPath,
  emptyPresentedLedger,
  mergePresented,
  type LedgerBootstrap,
  type PresentedLedger,
  type PresentedLedgerState,
  type PresentedObservation,
} from './presented-ledger.ts'

/** 新 domain 的存储文件名。 */
export const PRESENTED_DOMAIN_FILE = 'company_run_bundle_ledger.json'

/** 一段 workspace 在 domain 里的记录 schema。 */
const ledgerRecordSchema = z.object({
  schema: z.literal(1),
  workspace: z.string(),
  updatedAt: z.string(),
  paths: z.record(z.string(), z.boolean()),
  slugs: z.record(z.string(), z.boolean()),
})

export const presentedDomain = defineDomain({
  name: 'company_run_bundle_ledger',
  version: 1,
  tables: { ledgers: domainTable(ledgerRecordSchema) },
})

/** domain 文件的人可读路径（storage-json 默认根 = `<DSH_HOME>/storages`）。 */
export const presentedDomainPath = (dshHome: string): string => join(dshHome, 'storages', PRESENTED_DOMAIN_FILE)

/** workspace key：稳定、文件名安全、不泄露路径。 */
export function ledgerKey(workspace: string): string {
  return createHash('sha256').update(workspace).digest('hex').slice(0, 32)
}

/** 文件 fallback 路径（host-only）。 */
export const ledgerFilePath = (dshHome: string, workspace: string): string =>
  join(dshHome, 'company/ledger', `${ledgerKey(workspace)}.json`)

/** 账本读写面：domain 或 host-only 文件；读同步、写 async。 */
export interface PresentedLedgerStore {
  readonly kind: 'domain' | 'file'
  readonly workspace: string
  read(): PresentedLedgerState
  write(ledger: PresentedLedger): Promise<{ readonly ledger?: PresentedLedger; readonly warning?: string }>
  close(): void
}

function stateFromRecord(record: unknown, path: string): PresentedLedgerState {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) {
    return { status: 'corrupt', path, error: '记录不是对象' }
  }
  const value = record as Record<string, unknown>
  if (value.schema !== 1
    || typeof value.updatedAt !== 'string'
    || typeof value.paths !== 'object' || value.paths === null || Array.isArray(value.paths)
    || typeof value.slugs !== 'object' || value.slugs === null || Array.isArray(value.slugs)) {
    return { status: 'corrupt', path, error: '记录形状不符（schema/paths/slugs）' }
  }
  const paths = value.paths as Record<string, unknown>
  const slugs = value.slugs as Record<string, unknown>
  if (!Object.values(paths).every(entry => typeof entry === 'boolean')
    || !Object.values(slugs).every(entry => typeof entry === 'boolean')) {
    return { status: 'corrupt', path, error: 'paths/slugs 含非布尔值' }
  }
  return {
    status: 'ok',
    path,
    ledger: {
      schema: 1,
      updatedAt: value.updatedAt,
      paths: paths as Record<string, boolean>,
      slugs: slugs as Record<string, boolean>,
    },
  }
}

function fileStore(dshHome: string, workspace: string): PresentedLedgerStore {
  const path = ledgerFilePath(dshHome, workspace)
  return {
    kind: 'file',
    workspace,
    read: () => {
      try {
        if (!existsSync(path)) return { status: 'missing', path }
        return stateFromRecord(JSON.parse(readFileSync(path, 'utf8')), path)
      } catch (error) {
        return { status: 'corrupt', path, error: (error as Error).message }
      }
    },
    async write(ledger) {
      try {
        mkdirSync(dirname(path), { recursive: true })
        const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.tmp`
        try {
          writeFileSync(temporary, `${JSON.stringify({ workspace, ...ledger }, null, 2)}\n`, { flag: 'wx' })
          renameSync(temporary, path)
        } catch (error) {
          try { rmSync(temporary, { force: true }) } catch { /* preserve original error */ }
          throw error
        }
        return { ledger }
      } catch (error) {
        return { warning: `presented 账本文件写入失败（${(error as Error).message}）` }
      }
    },
    close: () => {},
  }
}

function domainStore(handle: Domain<typeof presentedDomain>, dshHome: string, workspace: string): PresentedLedgerStore {
  const table = handle.table('ledgers')
  const key = ledgerKey(workspace)
  const path = presentedDomainPath(dshHome)
  return {
    kind: 'domain',
    workspace,
    read: () => {
      try {
        const record = table.get(key)
        return record === undefined ? { status: 'missing', path } : stateFromRecord(record, path)
      } catch (error) {
        return { status: 'corrupt', path, error: (error as Error).message }
      }
    },
    async write(ledger) {
      try {
        await table.put(key, { workspace, ...ledger })
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
 * 打开账本 store；domain 优先，失败回退 host-only 文件并告警。
 * @param ctx - Host 上下文。
 * @param dshHome - DSH home。
 * @param workspace - 当前 workspace（canonical）。
 */
export async function createPresentedLedgerStore(
  ctx: Context,
  dshHome: string,
  workspace: string,
): Promise<PresentedLedgerStore> {
  const facility = storageDomainOf(ctx)
  if (facility === undefined) {
    ctx.logger?.warn?.('company-pack：storageDomain 未就绪；presented 账本回退 host-only 文件（仍不在 workspace）')
    return fileStore(dshHome, workspace)
  }
  try {
    const handle = await facility.open(presentedDomain)
    const effect = (ctx as unknown as { effect?: (callback: () => () => void) => unknown }).effect
    if (typeof effect === 'function') effect.call(ctx, () => () => { void handle.close().catch(() => {}) })
    return domainStore(handle, dshHome, workspace)
  } catch (error) {
    ctx.logger?.warn?.(`company-pack：presented domain 打开失败（${(error as Error).message}）；回退 host-only 文件`)
    return fileStore(dshHome, workspace)
  }
}

/**
 * 启动时准备账本：现有值优先；缺时给空账本并标记回扫。坏/更高 schema 保留原文件。
 * @param store - 账本 store。
 * @param now - 时钟（测试注入）。
 */
export async function ensureLedger(
  store: PresentedLedgerStore,
  now: Date = new Date(),
): Promise<LedgerBootstrap> {
  const state = store.read()
  if (state.status === 'ok') return { ledger: state.ledger, needsScan: false, migrated: false }
  if (state.status === 'missing') {
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
    warning: `presented 审计账本损坏（${state.path}：${state.error}）；已保留原文件，presented 暂按未核处理`,
  }
}

/** 记录一次 live present；坏账本不覆盖。 */
export async function recordLedger(
  store: PresentedLedgerStore,
  observation: PresentedObservation,
  now: Date = new Date(),
): Promise<{ readonly ledger?: PresentedLedger; readonly warning?: string }> {
  const state = store.read()
  if (state.status === 'corrupt' || state.status === 'unsupported') {
    return { warning: `presented 账本损坏（${'error' in state ? state.error : '未知'}），本次 present 不写账本` }
  }
  const base = state.status === 'ok' ? state.ledger : (await ensureLedger(store, now)).ledger
  const ledger = mergePresented(base, observation, now)
  const written = await store.write(ledger)
  return written.ledger === undefined ? { warning: written.warning ?? 'presented 账本写入失败' } : { ledger }
}

/** 人侧交付审计：写 true/false；路径校验只认 `.dsh-company/deliverables/<dir>/final.md`。 */
export async function auditLedger(
  workspace: string,
  store: PresentedLedgerStore,
  rawPath: string,
  presented: boolean,
  now: Date = new Date(),
): Promise<{ readonly ledger?: PresentedLedger; readonly path?: string; readonly warning?: string }> {
  const resolved = auditRelPath(workspace, rawPath)
  if (resolved.rel === undefined) return { warning: resolved.warning ?? '审计路径不合法' }
  const rel = resolved.rel
  const state = store.read()
  if (state.status === 'corrupt' || state.status === 'unsupported') {
    return { warning: `presented 账本损坏（${'error' in state ? state.error : '未知'}），未写` }
  }
  const base = state.status === 'ok' ? state.ledger : (await ensureLedger(store, now)).ledger
  const paths: Record<string, boolean> = { ...base.paths, [rel]: presented }
  let next: PresentedLedger = { schema: 1, updatedAt: now.toISOString(), paths, slugs: base.slugs }
  if (presented) {
    const slug = rel.split('/')[2] ?? ''
    if (slug !== '') next = { ...next, slugs: { ...next.slugs, [slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')]: true } }
  }
  const written = await store.write(next)
  return written.ledger === undefined ? { warning: written.warning ?? 'presented 账本写入失败' } : { ledger: next, path: rel }
}
