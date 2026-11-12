// 负例留证 2026-11-13（P0 矩阵落地时补）：去掉 `ensureCompanyRoot` 的根 symlink 检查 ⇒
// root-symlink-out 用例红（catalog/startup/presented 都会写进 outside）；还原即绿。
/**
 * 公司盘写入口的 Safety 矩阵（P0，2026-11-13）。
 *
 * 判据：任意形状 × 任意已登记写入口——
 * ① `outside/` 快照零变化（没写到公司盘外）；
 * ② 抛错必须是 typed refusal（`UnsafeCompanyPathError` / `CompanyWriteBlockedError`），
 *    不能把 EISDIR/EEXIST/ENOTDIR 冒给调用方。
 *
 * 证明不了：读路径、跨进程/重启、147/148/149 三个 knownGap（登记在 registry，不在此矩阵）。
 */
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  UnsafeCompanyPathError,
  createCompanyDir,
  readCompanyTextAt,
  writeCompanyAtomic,
  writeCompanyAtomicAt,
} from '../../../packages/company-pack/src/host/run-bundle/company-root.ts'
import { CompanyWriteBlockedError } from '../../../packages/company-pack/src/host/run-bundle/write-gate.ts'
import { nodeCultivationStorage, UnsafeCultivationPathError } from '../../../packages/company-pack/src/host/cultivation/cultivation-storage.ts'
import { planBundleManifest, writeBundleManifest } from '../../../packages/company-pack/src/host/run-bundle/bundle-manifest.ts'
import { appendUpgradeLog } from '../../../packages/company-pack/src/host/run-bundle/bundle-manifest.ts'
import { writePendingRevoke } from '../../../packages/company-pack/src/host/cultivation/revoke-journal.ts'
import { regenerateCatalog } from '../../../packages/company-pack/src/host/ledger/catalog.ts'
import { exportGovernance } from '../../../packages/company-pack/src/host/ledger/governance-export.ts'
import { writePresentedLedger, type PresentedLedger } from '../../../packages/company-pack/src/host/ledger/presented-ledger.ts'
import { writeStartupSettings } from '../../../packages/company-pack/src/host/startup/startup-store.ts'
import { applyBootstrap, planBootstrap } from '../../../packages/company-pack/src/host/run-bundle/bootstrap.ts'
import type { StartupSettings } from '../../../packages/company-pack/src/lib/startup-settings.ts'
import { ALL_SHAPES, makeWorld, outsideSnapshot } from '../../support/world-shapes.ts'

const ROLES = ['ceo', 'cfo', 'coo', 'cmo', 'vp-eng', 'vp-sales'] as const

/** 最小 pack content：bootstrap 只需要可读的种子源。 */
function makeContent(): string {
  const dir = mkdtempSync(join(tmpdir(), 'shape-content-'))
  for (const sub of ['templates', 'charters', 'state', 'kb-setup']) mkdirSync(join(dir, sub), { recursive: true })
  writeFileSync(join(dir, 'AGENTS.md'), '# 公司手册\n')
  for (const role of ROLES) writeFileSync(join(dir, `charters/${role}.md`), `# ${role}\n`)
  writeFileSync(join(dir, 'state/company.md'), '---\nproductType: business-software\n---\n# 公司\n')
  writeFileSync(join(dir, 'state/org.md'), '# 组织\n')
  writeFileSync(join(dir, 'state/owners.md'), '# 归属\n')
  writeFileSync(join(dir, 'state/motion-ledger.md'), '# 台账\n')
  writeFileSync(join(dir, 'kb-setup/seed.json'), JSON.stringify({
    seeds: [
      ...ROLES.map(role => ({ source: `charters/${role}.md`, target: `.dsh-company/kb/${role}/CHARTER.md` })),
      { source: 'state/company.md', target: '.dsh-company/kb/company.md' },
      { source: 'state/org.md', target: '.dsh-company/kb/org.md' },
      { source: 'state/owners.md', target: '.dsh-company/kb/owners.md' },
      { source: 'state/motion-ledger.md', target: '.dsh-company/kb/motion-ledger.md' },
    ],
  }))
  return dir
}

const CONTENT = makeContent()
afterAll(() => { rmSync(CONTENT, { recursive: true, force: true }) })

const SETTINGS: StartupSettings = {
  v: 1, productType: null, deliveryMode: null, wiki: null, updatedAt: null,
}
const LEDGER: PresentedLedger = {
  schema: 1, updatedAt: '2026-11-13T00:00:00.000Z', paths: {}, slugs: {},
}

interface Writer {
  readonly id: string
  /** 该写入口在公司盘内的主目标（叶形状按它建形状）。 */
  readonly target: string
  run(workspace: string): unknown
}

