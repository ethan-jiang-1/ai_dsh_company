/**
 * 部署身份页签条（2026-10-25 审查补证）：公司名解析 + loading/未配置/错盘三种可见状态。
 * 这张卡以前的证据只有“kb/company.md 落盘”，没有渲染断言；这里补上。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CompanyIdentity, companyNameFrom } from '../../packages/company-pack/src/client/CompanyView.tsx'

describe('CompanyIdentity', () => {
  it('从 kb/company.md 抽公司名；空文件给“未填”', () => {
    expect(companyNameFrom('公司名: Acme\n产品名: DSH\n')).toBe('Acme')
    expect(companyNameFrom('公司名：甲公司\n')).toBe('甲公司')
    expect(companyNameFrom('# 没有名字\n')).toBe('')
    expect(renderToStaticMarkup(createElement(CompanyIdentity, { state: { status: 'ready', text: '公司名: Acme\n' } })))
      .toContain('公司：Acme')
    expect(renderToStaticMarkup(createElement(CompanyIdentity, { state: { status: 'ready', text: '产品名: DSH\n' } })))
      .toContain('公司：（未填）')
  })

  it('loading 不冒充未填；读不到身份时明确“非公司盘”', () => {
    expect(renderToStaticMarkup(createElement(CompanyIdentity, { state: { status: 'loading' } }))).toContain('公司：…')
    expect(renderToStaticMarkup(createElement(CompanyIdentity, { state: { status: 'unreadable' } })))
      .toContain('非公司盘 / 身份未配置')
  })
})
