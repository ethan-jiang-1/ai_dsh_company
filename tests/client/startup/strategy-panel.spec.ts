/**
 * 策略面板的 wiki 新鲜度渲染判据（2026-11-12，新鲜度）。
 *
 * 为什么这层够用：面板对 wiki 的结论纯由 `settings` + 派生 `wikiCheck`（含 `checkedAt`）决定；
 * 真页面腿（ui-scene-smoke / cdp-probe）覆盖挂载与删除后的重开。
 *
 * 判据：
 * ① 检查对得上当前值且有 `checkedAt` → 显示可写/只读 + 「上次检查」；
 * ② 失效同上 → 显示三因之一 + 「上次检查」；
 * ③ 值不匹配 / 无 `checkedAt`（旧派生文件）→ 不显示可用或失效结论，显示「还没检查」；
 * ④ 未设 wiki → 不出现「还没检查」。
 *
 * 红配方：把 `checkCurrent` 恒设为 true → ③ 的「谎报可用」用例红；
 * 把 `checkedAt` 标签去掉 → ①/② 的「上次检查」用例红。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StrategyPanel } from '../../../packages/company-pack/src/client/startup/StrategyPanel.tsx'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import { en, zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import {
  EMPTY_STARTUP_OPTIONS,
  EMPTY_STARTUP_SETTINGS,
  type StartupOptions,
  type StartupSettings,
} from '../../../packages/company-pack/src/lib/startup-settings.ts'

function translator(dict: Record<CompanyKey, string>): CompanyT {
  return ((key: CompanyKey, params?: Record<string, string | number>) => {
    const template = dict[key]
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
  }) as CompanyT
}

const AT = '2026-11-12T12:34:00.000Z'

function render(
  settings: StartupSettings,
  options: StartupOptions,
  dict: Record<CompanyKey, string> = zh,
  optionsProblem: 'unreadable' | null = null,
): string {
  const store = createStartupStore({ loaded: true, settings, options, optionsProblem })
  return renderToStaticMarkup(createElement(StrategyPanel, {
    sessionId: 'session-1',
    store,
    load: async () => {},
    save: async () => ({ ok: true }),
    reset: async () => ({ ok: true }),
    floatTab: () => {},
    unfloatTab: () => {},
    useTabInfo: () => ({ tab: { id: 'tab1', contentId: 'dsh-company-pack/strategy' }, layout: 'dock' }),
    t: translator(dict),
  } as never))
}

const wikiSettings = { ...EMPTY_STARTUP_SETTINGS, wiki: '/w' }

describe('StrategyPanel · wiki 新鲜度', () => {
  it('有效检查：显示可写 + 上次检查时间', () => {
    const html = render(wikiSettings, {
      ...EMPTY_STARTUP_OPTIONS,
      wikiCheck: { value: '/w', ok: true, problem: null, location: 'inside', checkedAt: AT },
    })
    expect(html).toContain('在 workspace 内：角色可写')
    expect(html).toContain('上次检查')
  })

  it('失效检查：显示具体原因 + 上次检查时间', () => {
    const html = render(wikiSettings, {
      ...EMPTY_STARTUP_OPTIONS,
      wikiCheck: { value: '/w', ok: false, problem: 'missing', location: 'outside', checkedAt: AT },
    })
    expect(html).toContain('目录不存在')
    expect(html).toContain('上次检查')
  })

  it('旧派生文件（无 checkedAt）：不谎报可用，显示「还没检查」', () => {
    const html = render(wikiSettings, {
      ...EMPTY_STARTUP_OPTIONS,
      wikiCheck: { value: '/w', ok: true, problem: null, location: 'inside', checkedAt: null },
    })
    expect(html).not.toContain('角色可写')
    expect(html).not.toContain('角色只读')
    expect(html).toContain('还没检查')
  })

  it('检查值落后于设置：不谎报失效，按「还没检查」处理', () => {
    const html = render({ ...EMPTY_STARTUP_SETTINGS, wiki: '/new' }, {
      ...EMPTY_STARTUP_OPTIONS,
      wikiCheck: { value: '/old', ok: false, problem: 'missing', location: 'outside', checkedAt: AT },
    })
    expect(html).not.toContain('目录不存在')
    expect(html).toContain('还没检查')
  })

  it('未设 wiki：没有「还没检查」噪音；英文同款', () => {
    expect(render(EMPTY_STARTUP_SETTINGS, EMPTY_STARTUP_OPTIONS)).not.toContain('还没检查')
    const html = render(wikiSettings, {
      ...EMPTY_STARTUP_OPTIONS,
      wikiCheck: { value: '/w', ok: true, problem: null, location: 'outside', checkedAt: AT },
    }, en)
    expect(html).toContain('Outside the workspace: roles are read-only')
    expect(html).toContain('Checked:')
  })

  it('选项文件读坏：说出「读不出来」，不伪装成「内容里没有可选项」', () => {
    const html = render(EMPTY_STARTUP_SETTINGS, EMPTY_STARTUP_OPTIONS, zh, 'unreadable')
    expect(html).toContain('选项文件读不出来')
    expect(html).not.toContain('公司内容里还没有可选项')
  })

  it('缺 index.md 的提示带当前部署模板绝对路径', () => {
    const html = render(wikiSettings, {
      ...EMPTY_STARTUP_OPTIONS,
      wikiTemplate: '/profile/node_modules/dsh-company-pack/content/wiki-template',
      wikiCheck: { value: '/w', ok: false, problem: 'no-index', location: 'outside', checkedAt: AT },
    })
    expect(html).toContain('/profile/node_modules/dsh-company-pack/content/wiki-template')
  })
})
