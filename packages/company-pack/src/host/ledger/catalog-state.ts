/**
 * 成品目录的读取与校验（2026-11-03 从 host/catalog.ts 拆出，D2）。
 *
 * 只做「读盘 + schema 校验 + 坏形状报错」；生成/扫描在 catalog.ts，审计账本在 presented-ledger.ts。
 * 拆出原因：ledger 的旧索引迁移要读 catalog，若 ledger 反向 import catalog 会成环；读取面独立成叶。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DeliverablesCatalog } from '../../lib/deliverables-catalog.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'
import { isRecord } from '../../lib/guards.ts'

export const CATALOG_REL = RUN_BUNDLE_PATHS.catalog

export const catalogPath = (companyHome: string): string => join(companyHome, CATALOG_REL)

export type CatalogReadState =
  | { readonly status: 'ok'; readonly catalog: DeliverablesCatalog }
  | { readonly status: 'missing' }
  | { readonly status: 'corrupt'; readonly error: string }
  | { readonly status: 'unsupported'; readonly schema: number; readonly error: string }

/**
 * 读并校验既有目录。schema 比当前新时单独报 unsupported，host 可以告警而不是静默重建。
 * @param companyHome - 公司盘根。
 */
export function readCatalogState(companyHome: string): CatalogReadState {
  const path = catalogPath(companyHome)
  try {
    if (!existsSync(path)) return { status: 'missing' }
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!isRecord(raw)) return { status: 'corrupt', error: '不是对象' }
    const schema = raw.schema
    if (typeof schema !== 'number' || !Number.isSafeInteger(schema) || schema < 1) {
      return { status: 'corrupt', error: `schema 不是正整数（${String(schema)}）` }
    }
    if (schema > 1) return { status: 'unsupported', schema, error: `schema ${String(schema)} 高于本包支持的 1` }
    if (!Array.isArray(raw.entries)) return { status: 'corrupt', error: 'entries 不是数组' }
    for (const entry of raw.entries) {
      if (!isRecord(entry) || typeof entry.path !== 'string' || typeof entry.slug !== 'string') {
        return { status: 'corrupt', error: 'entries 含坏形状（缺 path/slug）' }
      }
      if (entry.presented !== null && entry.presented !== true && entry.presented !== false) {
        return { status: 'corrupt', error: `entries[${entry.path}] 的 presented 不是布尔/null` }
      }
    }
    return { status: 'ok', catalog: raw as unknown as DeliverablesCatalog }
  } catch (error) {
    return { status: 'corrupt', error: (error as Error).message }
  }
}

/** 读既有目录；不存在/损坏/schema 不符返回 null。 */
export function readCatalog(companyHome: string): DeliverablesCatalog | null {
  const state = readCatalogState(companyHome)
  return state.status === 'ok' ? state.catalog : null
}
