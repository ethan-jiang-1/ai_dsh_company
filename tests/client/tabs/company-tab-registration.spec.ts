import { Context } from '../../../vendor/dsh/vendor/cordis/src/index.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { SlotRegistry } from '../../../vendor/dsh/packages/client/ui-renderer/src/client/registry.ts'
import { SidebarRightTabRegistry } from '../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-registry.ts'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { CultivationFiles } from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import type { CompanyTabRegistrationData } from '../../../packages/company-pack/src/client/tabs/company-tab-registration.ts'
import { ArchiveHubTab, OpsHubTab, TeamHubTab } from '../../../packages/company-pack/src/client/tabs/company-hub-tabs.tsx'
import { createHubSubViewStore, type HubSubViewState } from '../../../packages/company-pack/src/client/tabs/hub-subview-store.ts'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import {
  ArchiveTabTitle, OpsTabTitle, TeamTabTitle,
  ArchiveGuideEntry, OpsGuideEntry, TeamGuideEntry,
  ArchiveGuideIcon, OpsGuideIcon, TeamGuideIcon,
} from '../../../packages/company-pack/src/client/ui/tab-icons.tsx'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { registerCompanyTabs } from '../../../packages/company-pack/src/client/tabs/company-tab-registration.ts'
import { en, zh } from '../../../packages/company-pack/src/client/locales.ts'

const EXPECTED_TYPES = [
  { id: 'dsh-company-pack/ops', kind: 'company-ops', title: '作战板', order: 20, description: '项目作战总台：合并看板、依赖图、任务板与项目策略' },
  { id: 'dsh-company-pack/team', kind: 'company-team', title: '团队', order: 30, description: '团队协同中心：汇总待办、高管在场动态与令牌预算' },
  { id: 'dsh-company-pack/archive', kind: 'company-archive', title: '档案', order: 40, description: '公司资产档案：集中审阅成品终稿、动议台账与培养规则' },
] as const

const BODY_COMPONENTS = [OpsHubTab, TeamHubTab, ArchiveHubTab]
const TITLE_COMPONENTS = [OpsTabTitle, TeamTabTitle, ArchiveTabTitle]
const GUIDE_COMPONENTS = [OpsGuideEntry, TeamGuideEntry, ArchiveGuideEntry]
const GUIDE_ICONS = [OpsGuideIcon, TeamGuideIcon, ArchiveGuideIcon]
const BODY_SLOT = 'sidebar.right.pane.tab'
const TITLE_SLOT = 'sidebar.right.pane.tab.title'
const GUIDE_SLOT = 'sidebar.right.tab.guide.entry'
const BODY_OWNER = 'company.test.body-owner'
const TITLE_OWNER = 'company.test.title-owner'
const GUIDE_OWNER = 'company.test.guide-owner'
const EMPTY_ENTRY = () => null
const KEYED_SESSION = { kind: 'keyed', scope: 'session' } as const

function tabData(t: CompanyTabRegistrationData['t'] = ((key: keyof typeof zh) => zh[key]) as CompanyTabRegistrationData['t']) {
  const cultivationFiles: CultivationFiles = {
    listJournal: vi.fn(async () => []),
    readHead: vi.fn(async () => null),
    listRecords: vi.fn(async () => ({ ok: true, names: [] })),
    readRecord: vi.fn(async () => null),
  }
  const roleSource = { getSnapshot: vi.fn(() => ({ projectionsBySession: {} })), subscribe: vi.fn(() => () => {}) }
  const attention = createAttentionRegistry()
  const pending = { kind: 'question', sessionId: 'test-session', what: 'Open item', since: 1 } as const
  attention.begin(pending)
  const data: CompanyTabRegistrationData = {
    attention,
    leadOf: vi.fn((sessionId: SessionId) => sessionId),
    follow: vi.fn(async function* () {}),
    floatTab: vi.fn(),
    unfloatTab: vi.fn(),
    pageHistory: vi.fn(async () => undefined),
    openMember: vi.fn(async () => {}),
    cultivationFiles,
    roleSource,
    readLedger: vi.fn(async () => 'ledger text'),
    readCatalog: vi.fn(async () => 'catalog text'),
    startupStore: createStartupStore(),
    loadStartup: vi.fn(async () => {}),
    saveStartup: vi.fn(async () => ({ ok: true as const })),
    resetStartup: vi.fn(async () => ({ ok: true as const })),
    t,
  }
  return { data, pending }
}

