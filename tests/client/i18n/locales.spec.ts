/**
 * company 字典的形状守卫（Phase A1）。
 *
 * 为什么：typed 注册只能保证「编译期 key 完整」；placeholder 拼错、en 里混中文、
 * 空值这类漂移仍会漏到页面。这里用 keyless 断言把两语言成对与占位符一致钉住。
 */
import { describe, expect, it } from 'vitest'
import { COMPANY_NS, en, zh, type CompanyKey } from '../../../packages/company-pack/src/client/locales.ts'

const CJK = /[\u3400-\u9fff]/u
const PLACEHOLDER = /\{([a-zA-Z][\w]*)\}/gu

function placeholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map(match => match[1] as string).sort()
}

describe('company locale 字典', () => {
  it('zh 是 key 源；en 的 key 集与 zh 完全一致', () => {
    const zhKeys = Object.keys(zh).sort()
    const enKeys = (Object.keys(en) as CompanyKey[]).sort()
    expect(enKeys).toEqual(zhKeys)
  })

  it('每个 key 的 zh/en 占位符同名同数', () => {
    for (const key of Object.keys(zh) as CompanyKey[]) {
      expect(placeholders(en[key]), `${key} 的 en 占位符`).toEqual(placeholders(zh[key]))
    }
  })

  it('en 不含 CJK；两语言都不为空', () => {
    for (const key of Object.keys(zh) as CompanyKey[]) {
      expect(zh[key].trim(), `${key} zh`).not.toBe('')
      expect(en[key].trim(), `${key} en`).not.toBe('')
      expect(en[key], `${key} en 混入中文`).not.toMatch(CJK)
    }
  })

  it('命名空间是稳定的 company', () => {
    expect(COMPANY_NS).toBe('company')
  })
})
