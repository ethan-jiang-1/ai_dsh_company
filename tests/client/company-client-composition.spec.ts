// @vitest-environment happy-dom
/** Whole-client composition evidence for the company pack browser half.
 *
 * Boots the production `bootClient` over the real web-profile bundle roster
 * (dsh-base + dsh-web-app + dsh-company-pack, composed by bundleRoster the way
 * the profile launcher composes patch layers) with the pack's dependency cone,
 * then asserts the actual `apply` surface: the three cohesive company tabs, the
 * three keyed slot groups, and the instance guard's fiber-owned heartbeat —
 * including their removal on unload and return on reload. Remote endpoints are
 * answered by the tier's RemoteMock (network boundary only; real composition
 * everywhere else). */
import { act, createElement, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, vi } from 'vitest'
import { frames, ok } from '@deepseek-ai/dsh-remote-mock'
import { bundleRoster, WEB_PROFILE_BUNDLES } from '@deepseek-ai/dsh-client-test-runtime/assembly/bundle-roster'
import { createClientTest } from '@deepseek-ai/dsh-client-test-runtime/assembly'
// 源码面供本包 client 行（tier 的 provide 机制）：动态 import 走 exports 落到 tsdown 的 CJS
// 构建产物会炸；provide 与根仓「vitest 一律走 src 源码面」纪律一致，模块本体仍是生产实现。
// 负例留证 2026-11-23：把 registerSidebarIdentity 的 sessions.list 订阅去掉改回一次性 void loadIdentity() ⇒ BUG-341 冷启动用例红；还原 ⇒ 绿。BUG-341
import * as companyClient from '../../packages/company-pack/src/client/index.ts'
import { companyIdentity, resetCompanyIdentity } from '../../packages/company-pack/src/client/data/company-identity.ts'
import { HEARTBEAT_KEY } from '../../packages/company-pack/src/client/wiring/instance-guard.ts'
import { en as companyEn, zh as companyZh } from '../../packages/company-pack/src/client/locales.ts'
import { DELEGATION_TOOL_KEYS } from '../../packages/company-pack/src/client/wiring/delegation-keys.ts'
import { TEAM_TOOL_KEYS } from '../../packages/company-pack/src/client/ui/TeamToolCard.tsx'
import { registerWaveS1Ux, S1_CLIENT_SURFACE_IDS, S1_TOOL_KEYS } from '../../packages/company-pack/src/client/ux/register-s1-ux.ts'
import { registerWaveS3Ux } from '../../packages/company-pack/src/client/ux/register-s3-ux.ts'
import { createStartupStore } from '../../packages/company-pack/src/client/startup/startup-store.ts'
import { createAttentionRegistry } from '../../packages/company-pack/src/client/wiring/attention-registry.ts'
import { CompanyGuideHub } from '../../packages/company-pack/src/client/ux/company-guide.tsx'
import { COMPANY_SHORTCUT_IDS } from '../../packages/company-pack/src/client/ux/company-triggers-shortcuts.ts'
import { COMPANY_HQ_PANEL_ID } from '../../packages/company-pack/src/client/ux/company-hq.tsx'
import { COMPANY_TURN_TAIL_ID } from '../../packages/company-pack/src/client/ux/company-turn-tail.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** The web profile's browser roster with the company pack as an extra bundle layer. */
const roster = bundleRoster(
  [...WEB_PROFILE_BUNDLES, 'dsh-company-pack'],
  undefined,
  { get: (name: string) => name === 'profileContext' ? { name: 'web' } : undefined },
).closure(['dsh-company-pack'])

const COMPANY_TAB_IDS = [
  'dsh-company-pack/ops',
  'dsh-company-pack/team',
  'dsh-company-pack/archive',
] as const

const COMPANY_SLOTS = [
  'sidebar.right.pane.tab',
  'sidebar.right.pane.tab.title',
  'sidebar.right.tab.guide.entry',
] as const

const HEARTBEATS = HEARTBEAT_KEY

interface TabsRegistry { entries(): ReadonlyArray<{ id: string }> }
interface StoredSlotEntry {
  component: ComponentType<Record<string, unknown>>
  options: { key?: string; id?: string }
  inject?: ((...args: unknown[]) => Record<string, unknown>) | undefined
  select?: ((...args: unknown[]) => unknown) | undefined
  locale?: string | undefined
}
interface SlotsRegistry { entries(key: string): ReadonlyArray<StoredSlotEntry> }