const WRITERS: readonly Writer[] = [
  {
    id: 'company.writeAtomic',
    target: 'kb/probe.json',
    run: (workspace) => writeCompanyAtomic(workspace, '.dsh-company/kb/probe.json', 'probe\n'),
  },
  {
    // 注意：这两个 API 的形参历史上叫 companyHome，实际语义是 workspace（内部再 companyHomeOf）。
    // 传 `.dsh-company` 会双重前缀；BUG-150（测试侧）就是这次假红的留痕。
    id: 'catalog.regenerate',
    target: 'kb/deliverables-index.json',
    run: (workspace) => regenerateCatalog(workspace),
  },
  {
    id: 'presented.write',
    target: 'deliverables-presented.json',
    run: (workspace) => writePresentedLedger(workspace, LEDGER),
  },
  {
    id: 'startup.write',
    target: 'startup.json',
    run: (workspace) => writeStartupSettings(workspace, SETTINGS),
  },
  {
    id: 'bootstrap.apply',
    target: 'kb/company.md',
    run: (workspace) => applyBootstrap(planBootstrap(CONTENT, workspace)),
  },
  {
    id: 'export.governance',
    target: 'exports',
    run: (workspace) => exportGovernance({ dshHome: join(workspace, '.dsh-home'), workspace }),
  },
  {
    id: 'cultivation.writeRecord',
    target: 'cultivation/records',
    run: (workspace) => nodeCultivationStorage.writeRecord(join(workspace, '.dsh-company/cultivation/records'), {
      kind: 'correction', targetRole: 'ceo', proposerRole: 'ceo', proposerKind: 'human',
      source: 'test', expectation: '稳', body: '先列清单',
    }),
  },
  {
    id: 'log.write',
    target: 'logs/company-pack-upgrade.log',
    run: (workspace) => appendUpgradeLog(workspace, 'probe'),
  },
  {
    id: 'bundle.write',
    target: 'bundle.json',
    run: (workspace) => writeBundleManifest(planBundleManifest({
      dshHome: join(workspace, '.dsh-home'), workspace, pack: { name: 'dsh-company-pack', version: '0.0.0-test' },
    })),
  },
  {
    id: 'cultivation.pendingRevoke',
    target: 'cultivation/.pending-revoke.json',
    run: (workspace) => writePendingRevoke(workspace, {
      schema: 1, role: 'ceo', slug: 'm1', revokedAt: 'x', createdAt: 'x', records: [],
    }),
  },
]

type Outcome = { readonly kind: 'ok'; readonly value: unknown } | { readonly kind: 'error'; readonly error: unknown }

function capture(run: () => unknown): Outcome {
  try { return { kind: 'ok', value: run() } } catch (error) { return { kind: 'error', error } }
}

function isTypedRefusal(error: unknown): boolean {
  return error instanceof UnsafeCompanyPathError
    || error instanceof CompanyWriteBlockedError
    || error instanceof UnsafeCultivationPathError
}

describe('公司盘 Safety 矩阵：形状 × 写入口', () => {
  for (const writer of WRITERS) {
    describe(writer.id, () => {
      for (const shape of ALL_SHAPES) {
        it(`${shape.id}：不写 outside，失败必须 typed`, () => {
          const world = makeWorld()
          try {
            shape.build(world, writer.target)
            const before = outsideSnapshot(world)
            const outcome = capture(() => writer.run(world.ws))
            expect(outsideSnapshot(world), `${writer.id} 在 ${shape.id} 下写到了 outside`).toEqual(before)
            if (outcome.kind === 'error') {
              expect(
                isTypedRefusal(outcome.error),
                `${writer.id} 在 ${shape.id} 下抛了非 typed 错误：${String(outcome.error)}`,
              ).toBe(true)
            }
          } finally { world.cleanup() }
        })
      }
    })
  }
})

describe('零覆盖入口：*At 与 createCompanyDir', () => {
  it('createCompanyDir 拒绝越界 rel', () => {
    const world = makeWorld()
    try {
      expect(() => createCompanyDir(world.ws, '../../outside-company')).toThrow(UnsafeCompanyPathError)
    } finally { world.cleanup() }
  })

  it('writeCompanyAtomicAt / readCompanyTextAt 在 companyHome 域工作', () => {
    const world = makeWorld()
    const home = join(world.ws, '.dsh-company')
    try {
      writeCompanyAtomicAt(home, 'kb/x.json', 'x\n')
      expect(readCompanyTextAt(home, 'kb/x.json')).toBe('x\n')
    } finally { world.cleanup() }
  })

  it('writeCompanyAtomicAt 拒绝根 symlink，外部不写', () => {
    const world = makeWorld()
    const home = join(world.ws, '.dsh-company')
    try {
      symlinkSync(world.outside, home)
      expect(() => writeCompanyAtomicAt(home, 'kb/x.json', 'x\n')).toThrow(UnsafeCompanyPathError)
      expect(outsideSnapshot(world)).toEqual([])
    } finally { world.cleanup() }
  })

  it('temp 写入后父目录被换成 symlink → 拒绝且外部不写（TOCTOU 收窄）', () => {
    const world = makeWorld()
    const kb = join(world.ws, '.dsh-company', 'kb')
    const outsideKb = join(world.outside, 'kb')
    try {
      mkdirSync(kb, { recursive: true })
      mkdirSync(outsideKb)
      const before = outsideSnapshot(world)
      expect(() => writeCompanyAtomic(world.ws, '.dsh-company/kb/x.json', 'x\n', {
        writeFile: (path, data, options) => {
          writeFileSync(path, data, options)
          rmSync(kb, { recursive: true, force: true })
          symlinkSync(outsideKb, kb)
        },
      })).toThrow(UnsafeCompanyPathError)
      expect(outsideSnapshot(world)).toEqual(before)
    } finally { world.cleanup() }
  })
})
