// @vitest-environment happy-dom
/**
 * 培养主视图（2026-10-28）：第三个 conversation.view 的左右结构、
 * 公司总览入口、shell composer 隐藏属性的挂载/清理。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCultivationView } from '../../packages/company-pack/src/client/CultivationView.tsx'
import type { CultivationFiles } from '../../packages/company-pack/src/client/cultivation-data.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
  delete document.documentElement.dataset.dshCultivationView
})

const files: CultivationFiles = {
  listJournal: async () => [],
  readHead: async () => null,
  listRecords: async () => [],
  readRecordHead: async () => null,
  readRecord: async () => null,
}

function roleSource() {
  return {
    subscribe: () => () => {},
    getSnapshot: () => ({ projectionsBySession: { 'session-lead': { values: { agentPreset: 'ceo' } } } }),
  }
}

function props() {
  const state = { byId: { 'session-lead': { origin: 'human', cwd: '/tmp/company' } }, projectionsBySession: {} }
  return {
    sessionId: 'session-lead',
    useProjection: () => undefined,
    useSessions: (selector: (value: typeof state) => unknown) => selector(state),
  } as never
}

async function mount(over: Record<string, unknown> = {}): Promise<HTMLElement> {
  const openCompanyOverview = vi.fn()
  const View = createCultivationView({
    sessions: { create: async () => 'session-cultivation', retain: () => ({ ready: new Promise(() => {}), release: () => {} }) } as never,
    cultivationFiles: files,
    cultivationActions: () => ({ run: async () => ({ ok: true, text: 'ok' }) }),
    roleSource: roleSource(),
    openCompanyOverview,
    ...over,
  } as never)
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(createElement(View, props())) })
  return host
}

describe('CultivationView', () => {
  it('左培养板 + 右培养对话；公司总览打开右栏；shell composer 隐藏只在挂载期', async () => {
    const host = await mount()
    expect(host.textContent).toContain('培养 · 方法工作台')
    expect(host.querySelector('.wk-cult-view-split')).not.toBeNull()
    expect(host.querySelector('.wk-cult-chat')).not.toBeNull()
    expect(document.documentElement.dataset.dshCultivationView).toBe('1')
    const overview = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('公司总览'))
    await act(async () => { overview?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
  })

  it('卸载清掉 composer 隐藏属性', async () => {
    await mount()
    expect(document.documentElement.dataset.dshCultivationView).toBe('1')
    act(() => { mounted?.unmount() })
    mounted = null
    expect(document.documentElement.dataset.dshCultivationView).toBeUndefined()
  })
})
