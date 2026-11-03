/**
 * 「打开成员」导航直测（2026-11-03 D2/D5 从 client/index 的 inject 闭包抽出）。
 *
 * 病类：lead / teammate 未 retain / refresh 失败三条现场只有 whole-client 间接覆盖；
 * 现在纯工厂 + 注入面，毫秒级断言。
 */
import { describe, expect, it, vi } from 'vitest'
import { makeOpenMember } from '../../../packages/company-pack/src/client/wiring/member-navigation.ts'

function deps(mainView = 1) {
  const sessions = {
    retainInfo: vi.fn(() => ({ getSnapshot: () => ({ retainedBy: { mainView } }) })),
    refresh: vi.fn(async () => {}),
  }
  return {
    sessions,
    uiWorkspace: { openSession: vi.fn() },
    leadOf: vi.fn(() => 'lead-session'),
  }
}

const open = (d: ReturnType<typeof deps>, sessionId: string, member: { readonly id: string, readonly role: 'lead' | 'teammate' }) =>
  makeOpenMember(d as never)(sessionId as never, member)

describe('makeOpenMember', () => {
  it('lead → 直接打开 lead，不查 retain/不 refresh', async () => {
    const d = deps()
    await open(d, 'session-1', { id: 'lead-session', role: 'lead' })
    expect(d.leadOf).toHaveBeenCalledWith('session-1')
    expect(d.uiWorkspace.openSession).toHaveBeenCalledWith('lead-session')
    expect(d.sessions.retainInfo).not.toHaveBeenCalled()
    expect(d.sessions.refresh).not.toHaveBeenCalled()
  })

  it('teammate 未被 mainView retain → 静默返回，不 refresh/不导航', async () => {
    const d = deps(0)
    await open(d, 'session-1', { id: 'member-1', role: 'teammate' })
    expect(d.sessions.refresh).not.toHaveBeenCalled()
    expect(d.uiWorkspace.openSession).not.toHaveBeenCalled()
  })

  it('teammate 仍被 retain → refresh 后按 continuable child 打开', async () => {
    const d = deps(1)
    await open(d, 'session-1', { id: 'member-1', role: 'teammate' })
    expect(d.sessions.refresh).toHaveBeenCalledTimes(1)
    expect(d.uiWorkspace.openSession).toHaveBeenCalledWith({
      parentSessionId: 'lead-session', childSessionId: 'member-1', mode: 'continuable',
    })
  })

  it('refresh 失败 → 拒绝原错误，不导航', async () => {
    const d = deps(1)
    d.sessions.refresh.mockRejectedValueOnce(new Error('refresh boom'))
    await expect(open(d, 'session-1', { id: 'member-1', role: 'teammate' })).rejects.toThrow('refresh boom')
    expect(d.uiWorkspace.openSession).not.toHaveBeenCalled()
  })
})