function mountCompanyTabs(ctx: Context, data: CompanyTabRegistrationData) {
  return ctx.plugin({
    inject: ['slots', 'sidebarRightTabs', 'sidebarRight', 'uiWorkspace'],
    apply: (scoped) => { registerCompanyTabs(scoped, data) },
  })
}

function mountRootDeclarations(ctx: Context) {
  return ctx.plugin({
    inject: ['slots'],
    apply: (scoped) => {
      scoped.slots.register({
        name: 'root',
        children: {
          [BODY_OWNER]: { kind: 'single', scope: 'root' },
          [TITLE_OWNER]: { kind: 'single', scope: 'root' },
          [GUIDE_OWNER]: { kind: 'single', scope: 'root' },
        },
      } as never, EMPTY_ENTRY as never)
    },
  })
}

function mountKeyedDeclaration(ctx: Context, owner: string, slot: string) {
  return ctx.plugin({
    inject: ['slots'],
    apply: (scoped) => {
      scoped.slots.register({ name: owner, children: { [slot]: KEYED_SESSION } } as never, EMPTY_ENTRY as never)
    },
  })
}

async function mountHarness(t?: CompanyTabRegistrationData['t']) {
  const ctx = new Context()
  const slots = new SlotRegistry(ctx)
  const sidebarRightTabs = new SidebarRightTabRegistry(ctx)
  const { data, pending } = tabData(t)
  const openTab = vi.fn()
  const openSession = vi.fn()
  ctx.provide('sidebarRightTabs', sidebarRightTabs)
  ctx.provide('sidebarRight', { openTab })
  ctx.provide('uiWorkspace', { openSession })
  onTestFinished(async () => { await ctx.fiber.dispose() })
  const companyFiber = mountCompanyTabs(ctx, data)
  onTestFinished(async () => { await companyFiber.dispose() })
  await companyFiber.await()
  return { ctx, slots, sidebarRightTabs, data, pending, openTab, openSession, companyFiber }
}

async function declareRoot(harness: Awaited<ReturnType<typeof mountHarness>>) {
  const fiber = mountRootDeclarations(harness.ctx)
  onTestFinished(async () => { await fiber.dispose() })
  await fiber.await()
  return fiber
}

async function declareSlot(harness: Awaited<ReturnType<typeof mountHarness>>, owner: string, slot: string) {
  const fiber = mountKeyedDeclaration(harness.ctx, owner, slot)
  onTestFinished(async () => { await fiber.dispose() })
  await fiber.await()
  return fiber
}

