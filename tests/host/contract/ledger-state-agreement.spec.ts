// 负例留证 2026-11-13（P1 落地时补）：让 `exportGovernance` 在账本 corrupt 时不再复制旧
// `exports/ledger.json` ⇒ Non-destruction 用例红；还原即绿。
/**
 * 账本状态面的 Agreement + Non-destruction 矩阵（P1，2026-11-13）。
 *
 * 判据：
 * ① 每种盘上形状 → `readPresentedLedger.status` 必须是合同类（missing/ok/corrupt/unsupported）；
 * ② 账本 corrupt/unsupported 时导出必须「沿用上次快照」——旧 ledger 与旧 methods 不能被整目录替换删掉。
 *
 * 证明不了：catalog 的派生内容（由 catalog.spec 判）、真浏览器台账页。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { exportGovernance } from '../../../packages/company-pack/src/host/ledger/governance-export.ts'
import { presentedLedgerPath, readPresentedLedger } from '../../../packages/company-pack/src/host/ledger/presented-ledger.ts'
import { makeWorld, type World } from '../../support/world-shapes.ts'

const VALID = `${JSON.stringify({ schema: 1, updatedAt: '2026-11-13T00:00:00.000Z', paths: {}, slugs: {} })}\n`

function writeAt(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

describe('presented ledger：形状 → status', () => {
  const cases: readonly { readonly id: string; readonly expected: 'ok' | 'missing' | 'corrupt' | 'unsupported'; readonly build: (world: World) => void }[] = [
    { id: 'missing', expected: 'missing', build: () => {} },
    { id: 'valid', expected: 'ok', build: (world) => { writeAt(presentedLedgerPath(world.ws), VALID) } },
    { id: 'corrupt', expected: 'corrupt', build: (world) => { writeAt(presentedLedgerPath(world.ws), 'not json\n') } },
    {
      id: 'unsupported',
      expected: 'unsupported',
      build: (world) => { writeAt(presentedLedgerPath(world.ws), '{"schema":2,"updatedAt":"x","paths":{},"slugs":{}}\n') },
    },
    { id: 'dir', expected: 'corrupt', build: (world) => { mkdirSync(presentedLedgerPath(world.ws), { recursive: true }) } },
    {
      id: 'symlink-out',
      expected: 'corrupt',
      build: (world) => {
        const outside = join(world.outside, 'ledger.json')
        writeFileSync(outside, VALID)
        mkdirSync(dirname(presentedLedgerPath(world.ws)), { recursive: true })
        symlinkSync(outside, presentedLedgerPath(world.ws))
      },
    },
    {
      id: 'root-symlink',
      expected: 'corrupt',
      build: (world) => { symlinkSync(world.outside, join(world.ws, '.dsh-company')) },
    },
  ]

  for (const testCase of cases) {
    it(`${testCase.id} → ${testCase.expected}`, () => {
      const world = makeWorld()
      try {
        testCase.build(world)
        expect(readPresentedLedger(world.ws).status).toBe(testCase.expected)
      } finally { world.cleanup() }
    })
  }
})

describe('治理导出：Non-destruction', () => {
  it('账本 corrupt → 沿用旧 ledger/methods，不整目录删掉', () => {
    const world = makeWorld()
    const dshHome = mkdtempSync(join(tmpdir(), 'ledger-home-'))
    try {
      writeAt(presentedLedgerPath(world.ws), 'not json\n')
      writeAt(join(world.ws, '.dsh-company/exports/ledger.json'), '{"schema":1,"old":true}\n')
      writeAt(join(world.ws, '.dsh-company/exports/methods/ceo/m1/SKILL.md'), '# old\n')

      const result = exportGovernance({
        dshHome,
        workspace: world.ws,
        ledger: { kind: 'file', read: () => readPresentedLedger(world.ws) },
      })

      expect(result.ledger).toBe(false)
      expect(result.warnings.some(warning => warning.includes('沿用上次'))).toBe(true)
      expect(readFileSync(join(world.ws, '.dsh-company/exports/ledger.json'), 'utf8')).toBe('{"schema":1,"old":true}\n')
      expect(readFileSync(join(world.ws, '.dsh-company/exports/methods/ceo/m1/SKILL.md'), 'utf8')).toBe('# old\n')
    } finally {
      world.cleanup()
      rmSync(dshHome, { recursive: true, force: true })
    }
  })
})
