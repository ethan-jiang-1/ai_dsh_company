import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acquireCompanyLease, leasePath, touchLease } from '../../../packages/company-pack/src/host/run-bundle/lease.ts'

describe('同 home writer lease（2026-10-27 R2）', () => {
  it('同进程可重入；全部 release 后锁文件消失', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-lease-'))
    try {
      const first = acquireCompanyLease(home)
      expect(first.acquired).toBe(true)
      expect(existsSync(leasePath(home))).toBe(true)
      const second = acquireCompanyLease(home)
      expect(second.acquired).toBe(true)
      if (first.acquired) first.release()
      expect(existsSync(leasePath(home))).toBe(true)
      if (second.acquired) second.release()
      expect(existsSync(leasePath(home))).toBe(false)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('stale pid 可接管；活着的其他 writer 被点名拒绝', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-lease-'))
    try {
      writeFileSync(leasePath(home), JSON.stringify({ schema: 1, pid: 0, token: 'stale', startedAt: 'x' }))
      const stale = acquireCompanyLease(home)
      expect(stale.acquired).toBe(true)
      if (stale.acquired) stale.release()

      writeFileSync(leasePath(home), JSON.stringify({ schema: 1, pid: process.ppid, token: 'other', startedAt: 'x' }))
      const blocked = acquireCompanyLease(home)
      expect(blocked.acquired).toBe(false)
      if (!blocked.acquired) expect(blocked.reason).toContain('另一个 writer')
      expect(JSON.parse(readFileSync(leasePath(home), 'utf8')).token).toBe('other')
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('PID 存活但锁 mtime 过期 → 视为 PID 复用可接管，并给 warning', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-lease-'))
    try {
      const path = leasePath(home)
      writeFileSync(path, JSON.stringify({ schema: 1, pid: process.ppid, token: 'orphan', startedAt: '2020-01-01T00:00:00.000Z' }))
      const old = new Date(Date.now() - 10 * 60_000)
      utimesSync(path, old, old)
      const takeover = acquireCompanyLease(home)
      expect(takeover.acquired).toBe(true)
      if (takeover.acquired) {
        expect(takeover.warning).toContain('stale')
        takeover.release()
      }
    } finally { rmSync(home, { recursive: true, force: true }) }
  })

  it('touchLease 只更新自己 token 的锁', () => {
    const home = mkdtempSync(join(tmpdir(), 'company-lease-'))
    try {
      const path = leasePath(home)
      writeFileSync(path, JSON.stringify({ schema: 1, pid: process.ppid, token: 'mine', startedAt: 'x' }))
      const old = new Date(Date.now() - 60_000)
      utimesSync(path, old, old)
      touchLease(path, 'other')
      expect(Math.abs(statSync(path).mtimeMs - old.getTime())).toBeLessThan(2)
      touchLease(path, 'mine')
      expect(statSync(path).mtimeMs).toBeGreaterThan(old.getTime())
    } finally { rmSync(home, { recursive: true, force: true }) }
  })
})
