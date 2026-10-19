import { Context } from '../../vendor/dsh/vendor/cordis/src/index.ts'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { SlotRegistry } from '../../vendor/dsh/packages/client/ui-renderer/src/client/registry.ts'
import { SidebarRightTabRegistry } from '../../vendor/dsh/packages/client/ui-sidebar-right/src/client/tab-registry.ts'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { CultivationFiles } from '../../packages/company-pack/src/client/cultivation-data.ts'
import { createAttentionRegistry } from '../../packages/company-pack/src/client/attention-registry.ts'
import type { CompanyTabRegistrationData } from '../../packages/company-pack/src/client/company-tab-registration.ts'
import { AttentionTab } from '../../packages/company-pack/src/client/AttentionTab.tsx'
import { BoardTab, BudgetTab, DagTab, PresenceTab, TasksTab } from '../../packages/company-pack/src/client/company-tabs.tsx'
import { CultivationTab } from '../../packages/company-pack/src/client/CultivationTab.tsx'
import { DeliverablesTab } from '../../packages/company-pack/src/client/DeliverablesTab.tsx'
import { LedgerTab } from '../../packages/company-pack/src/client/LedgerTab.tsx'
import {
  AttentionTabTitle, BoardTabTitle, BudgetTabTitle, CatalogTabTitle, CultivationTabTitle,
  DagTabTitle, LedgerTabTitle, PresenceTabTitle, TasksTabTitle,
  AttentionGuideEntry, BoardGuideEntry, BudgetGuideEntry, CatalogGuideEntry, CultivationGuideEntry,
  DagGuideEntry, LedgerGuideEntry, PresenceGuideEntry, TasksGuideEntry,
  AttentionGuideIcon, BoardGuideIcon, DagGuideIcon, PresenceGuideIcon,
  BudgetGuideIcon, TasksGuideIcon, CultivationGuideIcon, LedgerGuideIcon, CatalogGuideIcon,
} from '../../packages/company-pack/src/client/tab-icons.tsx'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { registerCompanyTabs } from '../../packages/company-pack/src/client/company-tab-registration.ts'

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
] as const

const BODY_COMPONENTS = [AttentionTab, BoardTab, DagTab, PresenceTab, BudgetTab, TasksTab, CultivationTab, LedgerTab, DeliverablesTab]
const TITLE_COMPONENTS = [AttentionTabTitle, BoardTabTitle, DagTabTitle, PresenceTabTitle, BudgetTabTitle, TasksTabTitle, CultivationTabTitle, LedgerTabTitle, CatalogTabTitle]
const GUIDE_COMPONENTS = [AttentionGuideEntry, BoardGuideEntry, DagGuideEntry, PresenceGuideEntry, BudgetGuideEntry, TasksGuideEntry, CultivationGuideEntry, LedgerGuideEntry, CatalogGuideEntry]
const GUIDE_ICONS = [AttentionGuideIcon, BoardGuideIcon, DagGuideIcon, PresenceGuideIcon, BudgetGuideIcon, TasksGuideIcon, CultivationGuideIcon, LedgerGuideIcon, CatalogGuideIcon]
const BODY_SLOT = 'sidebar.right.pane.tab'
const TITLE_SLOT = 'sidebar.right.pane.tab.title'
const GUIDE_SLOT = 'sidebar.right.tab.guide.entry'
const BODY_OWNER = 'company.test.body-owner'
const TITLE_OWNER = 'company.test.title-owner'
const GUIDE_OWNER = 'company.test.guide-owner'
const EMPTY_ENTRY = () => null
const KEYED_SESSION = { kind: 'keyed', scope: 'session' } as const

