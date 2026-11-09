/**
 * host 治理导出的 keyless 完成定义（2026-11-01 产品化 P4）。
 *
 * 判据：方法层/账本导出到 workspace `.dsh-company/exports/`；导出是派生；账本内容不变时不重写
 * （避免二启 exportedAt 打红）；权威文件不被改动。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportGovernance, readLedgerExport } from '../../../packages/company-pack/src/host/ledger/governance-export.ts'
import type { PresentedLedgerState } from '../../../packages/company-pack/src/host/ledger/catalog.ts'

const LEDGER = {
  schema: 1 as const,
  updatedAt: '2026-11-01T00:00:00.000Z',
  paths: { 'deliverables/a/final.md': true },
  slugs: {},
}

function make(): { home: string; ws: string; cleanup: () => void } {
  const root = mkdtempSync(join(tmpdir(), 'governance-export-'))
  const home = join(root, 'home')
  const ws = join(root, 'ws')
  mkdirSync(join(home, 'company/methods/ceo/m1'), { recursive: true })
  mkdirSync(ws, { recursive: true })
  writeFileSync(join(home, 'company/methods/ceo/m1/SKILL.md'), '# method\n')
  return { home, ws, cleanup: () => rmSync(root, { recursive: true, force: true }) }
}

describe('governance export', () => {
  it('导出 methods/ledger 到 workspace；权威不动；内容不变不重写', () => {
    const { home, ws, cleanup } = make()
    try {
      const source = { kind: 'domain' as const, read: (): PresentedLedgerState => ({ status: 'ok', path: 'x', ledger: LEDGER }) }
      const first = exportGovernance({ dshHome: home, workspace: ws, ledger: source, now: new Date('2026-11-01T00:00:00Z') })
      expect(first.methods).toBe(true)
      expect(first.ledger).toBe(true)
      expect(readFileSync(join(ws, '.dsh-company/exports/methods/ceo/m1/SKILL.md'), 'utf8')).toBe('# method\n')
      const exported = readLedgerExport(ws) as { ledger: unknown; exportedAt: string }
      expect(exported.ledger).toEqual(LEDGER)
      const bytes = readFileSync(join(ws, '.dsh-company/exports/ledger.json'), 'utf8')
      const second = exportGovernance({ dshHome: home, workspace: ws, ledger: source, now: new Date('2027-01-01T00:00:00Z') })
      expect(second.ledger).toBe(true)
      expect(readFileSync(join(ws, '.dsh-company/exports/ledger.json'), 'utf8')).toBe(bytes)
      // 权威文件仍在 home
      expect(readFileSync(join(home, 'company/methods/ceo/m1/SKILL.md'), 'utf8')).toBe('# method\n')
    } finally { cleanup() }
  })

  it('没有 methods/坏账本 ⇒ 不创建假数据、只 warn', () => {
    const { home, ws, cleanup } = make()
    try {
      rmSync(join(home, 'company/methods'), { recursive: true, force: true })
      const source = { kind: 'domain' as const, read: (): PresentedLedgerState => ({ status: 'corrupt', path: 'x', error: 'bad' }) }
      const result = exportGovernance({ dshHome: home, workspace: ws, ledger: source })
      expect(result.methods).toBe(false)
      expect(result.ledger).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(existsSync(join(ws, '.dsh-company/exports/ledger.json'))).toBe(false)
    } finally { cleanup() }
  })
})
