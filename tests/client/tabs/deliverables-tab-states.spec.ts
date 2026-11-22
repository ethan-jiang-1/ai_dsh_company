// @vitest-environment happy-dom
/**
 * 成品页签的**错误态渲染判据**：真挂 `DeliverablesTab`，喂三种读取结果，
 * 断言面板说的那句话对得上状态——尤其「截断」不能报成「形状不符」。
 *
 * 为什么单独立一条：`catalogProblemOf` 的纯函数已有断言，但把结果翻成文案的那一层在组件体里；
 * 不挂组件，那一层就永远没有判据（覆盖率也会掉）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { DeliverablesTab } from '../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx'
import { zh, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'

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
})
