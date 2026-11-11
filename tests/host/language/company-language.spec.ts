/**
 * Host 语言桥（Phase A3）：偏好解析、状态通知、settings 绑定。
 *
 * 证明边界：不证明真 settings 服务的网络时序（→ 真启动）；这里钉住纯判据与桥的接线。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  bindSettings, createCompanyLanguageState, languageFromPreference,
} from '../../../packages/company-pack/src/host/language/company-language.ts'

describe('languageFromPreference', () => {
  it.each([
    [undefined, 'zh'],
    ['', 'zh'],
    ['zh', 'zh'],
    ['zh-CN', 'zh'],
    ['en', 'en'],
    ['en-US', 'en'],
    ['ja', 'en'],
    ['pt-BR', 'en'],
  ] as const)('%s → %s', (value, expected) => {
    expect(languageFromPreference(value)).toBe(expected)
  })
})

describe('createCompanyLanguageState', () => {
  it('默认 zh；set 去重通知；text 按当前语言选句', () => {
    const state = createCompanyLanguageState()
    const listener = vi.fn()
    const off = state.subscribe(listener)
    expect(state.current()).toBe('zh')
    expect(state.text('中', 'EN')).toBe('中')
    state.set('en')
    expect(state.current()).toBe('en')
    expect(state.text('中', 'EN')).toBe('EN')
    expect(listener).toHaveBeenCalledTimes(1)
    state.set('en')
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    state.set('zh')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('bindSettings', () => {
  it('服务出现时读 preference；locale 更新即重读；相同值不通知', () => {
    const state = createCompanyLanguageState('zh')
    const updates = new Map<string, (ns: string) => void>()
    let preference: unknown = 'en'
    const settings = {
      describe: () => [{ ns: 'locale', value: { preference } }],
    }
    const scope = {
      get: (name: string) => name === 'settings' ? settings : undefined,
      on: (name: string, listener: (ns: string) => void) => {
        updates.set(name, listener)
        return () => { updates.delete(name) }
      },
    }
    const ctx = {
      inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
        callback(scope)
        return { dispose: async () => {} }
      },
    }
    const listener = vi.fn()
    state.subscribe(listener)
    bindSettings(ctx as never, state)
    expect(state.current()).toBe('en')
    expect(listener).toHaveBeenCalledTimes(1)
    updates.get('settings/document-updated')?.('locale')
    expect(listener).toHaveBeenCalledTimes(1)
    preference = 'zh'
    updates.get('settings/document-updated')?.('locale')
    expect(state.current()).toBe('zh')
    expect(listener).toHaveBeenCalledTimes(2)
    updates.get('settings/document-updated')?.('other')
    expect(state.current()).toBe('zh')
  })

  it('settings 缺失/读取抛错时保持 zh', () => {
    const state = createCompanyLanguageState('zh')
    const ctx = {
      inject: (_deps: readonly string[], callback: (scope: unknown) => void) => {
        callback({
          get: () => ({ describe: () => { throw new Error('not ready') } }),
          on: () => () => {},
        })
        return { dispose: async () => {} }
      },
    }
    bindSettings(ctx as never, state)
    expect(state.current()).toBe('zh')
  })
})
