/** Wave S2 `@` 角色提及触发器、成员对话旁路深链、分栏预设与只读快捷键单测。 */
import { describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ShortcutFixedCommand, ShortcutFixedInput } from '../../../vendor/dsh/packages/client/shortcuts/src/client/types.ts'
import type { CompanyKey, CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import { en, zh } from '../../../packages/company-pack/src/client/locales.ts'
import { createHubSubViewStore } from '../../../packages/company-pack/src/client/tabs/hub-subview-store.ts'
import {
  buildSubagentChatAddress,
  COMPANY_SHORTCUT_IDS,
  createCompanyRoleTriggerSource,
  openSplitPreset,
  openSubagentAside,
  registerCompanyShortcuts,
} from '../../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts'

const t = ((key: CompanyKey) => zh[key]) as CompanyT

// 负例留证 2026-11-27：去掉 createCompanyRoleTriggerSource 返回项的 localized section ⇒ @ 菜单分组头暴露裸 'company-roles'（BUG-390）；还原后绿。BUG-390
// 负例留证 2026-11-27：去掉 openSplitPreset review 分支 catch 块的 try 保护 ⇒ 两栏都无法挂载时直接抛未捕获异常（BUG-393）；还原后绿。BUG-393
describe('Wave S2 triggers, deep links, split presets, and shortcuts', () => {
  it('@ role trigger filters company roles cleanly and picks plain reference text', async () => {
    const source = createCompanyRoleTriggerSource(t)
    expect(source.trigger).toBe('@')
    expect(source.name).toBe('company-roles')

    const controller = new AbortController()
    const all = await source.candidates({ sessionId: 's1' as SessionId }, {
      query: '',
      position: 'inline',
      drilled: false,
      signal: controller.signal,
    })
    expect(all.some(item => item.name === 'ceo')).toBe(true)
    expect(all.some(item => item.name === 'vp-eng')).toBe(true)
    expect(all.every(item => typeof item.section === 'string' && item.section.length > 0 && item.section === zh['trigger.companyRoles'])).toBe(true)

    const sourceEn = createCompanyRoleTriggerSource(((key: CompanyKey) => en[key]) as CompanyT)
    const allEn = await sourceEn.candidates({ sessionId: 's1' as SessionId }, {
      query: '',
      position: 'inline',
      drilled: false,
      signal: controller.signal,
    })
    expect(allEn.every(item => typeof item.section === 'string' && item.section.length > 0 && item.section === en['trigger.companyRoles'])).toBe(true)

    const filtered = await source.candidates({ sessionId: 's1' as SessionId }, {
      query: 'eng',
      position: 'inline',
      drilled: false,
      signal: controller.signal,
    })
    expect(filtered.some(item => item.name === 'vp-eng')).toBe(true)

    const picked = source.onPick({
      candidate: filtered[0]!,
      session: { sessionId: 's1' as SessionId },
      position: 'inline',
      via: 'menu',
      action: 'pick',
      span: { start: 0, end: 4, draftRev: 1 },
    })
    expect(picked).toEqual({ text: `@${filtered[0]!.name} ` })
  })

  it('openSubagentAside selects chat panel before opening subagentchat resource with preferNewPane', () => {
    const openResource = vi.fn()
    const selectPanel = vi.fn()
    const address = buildSubagentChatAddress('lead-1' as SessionId, 'child-eng-1' as SessionId)
    expect(address).toContain('dsh-resource://subagentchat/session/child-eng-1')
    expect(address).toContain('parent=lead-1')
    expect(address).toContain('mode=continuable')

    openSubagentAside({ openResource }, 'lead-1' as SessionId, 'child-eng-1' as SessionId, { selectPanel })
    expect(selectPanel).toHaveBeenCalledWith(null)
    expect(openResource).toHaveBeenCalledWith(address, { preferNewPane: true })
  })

  it('openSplitPreset configures cohesive hub subviews, dual panes, and quiet collapse', () => {
    const store = createHubSubViewStore()
    const openTab = vi.fn()
    const toggleExpanded = vi.fn()
    openSplitPreset({ openTab }, store, 'ops')
    expect(store.store.getSnapshot().ops).toBe('board')
    expect(store.store.getSnapshot().team).toBe('presence')
    expect(openTab).toHaveBeenNthCalledWith(1, 'company-ops')
    expect(openTab).toHaveBeenNthCalledWith(2, 'company-team', { preferNewPane: true })

    openTab.mockClear()
    openSplitPreset({ openTab }, store, 'review')
    expect(store.store.getSnapshot().archive).toBe('deliverables')
    expect(openTab).toHaveBeenNthCalledWith(1, 'company-archive')
    expect(openTab).toHaveBeenNthCalledWith(2, 'files', { preferNewPane: true })

    openSplitPreset({ openTab, isExpanded: () => true, toggleExpanded }, store, 'quiet')
    expect(toggleExpanded).toHaveBeenCalledOnce()
    toggleExpanded.mockClear()
    openSplitPreset({ openTab, isExpanded: () => false, toggleExpanded }, store, 'quiet')
    expect(toggleExpanded).not.toHaveBeenCalled()

    // BUG-387：窄屏 (<768px) 下不强拆双分屏
    openTab.mockClear()
    openSplitPreset({ openTab }, store, 'ops', 390)
    expect(openTab).toHaveBeenCalledTimes(1)
    expect(openTab).toHaveBeenCalledWith('company-ops')

    openTab.mockClear()
    openSplitPreset({ openTab }, store, 'review', 390)
    expect(openTab).toHaveBeenCalledTimes(1)
    expect(openTab).toHaveBeenCalledWith('company-archive')

    // BUG-393：openSplitPreset review 当 files 与 company-ops fallback 均抛错时不向外抛未捕获异常
    expect(() => openSplitPreset({
      mounted: { getSnapshot: () => 's1' as SessionId, subscribe: () => () => {} },
      openTab: () => { throw new Error('sidebarRight: no session surface is mounted') },
    }, store, 'review', 1440)).not.toThrow()
  })

  it('registerCompanyShortcuts registers fixed commands and handles non-composing Alt+Shift+1/2/3 only', () => {
    const commands: ShortcutFixedCommand[] = []
    let listener: ((input: ShortcutFixedInput) => void) | null = null
    const openTab = vi.fn()
    const hubStore = createHubSubViewStore()
    const dispose = registerCompanyShortcuts(
      {
        registerFixed: (cmd) => {
          commands.push(cmd)
          return () => {}
        },
        observeFixedInput: (fn) => {
          listener = fn
          return () => { listener = null }
        },
      },
      {
        sidebarRight: {
          mounted: { getSnapshot: () => 's-active' as SessionId, subscribe: () => () => {} },
          openTab,
        },
        hubStore,
        t,
      },
    )

    expect(commands.map(cmd => cmd.id)).toEqual([
      COMPANY_SHORTCUT_IDS.ops,
      COMPANY_SHORTCUT_IDS.team,
      COMPANY_SHORTCUT_IDS.archive,
    ])

    const consume = vi.fn()
    listener!({
      type: 'keydown',
      gesture: {
        code: 'Digit2',
        control: false,
        alt: true,
        shift: true,
        meta: false,
        repeat: false,
        composing: true,
        defaultPrevented: false,
      },
      context: { region: 'page', modal: null, target: null },
      consume,
    })
    expect(consume).not.toHaveBeenCalled()
    expect(openTab).not.toHaveBeenCalled()

    listener!({
      type: 'keydown',
      gesture: {
        code: 'Digit2',
        control: false,
        alt: true,
        shift: true,
        meta: false,
        repeat: false,
        composing: false,
        defaultPrevented: false,
      },
      context: { region: 'page', modal: null, target: null },
      consume,
    })
    expect(consume).toHaveBeenCalledOnce()
    expect(openTab).toHaveBeenCalledWith('company-team')
    dispose()
  })
})