/** The tab registration injects `remote.workspaceFiles`; the tier's namespace
 * derivation needs a mock rule with that URL prefix (real browser: the dropped
 * api-remotes row provides the generated client). Unused by registration itself. */
function declareWorkspaceFilesNamespace(mock: { load(rules: unknown): unknown }): void {
  mock.load({ unary: { 'workspaceFiles/read': ok({ ok: true, value: { text: '' } }) } })
}

const test = createClientTest({ roster, provide: { 'dsh-company-pack': companyClient } })

describe('company client apply through the whole-client tier', () => {
  test('boots the pack row and registers the three company hubs with keyed slots', async ({ mock, start }) => {
    declareWorkspaceFilesNamespace(mock)
    // A1：setLocale 会写 settings/mutate；给 mock 一个最小 namespace view，避免 unmatched。
    mock.load({
      unary: {
        'settings/mutate': ok({
          autoGenerate: false, ns: 'locale', schema: {}, value: { preference: 'zh' },
          applies: 'live', secrets: [], revision: 1,
        }),
      },
    })
    const client = await start()

    const entry = [...client.ctx.loader.entries()].find(e => e.options.name === 'dsh-company-pack')
    expect(entry?.fiber, 'the company row imported and activated').toBeDefined()

    // A1：locale 服务在真 web roster 里组合成功，且 company 字典可切换。
    const locale = client.ctx.get('locale') as {
      bind(ns: string): (key: string) => string
      setLocale(id: string): void
    } | undefined
    expect(locale, 'locale service composed by the roster').toBeDefined()
    locale!.setLocale('zh')
    expect(locale!.bind('company')('brand.name')).toBe(companyZh['brand.name'])
    locale!.setLocale('en')
    expect(locale!.bind('company')('brand.name')).toBe(companyEn['brand.name'])

    const tabs = client.ctx.get('sidebarRightTabs')
    expect(tabs, 'sidebarRightTabs service composed by the roster').toBeDefined()
    const registered = (tabs as TabsRegistry).entries()
      .map(definition => definition.id)
      .filter(id => id.startsWith('dsh-company-pack/'))
    expect(registered).toEqual([...COMPANY_TAB_IDS])

    const slots = client.ctx.get('slots')
    expect(slots, 'slots service composed by the roster').toBeDefined()
    for (const slot of COMPANY_SLOTS) {
      const keys = (slots as SlotsRegistry)
        .entries(slot)
        .map(stored => stored.options.key)
        .filter((key): key is string => typeof key === 'string' && key.startsWith('dsh-company-pack/'))
      expect(keys).toEqual([...COMPANY_TAB_IDS])
    }

    // S1 原生扩展槽均成功注册
    expect((slots as SlotsRegistry).entries('shell.overlay').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.toastOverlay)
    expect((slots as SlotsRegistry).entries('conversation.session.header.utilities').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.headerAttention)
    expect((slots as SlotsRegistry).entries('sidebar.footer.action').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.footerStatus)
    expect((slots as SlotsRegistry).entries('conversation.hero.options').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.heroMotions)
    expect((slots as SlotsRegistry).entries('conversation.input.dock').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.motionDock)
    expect((slots as SlotsRegistry).entries('conversation.composer.dock').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.composerDock)
    expect((slots as SlotsRegistry).entries('conversation.chat.assistant-actions').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.assistantCultivate)
    expect((slots as SlotsRegistry).entries('sidebar.right.tab.document.actions').map(s => s.options.id)).toContain(S1_CLIENT_SURFACE_IDS.docFinalActions)
    expect((slots as SlotsRegistry).entries('tool.call.toolview').map(s => s.options.key)).toContain(S1_TOOL_KEYS.signoff)
    for (const cmd of S1_TOOL_KEYS.commands) {
      expect((slots as SlotsRegistry).entries('conversation.chat.commandview').map(s => s.options.key)).toContain(cmd)
    }

    // S2 原生 Guide Hub、@ trigger 与固定快捷键均成功注册
    expect((slots as SlotsRegistry).entries('sidebar.right.tab.guide').map(s => s.component)).toContain(CompanyGuideHub)
    // S3 全局 HQ 面板与左侧导航项注册
    expect((slots as SlotsRegistry).entries('sidebar.panellist').map(s => s.options.id)).toContain(COMPANY_HQ_PANEL_ID)
    expect((slots as SlotsRegistry).entries('main').map(s => s.options.key)).toContain(COMPANY_HQ_PANEL_ID)
    // S4 turnTail 注册
    expect((slots as SlotsRegistry).entries('conversation.chat.turnTail').map(s => s.options.id)).toContain(COMPANY_TURN_TAIL_ID)
    const shortcuts = client.ctx.get('shortcuts') as {
      fixedCatalog?: { getSnapshot(): ReadonlyArray<{ id: string }> }
    } | undefined
    if (shortcuts?.fixedCatalog !== undefined) {
      const fixedIds = shortcuts.fixedCatalog.getSnapshot().map(item => item.id)
      expect(fixedIds).toContain(COMPANY_SHORTCUT_IDS.ops)
      expect(fixedIds).toContain(COMPANY_SHORTCUT_IDS.team)
      expect(fixedIds).toContain(COMPANY_SHORTCUT_IDS.archive)
    }

    // The instance guard ran inside the real apply and owns one heartbeat.
    const beats = JSON.parse(localStorage.getItem(HEARTBEATS) ?? '{}') as Record<string, number>
    expect(Object.keys(beats).filter(id => id.startsWith('tab-'))).toHaveLength(1)
  }, 90_000)

  test('unloading the pack row removes its tab types, slot entries, and guard heartbeat', async ({ mock, start }) => {
    declareWorkspaceFilesNamespace(mock)
    const client = await start()
    const tabs = client.ctx.get('sidebarRightTabs') as TabsRegistry
    const slots = client.ctx.get('slots') as SlotsRegistry
    expect(tabs.entries().some(definition => definition.id.startsWith('dsh-company-pack/'))).toBe(true)

    await client.unload('dsh-company-pack')

    expect(tabs.entries().map(definition => definition.id).filter(id => id.startsWith('dsh-company-pack/'))).toEqual([])
    for (const slot of COMPANY_SLOTS) {
      expect(slots.entries(slot).map(stored => stored.options.key).filter((key): key is string => typeof key === 'string' && key.startsWith('dsh-company-pack/'))).toEqual([])
    }
    expect(slots.entries('shell.overlay').map(s => s.options.id)).not.toContain(S1_CLIENT_SURFACE_IDS.toastOverlay)
    expect(slots.entries('conversation.chat.assistant-actions').map(s => s.options.id)).not.toContain(S1_CLIENT_SURFACE_IDS.assistantCultivate)
    expect(slots.entries('tool.call.toolview').map(s => s.options.key)).not.toContain(S1_TOOL_KEYS.signoff)
    expect(slots.entries('sidebar.right.tab.guide').map(s => s.component)).not.toContain(CompanyGuideHub)
    expect(slots.entries('sidebar.panellist').map(s => s.options.id)).not.toContain(COMPANY_HQ_PANEL_ID)
    expect(slots.entries('main').map(s => s.options.key)).not.toContain(COMPANY_HQ_PANEL_ID)
    expect(slots.entries('conversation.chat.turnTail').map(s => s.options.id)).not.toContain(COMPANY_TURN_TAIL_ID)
    // The guard's disposer is fiber-owned (ctx.effect): unload removes its heartbeat.
    const beats = JSON.parse(localStorage.getItem(HEARTBEATS) ?? '{}') as Record<string, number>
    expect(Object.keys(beats).filter(id => id.startsWith('tab-'))).toEqual([])
  })

  test('BUG-341：冷启动 sessions.list 为 pending 空快照后到达会话时自动加载 company.md', async ({ mock, start }) => {
    resetCompanyIdentity()
    let readCount = 0
    const readSessionIds: string[] = []
    mock.load({
      unary: {
        'workspaceFiles/read': (sessionId?: string) => {
          readCount += 1
          if (sessionId !== undefined) readSessionIds.push(sessionId)
          return ok({ text: '---\ncompany: Cold Boot Inc\nproductName: Cold Brand\n---\n', eof: true })
        },
      },
      stream: {
        'session/follow': frames([]),
      },
    })
    const client = await start()
    expect(readCount).toBe(0)
    expect(companyIdentity().company).toBe('')

    const sessions = client.ctx.get('sessions') as unknown as {
      handleSessionAdded(summary: {
        sessionId: string
        cwd?: string
        origin?: 'subagent'
        parentId?: string
        running: boolean
        blank: boolean
        updatedAt: number
      }): void
      handleSessionRemoved(sessionId: string): void
    }
    sessions.handleSessionAdded({
      sessionId: 's-cold-boot-1',
      cwd: '/tmp/ws-cold',
      running: false,
      blank: false,
      updatedAt: 1000,
    })
    await vi.waitFor(() => {
      expect(readCount).toBe(1)
      expect(companyIdentity()).toEqual({
        company: 'Cold Boot Inc',
        productName: 'Cold Brand',
        productType: '',
        timeZone: '',
      })
    })
    expect(readSessionIds).toEqual(['s-cold-boot-1'])
    try { (client.ctx.get('uiWorkspace') as { openSession(id: string): void }).openSession('s-cold-boot-1') } catch { /* ok */ }

    // Removing the only session triggers target === undefined -> resetCompanyIdentity() (index.ts L378-385)
    sessions.handleSessionRemoved('s-cold-boot-1')
    await vi.waitFor(() => {
      expect(companyIdentity().productName).toBe('')
    })

    // Subagent-only session without cwd falls back to rows[0] & empty cwd key (index.ts L371-372, L387)
    sessions.handleSessionAdded({
      sessionId: 's-sub-only',
      origin: 'subagent',
      parentId: 's-parent',
      running: false,
      blank: false,
      updatedAt: 1500,
    })
    await vi.waitFor(() => {
      expect(readSessionIds).toContain('s-sub-only')
    })

    // Subsequent session whose workspaceFiles/read rejects falls back cleanly (index.ts L399-403)
    let secondReadAttempted = false
    mock.load({
      unary: {
        'workspaceFiles/read': () => {
          secondReadAttempted = true
          throw new Error('read failed')
        },
      },
    })
    sessions.handleSessionAdded({
      sessionId: 's-cold-boot-2',
      cwd: '/tmp/ws-cold-2',
      running: false,
      blank: false,
      updatedAt: 2000,
    })
    await vi.waitFor(() => {
      expect(secondReadAttempted).toBe(true)
      expect(companyIdentity().productName).toBe('')
    })
  })

  test('reloading the pack row re-registers the same surface', async ({ mock, start }) => {
    declareWorkspaceFilesNamespace(mock)
    const client = await start()
    const tabs = client.ctx.get('sidebarRightTabs') as TabsRegistry

    await client.reload('dsh-company-pack')

    const registered = tabs.entries().map(definition => definition.id).filter(id => id.startsWith('dsh-company-pack/'))
    expect(registered).toEqual([...COMPANY_TAB_IDS])
    const beats = JSON.parse(localStorage.getItem(HEARTBEATS) ?? '{}') as Record<string, number>
    expect(Object.keys(beats).filter(id => id.startsWith('tab-'))).toHaveLength(1)
  })

  test('invokes every company slot inject() and mounts every tab and non-tab slot in happy-dom with zero errors', async ({ mock, start }) => {
    mock.load({
      unary: {
        'workspaceFiles/read': ok({ text: '', eof: true }),
        'workspaceFiles/list': ok({ entries: [] }),
        'settings/mutate': ok({
          autoGenerate: false, ns: 'locale', schema: {}, value: { preference: 'zh' },
          applies: 'live', secrets: [], revision: 1,
        }),
      },
      stream: {
        'session/follow': frames([]),
      },
    })
    const client = await start()
    const slots = client.ctx.get('slots') as SlotsRegistry
    const locale = client.ctx.get('locale') as { bind(ns: string): (key: string) => unknown }
    const sessions = client.ctx.get('sessions') as unknown as {
      list: { getSnapshot(): unknown; subscribe(fn: () => void): () => void }
    }

    const sessionId = 's-mount-1'
    const useSessions = (selector: (s: unknown) => unknown) => selector(sessions.list.getSnapshot())
    const useProjection = () => undefined
    const tCompany = locale.bind('company')

    const errors: unknown[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => { errors.push(args) })

    const targets: Array<{ slot: string; entry: StoredSlotEntry; owner: Record<string, unknown> }> = []
    for (const key of COMPANY_TAB_IDS) {
      const body = slots.entries('sidebar.right.pane.tab').find(e => e.options.key === key)
      const title = slots.entries('sidebar.right.pane.tab.title').find(e => e.options.key === key)
      const guide = slots.entries('sidebar.right.tab.guide.entry').find(e => e.options.key === key)
      expect(body, `missing tab body ${key}`).toBeDefined()
      expect(title, `missing tab title ${key}`).toBeDefined()
      expect(guide, `missing guide entry ${key}`).toBeDefined()
      targets.push(
        { slot: `tab.body:${key}`, entry: body!, owner: { sessionId, useSessions, useProjection, useTabInfo: () => ({ sidebar: { expanded: true, fullscreen: false }, panel: { id: 'pane-1' }, tab: { id: 'tab-1', contentId: key } }) } },
        { slot: `tab.title:${key}`, entry: title!, owner: { sessionId, active: true, tab: { id: 'tab-1', contentId: key } } },
        { slot: `tab.guide:${key}`, entry: guide!, owner: { id: key, title: key, description: key } },
      )
    }

    const inputLeft = slots.entries('conversation.input.left').filter(e => e.options.id === 'company-strategy' || e.options.id === 'company-command-scope')
    expect(inputLeft).toHaveLength(2)
    for (const entry of inputLeft) {
      targets.push({ slot: `conversation.input.left:${entry.options.id}`, entry, owner: { sessionId, useSessions, useProjection } })
    }

    const cultView = slots.entries('conversation.view').find(e => e.options.id === 'dsh-company-pack/cultivation')
    expect(cultView).toBeDefined()
    targets.push({ slot: 'conversation.view:cultivation', entry: cultView!, owner: { sessionId, useSessions, useProjection } })

    const brand = slots.entries('sidebar.brand.name').find(e => e.locale === 'company')
    expect(brand).toBeDefined()
    targets.push({ slot: 'sidebar.brand.name', entry: brand!, owner: {} })

    const badge = slots.entries('sidebar.session.row.leading').find(e => e.options.id === 'company-role-badge')
    expect(badge).toBeDefined()
    targets.push({ slot: 'sidebar.session.row.leading', entry: badge!, owner: { sessionId } })

    const tasksAct = slots.entries('conversation.session.header.actions').find(e => e.options.id === 'company-tasks')
    expect(tasksAct).toBeDefined()
    targets.push({ slot: 'conversation.session.header.actions', entry: tasksAct!, owner: { sessionId, useSessions } })

    // `tool.call.toolview` only activates once an owner declares it; if the minimal web closure
    // didn't mount ui-tool's conversation node owner, declare it via `shell.overlay` so our own
    // `scoped.slots.inject('tool.call.toolview', ...)` fires for every DELEGATION + TEAM key.
    if (slots.entries('tool.call.toolview').filter(e => e.locale === 'company').length === 0) {
      await client.ctx.plugin({
        inject: ['slots'],
        apply: (scoped) => {
          scoped.slots.inject('shell.overlay', () =>
            (scoped.slots as unknown as { register(opts: unknown, comp: unknown): () => void }).register({
              name: 'shell.overlay',
              id: 'test-toolview-host',
              children: { 'tool.call.toolview': { kind: 'keyed', scope: 'session' } },
            }, () => null))
        },
      })
    }

    for (const key of [...DELEGATION_TOOL_KEYS, ...TEAM_TOOL_KEYS, S1_TOOL_KEYS.signoff]) {
      const tool = slots.entries('tool.call.toolview').find(e => e.options.key === key && e.locale === 'company')
      expect(tool, `missing tool.call.toolview ${key}`).toBeDefined()
      targets.push({ slot: `tool.call.toolview:${key}`, entry: tool!, owner: { sessionId, toolName: key, block: { name: key, argsRaw: '{}' } } })
    }

    // S1–S4 新增槽位真 inject() + 挂载守卫（含 chain selector & injected callbacks）
    const s1Toast = slots.entries('shell.overlay').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.toastOverlay)
    const s1Header = slots.entries('conversation.session.header.utilities').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.headerAttention)
    const s1Footer = slots.entries('sidebar.footer.action').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.footerStatus)
    const s1Hero = slots.entries('conversation.hero.options').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.heroMotions)
    const s1Dock = slots.entries('conversation.input.dock').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.motionDock)
    const s1CompDock = slots.entries('conversation.composer.dock').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.composerDock)
    const s1Assist = slots.entries('conversation.chat.assistant-actions').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.assistantCultivate)
    const s1DocAct = slots.entries('sidebar.right.tab.document.actions').find(e => e.options.id === S1_CLIENT_SURFACE_IDS.docFinalActions)
    const s1Composer = slots.entries('conversation.composer').find(e => e.locale === 'company')
    const s2Guide = slots.entries('sidebar.right.tab.guide').find(e => e.component === CompanyGuideHub)
    const s3Icon = slots.entries('sidebar.panellist').find(e => e.options.id === COMPANY_HQ_PANEL_ID)
    const s3Main = slots.entries('main').find(e => e.options.key === COMPANY_HQ_PANEL_ID)
    const s4TurnTail = slots.entries('conversation.chat.turnTail').find(e => e.options.id === COMPANY_TURN_TAIL_ID)

    expect(s1Toast && s1Header && s1Footer && s1Hero && s1Dock && s1CompDock && s1Assist && s1DocAct).toBeDefined()
    expect(s1Composer && s2Guide && s3Icon && s3Main && s4TurnTail).toBeDefined()

    for (const cmd of S1_TOOL_KEYS.commands) {
      const cmdEntry = slots.entries('conversation.chat.commandview').find(e => e.options.key === cmd)
      expect(cmdEntry, `missing commandview ${cmd}`).toBeDefined()
      targets.push({ slot: `commandview:${cmd}`, entry: cmdEntry!, owner: { sessionId, name: cmd, node: { name: cmd, outcome: { kind: 'success', text: 'OK' } } } })
    }
    targets.push(
      { slot: 'shell.overlay:toast', entry: s1Toast!, owner: {} },
      { slot: 'header.utilities:attention', entry: s1Header!, owner: { sessionId } },
      { slot: 'sidebar.footer.action', entry: s1Footer!, owner: { wide: true } },
      { slot: 'conversation.hero.options', entry: s1Hero!, owner: { sessionId, inputActions: { setDraft: () => {} } } },
      { slot: 'conversation.input.dock', entry: s1Dock!, owner: { sessionId, session: { id: sessionId }, input: {}, inputActions: { setDraft: () => {} }, useSessions } },
      { slot: 'conversation.composer.dock', entry: s1CompDock!, owner: { sessionId, useSessions } },
      { slot: 'assistant-actions', entry: s1Assist!, owner: { sessionId, message: { id: 'm1', content: [] } } },
      { slot: 'document.actions', entry: s1DocAct!, owner: { absolutePath: '.dsh-company/deliverables/m1/final.md' } },
      {
        slot: 'conversation.composer:signoff',
        entry: s1Composer!,
        owner: { pendingInteraction: { kind: 'approval', toolName: 'request_signoff', reason: 'Margin: test', answer: () => {} } },
      },
      {
        slot: 'sidebar.right.tab.guide:company',
        entry: s2Guide!,
        owner: { useTabInfo: () => ({ tab: { id: 'g', contentId: 'guide', actions: { openTab: () => {} } } }) },
      },
      { slot: 'sidebar.panellist:hq', entry: s3Icon!, owner: { size: 18, active: false } },
      {
        slot: 'main:hq',
        entry: s3Main!,
        owner: {
          renderSlot: () => null,
          SessionProvider: ({ children }: { children?: unknown }) => children,
          useSessions,
          useProjection,
        },
      },
      { slot: 'conversation.chat.turnTail', entry: s4TurnTail!, owner: { turn: { data: new Map() } } },
    )

    const sidebarRight = client.ctx.get('sidebarRight') as {
      mounted?: { getSnapshot(): string | undefined }
      openTab(id: string): void
      openResource(ref: unknown): void
      float(id: string, rect?: unknown): void
      dock(id: string): void
    }
    const mountedSpy = sidebarRight.mounted !== undefined
      ? vi.spyOn(sidebarRight.mounted, 'getSnapshot').mockReturnValue('surface-test')
      : undefined
    const openTabSpy = vi.spyOn(sidebarRight, 'openTab').mockImplementation(() => {})
    const openResourceSpy = vi.spyOn(sidebarRight, 'openResource').mockImplementation(() => {})
    const floatSpy = vi.spyOn(sidebarRight, 'float').mockImplementation(() => {})
    const dockSpy = vi.spyOn(sidebarRight, 'dock').mockImplementation(() => {})

    try {
      for (const target of targets) {
        const selected = target.entry.select !== undefined ? target.entry.select(target.owner) : undefined
        if (target.slot === 'conversation.composer:signoff') {
          expect(selected).not.toBeNull()
          expect(target.entry.select?.({ pendingInteraction: { kind: 'approval', toolName: 'bash', answer: () => {} } })).toBeNull()
        }
        if (target.slot === 'sidebar.right.tab.guide:company') {
          expect(selected).toEqual({ active: true })
        }
        const injected = target.entry.inject !== undefined ? target.entry.inject(sessionId) : {}
        // Exercise safe navigation / callback wires injected by S1–S4 & company-tab-registration
        if (target.slot === 'tab.body:dsh-company-pack/archive') {
          try {
            const tabActs = injected as { openFinal?: (sid: string, p: string) => void; floatTab?: (id: string) => void; unfloatTab?: (id: string) => void; openSplit?: (preset: string) => void }
            tabActs.openFinal?.(sessionId, '.dsh-company/deliverables/m1/final.md')
            tabActs.floatTab?.('tab-1')
            tabActs.unfloatTab?.('pane-1')
            tabActs.openSplit?.('ops')
          } catch { /* ok when no surface */ }
        } else if (target.slot === 'conversation.input.left:company-strategy') {
          try { (injected as { open?: () => void }).open?.() } catch { /* ok */ }
        } else if (target.slot === 'conversation.view:cultivation') {
          try { (injected as { openCompanyOverview?: () => void }).openCompanyOverview?.() } catch { /* ok */ }
        } else if (target.slot === 'tab.body:dsh-company-pack/team') {
          try { (injected as { openMemberAside?: (sid: string, m: string) => void }).openMemberAside?.(sessionId, 'child-1') } catch { /* ok when no surface */ }
        } else if (target.slot === 'conversation.session.header.actions') {
          try { (injected as { openTasks?: () => void }).openTasks?.() } catch { /* ok when no surface */ }
        } else if (target.slot === 'header.utilities:attention' || target.slot === 'conversation.input.dock' || target.slot === 'conversation.composer.dock') {
          const openTabFn = injected.openTab as ((id: string) => void) | undefined
          openTabFn?.('company-attention')
          openTabFn?.('company-board')
          if (target.slot === 'header.utilities:attention') {
            openTabSpy.mockImplementationOnce(() => { throw new Error('surface unavailable') })
            openTabFn?.('company-board')
          }
          if (target.slot === 'conversation.input.dock') {
            ;(injected.onDraftCommand as ((cmd: string) => void) | undefined)?.('/req check ')
          }
        } else if (target.slot === 'conversation.hero.options') {
          ;(injected.notifyDraft as ((label: string) => void) | undefined)?.('PRD')
        } else if (target.slot === 'assistant-actions') {
          const openCult = injected.openCultivation as ((ctx?: { messageId?: string; filePath?: string }) => void) | undefined
          openCult?.({ messageId: 'm1' })
          openCult?.({ filePath: '.dsh-company/deliverables/m1/final.md' })
          openCult?.({ messageId: '  ', filePath: '   ' })
          openCult?.()
        } else if (target.slot === 'document.actions') {
          ;(injected.openDeliverables as ((p?: string) => void) | undefined)?.('.dsh-company/deliverables/m1/final.md')
        } else if (target.slot === 'sidebar.right.tab.guide:company') {
          try { (injected.openSplit as ((p: string) => void) | undefined)?.('ops') } catch { /* ok */ }
          try { (injected.openSplit as ((p: string) => void) | undefined)?.('quiet') } catch { /* ok */ }
        } else if (target.slot === 'main:hq') {
          ;(injected.selectSection as ((s: string) => void) | undefined)?.('overview')
          ;(injected.returnToChat as (() => void) | undefined)?.()
          try { (injected.openSession as ((id: string) => void) | undefined)?.(sessionId) } catch { /* ok */ }
          try { (injected.openFinal as ((sid: string, p: string) => void) | undefined)?.(sessionId, 'final.md') } catch { /* ok */ }
          expect(openResourceSpy).toHaveBeenCalled()
        } else if (target.slot === 'conversation.chat.turnTail') {
          try { (injected.openOps as (() => void) | undefined)?.() } catch { /* ok when no surface */ }
          try { (injected.openArchive as (() => void) | undefined)?.() } catch { /* ok when no surface */ }
        }
        const hooks = (injected as { readonly hooks?: Record<string, { getSnapshot(): unknown }> }).hooks
        const hookProps = hooks === undefined
          ? {}
          : Object.fromEntries(
              Object.entries(hooks).map(([name, src]) => [
                `use${name.charAt(0).toUpperCase()}${name.slice(1)}`,
                (selector: (value: unknown) => unknown) => selector(src.getSnapshot()),
              ]),
            )
        const props = {
          ...target.owner,
          ...(selected !== undefined ? { matched: selected } : {}),
          ...injected,
          ...hookProps,
          ...(target.entry.locale ? { t: tCompany } : {}),
        }
        const host = document.createElement('div')
        document.body.append(host)
        const root = createRoot(host)
        await act(async () => {
          root.render(createElement(target.entry.component, props))
          await Promise.resolve()
        })
        act(() => { root.unmount() })
        host.remove()
      }
      const toastInjected = s1Toast!.inject?.(sessionId) as { dismiss?: () => void } | undefined
      toastInjected?.dismiss?.()

      // Exercise registerWaveS1Ux without openHq/hubStore fallback (safeOpenTab('company-cultivation') & string error)
      const registeredActions: Array<{ slot: string; inject?: (sid: string) => Record<string, unknown> }> = []
      const fakeCtx = {
        locale: { bind: () => (k: string) => k },
        inject: (_deps: readonly string[], fn: (sc: unknown) => void) => {
          fn({
            slots: {
              inject: (slot: string, factory: () => unknown) => {
                const entry = factory() as { inject?: (sid: string) => Record<string, unknown> }
                registeredActions.push({
                  slot,
                  ...(entry.inject === undefined ? {} : { inject: entry.inject }),
                })
              },
              register: (opts: unknown) => opts,
            },
            sidebarRight: {
              mounted: { getSnapshot: () => 's1', subscribe: () => () => {} },
              openTab: () => { throw 'tab open failed' },
            },
            sessions: { binding: () => undefined },
          })
        },
      }
      registerWaveS1Ux(fakeCtx as never, { attention: createAttentionRegistry() })
      const assist = registeredActions.find(a => a.slot === 'conversation.chat.assistant-actions')
      ;(assist?.inject?.(sessionId) as { openCultivation?: () => void } | undefined)?.openCultivation?.()

      // Exercise registerWaveS3Ux with missing remote.session.page (register-s3-ux.ts L113 : undefined branch)
      const s3Injected: Array<{ inject?: () => Record<string, unknown> }> = []
      const fakeS3Ctx = {
        locale: { bind: () => (k: string) => k },
        inject: (_deps: readonly string[], fn: (sc: unknown) => void) => {
          fn({
            slots: {
              inject: (_slot: string, factory: () => unknown) => {
                s3Injected.push(factory() as { inject?: () => Record<string, unknown> })
              },
              register: (opts: unknown) => opts,
            },
            layout: { selectPanel: () => {} },
            sessions: { list: { getSnapshot: () => ({ byId: {} }), subscribe: () => () => {} }, binding: () => undefined },
            uiWorkspace: { openSession: () => {} },
            remote: { session: {}, workspaceFiles: {}, commands: {} },
            sidebarRight: { mounted: { getSnapshot: () => 's1', subscribe: () => () => {} }, openResource: () => {} },
          })
        },
      }
      const s3Handle = registerWaveS3Ux(fakeS3Ctx as never, { attention: createAttentionRegistry(), startupStore: createStartupStore() })
      s3Handle.openHq()
      const mainProps = s3Injected[1]?.inject?.()
      expect(mainProps?.pageHistory).toBeUndefined()
    } finally {
      mountedSpy?.mockRestore()
      openTabSpy.mockRestore()
      openResourceSpy.mockRestore()
      floatSpy.mockRestore()
      dockSpy.mockRestore()
      errorSpy.mockRestore()
    }
    expect(errors).toEqual([])
  }, 90_000)
})
