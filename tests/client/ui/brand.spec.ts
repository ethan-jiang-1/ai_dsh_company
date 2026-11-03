import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DreamTeamBrandName } from '../../../packages/company-pack/src/client/ui/Brand.tsx'

/**
 * 侧栏品牌名 = 部署词标（首屏第一笔）。原断言住在已删的 company-identity.spec；品牌仍在
 * `client/index.ts` 的 `sidebar.brand.name` 注册面，故单独保留这一条静态渲染守卫。
 * 证明边界：只证渲染出部署词标，不证 slot 装配（→ client-load-smoke / ui-scene-smoke）。
 */
describe('Brand', () => {
  it('侧栏品牌名 = 部署词标', () => {
    expect(renderToStaticMarkup(createElement(DreamTeamBrandName))).toContain('DSH 梦之队')
  })
})
