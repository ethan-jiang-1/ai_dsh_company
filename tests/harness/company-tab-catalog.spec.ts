import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { repositoryRoot } from '../../tools/lib/repository-layout.mjs'
import { parseCompanyTabCatalog } from '../../tools/lib/company-tab-catalog.mjs'

// 2026-10-20 审计：cdp-probe 的 8 个页签 vs 注册面 9 个（成品缺）。本 spec 钉注册源形状，
// live 面由 cdp-probe 从同一份 catalog 驱动；解析失败 = 探针不该静默跑 8/8。
describe('company-tab-catalog', () => {
  it('从真实注册源解析出 9 个页签，含成品', () => {
    const source = readFileSync(join(repositoryRoot, 'packages/company-pack/src/client/company-tab-registration.ts'), 'utf8')
    const identity = readFileSync(join(repositoryRoot, 'packages/company-pack/src/client/tab-icons.tsx'), 'utf8')
    const tabs = parseCompanyTabCatalog(source, identity)
    expect(tabs).toHaveLength(9)
    expect(tabs.map(tab => tab.title)).toContain('成品')
    expect(tabs.every(tab => tab.id.startsWith('dsh-company-pack/'))).toBe(true)
  })

  it('格式漂移时返回空（探针 fail-loud，而不是少一个也绿）', () => {
    expect(parseCompanyTabCatalog('id: x, title: y')).toEqual([])
    expect(parseCompanyTabCatalog("id: 'dsh-company-pack/x', kind: 'k', face: 'missing'", 'const FACES = {}')).toEqual([])
  })
})
