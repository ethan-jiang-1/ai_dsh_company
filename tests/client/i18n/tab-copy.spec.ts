/**
 * 公司页签壳的中英文回归（Phase A2 第一片）。
 *
 * 这不是端到端：它断言**真实 UI 用的那份 copy 函数和 Title 组件**在 zh/en 下
 * 返回不同语言的文案，且 10 个页签全覆盖。浏览器全页签归 ui-scene-smoke。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TAB_IDENTITY } from '../../../packages/company-pack/src/client/ui/tab-icons.tsx'
import {
  TAB_COPY_KEYS, tabCopyFor, type FaceKey,
} from '../../../packages/company-pack/src/client/tabs/tab-copy.ts'
import { en, zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'

const CJK = /[\u3400-\u9fff]/u
const translate = (dict: Record<CompanyKey, string>): CompanyT =>
  ((key: CompanyKey) => dict[key]) as CompanyT
const zhT = translate(zh)
const enT = translate(en)
const faces = Object.keys(TAB_COPY_KEYS) as FaceKey[]

describe('company 页签壳 zh/en', () => {
  it('10 个页签都有 zh/en 的 label/tooltip/description；en 无中文且与 zh 不同', () => {
    expect(faces).toHaveLength(10)
    for (const face of faces) {
      const zhCopy = tabCopyFor(face, zhT)
      const enCopy = tabCopyFor(face, enT)
      for (const field of ['label', 'tooltip', 'description'] as const) {
        expect(zhCopy[field].trim(), `${face}.${field} zh`).not.toBe('')
        expect(enCopy[field].trim(), `${face}.${field} en`).not.toBe('')
        expect(enCopy[field], `${face}.${field} en 混入中文`).not.toMatch(CJK)
        expect(enCopy[field], `${face}.${field} 两种语言相同`).not.toBe(zhCopy[field])
      }
    }
  })

  it('真实 Title 组件在 zh/en 下渲染出对应文案', () => {
    for (const face of faces) {
      const zhCopy = tabCopyFor(face, zhT)
      const enCopy = tabCopyFor(face, enT)
      const zhHtml = renderToStaticMarkup(createElement(TAB_IDENTITY[face].Title, { t: zhT }))
      const enHtml = renderToStaticMarkup(createElement(TAB_IDENTITY[face].Title, { t: enT }))
      expect(zhHtml, `${face} zh Title`).toContain(zhCopy.label)
      expect(enHtml, `${face} en Title`).toContain(enCopy.label)
      expect(enHtml, `${face} en Title 残留中文`).not.toContain(zhCopy.label)
      const enEntry = renderToStaticMarkup(createElement(TAB_IDENTITY[face].Entry, { t: enT, kind: face, openTab: () => {} }))
      expect(enEntry, `${face} en GuideEntry`).toContain(enCopy.label)
    }
  })

  it('关键页签的 language 映射没有错位', () => {
    expect(tabCopyFor('attention', zhT).label).toBe('待办')
    expect(tabCopyFor('attention', enT).label).toBe('Inbox')
    expect(tabCopyFor('catalog', zhT).label).toBe('成品')
    expect(tabCopyFor('catalog', enT).label).toBe('Deliverables')
    expect(tabCopyFor('cultivation', zhT).label).toBe('培养')
    expect(tabCopyFor('cultivation', enT).label).toBe('Cultivation')
  })
})
