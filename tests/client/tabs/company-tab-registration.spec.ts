import { Context } from '../../../vendor/dsh/vendor/cordis/src/index.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { SlotRegistry } from '../../../vendor/dsh/packages/client/ui-renderer/src/client/registry.ts'
import { SidebarRightTabRegistry } from '../../../vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-registry.ts'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { CultivationFiles } from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import type { CompanyTabRegistrationData } from '../../../packages/company-pack/src/client/tabs/company-tab-registration.ts'
import { AttentionTab } from '../../../packages/company-pack/src/client/tabs/AttentionTab.tsx'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from '../../../packages/company-pack/src/client/tabs/company-tabs.tsx'
import { CultivationTab } from '../../../packages/company-pack/src/client/tabs/CultivationTab.tsx'
import { DeliverablesTab } from '../../../packages/company-pack/src/client/tabs/DeliverablesTab.tsx'
import { LedgerTab } from '../../../packages/company-pack/src/client/tabs/LedgerTab.tsx'
import { StrategyPanel } from '../../../packages/company-pack/src/client/startup/StrategyPanel.tsx'
import { createStartupStore } from '../../../packages/company-pack/src/client/startup/startup-store.ts'
import {
  AttentionTabTitle, BoardTabTitle, BudgetTabTitle, CatalogTabTitle, CultivationTabTitle,
  DagTabTitle, LedgerTabTitle, PresenceTabTitle, TasksTabTitle, StrategyTabTitle,
  AttentionGuideEntry, BoardGuideEntry, BudgetGuideEntry, CatalogGuideEntry, CultivationGuideEntry,
  DagGuideEntry, LedgerGuideEntry, PresenceGuideEntry, TasksGuideEntry, StrategyGuideEntry,
  AttentionGuideIcon, BoardGuideIcon, DagGuideIcon, PresenceGuideIcon,
  BudgetGuideIcon, TasksGuideIcon, CultivationGuideIcon, LedgerGuideIcon, CatalogGuideIcon, StrategyGuideIcon,
} from '../../../packages/company-pack/src/client/ui/tab-icons.tsx'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { registerCompanyTabs } from '../../../packages/company-pack/src/client/tabs/company-tab-registration.ts'
import { en, zh } from '../../../packages/company-pack/src/client/locales.ts'

const EXPECTED_TYPES = [
  { id: 'dsh-company-pack/attention', kind: 'company-attention', title: '待办', order: 50, description: '人的待办收件箱：待批审批 / 待答问询 / 升级 + 完成通知' },
  { id: 'dsh-company-pack/board', kind: 'company-board', title: '看板', order: 51, description: '任务看板：活到哪一步（owner / 依赖 / 修订号）' },
  { id: 'dsh-company-pack/dag', kind: 'company-dag', title: '依赖图', order: 52, description: '任务依赖图：谁依赖谁、关键路径' },
  { id: 'dsh-company-pack/presence', kind: 'company-presence', title: '在场', order: 53, description: '组织在场板：谁在忙、忙什么；点行进成员空间' },
  { id: 'dsh-company-pack/budget', kind: 'company-budget', title: '用量', order: 54, description: '令牌用量与占比（只做令牌，不做美元）' },
  { id: 'dsh-company-pack/tasks', kind: 'company-tasks', title: '任务板', order: 55, description: '共享任务表：状态 / owner / 依赖 / 修订号' },
  { id: 'dsh-company-pack/cultivation', kind: 'company-cultivation', title: '培养', order: 56, description: '养自己的角色分身：待处理建议 / 已采纳方法 / journal 待审 / 赞踩' },
  { id: 'dsh-company-pack/ledger', kind: 'company-ledger', title: '台账', order: 57, description: '动议台账：公司累计干了什么（日期/类型/参与/成品/结论）' },
  { id: 'dsh-company-pack/deliverables', kind: 'company-deliverables', title: '成品', order: 58, description: '公司成品目录：按 final.md 列成品（日期/类型/结果/结论）' },
  { id: 'dsh-company-pack/strategy', kind: 'company-strategy', title: '策略', order: 20, description: '项目策略：三行、自动优先、选项来自公司内容' },
] as const