describe('company tab registration', () => {
  it('registers all tab types and guide icons before any slot declaration', async () => {
    const harness = await mountHarness()
    const declaredTypes = harness.sidebarRightTabs.entries()
    expect(declaredTypes.map(({ id, kind, title, guide }) => ({
      id, kind, title: title(''), guide: guide?.map(entry => [entry.id, entry.order, entry.title(), entry.description?.()]),
    }))).toEqual(EXPECTED_TYPES.map(type => ({
      id: type.id,
      kind: type.kind,
      title: type.title,
      guide: [[type.id, type.order, type.title, type.description]],
    })))
    expect(declaredTypes.map(definition => definition.guide?.[0]?.icon)).toEqual(GUIDE_ICONS)

    // 类型阶段已注册，但三个 slots.inject 都在等真实 SlotRegistry 声明，不提前注册。
    expect(harness.slots.entries(BODY_SLOT)).toEqual([])
    expect(harness.slots.entries(TITLE_SLOT)).toEqual([])
    expect(harness.slots.entries(GUIDE_SLOT)).toEqual([])
  })

  it('mounts body, title and guide only after declarations, with injected data intact', async () => {
    const harness = await mountHarness()
    await declareRoot(harness)
    const bodyFiber = await declareSlot(harness, BODY_OWNER, BODY_SLOT)
    const bodyEntries = harness.slots.entries(BODY_SLOT)
    expect(bodyEntries.map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(bodyEntries.every(entry => entry.locale === 'company'), 'body 槽必须拿到 company t seat').toBe(true)
    expect(bodyEntries.map(entry => entry.component)).toEqual(BODY_COMPONENTS)
    expect(harness.slots.entries(TITLE_SLOT)).toEqual([])
    expect(harness.slots.entries(GUIDE_SLOT)).toEqual([])

    const bodyProps = bodyEntries.map(entry => entry.inject?.() ?? {})
    const hubStore = createHubSubViewStore()
    const opsProps = bodyProps[0]!
    expect(opsProps.floatTab).toBe(harness.data.floatTab)
    expect(opsProps.unfloatTab).toBe(harness.data.unfloatTab)
    expect(opsProps.leadOf).toBe(harness.data.leadOf)
    expect(opsProps.follow).toBe(harness.data.follow)
    expect((opsProps.hooks as { hubState: { getSnapshot(): HubSubViewState } }).hubState.getSnapshot().ops).toBe('board')
    ;(opsProps.selectSection as typeof hubStore.select)('ops', 'tasks')
    expect((opsProps.hooks as { hubState: { getSnapshot(): HubSubViewState } }).hubState.getSnapshot().ops).toBe('tasks')

    const teamProps = bodyProps[1]!
    expect(teamProps.floatTab).toBe(harness.data.floatTab)
    expect(teamProps.unfloatTab).toBe(harness.data.unfloatTab)
    expect(teamProps.attention).toBe(harness.data.attention)
    expect((teamProps.attention as typeof harness.data.attention).list()).toEqual([harness.pending])
    ;(teamProps.openSession as (sessionId: SessionId) => void)('test-session' as SessionId)
    expect(harness.openSession).toHaveBeenCalledWith('test-session')
    const member = { id: 'member-1', role: 'teammate' } as const
    await (teamProps.openMember as CompanyTabRegistrationData['openMember'])('child-session' as SessionId, member)
    expect(harness.data.openMember).toHaveBeenCalledWith('child-session', member)

    const archiveProps = bodyProps[2]!
    expect(archiveProps.floatTab).toBe(harness.data.floatTab)
    expect(archiveProps.unfloatTab).toBe(harness.data.unfloatTab)
    expect(archiveProps.cultivationFiles).toBe(harness.data.cultivationFiles)
    expect(archiveProps.roleSource).toBe(harness.data.roleSource)
    const signal = new AbortController().signal
    await expect((archiveProps.readLedger as CompanyTabRegistrationData['readLedger'])('lead-session' as SessionId, signal)).resolves.toBe('ledger text')
    expect(harness.data.readLedger).toHaveBeenCalledWith('lead-session', signal)
    expect(archiveProps.readCatalog).toBe(harness.data.readCatalog)
    await expect((archiveProps.readCatalog as CompanyTabRegistrationData['readCatalog'])('lead-session' as SessionId, signal)).resolves.toBe('catalog text')
    expect(harness.data.readCatalog).toHaveBeenCalledWith('lead-session', signal)

    const titleFiber = await declareSlot(harness, TITLE_OWNER, TITLE_SLOT)
    expect(harness.slots.entries(TITLE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(harness.slots.entries(TITLE_SLOT).map(entry => entry.component)).toEqual(TITLE_COMPONENTS)
    expect(harness.slots.entries(TITLE_SLOT).every(entry => entry.locale === 'company'), 'title 槽必须拿到 company t seat').toBe(true)
    expect(harness.slots.entries(GUIDE_SLOT)).toEqual([])

    const guideFiber = await declareSlot(harness, GUIDE_OWNER, GUIDE_SLOT)
    const guideEntries = harness.slots.entries(GUIDE_SLOT)
    expect(guideEntries.map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(guideEntries.map(entry => entry.component)).toEqual(GUIDE_COMPONENTS)
    expect(guideEntries.every(entry => entry.locale === 'company'), 'guide 槽必须拿到 company t seat').toBe(true)
    for (const [index, entry] of guideEntries.entries()) {
      const props = entry.inject?.() ?? {}
      expect(Object.keys(props)).toEqual(['openTab'])
      ;(props.openTab as (kind: string) => void)(EXPECTED_TYPES[index]!.kind)
    }
    expect(harness.openTab.mock.calls).toEqual(EXPECTED_TYPES.map(type => [type.kind]))

    await bodyFiber.dispose()
    await titleFiber.dispose()
    await guideFiber.dispose()
  })

  it('页签 title/guide 文案随 locale 实时切换（不是注册时捕获）', async () => {
    let dict: Record<string, string> = zh
    const t = ((key: string) => dict[key] ?? key) as CompanyTabRegistrationData['t']
    const harness = await mountHarness(t)
    const team = harness.sidebarRightTabs.entries().find(definition => definition.id === 'dsh-company-pack/team')
    expect(team, 'team tab type').toBeDefined()
    expect(team!.title('')).toBe('团队')
    expect(team!.guide?.[0]?.description?.()).toContain('团队协同中心')
    dict = en
    expect(team!.title('')).toBe('Team')
    expect(team!.guide?.[0]?.description?.()).toContain('Team hub')
    dict = zh
    expect(team!.title('')).toBe('团队')
  })

  it('collapses one declaration at a time; reinstallation and final unload stay scoped', async () => {
    const harness = await mountHarness()
    await declareRoot(harness)
    let bodyFiber = await declareSlot(harness, BODY_OWNER, BODY_SLOT)
    let titleFiber = await declareSlot(harness, TITLE_OWNER, TITLE_SLOT)
    let guideFiber = await declareSlot(harness, GUIDE_OWNER, GUIDE_SLOT)

    await bodyFiber.dispose()
    expect(harness.slots.entries(BODY_SLOT)).toEqual([])
    expect(harness.slots.entries(TITLE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(harness.slots.entries(GUIDE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    bodyFiber = await declareSlot(harness, BODY_OWNER, BODY_SLOT)
    expect(harness.slots.entries(BODY_SLOT).map(entry => entry.component)).toEqual(BODY_COMPONENTS)

    await titleFiber.dispose()
    expect(harness.slots.entries(TITLE_SLOT)).toEqual([])
    expect(harness.slots.entries(BODY_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(harness.slots.entries(GUIDE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    titleFiber = await declareSlot(harness, TITLE_OWNER, TITLE_SLOT)
    expect(harness.slots.entries(TITLE_SLOT).map(entry => entry.component)).toEqual(TITLE_COMPONENTS)

    await guideFiber.dispose()
    expect(harness.slots.entries(GUIDE_SLOT)).toEqual([])
    expect(harness.slots.entries(BODY_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(harness.slots.entries(TITLE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    guideFiber = await declareSlot(harness, GUIDE_OWNER, GUIDE_SLOT)
    const restoredGuideEntries = harness.slots.entries(GUIDE_SLOT)
    expect(restoredGuideEntries.map(entry => entry.component)).toEqual(GUIDE_COMPONENTS)
    for (const [index, entry] of restoredGuideEntries.entries()) {
      const props = entry.inject?.() ?? {}
      ;(props.openTab as (kind: string) => void)(EXPECTED_TYPES[index]!.kind)
    }
    expect(harness.openTab.mock.calls).toHaveLength(EXPECTED_TYPES.length)

    await harness.companyFiber.dispose()
    expect(harness.sidebarRightTabs.entries()).toEqual([])
    expect(harness.sidebarRightTabs.guide()).toEqual([])
    expect(harness.slots.entries(BODY_SLOT)).toEqual([])
    expect(harness.slots.entries(TITLE_SLOT)).toEqual([])
    expect(harness.slots.entries(GUIDE_SLOT)).toEqual([])
    await bodyFiber.dispose()
    await titleFiber.dispose()
    await guideFiber.dispose()
  })
})
