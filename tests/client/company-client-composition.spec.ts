// @vitest-environment happy-dom
/** Whole-client composition evidence for the company pack browser half.
 *
 * Boots the production `bootClient` over the real web-profile bundle roster
 * (dsh-base + dsh-web-app + dsh-company-pack, composed by bundleRoster the way
 * the profile launcher composes patch layers) with the pack's dependency cone,
 * then asserts the actual `apply` surface: the nine company tab types, the
 * three keyed slot groups, and the instance guard's fiber-owned heartbeat —
 * including their removal on unload and return on reload. Remote endpoints are
 * answered by the tier's RemoteMock (network boundary only; real composition
 * everywhere else). */
import { describe, expect } from 'vitest'
import { ok } from '../../vendor/dsh/packages/test-support/remote-mock/src/index.ts'
import { bundleRoster, WEB_PROFILE_BUNDLES } from '../../vendor/dsh/packages/test-support/client-runtime/src/assembly/bundle-roster.ts'
import { createClientTest } from '../../vendor/dsh/packages/test-support/client-runtime/src/assembly/index.ts'
// 源码面供本包 client 行（tier 的 provide 机制）：动态 import 走 exports 落到 tsdown 的 CJS
// 构建产物会炸；provide 与根仓「vitest 一律走 src 源码面」纪律一致，模块本体仍是生产实现。
import * as companyClient from '../../packages/company-pack/src/client/index.ts'

/** The web profile's browser roster with the company pack as an extra bundle layer. */
const roster = bundleRoster(
  [...WEB_PROFILE_BUNDLES, 'dsh-company-pack'],
  undefined,
  { get: (name: string) => name === 'profileContext' ? { name: 'web' } : undefined },
).closure(['dsh-company-pack'])

const COMPANY_TAB_IDS = [
  'dsh-company-pack/attention',
  'dsh-company-pack/board',
  'dsh-company-pack/dag',
  'dsh-company-pack/presence',
  'dsh-company-pack/budget',
  'dsh-company-pack/tasks',
  'dsh-company-pack/cultivation',
  'dsh-company-pack/ledger',
  'dsh-company-pack/deliverables',
] as const

const COMPANY_SLOTS = [
  'sidebar.right.pane.tab',
  'sidebar.right.pane.tab.title',
  'sidebar.right.tab.guide.entry',
] as const

const HEARTBEATS = 'dsh-instance-heartbeats'

interface TabsRegistry { entries(): ReadonlyArray<{ id: string }> }
interface SlotsRegistry { entries(key: string): ReadonlyArray<{ options: { key: string } }> }

/** The tab registration injects `remote.workspaceFiles`; the tier's namespace
 * derivation needs a mock rule with that URL prefix (real browser: the dropped
 * api-remotes row provides the generated client). Unused by registration itself. */
function declareWorkspaceFilesNamespace(mock: { load(rules: unknown): unknown }): void {
  mock.load({ unary: { 'workspaceFiles/read': ok({ ok: true, value: { text: '' } }) } })
}

const test = createClientTest({ roster, provide: { 'dsh-company-pack': companyClient } })

describe('company client apply through the whole-client tier', () => {
  test('boots the pack row and registers the nine company tabs with keyed slots', async ({ mock, start }) => {
    declareWorkspaceFilesNamespace(mock)
    const client = await start()

    const entry = [...client.ctx.loader.entries()].find(e => e.options.name === 'dsh-company-pack')
    expect(entry?.fiber, 'the company row imported and activated').toBeDefined()

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
        .filter(key => key.startsWith('dsh-company-pack/'))
      expect(keys).toEqual([...COMPANY_TAB_IDS])
    }

    // The instance guard ran inside the real apply and owns one heartbeat.
    const beats = JSON.parse(localStorage.getItem(HEARTBEATS) ?? '{}') as Record<string, number>
    expect(Object.keys(beats).filter(id => id.startsWith('tab-'))).toHaveLength(1)
  })

  test('unloading the pack row removes its tab types, slot entries, and guard heartbeat', async ({ mock, start }) => {
    declareWorkspaceFilesNamespace(mock)
    const client = await start()
    const tabs = client.ctx.get('sidebarRightTabs') as TabsRegistry
    const slots = client.ctx.get('slots') as SlotsRegistry
    expect(tabs.entries().some(definition => definition.id.startsWith('dsh-company-pack/'))).toBe(true)

    await client.unload('dsh-company-pack')

    expect(tabs.entries().map(definition => definition.id).filter(id => id.startsWith('dsh-company-pack/'))).toEqual([])
    for (const slot of COMPANY_SLOTS) {
      expect(slots.entries(slot).map(stored => stored.options.key).filter(key => key.startsWith('dsh-company-pack/'))).toEqual([])
    }
    // The guard's disposer is fiber-owned (ctx.effect): unload removes its heartbeat.
    const beats = JSON.parse(localStorage.getItem(HEARTBEATS) ?? '{}') as Record<string, number>
    expect(Object.keys(beats).filter(id => id.startsWith('tab-'))).toEqual([])
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
})
