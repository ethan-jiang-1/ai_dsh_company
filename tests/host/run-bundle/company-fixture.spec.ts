/**
 * 公司 fixture 矩阵（三层分离的测试资产，2026-11-09）。
 *
 * 病根：测试把"这家公司是什么"写成常量（名字/人数/政策数字），换公司时测试仍在替旧公司作证。
 * 判据：同一套 spec 用两家不同公司跑；期望值只从 fixture profile 读。
 *
 * 红配方：删 `tests/fixtures/companies/beta-b2b-saas/policy-lines.md` → 本 spec 红（fixture 缺件）；
 * 把 beta 的 productType 改成与 acme 相同 → "产品类型不同"红。
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bootstrapCompanyWorkspace } from '../../../packages/company-pack/src/host/run-bundle/bootstrap.ts'
import {
  listCompanyFixtureIds,
  loadCompanyFixture,
  materializeCompanyContent,
} from '../../support/company-fixture.ts'

const ids = listCompanyFixtureIds()

describe('公司 fixture 矩阵：资产形状', () => {
  it('至少两家公司，且产品类型不同（换类型才有对照）', () => {
    expect(ids.length, '公司 fixture 少于两家，换公司无从验证').toBeGreaterThanOrEqual(2)
    const types = ids.map(id => loadCompanyFixture(id).identity['productType'])
    expect(types.every(type => typeof type === 'string' && type !== ''), 'productType 是必填').toBe(true)
    expect(new Set(types).size, '至少两种 productType').toBe(types.length)
  })
})

describe.each(ids)('公司 fixture：%s', (id) => {
  const fixture = loadCompanyFixture(id)

  it('profile 三件齐且可解析', () => {
    expect(fixture.identity['company']).toBeTruthy()
    expect(fixture.identity['productType']).toBeTruthy()
    expect(fixture.identity['timeZone']).toBeTruthy()
    expect(fixture.organization['总人数']).toMatch(/^\d+$/)
    expect(fixture.organization['部门数']).toMatch(/^\d+$/)
    expect(fixture.policy['毛利底线']).toBeTruthy()
    expect(fixture.policy['并行项目上限']).toMatch(/^\d+$/)
  })

  it('bootstrap 从该公司的状态种子落盘（同一套 spec 换公司跑）', () => {
    const content = mkdtempSync(join(tmpdir(), `company-content-${id}-`))
    const workspace = mkdtempSync(join(tmpdir(), `company-ws-${id}-`))
    try {
      materializeCompanyContent(content, fixture)
      const { result } = bootstrapCompanyWorkspace(content, workspace)
      expect(result.created, 'fresh 盘要 seed 公司身份').toContain('.dsh-company/kb/company.md')
      const seeded = readFileSync(join(workspace, '.dsh-company/kb/company.md'), 'utf8')
      expect(seeded).toContain(fixture.identity['company'] as string)
    } finally {
      rmSync(content, { recursive: true, force: true })
      rmSync(workspace, { recursive: true, force: true })
    }
  })
})
