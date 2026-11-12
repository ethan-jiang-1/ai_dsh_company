/** 看板/DAG 的表达层 keyless 检查（P0 UI 双语）。只测空态与列标签；数据语义仍由既有 spec 守。 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BoardPanel, DagPanel } from '../../../packages/company-pack/src/client/tabs/company-panels.tsx'
import { en, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import type { BoardColumn } from '../../../packages/company-pack/src/lib/board.ts'

const tEn = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = en[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

const COLUMNS: BoardColumn[] = [
  { status: 'pending', label: '待办', cards: [] },
  { status: 'in_progress', label: '进行中', cards: [] },
  { status: 'completed', label: '完成', cards: [] },
]

describe('BoardPanel i18n', () => {
  it('en：看板 aria、三列标签与空列文案', () => {
    const html = renderToStaticMarkup(createElement(BoardPanel, { columns: COLUMNS, t: tEn }))
    expect(html).toContain('aria-label="Task board"')
    expect(html).toContain('Pending')
    expect(html).toContain('In progress')
    expect(html).toContain('Completed')
    expect(html).toContain('This column is empty for now.')
  })
})

describe('DagPanel i18n', () => {
  it('en：空态与 aria', () => {
    const html = renderToStaticMarkup(createElement(DagPanel, {
      layout: { nodes: [], edges: [], width: 0, height: 0 },
      t: tEn,
    }))
    expect(html).toContain('This motion has no task dependency graph yet.')
  })
})
