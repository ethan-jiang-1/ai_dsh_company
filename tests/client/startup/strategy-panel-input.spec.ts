// @vitest-environment happy-dom
/**
 * 策略面板 wiki 输入的受控语义。
 *
 * 现场：填 `wiki` → 保存生效 → 点「恢复自动」（盘上已 null）→ 输入框仍显示 `wiki`；
 * 再点一下输入框（不改字）失焦 → 旧值被写回，重置等于被撤销。
 * 判据：输入框跟着 store 走；与 store 相同的值失焦不产生任何写入。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyPanel } from '../../../packages/company-pack/src/client/startup/StrategyPanel.tsx'
import { createStartupStore, type StartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import { zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { EMPTY_STARTUP_OPTIONS, EMPTY_STARTUP_SETTINGS } from '../../../packages/company-pack/src/lib/startup/startup-settings.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

const t = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = String(zh[key])
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

async function mountWith(store: StartupStore, save: (field: string, value: string | null) => Promise<{ ok: boolean }>) {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => {
    mounted?.render(createElement(StrategyPanel, {
      sessionId: 'session-1',
      store,
      load: async () => {},
      save,
      reset: async () => ({ ok: true }),
      floatTab: () => {},
      unfloatTab: () => {},
      useTabInfo: () => ({ tab: { id: 'tab1', contentId: 'dsh-company-pack/strategy' }, layout: 'dock' }),
      t,
    } as never))
  })
  return host
}

const wikiInput = (host: HTMLElement): HTMLInputElement => {
  const input = host.querySelector('input.wk-strategy-input')
  if (input === null) throw new Error('wiki input not found')
  return input as HTMLInputElement
}

describe('策略 wiki 输入：受控', () => {
  it('store 重置为 null 后输入框清空（不是还留着旧值）', async () => {
    const store = createStartupStore({ loaded: true, settings: { ...EMPTY_STARTUP_SETTINGS, wiki: 'wiki' }, options: EMPTY_STARTUP_OPTIONS })
    const host = await mountWith(store, async () => ({ ok: true }))
    expect(wikiInput(host).value).toBe('wiki')
    await act(async () => { store.set({ loaded: true, settings: { ...EMPTY_STARTUP_SETTINGS, wiki: null }, options: EMPTY_STARTUP_OPTIONS }) })
    expect(wikiInput(host).value).toBe('')
  })

  it('与 store 相同的值失焦 ⇒ 不写回（碰一下输入框不能撤销重置）', async () => {
    const save = vi.fn(async () => ({ ok: true }))
    const store = createStartupStore({ loaded: true, settings: { ...EMPTY_STARTUP_SETTINGS, wiki: null }, options: EMPTY_STARTUP_OPTIONS })
    const host = await mountWith(store, save)
    const input = wikiInput(host)
    await act(async () => { input.dispatchEvent(new Event('focusout', { bubbles: true })) })
    expect(save).not.toHaveBeenCalled()
  })

  it('改了字再失焦 ⇒ 写入新值（受控不等于不可编辑）', async () => {
    const save = vi.fn(async () => ({ ok: true }))
    const store = createStartupStore({ loaded: true, settings: { ...EMPTY_STARTUP_SETTINGS, wiki: null }, options: EMPTY_STARTUP_OPTIONS })
    const host = await mountWith(store, save)
    const input = wikiInput(host)
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      setter?.call(input, 'wiki')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => { input.dispatchEvent(new Event('focusout', { bubbles: true })) })
    expect(save).toHaveBeenCalledWith('session-1', 'wiki', 'wiki')
  })
})
