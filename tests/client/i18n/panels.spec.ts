// @vitest-environment happy-dom
/** 看板/DAG/任务板/成品页签的表达层 keyless 检查（P0 UI 双语）：填充态、漂移态、边界态与实时切换。 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { BoardPanel, DagPanel } from '../../../packages/company-pack/src/client/tabs/company-panels.tsx'
import { TasksTableView } from '../../../packages/company-pack/src/client/tabs/TasksPanel.tsx'
import { DeliverablesTab, DeliverablesView } from '../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx'
import { en, zh } from '../../../packages/company-pack/src/client/locales.ts'
import { parseCatalog } from '../../../packages/company-pack/src/client/data/deliverables-index.ts'
import type { BoardColumn } from '../../../packages/company-pack/src/lib/presence/board.ts'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/shared/run-bundle-paths.ts'
import { assertEnglishUiClean, translateWith } from '../../support/i18n-assertions.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const tEn = translateWith(en)
const tZh = translateWith(zh)

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

const COLUMNS: BoardColumn[] = [
  { status: 'pending', label: '待办', cards: [] },
  { status: 'in_progress', label: '进行中', cards: [] },
  { status: 'completed', label: '完成', cards: [] },
]

describe('BoardPanel & DagPanel i18n', () => {
  it('en：看板 aria、三列标签与空列文案无中文', () => {
    const html = renderToStaticMarkup(createElement(BoardPanel, { columns: COLUMNS, t: tEn }))
    expect(html).toContain('aria-label="Task board"')
    expect(html).toContain('aria-label="Pending column"')
    expect(html).toContain('Pending')
    expect(html).toContain('In progress')
    expect(html).toContain('Completed')
    expect(html).toContain('This column is empty for now.')
    assertEnglishUiClean(html, 'BoardPanel empty en')
  })

  it('en：填充看板卡含阻塞依赖 + drift + statusGap + revisionGap 无中文与全角标点', () => {
    const populated: BoardColumn[] = [
      {
        status: 'pending',
        label: '待办',
        cards: [{
          id: 't1',
          subject: 'Ship budget analysis',
          ownerLabel: 'CFO',
          revision: 2,
          blockedBy: ['t0', 't2'],
          ready: false,
          drift: { taskId: 't1', declared: ['t9', 'ext-x'], missing: ['t9'], unmapped: ['ext-x'] },
          statusGap: true,
          revisionGap: true,
        }],
      },
      { status: 'in_progress', label: '进行中', cards: [] },
      { status: 'completed', label: '完成', cards: [] },
    ]
    const html = renderToStaticMarkup(createElement(BoardPanel, { columns: populated, t: tEn }))
    expect(html).toContain('Waiting on t0, t2')
    expect(html).toContain('Declared dependencies missing from the board: t9; Declared dependencies cannot be checked: ext-x')
    expect(html).toContain('Unknown status')
    expect(html).toContain('Revision gap')
    assertEnglishUiClean(html, 'BoardPanel populated en')
  })

  it('en：DagPanel 空态与填充态均无中文与全角标点', () => {
    const emptyHtml = renderToStaticMarkup(createElement(DagPanel, {
      layout: { nodes: [], edges: [], width: 0, height: 0 },
      t: tEn,
    }))
    expect(emptyHtml).toContain('This motion has no task dependency graph yet.')
    assertEnglishUiClean(emptyHtml, 'DagPanel empty en')

    const populatedHtml = renderToStaticMarkup(createElement(DagPanel, {
      layout: {
        width: 400,
        height: 160,
        nodes: [{
          id: 't1',
          subject: 'Finalize contract',
          ownerLabel: 'VP Eng',
          status: 'pending',
          level: 0,
          order: 0,
          waitingOn: 1,
          x: 10,
          y: 10,
          width: 140,
          height: 54,
        }],
        edges: [],
      },
      t: tEn,
    }))
    expect(populatedHtml).toContain('Waiting on 1')
    expect(populatedHtml).toContain('<title>t1: Finalize contract</title>')
    assertEnglishUiClean(populatedHtml, 'DagPanel populated en')
  })
})

describe('TasksTableView i18n', () => {
  it('en：空/加载/填充任务与 gap 态无中文与全角标点', () => {
    const loadingHtml = renderToStaticMarkup(createElement(TasksTableView, { view: null, t: tEn }))
    assertEnglishUiClean(loadingHtml, 'TasksTableView loading en')

    const populatedHtml = renderToStaticMarkup(createElement(TasksTableView, {
      t: tEn,
      view: {
        motionId: 'm1',
        members: [{ name: 'ceo', status: 'running' }, { name: 'cfo', status: 'idle' }],
        tasks: [
          { id: 't1', subject: 'Audit model', status: 'pending', owner: 'cfo', blockedBy: ['missing-1'], revision: 1 },
        ],
      } as never,
    }))
    expect(populatedHtml).toContain('Members:')
    expect(populatedHtml).toContain('missing-1 (not found)')
    assertEnglishUiClean(populatedHtml, 'TasksTableView populated en')
  })
})

describe('DeliverablesTab i18n 与实时语言切换（回归 hooks deps）', () => {
  it('en 渲染无中文；语言从 zh 切换为 en 时月份分组头同步重算（不滞留「日期未记」）', async () => {
    const catalogJson = JSON.stringify({
      schema: 1,
      generatedAt: '2026-11-23T01:00:00Z',
      entries: [
        { slug: 'launch-brief', kickoff: '', type: 'production', result: 'completed', root: RUN_BUNDLE_PATHS.deliverables, path: 'deliverables/launch-brief/final.md', summary: 'Ready for review', ledgered: true, presented: true, metaProblem: null },
        { slug: 'broken-item', path: '' },
      ],
    })
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    const baseProps = {
      sessionId: 's1',
      readCatalog: async () => ({ ok: true as const, eof: true, text: catalogJson }),
      useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/deliverables' } }),
      floatTab: () => {},
      unfloatTab: () => {},
      openFinal: () => {},
    }
    await act(async () => { mounted?.render(createElement(DeliverablesTab, { ...baseProps, t: tZh } as never)) })
    await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
    expect(host.textContent).toContain('日期未记')

    await act(async () => { mounted?.render(createElement(DeliverablesTab, { ...baseProps, t: tEn } as never)) })
    expect(host.textContent).toContain('Date missing')
    expect(host.textContent).not.toContain('日期未记')
    assertEnglishUiClean(host.textContent ?? '', 'DeliverablesTab switched en')

    // 同一 catalog 引用下切换 t：验证 DeliverablesView 的 groups useMemo 真以 t 为依赖（非引用重建巧合）。
    const stableCatalog = parseCatalog(catalogJson)!
    const viewHost = document.createElement('div')
    document.body.append(viewHost)
    const viewRoot = createRoot(viewHost)
    await act(async () => { viewRoot.render(createElement(DeliverablesView, { catalog: stableCatalog, sessionId: 's1' as never, openFinal: () => {}, t: tZh })) })
    expect(viewHost.querySelector('.wk-section-title')?.textContent).toContain('日期未记')
    await act(async () => { viewRoot.render(createElement(DeliverablesView, { catalog: stableCatalog, sessionId: 's1' as never, openFinal: () => {}, t: tEn })) })
    expect(viewHost.querySelector('.wk-section-title')?.textContent).toContain('Date missing')
    expect(viewHost.textContent).not.toContain('日期未记')
    act(() => { viewRoot.unmount() })
    viewHost.remove()
  })
})
