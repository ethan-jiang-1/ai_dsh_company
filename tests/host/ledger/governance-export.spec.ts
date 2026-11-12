// 负例留证 2026-11-13：root 换回 `join(workspace,'.dsh-company')` ⇒ root-symlink 导出写外部（BUG-147）；ensureCompanyRoot 即绿。
// 负例留证 2026-11-13：staging 不复制旧 ledger ⇒ corrupt 账本导出后旧快照消失（BUG-114）；复制旧件即绿。
/**
 * host 治理导出的 keyless 完成定义（2026-11-01 产品化 P4）。
 *
 * 判据：方法层/账本导出到 workspace `.dsh-company/exports/`；导出是派生；账本内容不变时不重写
 * （避免二启 exportedAt 打红）；权威文件不被改动。
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportGovernance, readLedgerExport, swapDirWithBackup } from '../../../packages/company-pack/src/host/ledger/governance-export.ts'
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

describe('导出目录替换的回滚', () => {
  it('staging→target 失败时把旧 target 恢复，不丢上一份导出', () => {
    const root = mkdtempSync(join(tmpdir(), 'governance-swap-'))
    const target = join(root, 'exports')
    const staging = join(root, 'staging')
    mkdirSync(target, { recursive: true })
    mkdirSync(staging, { recursive: true })
    writeFileSync(join(target, 'old.md'), 'old')
    writeFileSync(join(staging, 'new.md'), 'new')
    let calls = 0
    const rename = (from: string, to: string): void => {
      calls += 1
      if (calls === 2) throw new Error('rename boom')
      renameSync(from, to)
    }
    try {
      expect(() => swapDirWithBackup(staging, target, { rename })).toThrow('rename boom')
      expect(readFileSync(join(target, 'old.md'), 'utf8')).toBe('old')
      expect(existsSync(join(root, 'exports.bak-'))).toBe(false)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })

  it('账本 corrupt/缺席、methods 源缺失 → 沿用上次快照，不整体删掉（BUG-114）', () => {
    const { home, ws, cleanup } = make()
    try {
      const ok = { kind: 'domain' as const, read: (): PresentedLedgerState => ({ status: 'ok', path: 'x', ledger: LEDGER }) }
      exportGovernance({ dshHome: home, workspace: ws, ledger: ok })
      const before = readFileSync(join(ws, '.dsh-company/exports/ledger.json'), 'utf8')
      const corrupt = { kind: 'domain' as const, read: (): PresentedLedgerState => ({ status: 'corrupt', path: 'x', error: 'bad' }) }
      const corruptRun = exportGovernance({ dshHome: home, workspace: ws, ledger: corrupt })
      expect(corruptRun.warnings.some(warning => warning.includes('沿用上次'))).toBe(true)
      expect(readFileSync(join(ws, '.dsh-company/exports/ledger.json'), 'utf8')).toBe(before)
      exportGovernance({ dshHome: home, workspace: ws })
      expect(readFileSync(join(ws, '.dsh-company/exports/ledger.json'), 'utf8')).toBe(before)
      rmSync(join(home, 'company/methods'), { recursive: true, force: true })
      exportGovernance({ dshHome: home, workspace: ws })
      expect(readFileSync(join(ws, '.dsh-company/exports/methods/ceo/m1/SKILL.md'), 'utf8')).toBe('# method\n')
    } finally { cleanup() }
  })

  it('.dsh-company 是 symlink → 导出拒绝且外部目录不写（BUG-147）', () => {
    const root = mkdtempSync(join(tmpdir(), 'governance-root-link-'))
    const outside = mkdtempSync(join(tmpdir(), 'governance-root-outside-'))
    try {
      const ws = join(root, 'ws')
      mkdirSync(ws, { recursive: true })
      symlinkSync(outside, join(ws, '.dsh-company'))
      const result = exportGovernance({ dshHome: join(root, 'home'), workspace: ws })
      expect(result.warnings.some(warning => warning.includes('不安全'))).toBe(true)
      expect(existsSync(join(outside, 'exports'))).toBe(false)
      expect(readLedgerExport(ws)).toBeUndefined()
    } finally { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }) }
  })
})