const BODY_COMPONENTS = [AttentionTab, BoardTab, DagTab, PresenceTab, BudgetTab, TasksTab, CultivationTab, LedgerTab, DeliverablesTab, StrategyPanel]
const TITLE_COMPONENTS = [AttentionTabTitle, BoardTabTitle, DagTabTitle, PresenceTabTitle, BudgetTabTitle, TasksTabTitle, CultivationTabTitle, LedgerTabTitle, CatalogTabTitle, StrategyTabTitle]
const GUIDE_COMPONENTS = [AttentionGuideEntry, BoardGuideEntry, DagGuideEntry, PresenceGuideEntry, BudgetGuideEntry, TasksGuideEntry, CultivationGuideEntry, LedgerGuideEntry, CatalogGuideEntry, StrategyGuideEntry]
const GUIDE_ICONS = [AttentionGuideIcon, BoardGuideIcon, DagGuideIcon, PresenceGuideIcon, BudgetGuideIcon, TasksGuideIcon, CultivationGuideIcon, LedgerGuideIcon, CatalogGuideIcon, StrategyGuideIcon]
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
    listRecords: vi.fn(async () => []),
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
    const attentionProps = bodyProps[0]!
    expect(Object.keys(attentionProps).sort()).toEqual(['floatTab', 'follow', 'getPending', 'leadOf', 'openSession', 't', 'unfloatTab'])
    expect(attentionProps.floatTab).toBe(harness.data.floatTab)
    expect(attentionProps.unfloatTab).toBe(harness.data.unfloatTab)
    expect(attentionProps.leadOf).toBe(harness.data.leadOf)
    expect(attentionProps.follow).toBe(harness.data.follow)
    expect((attentionProps.getPending as () => unknown)()).toEqual([harness.pending])
    ;(attentionProps.openSession as (sessionId: SessionId) => void)('test-session' as SessionId)
    expect(harness.openSession).toHaveBeenCalledWith('test-session')

    const sharedData = { leadOf: harness.data.leadOf, follow: harness.data.follow, floatTab: harness.data.floatTab, unfloatTab: harness.data.unfloatTab, t: harness.data.t }
    for (const index of [1, 2, 4, 5]) expect(bodyProps[index]).toEqual(sharedData)
    const presenceProps = bodyProps[3]!
    expect(presenceProps).toEqual({ ...sharedData, openMember: harness.data.openMember })
    const member = { id: 'member-1', role: 'teammate' } as const
    await (presenceProps.openMember as CompanyTabRegistrationData['openMember'])('child-session' as SessionId, member)
    expect(harness.data.openMember).toHaveBeenCalledWith('child-session', member)

    expect(bodyProps[6]).toEqual({
      floatTab: harness.data.floatTab,
      unfloatTab: harness.data.unfloatTab,
      cultivationFiles: harness.data.cultivationFiles,
      followEvents: harness.data.follow,
      roleSource: harness.data.roleSource,
      t: harness.data.t,
    })
    const signal = new AbortController().signal
    expect(bodyProps[7]).toEqual({ floatTab: harness.data.floatTab, unfloatTab: harness.data.unfloatTab, readLedger: harness.data.readLedger, t: harness.data.t })
    await expect((bodyProps[7]!.readLedger as CompanyTabRegistrationData['readLedger'])('lead-session' as SessionId, signal)).resolves.toBe('ledger text')
    expect(harness.data.readLedger).toHaveBeenCalledWith('lead-session', signal)
    expect(bodyProps[8]!.readCatalog).toBe(harness.data.readCatalog)
    await expect((bodyProps[8]!.readCatalog as CompanyTabRegistrationData['readCatalog'])('lead-session' as SessionId, signal)).resolves.toBe('catalog text')
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
    const attention = harness.sidebarRightTabs.entries().find(definition => definition.id === 'dsh-company-pack/attention')
    expect(attention, 'attention tab type').toBeDefined()
    expect(attention!.title()).toBe('待办')
    expect(attention!.guide?.[0]?.description?.()).toContain('待办收件箱')
    dict = en
    expect(attention!.title()).toBe('Inbox')
    expect(attention!.guide?.[0]?.description?.()).toContain('pending inbox')
    dict = zh
    expect(attention!.title()).toBe('待办')
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
