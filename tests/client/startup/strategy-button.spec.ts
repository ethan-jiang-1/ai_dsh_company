/**
 * composer 策略按钮的静态渲染判据（2026-11-12）。
 *
 * 为什么这层够用：按钮的可观察行为就是「显示当前状态」——纯由 store 快照 + 字典决定，
 * 不需要浏览器。真页面腿（`ui-scene-smoke` / 探针）覆盖挂载与交互。
 *
 * 判据：
 * ① 未读盘 = 中性文案（不冒充「自动」）；
 * ② 全自动 = 「策略：自动」；
 * ③ 有覆盖 = 列出已设值；
 * ④ zh / en 同时成立，且 `data-overridden` 反映有无覆盖。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StrategyButton } from '../../../packages/company-pack/src/client/startup/StrategyButton.tsx'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import { en, zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { EMPTY_STARTUP_OPTIONS, EMPTY_STARTUP_SETTINGS, type StartupSettings } from '../../../packages/company-pack/src/lib/startup-settings.ts'

function translator(dict: Record<CompanyKey, string>): CompanyT {
  return ((key: CompanyKey, params?: Record<string, string | number>) => {
    const template = dict[key]
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
  }) as CompanyT
}

function render(settings: StartupSettings, loaded: boolean, dict: Record<CompanyKey, string>): string {
  const store = createStartupStore({ loaded, settings, options: EMPTY_STARTUP_OPTIONS })
  return renderToStaticMarkup(createElement(StrategyButton, {
    sessionId: 'session-1',
    store,
    load: async () => {},
    open: () => {},
    t: translator(dict),
  } as never))
}

describe('StrategyButton', () => {
  it('未读盘显示中性文案，不冒充自动', () => {
    const html = render(EMPTY_STARTUP_SETTINGS, false, zh)
    expect(html).toContain('策略')
    expect(html).not.toContain('策略：自动')
  })

  it('全自动：中文显示「策略：自动」，且无覆盖标记', () => {
    const html = render(EMPTY_STARTUP_SETTINGS, true, zh)
    expect(html).toContain('策略：自动')
    expect(html).toContain('data-overridden="false"')
  })

  it('有覆盖：列出已设值，并打上覆盖标记', () => {
    const html = render({ ...EMPTY_STARTUP_SETTINGS, productType: 'business-software' }, true, zh)
    expect(html).toContain('策略：business-software')
    expect(html).toContain('data-overridden="true"')
  })

  it('英文同款成立', () => {
    expect(render(EMPTY_STARTUP_SETTINGS, true, en)).toContain('Strategy: auto')
    expect(render({ ...EMPTY_STARTUP_SETTINGS, deliveryMode: 'project-services' }, true, en))
      .toContain('Strategy: project-services')
  })
})
