// @vitest-environment happy-dom
// 负例留证 2026-11-27：DeliverablesView 直接使用未回正的 filter state ⇒ 台账外/未 present 归零隐藏按钮后画面卡死在空态（BUG-395）；还原后绿。BUG-395
// 负例留证 2026-11-27：DeliverablesView 未订阅 deliverablesFocusStore ⇒ 从 final.md 点核对草稿跳转成品面板时无对应动议高亮且隐藏筛选不复位（BUG-398）；还原后绿。BUG-398
/**
 * 成品页签的**错误态渲染判据**：真挂 `DeliverablesTab`，喂三种读取结果，
 * 断言面板说的那句话对得上状态——尤其「截断」不能报成「形状不符」。
 *
 * 为什么单独立一条：`catalogProblemOf` 的纯函数已有断言，但把结果翻成文案的那一层在组件体里；
 * 不挂组件，那一层就永远没有判据（覆盖率也会掉）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeliverablesTab, DeliverablesView, formatGeneratedAt } from '../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx'
import { createDeliverablesFocusStore, deliverablesFocusStore, extractDeliverableTarget } from '../../../packages/company-pack/src/client/tabs/deliverables-focus-store.ts'
import { zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/shared/run-bundle-paths.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

const t = ((key: keyof typeof zh, params?: Record<string, string | number>) => {
  const template = String(zh[key])
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

function props(over: Record<string, unknown> = {}) {
  return {
    sessionId: 'session-test',
    readCatalog: async () => ({ ok: true as const, eof: true, text: '{}' }),
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/deliverables' } }),
    floatTab: () => {},
    unfloatTab: () => {},
    openFinal: async () => ({ ok: true }),
    t,
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
  return host
}

describe('DeliverablesTab：截断 ≠ 形状不符', () => {
  it('读到但文件更长 ⇒ 说「超出读取上限」，不说「形状不符」', async () => {
    const host = await mount(createElement(DeliverablesTab, props({
      readCatalog: async () => ({ ok: true as const, eof: false, text: '{"schema":1,"entries":[' }),
    })))
    expect(host.textContent).toContain('超出读取上限')
    expect(host.textContent).not.toContain('形状不符')
  })

  it('读完但内容坏 ⇒ 仍是「形状不符」', async () => {
    const host = await mount(createElement(DeliverablesTab, props({
      readCatalog: async () => ({ ok: true as const, eof: true, text: 'not json' }),
    })))
    expect(host.textContent).toContain('形状不符')
  })

  it('读不到 ⇒ 「不可读」', async () => {
    const host = await mount(createElement(DeliverablesTab, props({
      readCatalog: async () => ({ ok: false as const, reason: 'EACCES' }),
    })))
    expect(host.textContent).toContain('不可读')
  })

  it('BUG-395：选中「台账外/未 present」筛选且计数归零后自动退回「全部」，不卡死空态', async () => {
    const makeCatalog = (unledgered: boolean) => ({
      schema: 1 as const,
      generatedAt: '2026-11-27T01:00:00Z',
      skipped: 0,
      entries: [{
        slug: 'item-1',
        kickoff: '2026-11-27',
        type: 'production',
        result: 'completed',
        summary: 'done summary',
        root: RUN_BUNDLE_PATHS.deliverables,
        dir: '2026-11-27-item-1',
        path: `${RUN_BUNDLE_PATHS.deliverables}/2026-11-27-item-1/final.md`,
        ledgered: !unledgered,
        presented: true,
        metaProblem: null,
      }],
    })
    const host = await mount(createElement(DeliverablesView, {
      catalog: makeCatalog(true),
      sessionId: 'session-1' as never,
      openFinal: () => {},
      t,
    }))
    const unledgeredBtn = [...host.querySelectorAll('button')].find(b => b.textContent?.includes(zh['deliverables.filter.unledgered']))!
    await act(async () => { unledgeredBtn.click() })
    expect(unledgeredBtn.getAttribute('aria-pressed')).toBe('true')

    await act(async () => {
      mounted?.render(createElement(DeliverablesView, {
        catalog: makeCatalog(false),
        sessionId: 'session-1' as never,
        openFinal: () => {},
        t,
      }))
    })
    expect([...host.querySelectorAll('button')].find(b => b.textContent?.includes(zh['deliverables.filter.unledgered']))).toBeUndefined()
    expect(host.textContent).toContain('item-1')
    expect(host.textContent).not.toContain(zh['deliverables.emptyFilter'])
  })

  it('BUG-398：deliverablesFocusStore 发布路径后重置筛选并高亮匹配成品行', async () => {
    deliverablesFocusStore.publish('/ws/.dsh-company/deliverables/2026-11-27-item-1/final.md')
    const catalog = {
      schema: 1 as const,
      generatedAt: '2026-11-27T00:00:00Z',
      skipped: 0,
      entries: [{
        slug: 'item-1',
        kickoff: '2026-11-27',
        type: 'production',
        result: 'completed',
        summary: 'done summary',
        root: RUN_BUNDLE_PATHS.deliverables,
        dir: '2026-11-27-item-1',
        path: `${RUN_BUNDLE_PATHS.deliverables}/2026-11-27-item-1/final.md`,
        ledgered: true,
        presented: true,
        metaProblem: null,
      }],
    }
    const openFinal = vi.fn()
    const host = await mount(createElement(DeliverablesView, {
      catalog,
      sessionId: 'session-1' as never,
      openFinal,
      t,
    }))
    const row = host.querySelector('.wk-deliverable-row[data-highlighted="true"]')
    expect(row).not.toBeNull()
    expect(row?.textContent).toContain('item-1')
    expect(deliverablesFocusStore.get()).toBeNull()

    const openBtn = host.querySelector('.wk-deliverable-open') as HTMLButtonElement
    await act(async () => { openBtn.click() })
    expect(openFinal).toHaveBeenCalledWith('session-1', `${RUN_BUNDLE_PATHS.deliverables}/2026-11-27-item-1/final.md`)

    expect(extractDeliverableTarget(undefined)).toBeNull()
    expect(extractDeliverableTarget('   ')).toBeNull()
    expect(extractDeliverableTarget('custom-slug')).toBe('custom-slug')
    const focusStore = createDeliverablesFocusStore()
    expect(focusStore.publish('')).toBeNull()
    const published = focusStore.publish('custom-slug')!
    focusStore.consume(published.id + 99)
    expect(focusStore.get()?.id).toBe(published.id)
    focusStore.consume(published.id)
    expect(focusStore.get()).toBeNull()

    // formatGeneratedAt defaultT fallback (L121), emptyFilter/emptyAll (L215), unpresented drop-to-zero (L164), slug highlight (L223)
    expect(formatGeneratedAt('2026-11-27T01:00:00Z')).toContain('01:00')
    act(() => { mounted?.unmount(); mounted = null })

    const makeUnpresented = (presented: boolean) => ({
      schema: 1 as const,
      generatedAt: '2026-11-27T01:00:00Z',
      skipped: 0,
      entries: [{
        slug: 'slug-match',
        kickoff: '2026-11-27',
        type: 'production',
        result: 'completed',
        summary: 'done',
        root: RUN_BUNDLE_PATHS.deliverables,
        dir: '2026-11-27-other',
        path: `${RUN_BUNDLE_PATHS.deliverables}/2026-11-27-other/final.md`,
        ledgered: true,
        presented,
        metaProblem: null,
      }],
    })
    deliverablesFocusStore.publish('slug-match')
    const h2 = await mount(createElement(DeliverablesView, {
      catalog: makeUnpresented(false),
      sessionId: 'session-1' as never,
      openFinal,
      t,
    }))
    expect(h2.querySelector('.wk-deliverable-row[data-highlighted="true"]')).not.toBeNull()
    const unpresentedBtn = [...h2.querySelectorAll('button')].find(b => b.textContent?.includes(zh['deliverables.filter.unpresented']))!
    await act(async () => { unpresentedBtn.click() })
    await act(async () => {
      mounted?.render(createElement(DeliverablesView, {
        catalog: makeUnpresented(true),
        sessionId: 'session-1' as never,
        openFinal,
        t,
      }))
    })
    expect(h2.textContent).toContain('slug-match')
    const archiveBtn = [...h2.querySelectorAll('button')].find(b => b.textContent?.includes(zh['deliverables.filter.archive']))!
    await act(async () => { archiveBtn.click() })
    expect(h2.textContent).toContain(zh['deliverables.emptyFilter'])
    const allBtn = [...h2.querySelectorAll('button')].find(b => b.textContent?.includes(zh['deliverables.filter.all']))!
    await act(async () => { allBtn.click() })
    await act(async () => {
      mounted?.render(createElement(DeliverablesView, {
        catalog: { schema: 1, generatedAt: '', skipped: 0, entries: [] },
        sessionId: 'session-1' as never,
        openFinal,
        t,
      }))
    })
    expect(h2.textContent).toContain(zh['deliverables.emptyAll'])
  })
})
