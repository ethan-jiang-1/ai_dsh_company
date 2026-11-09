/**
 * 同 home writer lease（2026-10-27 R2）。
 *
 * DSH 不承诺多 Host 共享一个 home；本包也不假装支持。这里只做一件事：**同一时刻只让一个
 * writer 写公司数据**。第二个 writer 仍能起 DSH 会话（不 brick 应用），但公司数据命令/自举/
 * 成品目录停写，并在启动输出点名 holder。崩溃留下的 stale lock 靠 PID 存活判定接管。
 *
 * 边界：lease 不提供事务、不跨机器、不防同进程内两个 fiber 的并发（DSH 组合层负责 dispose）；
 * 它是“防静默互写”的护栏，不是高可用锁。
 */
import { randomUUID } from 'node:crypto'
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const LEASE_FILENAME = 'company-pack.lock'

export interface LeaseHolder {
  readonly schema: 1
  readonly pid: number
  readonly token: string
  readonly startedAt: string
}

export type LeaseResult =
  | { readonly acquired: true; readonly path: string; readonly release: () => void }
  | { readonly acquired: false; readonly path: string; readonly reason: string; readonly holder?: LeaseHolder }

interface HeldLease {
  readonly holder: LeaseHolder
  refs: number
}

const held = new Map<string, HeldLease>()

/** lease 文件路径（`<DSH_HOME>/company-pack.lock`）。 */
export const leasePath = (dshHome: string): string => join(dshHome, LEASE_FILENAME)

function isAlive(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function parseHolder(text: string): LeaseHolder | null {
  try {
    const raw = JSON.parse(text) as Partial<LeaseHolder>
    if (raw.schema !== 1 || typeof raw.pid !== 'number' || typeof raw.token !== 'string' || typeof raw.startedAt !== 'string') return null
    return raw as LeaseHolder
  } catch {
    return null
  }
}

/**
 * 获取/共享同 home 的 writer lease。
 * @param dshHome - DSH home。
 * @param now - 时钟（测试注入）。
 * @param pid - 当前进程号（测试注入）。
 * @returns 已获取（含 release），或点名 holder 的拒绝。
 */
export function acquireCompanyLease(dshHome: string, now: Date = new Date(), pid: number = process.pid): LeaseResult {
  const path = leasePath(dshHome)
  const existing = held.get(path)
  if (existing !== undefined) {
    existing.refs += 1
    return {
      acquired: true,
      path,
      release: () => {
        const entry = held.get(path)
        if (entry === undefined) return
        if (entry.refs > 1) { entry.refs -= 1; return }
        try {
          const current = parseHolder(readFileSync(path, 'utf8'))
          if (current?.token === entry.holder.token) unlinkSync(path)
        } catch { /* 文件已被删/替换：不删别人的锁 */ }
        held.delete(path)
      },
    }
  }
  const holder: LeaseHolder = {
    schema: 1,
    pid,
    token: `${String(pid)}-${String(now.getTime())}-${randomUUID()}`,
    startedAt: now.toISOString(),
  }
  const text = `${JSON.stringify(holder, null, 2)}\n`
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(path, text, { flag: 'wx' })
      held.set(path, { holder, refs: 1 })
      return {
        acquired: true,
        path,
        release: () => {
          const entry = held.get(path)
          if (entry === undefined) return
          if (entry.refs > 1) { entry.refs -= 1; return }
          try {
            const current = parseHolder(readFileSync(path, 'utf8'))
            if (current?.token === entry.holder.token) unlinkSync(path)
          } catch { /* 文件已被删/替换：不删别人的锁 */ }
          held.delete(path)
        },
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        return { acquired: false, path, reason: `无法写 writer lease：${(error as Error).message}` }
      }
    }
    let current: LeaseHolder | null = null
    try {
      current = parseHolder(readFileSync(path, 'utf8'))
    } catch { /* 读不到按 stale */ }
    if (current !== null && current.pid !== pid && isAlive(current.pid)) {
      return { acquired: false, path, reason: `另一个 writer 正在使用这个 home（pid ${String(current.pid)}）`, holder: current }
    }
    // 同 pid 但没有进程内登记 = 上次异常残留；stale/坏文件都清掉后重试一次。
    try { unlinkSync(path) } catch { /* 被别的进程抢先清掉 */ }
  }
  return { acquired: false, path, reason: 'writer lease 竞争失败（另一个进程抢先）' }
}
