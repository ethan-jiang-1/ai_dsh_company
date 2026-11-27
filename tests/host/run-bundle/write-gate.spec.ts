// 负例留证 2026-11-13：删 ensureRecordsDirectory 的 residency ⇒ root symlink 下先 mkdir 外部 cultivation（BUG-149）；前置 assert 即绿。
// 负例留证 2026-11-13：cultivation/export 直写不接 gate ⇒ block 后仍写成功（BUG-144）；接 assert 即绿。
/** 公司盘写 gate 与根/子目录 residency（BUG-119/121/129/131）。 */
import { existsSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ensureCompanyDir,
  ensureCompanyDirAt,
  ensureCompanyRoot,
  ensureCompanyRootAt,
  resolveCompanySegments,
  UnsafeCompanyPathError,
  verifyCompanySubpathAt,
  writeCompanyAtomic,
} from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'
import {
  assertCompanyWritesAllowed,
  blockCompanyWrites,
  unblockCompanyWrites,
  CompanyWriteBlockedError,
} from '../../../packages/company-pack/src/host/run-bundle/write-gate.ts'
import { nodeCultivationStorage } from '../../../packages/company-pack/src/host/cultivation/cultivation-storage.ts'
import { exportGovernance } from '../../../packages/company-pack/src/host/ledger/governance-export.ts'
import { writePendingRevoke } from '../../../packages/company-pack/src/host/cultivation/revoke-journal.ts'
import { appendRotatingLine } from '../../../packages/company-pack/src/host/logging/rotating-log.ts'

const temp = (): string => mkdtempSync(join(tmpdir(), 'company-root-'))

