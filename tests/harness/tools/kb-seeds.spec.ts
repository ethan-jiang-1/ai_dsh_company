import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { readSeeds } from '../../../packages/company-pack/src/host/run-bundle/bootstrap.ts'
import { readKbSeeds, readProductType, seedKbFiles } from '../../../tools/lib/kb-seeds.mjs'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'
import { mirrorCompanyReference } from '../../../tools/lib/rehearsal.mjs'

const CONTENT = join(ROOT, 'packages/company-pack/content')
const RUN_BUNDLE_DIR = '.dsh-company'
const KB_DIR = `${RUN_BUNDLE_DIR}/kb`
const TMP: string[] = []
afterAll(() => { for (const dir of TMP) rmSync(dir, { recursive: true, force: true }) })

const tempDir = (prefix: string): string => {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  TMP.push(dir)
  return dir
}

/** pack 的出厂 productType（唯一来源 = `content/state/company.md`，不在测试里写死字面量）。 */
const DEFAULT_TYPE = readProductType(readFileSync(join(CONTENT, 'state/company.md'), 'utf8'))

/** 生产 bootstrap 会 seed 的 kb 文件清单（唯一期望源 = pack 的 seed.json）。 */
function productionKbTargets(): string[] {
  const { seeds, error } = readSeeds(CONTENT, { productType: DEFAULT_TYPE })
  expect(error, '生产 seed 清单必须可读').toBeUndefined()
  expect(seeds.some(seed => seed.target === `${KB_DIR}/process-docs.md`), '类型相关 seed 不能被跳过').toBe(true)
  return seeds.map(seed => seed.target).filter(target => target.startsWith(`${KB_DIR}/`)).sort()
}

/** 某 workspace 下 `.dsh-company/kb/` 的实际文件（目录不算；按 POSIX 相对路径）。 */
function kbFiles(workspace: string): string[] {
  const root = join(workspace, KB_DIR)
  const out: string[] = []
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) walk(join(dir, entry.name), rel)
      else if (entry.isFile() && statSync(join(dir, entry.name)).isFile()) out.push(`${KB_DIR}/${rel}`)
    }
  }
  walk(root, '')
  return out.sort()
}

// 负例留证 2026-11-10：BUG-054 —— 修前本文件第 2 条实跑红：
//   `actual` 只有 10 个 kb 文件，缺 `policy-lines.md` / `review-protocol.md` /
//   `process-docs.md` / `AGENTS.md`（mirror 抄的是固定 5 件状态清单，`content/state/process-docs.md`
//   早已不存在）；把 seed 驱动复制接上后绿。红配方 = 还原 tools/lib/kb-seeds.mjs 的 seed 读取为
//   旧的固定清单，或删本 spec 的 policy-lines 断言。
describe('kb 旁路装配与生产 seed 同形（BUG-054）', () => {
  it('维护工具读到的 kb seed 与生产 bootstrap 的 readSeeds 同清单', () => {
    expect(readKbSeeds(CONTENT).map(seed => seed.target).sort()).toEqual(productionKbTargets())
  })

  it('seedKbFiles 给 fresh workspace 补齐全部 kb 文件（含 policy-lines / review-protocol）', () => {
    const workspace = tempDir('kb-seed-')
    expect(seedKbFiles(CONTENT, workspace).sort()).toEqual(productionKbTargets())
    expect(kbFiles(workspace)).toEqual(productionKbTargets())
    for (const target of productionKbTargets()) {
      const seed = readKbSeeds(CONTENT).find(entry => entry.target === target)
      expect(seed, `${target} 必须来自 seed.json`).toBeDefined()
      expect(readFileSync(join(workspace, target), 'utf8'))
        .toBe(readFileSync(join(CONTENT, seed?.source ?? ''), 'utf8'))
    }
    expect(readFileSync(join(workspace, `${KB_DIR}/policy-lines.md`), 'utf8')).toContain('Parallel delivery limit')
  })

  it('onlyMissing 不覆盖已有文件（bundle:init 与生产 only-fill 同语义）', () => {
    const workspace = tempDir('kb-only-fill-')
    const target = join(workspace, `${KB_DIR}/company.md`)
    seedKbFiles(CONTENT, workspace)
    writeFileSync(target, '# 用户改过的公司身份\n')
    seedKbFiles(CONTENT, workspace, { onlyMissing: true })
    expect(readFileSync(target, 'utf8')).toBe('# 用户改过的公司身份\n')
  })

  it('类型相关 seed 随 productType 解析（process-docs 不写死单一类型）', () => {
    const processDocs = readKbSeeds(CONTENT).find(seed => seed.target === `${KB_DIR}/process-docs.md`)
    expect(processDocs?.source, '缺省 = pack company.md 的出厂类型').toBe('product-types/business-software/requirements-model.md')
    const workspace = tempDir('kb-hardware-')
    seedKbFiles(CONTENT, workspace, { productType: 'hardware-software' })
    expect(readFileSync(join(workspace, `${KB_DIR}/process-docs.md`), 'utf8'))
      .toBe(readFileSync(join(CONTENT, 'product-types/hardware-software/requirements-model.md'), 'utf8'))
  })

  it('缺/未知 productType 时旁路 fail-loud（不猜类型）', () => {
    expect(() => seedKbFiles(CONTENT, tempDir('kb-bad-'), { productType: 'mystery' })).toThrow(/mystery/)
    expect(() => seedKbFiles(CONTENT, tempDir('kb-null-'), { productType: '' })).toThrow(/productType/)
  })

  it('company.md 的 YAML 引号/注释按标量解析', () => {
    expect(readProductType('---\nproductType: "business-software" # 默认\n---\n')).toBe('business-software')
    expect(readProductType("productType: 'hardware-software'")).toBe('hardware-software')
    expect(readProductType('productType: <类型 id>')).toBeNull()
  })

  it('排练场 mirror 与 bootstrap seed 的 kb 文件清单一致（缺 policy-lines = COO/CFO 判据闭合不了）', () => {
    const workspace = tempDir('kb-mirror-')
    mirrorCompanyReference(workspace, join(workspace, 'company-workspace'), { contentRoot: CONTENT })
    expect(kbFiles(workspace)).toEqual(productionKbTargets())
    expect(kbFiles(workspace)).toContain(`${KB_DIR}/policy-lines.md`)
    expect(kbFiles(workspace)).toContain(`${KB_DIR}/review-protocol.md`)
  })

  it('bundle:init 从 seed.json 复制 kb 文件，不再维护第二份清单', () => {
    const source = readFileSync(join(ROOT, 'tools/bundle-init.mjs'), 'utf8')
    expect(source, 'bundle:init 必须走共享 seed 复制面（BUG-054 的根因是旁路清单各自维护）')
      .toContain('seedKbFiles')
    expect(source, '旧固定清单不得残留（它与 seed.json 漂移）')
      .not.toContain("['company.md', 'org.md', 'owners.md', 'motion-ledger.md']")
  })
})
