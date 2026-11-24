// 负例留证 2026-11-24：把 resolveCompanyRoots 的 hasBundle 分支删掉（永远返回平铺）⇒ 本用例红。BUG-353
/** 工作区双根解析（BUG-353）：v3 bundle 与历史扁平两种布局。 */
import { describe, expect, it } from 'vitest'
import { COMPANY_BUNDLE_DIRNAME, resolveCompanyRoots } from '../../tools/lib/company/workspace-roots.mjs'

describe('resolveCompanyRoots（BUG-353）', () => {
  it('有 bundle：companyRoot = <ws>/.dsh-company，外层仍是 workspaceRoot', () => {
    const roots = resolveCompanyRoots('/repo/company-workspace', true)
    expect(roots.workspaceRoot).toBe('/repo/company-workspace')
    expect(roots.companyRoot).toBe(`/repo/company-workspace/${COMPANY_BUNDLE_DIRNAME}`)
    expect(roots.bundleRel).toBe(COMPANY_BUNDLE_DIRNAME)
  })

  it('无 bundle：两根都指向外层（历史扁平快照兼容）', () => {
    const roots = resolveCompanyRoots('/repo/old-snapshot', false)
    expect(roots.workspaceRoot).toBe('/repo/old-snapshot')
    expect(roots.companyRoot).toBe('/repo/old-snapshot')
    expect(roots.bundleRel).toBe('')
  })
})