describe('公司盘根 residency 与写 gate', () => {
  it('.dsh-company 是 symlink → 拒绝；外部目录不写', () => {
    const ws = temp()
    const outside = temp()
    symlinkSync(outside, join(ws, '.dsh-company'))
    try {
      expect(() => ensureCompanyRoot(ws)).toThrow(/symlink/)
      expect(() => writeCompanyAtomic(ws, '.dsh-company/startup.json', '{}')).toThrow(/symlink/)
      expect(existsSync(join(outside, 'startup.json'))).toBe(false)
    } finally { rmSync(ws, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }) }
  })

  it('kb 子目录是 symlink → 拒绝写；外部目录不写', () => {
    const ws = temp()
    const outside = temp()
    mkdirSync(join(ws, '.dsh-company'), { recursive: true })
    symlinkSync(outside, join(ws, '.dsh-company/kb'))
    try {
      expect(() => writeCompanyAtomic(ws, '.dsh-company/kb/x.json', '{}')).toThrow(/symlink/)
      expect(existsSync(join(outside, 'x.json'))).toBe(false)
    } finally { rmSync(ws, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }) }
  })

  it('写 gate 被 block 时拒绝所有公司盘写，恢复后可写', () => {
    const ws = temp()
    try {
      blockCompanyWrites('lease blocked')
      expect(() => writeCompanyAtomic(ws, '.dsh-company/startup.json', '{}')).toThrow(CompanyWriteBlockedError)
      expect(existsSync(join(ws, '.dsh-company/startup.json'))).toBe(false)
      unblockCompanyWrites()
      writeCompanyAtomic(ws, '.dsh-company/startup.json', '{}')
      expect(existsSync(join(ws, '.dsh-company/startup.json'))).toBe(true)
    } finally { unblockCompanyWrites(); rmSync(ws, { recursive: true, force: true }) }
  })

  it('gate 覆盖 cultivation/export 直写，不只 company-root 助手（BUG-144）', () => {
    const ws = temp()
    const records = join(ws, '.dsh-company/cultivation/records')
    mkdirSync(records, { recursive: true })
    const draft = {
      kind: 'correction' as const, targetRole: 'ceo' as const, proposerRole: 'ceo' as const,
      proposerKind: 'human' as const, source: 'test', expectation: '稳', body: '先列清单',
    }
    try {
      blockCompanyWrites('lease lost/test')
      expect(() => nodeCultivationStorage.writeRecord(records, draft)).toThrow(CompanyWriteBlockedError)
      expect(() => nodeCultivationStorage.installMethod(join(ws, '.dsh-company/cultivation/methods'), 'ceo', 'm1', '# m')).toThrow(CompanyWriteBlockedError)
      expect(() => exportGovernance({ dshHome: join(ws, 'home'), workspace: ws })).toThrow(CompanyWriteBlockedError)
      unblockCompanyWrites()
      expect(nodeCultivationStorage.writeRecord(records, draft)).toMatch(/^\d/)
    } finally { unblockCompanyWrites(); rmSync(ws, { recursive: true, force: true }) }
  })

  it('根 symlink → cultivation/revoke journal/log 写拒绝，外部不写（BUG-149）', () => {
    const ws = temp()
    const outside = temp()
    const records = join(ws, '.dsh-company/cultivation/records')
    const draft = {
      kind: 'correction' as const, targetRole: 'ceo' as const, proposerRole: 'ceo' as const,
      proposerKind: 'human' as const, source: 'test', expectation: '稳', body: '先列清单',
    }
    try {
      symlinkSync(outside, join(ws, '.dsh-company'))
      expect(() => nodeCultivationStorage.writeRecord(records, draft)).toThrow(/symlink/)
      expect(() => writePendingRevoke(ws, {
        schema: 1, role: 'ceo', slug: 'm1', revokedAt: 'x', createdAt: 'x', records: [],
      })).toThrow(/symlink/)
      expect(() => appendRotatingLine(join(ws, '.dsh-company/logs/upgrade.log'), 'x\n')).toThrow(/symlink/)
      expect(existsSync(join(outside, 'cultivation'))).toBe(false)
      expect(existsSync(join(outside, 'logs'))).toBe(false)
    } finally { rmSync(ws, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }) }
  })

  // 负例留证 2026-11-27：write-gate 与 company-root 无 en 错误输出（BUG-405）；加 reasonEn/lang='en' 即绿。BUG-405
  it('write-gate 与 company-root 在 lang="en" 下抛出无中文的英文错误与 messageEn（BUG-405）', () => {
    const cjk = /[\u4e00-\u9fff]/
    const ws = temp()
    const outside = temp()
    symlinkSync(outside, join(ws, '.dsh-company'))
    try {
      let captured: unknown
      try {
        ensureCompanyRoot(ws, { lang: 'en' })
      } catch (error) {
        captured = error
      }
      expect(captured).toBeInstanceOf(UnsafeCompanyPathError)
      expect((captured as UnsafeCompanyPathError).message).not.toMatch(cjk)
      expect((captured as UnsafeCompanyPathError).messageEn).not.toMatch(cjk)

      let segError: unknown
      try {
        resolveCompanySegments('../escape', { allowRoot: false, stripCompanyPrefix: false, lang: 'en' })
      } catch (error) {
        segError = error
      }
      expect(segError).toBeInstanceOf(UnsafeCompanyPathError)
      expect((segError as UnsafeCompanyPathError).message).not.toMatch(cjk)

      const safeHome = join(outside, 'safe-home')
      mkdirSync(join(safeHome, 'kb'), { recursive: true })
      symlinkSync(outside, join(safeHome, 'kb/link'))
      expect(() => ensureCompanyRootAt(join(ws, '.dsh-company'), { lang: 'en' })).toThrow(UnsafeCompanyPathError)
      expect(() => verifyCompanySubpathAt(safeHome, 'kb/link', 'en')).toThrow(UnsafeCompanyPathError)
      expect(() => ensureCompanyDirAt(safeHome, 'kb/link', { lang: 'en' })).toThrow(UnsafeCompanyPathError)
      expect(() => ensureCompanyDir(ws, 'kb', { lang: 'en' })).toThrow(UnsafeCompanyPathError)
      expect(() => resolveCompanySegments('/abs/path', { allowRoot: false, stripCompanyPrefix: false, lang: 'en' })).toThrow(UnsafeCompanyPathError)
      expect(() => resolveCompanySegments('a\0b', { allowRoot: false, stripCompanyPrefix: false, lang: 'en' })).toThrow(UnsafeCompanyPathError)
      expect(() => resolveCompanySegments('.dsh-company', { allowRoot: false, stripCompanyPrefix: true, lang: 'en' })).toThrow(UnsafeCompanyPathError)
      const fileWs = join(outside, 'file-ws')
      mkdirSync(fileWs, { recursive: true })
      writeFileSync(join(fileWs, '.dsh-company'), 'not-dir')
      expect(() => ensureCompanyRoot(fileWs, { lang: 'en' })).toThrow(/not a directory/)

      blockCompanyWrites('中文原因', 'English lease blocked')
      let gateError: unknown
      try {
        assertCompanyWritesAllowed('en')
      } catch (error) {
        gateError = error
      }
      expect(gateError).toBeInstanceOf(CompanyWriteBlockedError)
      expect((gateError as CompanyWriteBlockedError).message).toContain('English lease blocked')
      expect((gateError as CompanyWriteBlockedError).message).not.toMatch(cjk)
      expect((gateError as CompanyWriteBlockedError).messageEn).not.toMatch(cjk)
    } finally {
      unblockCompanyWrites()
      rmSync(ws, { recursive: true, force: true })
      rmSync(outside, { recursive: true, force: true })
    }
  })
})
