import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nodeCultivationStorage } from '../../packages/company-pack/src/host/cultivation-storage.ts'
import {
  clearPendingRevoke,
  pendingRevokePath,
  recoverPendingRevoke,
  writePendingRevoke,
} from '../../packages/company-pack/src/host/revoke-journal.ts'

function fixture(): { root: string; records: string; methods: string; id: string; text: string } {
  const root = mkdtempSync(join(tmpdir(), 'revoke-journal-'))
  const records = join(root, 'cultivation/records')
  const methods = join(root, 'methods')
  const id = nodeCultivationStorage.writeRecord(records, {
    kind: 'correction', targetRole: 'ceo', proposerRole: 'ceo', proposerKind: 'human',
    source: 'test', expectation: 'e', body: 'body',
  })
  const text = nodeCultivationStorage.readRecord(records, id)?.text ?? ''
  nodeCultivationStorage.updateRecord(records, id, { status: 'adopted', methodSlug: 'm', decidedAt: 'x' }, text)
  nodeCultivationStorage.installMethod(methods, 'ceo', 'm', 'skill body')
  return { root, records, methods, id, text }
}

describe('revoke pending journal 恢复（2026-10-27 R4）', () => {
  it('方法还在 + 记录已改 ⇒ 回滚记录并清日志', () => {
    const f = fixture()
    try {
      const old = nodeCultivationStorage.readRecord(f.records, f.id)!.text
      nodeCultivationStorage.updateRecord(f.records, f.id, { revokedAt: '2026-10-27T00:00:00.000Z' }, old)
      writePendingRevoke(f.root, {
        schema: 1, role: 'ceo', slug: 'm', revokedAt: '2026-10-27T00:00:00.000Z', createdAt: 'x',
        records: [{ id: f.id, text: old }],
      })
      const result = recoverPendingRevoke(f.root, f.methods, nodeCultivationStorage)
      expect(result.status).toBe('rolled-back')
      expect(nodeCultivationStorage.readRecord(f.records, f.id)?.text).toBe(old)
      expect(existsSync(pendingRevokePath(f.root))).toBe(false)
      expect(existsSync(join(f.methods, 'ceo/m/SKILL.md'))).toBe(true)
    } finally {
      rmSync(f.root, { recursive: true, force: true })
    }
  })

  it('方法已删 + 记录仍旧 ⇒ 补完 revokedAt 并清日志', () => {
    const f = fixture()
    try {
      const old = nodeCultivationStorage.readRecord(f.records, f.id)!.text
      nodeCultivationStorage.removeMethod(f.methods, 'ceo', 'm')
      writePendingRevoke(f.root, {
        schema: 1, role: 'ceo', slug: 'm', revokedAt: '2026-10-27T00:00:00.000Z', createdAt: 'x',
        records: [{ id: f.id, text: old }],
      })
      const result = recoverPendingRevoke(f.root, f.methods, nodeCultivationStorage)
      expect(result.status).toBe('completed')
      expect(nodeCultivationStorage.readRecord(f.records, f.id)?.text).toContain('revokedAt: 2026-10-27T00:00:00.000Z')
      expect(existsSync(pendingRevokePath(f.root))).toBe(false)
    } finally {
      rmSync(f.root, { recursive: true, force: true })
    }
  })

  it('记录被外部改成第三种形状 ⇒ conflict，日志保留', () => {
    const f = fixture()
    try {
      const old = nodeCultivationStorage.readRecord(f.records, f.id)!.text
      nodeCultivationStorage.updateRecord(f.records, f.id, { status: 'rejected', reason: 'manual' }, old)
      writePendingRevoke(f.root, {
        schema: 1, role: 'ceo', slug: 'm', revokedAt: '2026-10-27T00:00:00.000Z', createdAt: 'x',
        records: [{ id: f.id, text: old }],
      })
      const result = recoverPendingRevoke(f.root, f.methods, nodeCultivationStorage)
      expect(result.status).toBe('conflict')
      expect(readFileSync(pendingRevokePath(f.root), 'utf8')).toContain('"schema": 1')
      clearPendingRevoke(f.root)
    } finally {
      rmSync(f.root, { recursive: true, force: true })
    }
  })
})
