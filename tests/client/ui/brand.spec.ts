import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  parseCompanyIdentity,
  resetCompanyIdentity,
  setCompanyIdentity,
} from '../../../packages/company-pack/src/client/data/company-identity.ts'
import { DreamTeamBrandName } from '../../../packages/company-pack/src/client/ui/Brand.tsx'
import { en, zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { listCompanyFixtureIds, loadCompanyFixture } from '../../support/company-fixture.ts'

/**
 * 侧栏品牌名 = 部署词标（首屏第一笔）。
 *
 * 2026-11-09：品牌不再写死在组件里——从部署身份（`company.md` frontmatter）读 `productName`；
 * 读不到保持出厂词标。本 spec 用两家公司 fixture 跑同一套断言（换公司不改测试）。
 * 证明边界：只证渲染与解析，不证 slot 装配/真实读取（→ client-load-smoke）。
 */
const ids = listCompanyFixtureIds()

const t = ((key: keyof typeof zh) => zh[key]) as CompanyT
const tEn = ((key: keyof typeof en) => en[key]) as CompanyT

beforeEach(() => { resetCompanyIdentity() })

describe('Brand', () => {
  it('无部署身份 ⇒ 出厂词标（zh/en 跟随 t）', () => {
    expect(renderToStaticMarkup(createElement(DreamTeamBrandName, { t }))).toContain(zh['brand.name'])
    expect(renderToStaticMarkup(createElement(DreamTeamBrandName, { t: tEn }))).toContain(en['brand.name'])
  })

  it('身份解析：缺 frontmatter / 缺 company ⇒ 不覆盖出厂词标', () => {
    expect(parseCompanyIdentity(null)).toBeNull()
    expect(parseCompanyIdentity('# 无头\n')).toBeNull()
    expect(parseCompanyIdentity('---\nproductName: Acme\n---\n')).toBeNull()
  })
})

describe.each(ids)('品牌跟随部署身份：%s', (id) => {
  const fixture = loadCompanyFixture(id)

  it('从 identity.md 解析 productName 并渲染', () => {
    const text = readFileSync(join(fixture.dir, 'identity.md'), 'utf8')
    const parsed = parseCompanyIdentity(text)
    expect(parsed, 'fixture identity 解析失败').not.toBeNull()
    expect(parsed?.company).toBe(fixture.identity['company'])
    setCompanyIdentity(parsed!)
    expect(renderToStaticMarkup(createElement(DreamTeamBrandName, { t }))).toContain(fixture.identity['productName'] as string)
  })
})
