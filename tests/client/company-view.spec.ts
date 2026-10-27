// @vitest-environment happy-dom
/**
 * 公司整页视图的真挂载判据（R4-05，2026-10-28 第四轮六维审计）。
 *
 * 为什么补：`createCompanyView` 此前在全仓 tests 中 0 处 import——整页空白、子页签不切、
 * 浮出按钮死，954 例也全绿。本档用 happy-dom + createRoot 真挂 `createCompanyView`，
 * 断四个子页签、加载/错误行、浮出入口与身份条；不主张 CSS/布局（那层归真页面车道）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCompanyView } from '../../packages/company-pack/src/client/CompanyView.tsx'
import type { CultivationFiles } from '../../packages/company-pack/src/client/cultivation-data.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

const files: CultivationFiles = {
  listJournal: async () => [],
  readHead: async () => null,
  listRecords: async () => [],
  readRecordHead: async () => null,
  readRecord: async () => null,
}

function roleSource(preset = 'ceo') {
  return {
    subscribe: () => () => {},
    getSnapshot: () => ({ projectionsBySession: { 'session-lead': { values: { agentPreset: preset } } } }),
  }
}

function sessionState(over: Record<string, unknown> = {}) {
  return {
    byId: { 'session-lead': { origin: 'human' } },
    projectionsBySession: {},
    ...over,
  }
}

function props(state: ReturnType<typeof sessionState> = sessionState()) {
  return {
    sessionId: 'session-lead',
    useProjection: () => undefined,
    useSessions: (selector: (value: ReturnType<typeof sessionState>) => unknown) => selector(state),
  } as never
}

function injected(over: Record<string, unknown> = {}) {
  return {
    leadOf: (id: string) => id,
    follow: async function* () { /* 空流 */ },
    cultivationFiles: files,
    cultivationActions: () => ({ run: async () => ({ ok: true }) }),
    roleSource: roleSource(),
    readCompany: async () => '公司名: 测试公司\n',
    floatPanel: vi.fn(),
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  return host
}

function tab(host: HTMLElement, label: string): HTMLButtonElement {
  const button = [...host.querySelectorAll('button[role="tab"]')].find(node => node.textContent?.includes(label))
  if (button === undefined) throw new Error(`tab not found: ${label}`)
  return button as HTMLButtonElement
}

describe('公司整页视图：子页签、加载/错误与浮出（R4-05）', () => {
  it('挂载即显示四个子页签、身份条和团队加载行（不是一张空白页）', async () => {
    const View = createCompanyView(injected())
    const host = await mount(createElement(View, props()))
    for (const label of ['看板', '依赖图', '在场', '培养']) expect(host.textContent).toContain(label)
    expect(host.textContent).toContain('公司：测试公司')
    expect(host.textContent).toContain('读取团队状态…')
    expect(host.querySelector('button[role="tab"][aria-selected="true"]')?.textContent).toContain('看板')
  })

  it('点子页签真的切换：培养面板出现（不依赖 team 加载成功）', async () => {
    const View = createCompanyView(injected())
    const host = await mount(createElement(View, props()))
    await act(async () => { tab(host, '培养').click() })
    await act(async () => { /* flush cultivation reads */ })
    expect(host.textContent).toContain('我的分身：CEO')
    expect(host.textContent).toContain('没有给我的建议或纠正')
    expect(host.textContent).not.toContain('读取团队状态…')
  })

  it('浮出按钮把当前子页 kind 交给 floatPanel，而不是死按钮', async () => {
    const floatPanel = vi.fn()
    const View = createCompanyView(injected({ floatPanel }))
    const host = await mount(createElement(View, props()))
    const float = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('浮出看板'))
    expect(float).toBeDefined()
    await act(async () => { float?.click() })
    expect(floatPanel).toHaveBeenCalledWith('company-board')
    await act(async () => { tab(host, '在场').click() })
    const floatPresence = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('浮出在场'))
    expect(floatPresence).toBeDefined()
  })

  it('投影 failure 显示错误行；不是静默空面板', async () => {
    const state = sessionState({
      projectionsBySession: { 'session-lead': { values: { agentTeam: { failure: '反馈流断开', members: [], tasks: [] } } } },
    })
    const View = createCompanyView(injected())
    const host = await mount(createElement(View, props(state)))
    expect(host.textContent).toContain('反馈流断开')
  })
})
