/**
 * fresh bootstrap 用真实 content 播种两个类型（2026-11-11，BUG-063 的端到端内容反证）。
 *
 * 判据：business 盘得到三层合同；hardware 盘得到五层合同；两者内容不同；seed 真的按 productType 分支。
 *
 * 红配方：把 seed.json 的 source 改回写死 hardware → business 用例红；
 * 把 business 的 requirements-model.md 复制成 hardware 版 → business 用例红。
 */
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bootstrapCompanyWorkspace } from '../../../packages/company-pack/src/host/run-bundle/bootstrap.ts'
import { repositoryRoot as ROOT } from '../../../tools/lib/repository-layout.mjs'

const CONTENT_DIR = join(ROOT, 'packages/company-pack/content')

function fresh(type: string): { workspace: string; processDocs: string; cleanup: () => void } {
  const workspace = mkdtempSync(join(tmpdir(), `bootstrap-content-${type}-`))
  const kb = join(workspace, '.dsh-company/kb')
  mkdirSync(kb, { recursive: true })
  writeFileSync(join(kb, 'company.md'), `---\ncompany: test\nproductType: ${type}\n---\n`)
  const { result } = bootstrapCompanyWorkspace(CONTENT_DIR, workspace)
  expect(result.created).toContain('.dsh-company/kb/process-docs.md')
  const processDocs = readFileSync(join(kb, 'process-docs.md'), 'utf8')
  return { workspace, processDocs, cleanup: () => rmSync(workspace, { recursive: true, force: true }) }
}

describe('fresh bootstrap 用真实 content：类型不同，合同不同', () => {
  it('business-software → 三层合同', () => {
    const { processDocs, cleanup } = fresh('business-software')
    try {
      expect(processDocs).toContain('# Product document chain and numbering contract (business-software)')
      expect(processDocs).toContain('Three layers and owners')
      expect(processDocs).not.toContain('Five layers and owners')
    } finally { cleanup() }
  })

  it('hardware-software → 五层合同', () => {
    const { processDocs, cleanup } = fresh('hardware-software')
    try {
      expect(processDocs).toContain('# Product document chain and numbering contract (hardware-software)')
      expect(processDocs).toContain('Five layers and owners')
      expect(processDocs).toContain('SyRS')
    } finally { cleanup() }
  })

  it('两份播种内容哈希不同', () => {
    const business = fresh('business-software')
    const hardware = fresh('hardware-software')
    try {
      const hash = (text: string): string => createHash('sha256').update(text).digest('hex')
      expect(hash(business.processDocs)).not.toBe(hash(hardware.processDocs))
    } finally {
      business.cleanup()
      hardware.cleanup()
    }
  })
})
