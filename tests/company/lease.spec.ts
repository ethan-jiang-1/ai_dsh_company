import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { acquireCompanyLease, leasePath } from '../../packages/company-pack/src/host/lease.ts'

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
})
