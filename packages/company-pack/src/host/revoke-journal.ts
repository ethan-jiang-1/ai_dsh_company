/**
 * revoke 的跨 store 恢复日志（2026-10-27 R4）。
 *
 * revoke 要同时改两处：公司盘 records 的 `revokedAt`，以及 profile 方法层的 `SKILL.md`。两处
 * 没有事务；进程若在中间崩溃，会留下“记录已撤销/方法还在”或相反。这里在动手前写一份
 * `cultivation/.pending-revoke.json`（旧记录全文 + 目标角色/slug/时间），下次启动或下次 revoke
 * 时用“方法还在 ⇒ 回滚记录；方法已不在 ⇒ 补完记录”的规则恢复。
 *
 * 边界：只处理本包自己写出的 pending；外部手改过的记录不覆盖（报 conflict，留日志给人看）。
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { CultivationStorage } from './cultivation-storage.ts'

export interface PendingRevokeRecord {
  readonly id: string
  readonly text: string
}

export interface PendingRevoke {
  readonly schema: 1
  readonly role: string
  readonly slug: string
  readonly revokedAt: string
  readonly createdAt: string
  readonly records: readonly PendingRevokeRecord[]
}

export type RecoverRevokeResult =
  | { readonly status: 'none' }
  | { readonly status: 'rolled-back'; readonly count: number }
  | { readonly status: 'completed'; readonly count: number }
  | { readonly status: 'conflict'; readonly problem: string }
  | { readonly status: 'error'; readonly problem: string }

export const pendingRevokePath = (companyRoot: string): string => join(companyRoot, 'cultivation', '.pending-revoke.json')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readPendingRevoke(companyRoot: string): PendingRevoke | null {
  const path = pendingRevokePath(companyRoot)
  try {
    if (!existsSync(path)) return null
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
    if (!isRecord(raw) || raw.schema !== 1) return null
    if (typeof raw.role !== 'string' || typeof raw.slug !== 'string') return null
    if (typeof raw.revokedAt !== 'string' || typeof raw.createdAt !== 'string') return null
    if (!Array.isArray(raw.records)) return null
    const records: PendingRevokeRecord[] = []
    for (const entry of raw.records) {
      if (!isRecord(entry) || typeof entry.id !== 'string' || typeof entry.text !== 'string') return null
      records.push({ id: entry.id, text: entry.text })
    }
    return {
      schema: 1,
      role: raw.role,
      slug: raw.slug,
      revokedAt: raw.revokedAt,
      createdAt: raw.createdAt,
      records,
    }
  } catch {
    return null
  }
}

export function writePendingRevoke(companyRoot: string, pending: PendingRevoke): void {
  const path = pendingRevokePath(companyRoot)
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.${String(process.pid)}.${String(Date.now())}.${randomUUID()}.tmp`
  try {
    writeFileSync(temporary, `${JSON.stringify(pending, null, 2)}\n`, { flag: 'wx' })
    renameSync(temporary, path)
  } catch (error) {
    try { rmSync(temporary, { force: true }) } catch { /* preserve original error */ }
    throw error
  }
}

export function clearPendingRevoke(companyRoot: string): void {
  rmSync(pendingRevokePath(companyRoot), { force: true })
}

/**
 * 恢复 pending revoke。规则只有两条：方法还在 ⇒ 记录回滚到旧全文（撤销未完成）；方法已不在
 * ⇒ 把仍是旧全文的记录补上 `revokedAt`（撤销已越过删除点）。记录被外部改成第三种形状 ⇒ conflict。
 * @param companyRoot - 公司盘根。
 * @param methodRoot - 方法层根（profile 下）。
 * @param storage - 培养存储。
 */
export function recoverPendingRevoke(
  companyRoot: string,
  methodRoot: string,
  storage: CultivationStorage,
): RecoverRevokeResult {
  const pending = readPendingRevoke(companyRoot)
  if (pending === null) {
    return existsSync(pendingRevokePath(companyRoot))
      ? { status: 'conflict', problem: 'revoke 恢复日志损坏，未自动处理' }
      : { status: 'none' }
  }
  if (!existsSync(methodRoot)) return { status: 'conflict', problem: `方法层根不存在：${methodRoot}` }
  const recordsDir = join(companyRoot, 'cultivation', 'records')
  try {
    const methodExists = storage.readMethod(methodRoot, pending.role, pending.slug) !== null
    let changed = 0
    for (const record of pending.records) {
      const current = storage.readRecord(recordsDir, record.id)
      if (current === null) continue
      if (current.text === record.text) {
        if (!methodExists) {
          if (!storage.updateRecord(recordsDir, record.id, { revokedAt: pending.revokedAt }, record.text)) {
            return { status: 'conflict', problem: `记录 ${record.id} 在恢复时被改动` }
          }
          changed += 1
        }
        continue
      }
      if (methodExists) {
        if (!current.text.includes('revokedAt:')) {
          return { status: 'conflict', problem: `记录 ${record.id} 已被外部改动，未回滚` }
        }
        if (!storage.restoreRecord(recordsDir, record.id, record.text)) {
          return { status: 'error', problem: `记录 ${record.id} 回滚失败` }
        }
        changed += 1
      } else if (!current.text.includes('revokedAt:')) {
        return { status: 'conflict', problem: `记录 ${record.id} 已被外部改动，未补写撤销` }
      }
    }
    clearPendingRevoke(companyRoot)
    return methodExists
      ? { status: 'rolled-back', count: changed }
      : { status: 'completed', count: changed }
  } catch (error) {
    return { status: 'error', problem: (error as Error).message }
  }
}