function tabData() {
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

describe('company tab registration', () => {
  it('keeps tab types, keyed renderers, injected data, waits, collapse, reinstallation, and unload aligned', async () => {
    const ctx = new Context()
    const slots = new SlotRegistry(ctx)
    const sidebarRightTabs = new SidebarRightTabRegistry(ctx)
    const { data, pending } = tabData()
    const openTab = vi.fn()
    const openSession = vi.fn()
    ctx.provide('sidebarRightTabs', sidebarRightTabs)
    ctx.provide('sidebarRight', { openTab })
    ctx.provide('uiWorkspace', { openSession })
    onTestFinished(async () => { await ctx.fiber.dispose() })

    const companyFiber = mountCompanyTabs(ctx, data)
    onTestFinished(async () => { await companyFiber.dispose() })
    await companyFiber.await()
    const declaredTypes = sidebarRightTabs.entries()
    expect(declaredTypes.map(({ id, kind, title, guide }) => ({
      id, kind, title: title(''), guide: guide?.map(entry => [entry.id, entry.order, entry.title(), entry.description?.()]),
    }))).toEqual(EXPECTED_TYPES.map(type => ({
      id: type.id,
      kind: type.kind,
      title: type.title,
      guide: [[type.id, type.order, type.title, type.description]],
    })))
    expect(declaredTypes.map(definition => definition.guide?.[0]?.icon)).toEqual(GUIDE_ICONS)

    // The module has registered its type stage, but each slots.inject waits for
    // the corresponding real SlotRegistry declaration instead of registering early.
    expect(slots.entries(BODY_SLOT)).toEqual([])
    expect(slots.entries(TITLE_SLOT)).toEqual([])
    expect(slots.entries(GUIDE_SLOT)).toEqual([])

    const rootFiber = mountRootDeclarations(ctx)
    onTestFinished(async () => { await rootFiber.dispose() })
    await rootFiber.await()
    const bodyFiber = mountKeyedDeclaration(ctx, BODY_OWNER, BODY_SLOT)
    onTestFinished(async () => { await bodyFiber.dispose() })
    await bodyFiber.await()
    const bodyEntries = slots.entries(BODY_SLOT)
    expect(bodyEntries.map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(bodyEntries.map(entry => entry.component)).toEqual(BODY_COMPONENTS)
    expect(slots.entries(TITLE_SLOT)).toEqual([])
    expect(slots.entries(GUIDE_SLOT)).toEqual([])
    const bodyProps = bodyEntries.map(entry => entry.inject?.() ?? {})
    const attentionProps = bodyProps[0]!
    expect(Object.keys(attentionProps).sort()).toEqual(['floatTab', 'follow', 'getPending', 'leadOf', 'openSession', 'unfloatTab'])
    expect(attentionProps.floatTab).toBe(data.floatTab)
    expect(attentionProps.unfloatTab).toBe(data.unfloatTab)
    expect(attentionProps.leadOf).toBe(data.leadOf)
    expect(attentionProps.follow).toBe(data.follow)
    expect((attentionProps.getPending as () => unknown)()).toEqual([pending])
    ;(attentionProps.openSession as (sessionId: SessionId) => void)('test-session' as SessionId)
    expect(openSession).toHaveBeenCalledWith('test-session')

    const sharedData = { leadOf: data.leadOf, follow: data.follow, floatTab: data.floatTab, unfloatTab: data.unfloatTab }
    for (const index of [1, 2, 4, 5]) {
      expect(bodyProps[index]).toEqual(sharedData)
    }
    const presenceProps = bodyProps[3]!
    expect(presenceProps).toEqual({ ...sharedData, openMember: data.openMember })
    const member = { id: 'member-1', role: 'teammate' } as const
    await (presenceProps.openMember as CompanyTabRegistrationData['openMember'])('child-session' as SessionId, member)
    expect(data.openMember).toHaveBeenCalledWith('child-session', member)

    expect(bodyProps[6]).toEqual({
      floatTab: data.floatTab,
      unfloatTab: data.unfloatTab,
      cultivationFiles: data.cultivationFiles,
      followEvents: data.follow,
      roleSource: data.roleSource,
    })
    expect(bodyProps[7]).toEqual({ floatTab: data.floatTab, unfloatTab: data.unfloatTab, readLedger: data.readLedger })
    const ledgerProps = bodyProps[7]!
    const signal = new AbortController().signal
    await expect((ledgerProps.readLedger as CompanyTabRegistrationData['readLedger'])('lead-session' as SessionId, signal)).resolves.toBe('ledger text')
    expect(data.readLedger).toHaveBeenCalledWith('lead-session', signal)

    const catalogProps = bodyProps[8]!
    expect(catalogProps.floatTab).toBe(data.floatTab)
    expect(catalogProps.unfloatTab).toBe(data.unfloatTab)
    expect(catalogProps.readCatalog).toBe(data.readCatalog)
    expect(typeof catalogProps.openFinal).toBe('function')
    await expect((catalogProps.readCatalog as CompanyTabRegistrationData['readCatalog'])('lead-session' as SessionId, signal)).resolves.toBe('catalog text')
    expect(data.readCatalog).toHaveBeenCalledWith('lead-session', signal)

    const titleFiber = mountKeyedDeclaration(ctx, TITLE_OWNER, TITLE_SLOT)
    onTestFinished(async () => { await titleFiber.dispose() })
    await titleFiber.await()
    expect(slots.entries(TITLE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(slots.entries(GUIDE_SLOT)).toEqual([])
    const guideFiber = mountKeyedDeclaration(ctx, GUIDE_OWNER, GUIDE_SLOT)
    onTestFinished(async () => { await guideFiber.dispose() })
    await guideFiber.await()

    const titleEntries = slots.entries(TITLE_SLOT)
    expect(titleEntries.map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(titleEntries.map(entry => entry.component)).toEqual(TITLE_COMPONENTS)

    const guideEntries = slots.entries(GUIDE_SLOT)
    expect(guideEntries.map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(guideEntries.map(entry => entry.component)).toEqual(GUIDE_COMPONENTS)
    for (const [index, entry] of guideEntries.entries()) {
      const props = entry.inject?.() ?? {}
      expect(Object.keys(props)).toEqual(['openTab'])
      ;(props.openTab as (kind: string) => void)(EXPECTED_TYPES[index]!.kind)
    }
    expect(openTab.mock.calls).toEqual(EXPECTED_TYPES.map(type => [type.kind]))

    // Collapsing one declaring slot removes only that slot's contributions;
    // the other two waits remain installed, then this group follows redeclaration.
    await bodyFiber.dispose()
    expect(slots.entries(BODY_SLOT)).toEqual([])
    expect(slots.entries(TITLE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(slots.entries(GUIDE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    const replacementBodyFiber = mountKeyedDeclaration(ctx, BODY_OWNER, BODY_SLOT)
    onTestFinished(async () => { await replacementBodyFiber.dispose() })
    await replacementBodyFiber.await()
    expect(slots.entries(BODY_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(slots.entries(BODY_SLOT).map(entry => entry.component)).toEqual(BODY_COMPONENTS)

    // Each independent wait owns a separate declaration epoch and reinstalls only its own group.
    await titleFiber.dispose()
    expect(slots.entries(TITLE_SLOT)).toEqual([])
    expect(slots.entries(BODY_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(slots.entries(GUIDE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    const replacementTitleFiber = mountKeyedDeclaration(ctx, TITLE_OWNER, TITLE_SLOT)
    onTestFinished(async () => { await replacementTitleFiber.dispose() })
    await replacementTitleFiber.await()
    expect(slots.entries(TITLE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(slots.entries(TITLE_SLOT).map(entry => entry.component)).toEqual(TITLE_COMPONENTS)

    await guideFiber.dispose()
    expect(slots.entries(GUIDE_SLOT)).toEqual([])
    expect(slots.entries(BODY_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(slots.entries(TITLE_SLOT).map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    const replacementGuideFiber = mountKeyedDeclaration(ctx, GUIDE_OWNER, GUIDE_SLOT)
    onTestFinished(async () => { await replacementGuideFiber.dispose() })
    await replacementGuideFiber.await()
    const restoredGuideEntries = slots.entries(GUIDE_SLOT)
    expect(restoredGuideEntries.map(entry => entry.options.key)).toEqual(EXPECTED_TYPES.map(type => type.id))
    expect(restoredGuideEntries.map(entry => entry.component)).toEqual(GUIDE_COMPONENTS)
    for (const [index, entry] of restoredGuideEntries.entries()) {
      const props = entry.inject?.() ?? {}
      ;(props.openTab as (kind: string) => void)(EXPECTED_TYPES[index]!.kind)
    }
    expect(openTab.mock.calls.slice(EXPECTED_TYPES.length)).toEqual(EXPECTED_TYPES.map(type => [type.kind]))

    await companyFiber.dispose()
    expect(sidebarRightTabs.entries()).toEqual([])
    expect(sidebarRightTabs.guide()).toEqual([])
    expect(slots.entries(BODY_SLOT)).toEqual([])
    expect(slots.entries(TITLE_SLOT)).toEqual([])
    expect(slots.entries(GUIDE_SLOT)).toEqual([])
  })
})
