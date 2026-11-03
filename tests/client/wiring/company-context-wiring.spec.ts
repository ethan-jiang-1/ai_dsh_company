/**
 * 培养背景接线的直测（2026-11-03 D2/D5 抽出后）：会话/成品引用 → 背景源 + 「打开原文」。
 *
 * 病类：这些分支原本住 `client/index.ts` 的 apply 闭包（branch 12%），只有 whole-client 间接覆盖；
 * 「点了没反应」的三种现场（会话已删 / 原文不在 / stat 抛错）没有 keyless 证据。
 * 证明边界：不证 slot 注册、remote 真装配与 UI 呈现（→ company-client-composition / ui-scene）。
 */
import { describe, expect, it, vi } from 'vitest'
import { makeContextWiring } from '../../../packages/company-pack/src/client/wiring/context-wiring.ts'
import { sessionFileAddress } from '../../../packages/company-pack/src/lib/deliverables-address.ts'

function makeScoped(over = {}) {
  return {
    sessions: {
      list: { getSnapshot: () => ({ byId: { 'session-1': { id: 'session-1' } } }) },
      subagentAddress: vi.fn(() => undefined),
    },
    uiWorkspace: { openSession: vi.fn() },
    sidebarRight: { openResource: vi.fn() },
    remote: { workspaceFiles: { stat: vi.fn(async () => ({ ok: true })) } },
    ...over,
  }
}

const leadOf = () => 'lead-session'
const rawFollow = async function* () {}
const readCatalog = async () => null

const wiringFor = (scoped: ReturnType<typeof makeScoped>) =>
  makeContextWiring(scoped as never, leadOf as never, rawFollow as never, readCatalog as never) as unknown as {
    readonly openContext: (sessionId: string, context: unknown) => Promise<{ readonly ok: boolean, readonly problem?: string }>
    readonly contextSources: (sessionId: string) => { readonly listSessions: (id: string, role?: string) => { readonly ok: boolean, readonly value: readonly unknown[] } }
  }

const sessionContext = (over = {}) => ({ kind: 'session', ref: 'session-1', title: 't', excerpt: '', ...over })
const fileContext = (over = {}) => ({ kind: 'deliverable', ref: 'kb/x.md', title: 't', excerpt: '', ...over })

describe('makeContextWiring / openContext', () => {
  it('会话在列表里 → openSession(ref)', async () => {
    const scoped = makeScoped()
    const wiring = wiringFor(scoped)
    await expect(wiring.openContext('session-1', sessionContext())).resolves.toEqual({ ok: true })
    expect(scoped.uiWorkspace.openSession).toHaveBeenCalledWith('session-1')
  })

  it('会话不在 → 可操作 problem，不导航', async () => {
    const scoped = makeScoped()
    const wiring = wiringFor(scoped)
    const result = await wiring.openContext('session-1', sessionContext({ ref: 'gone' }))
    expect(result).toEqual({ ok: false, problem: '这个会话现在打不开了（可能已删除）。' })
    expect(scoped.uiWorkspace.openSession).not.toHaveBeenCalled()
  })

  it('subagent child：不在 byId 但 subagentAddress 认识 → parent/child/mode 导航', async () => {
    const scoped = makeScoped({
      sessions: {
        list: { getSnapshot: () => ({ byId: {} }) },
        subagentAddress: vi.fn(() => ({ parentSessionId: 'parent' })),
      },
    })
    const wiring = wiringFor(scoped)
    await expect(wiring.openContext('session-1', sessionContext({
      ref: 'child', parentSessionId: 'parent', mode: 'continuable',
    }))).resolves.toEqual({ ok: true })
    expect(scoped.uiWorkspace.openSession).toHaveBeenCalledWith({
      parentSessionId: 'parent', childSessionId: 'child', mode: 'continuable',
    })
  })

  it('subagent child 缺 mode → 导航回退 unknown', async () => {
    const scoped = makeScoped({
      sessions: {
        list: { getSnapshot: () => ({ byId: {} }) },
        subagentAddress: vi.fn(() => ({ parentSessionId: 'parent' })),
      },
    })
    const wiring = wiringFor(scoped)
    await wiring.openContext('session-1', sessionContext({ ref: 'child', parentSessionId: 'parent' }))
    expect(scoped.uiWorkspace.openSession).toHaveBeenCalledWith({
      parentSessionId: 'parent', childSessionId: 'child', mode: 'unknown',
    })
  })

  it('成品/文件 stat ok → openResource(sessionFileAddress(lead, ref))', async () => {
    const scoped = makeScoped()
    const wiring = wiringFor(scoped)
    await expect(wiring.openContext('session-1', fileContext())).resolves.toEqual({ ok: true })
    expect(scoped.sidebarRight.openResource).toHaveBeenCalledWith(sessionFileAddress('lead-session', 'kb/x.md'))
  })

  it('文件 stat !ok → 原文不在 problem', async () => {
    const scoped = makeScoped({
      remote: { workspaceFiles: { stat: vi.fn(async () => ({ ok: false })) } },
    })
    const wiring = wiringFor(scoped)
    await expect(wiring.openContext('session-1', fileContext()))
      .resolves.toEqual({ ok: false, problem: '原文不在了（文件可能已归档/移动）。' })
    expect(scoped.sidebarRight.openResource).not.toHaveBeenCalled()
  })

  it('stat 抛错 → 打不开原文，保留错误原话', async () => {
    const scoped = makeScoped({
      remote: { workspaceFiles: { stat: vi.fn(async () => { throw new Error('boom') }) } },
    })
    const wiring = wiringFor(scoped)
    await expect(wiring.openContext('session-1', fileContext()))
      .resolves.toEqual({ ok: false, problem: '打不开原文：boom' })
  })
})

describe('makeContextWiring / contextSources', () => {
  it('listSessions 从当前会话列表投影（空列表也是 ok）', () => {
    const scoped = makeScoped({ sessions: { list: { getSnapshot: () => ({ byId: {} }) }, subagentAddress: vi.fn() } })
    const wiring = wiringFor(scoped)
    expect(wiring.contextSources('session-1').listSessions('session-1')).toEqual({ ok: true, value: [] })
  })
})
