// @vitest-environment happy-dom
/** useCompanyData 订阅生命周期（2026-10-21 六维度 Phase C3 补强：此前 hook 无窄 spec，
 * 只有面板文案级断言）。判据面：stream 开关订阅、历史帧播种 + 50 条封顶 + 最新在前、
 * 卸载/换 Lead 中止旧流、流错误 fail-loud、名册迟到把动态里裸 id 换成员名。
 * 手法：happy-dom + createRoot + 可控 follow 通道（async generator 通道，push 即唤醒）；
 * useProjection / useSessions 用稳定常量函数替身（数据边界，非 mock 白名单面——真 hook 全跑）。 */
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import {
  useCompanyData,
  type CompanyData,
  type CompanyDataInjected,
  type SessionsStoreLike,
  type UseSessions,
} from '../../packages/company-pack/src/client/use-company-data.ts'
import type { TeamEventLike, TeamStreamFrame, TeamViewLike } from '../../packages/company-pack/src/lib/presence.ts'
import type { UseProjection } from '@deepseek-ai/dsh-api-session-controller/client'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** 事件夹具（形状 = lib/presence 的 TeamEventLike）。 */
const memberActive = (id: string, time: number): TeamEventLike =>
  ({ type: 'team/member', time, data: { teamId: 't-1', member: { id, name: id, phase: 'active' } } })
const messageTo = (targetId: string, text: string, time: number): TeamEventLike =>
  ({
    type: 'team/message/queued', time,
    data: {
      teamId: 't-1',
      message: { id: `msg-${String(time)}`, senderId: 'lead', senderName: '', targetId, content: [{ type: 'text', text }] },
    },
  })

const teamView: TeamViewLike = {
  members: [{ id: 'm-1', name: 'vp-eng', role: 'teammate', phase: 'active' }],
  tasks: [{ id: 'T1', subject: '出评审意见', status: 'in_progress', ownerName: 'vp-eng', revision: 1, blockedBy: [], ready: true }],
}

/** 可控流通道：initial 立即可读，push() 唤醒挂起的迭代；记录 AbortSignal 供断言。 */
function channel(initial: readonly TeamStreamFrame[] = []) {
  const queue: TeamStreamFrame[] = [...initial]
  const api = {
    signal: undefined as AbortSignal | undefined,
    push(frame: TeamStreamFrame): void { queue.push(frame); wake?.() },
  }
  let wake: (() => void) | undefined
  const follow = async function* (_sessionId: SessionId, signal: AbortSignal): AsyncGenerator<TeamStreamFrame> {
    api.signal = signal
    while (!signal.aborted) {
      if (queue.length > 0) { yield queue.shift()!; continue }
      await new Promise<void>(resolve => { wake = resolve }).then(() => { wake = undefined })
    }
  }
  return { api, follow }
}

/** 流完后抛错的 follow（错误档：fail-loud 不静默）。 */
async function* failingFollow(_sessionId: SessionId, _signal: AbortSignal): AsyncGenerator<TeamStreamFrame> {
  yield { kind: 'history', events: [memberActive('m-1', 1)] }
  throw new Error('boom')
}

const useProjection: UseProjection = ((key: string) =>
  key === 'tokenUsage'
    ? { uncachedInputTokens: 1_000, outputTokens: 1_000 }
    : { turns: 3, steps: 9, llmMs: 8_000, toolMs: 2_000 }) as unknown as UseProjection

/** 挂载柄：props 可换（sessionId / store / injected / stream），snapshots 收每次渲染的 CompanyData。 */
function mountHarness(initial: {
  sessionId: SessionId
  store: SessionsStoreLike
  injected: CompanyDataInjected
  stream: boolean
}) {
  const snapshots: CompanyData[] = []
  const state = { ...initial }
  const useSessions: UseSessions = (<T>(selector: (s: SessionsStoreLike) => T) => selector(state.store)) as unknown as UseSessions
  function Harness(): ReactElement {
    const data = useCompanyData(state.injected, state.sessionId, useProjection, useSessions, { stream: state.stream })
    snapshots.push(data)
    return createElement('div', null, (data.activity[0]?.text ?? '') + (data.streamError ?? ''))
  }
  const container = document.createElement('div')
  const root: Root = createRoot(container)
  const rerender = async (next: Partial<typeof state>) => {
    Object.assign(state, next)
    await act(async () => {
      root.render(createElement(Harness))
      // 宏任务边界：让 follow 通道的微任务链（generator 唤醒 → setState → 再挂起）在 act 内结算。
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  }
  const unmount = () => { act(() => { root.unmount() }) }
  const last = (): CompanyData => snapshots[snapshots.length - 1]!
  return { snapshots, rerender, unmount, last, state }
}

const injectedOf = (follow: CompanyDataInjected['follow']): CompanyDataInjected =>
  ({ leadOf: (id) => id, follow })

describe('useCompanyData 订阅生命周期', () => {
  it('stream:false 不订阅事件流（follow 零调用）；team 投影照折四个读模型', async () => {
    let followCalls = 0
    const follow = async function* (): AsyncGenerator<TeamStreamFrame> { followCalls++; yield* [] }
    const store: SessionsStoreLike = { projectionsBySession: { 's-1': { values: { agentTeam: teamView } } } }
    const h = mountHarness({ sessionId: 's-1', store, injected: injectedOf(follow as CompanyDataInjected['follow']), stream: false })
    await h.rerender({})
    expect(followCalls, '不订阅面板不得拉流').toBe(0)
    expect(h.last().streamError).toBeNull()
    expect(h.last().tasks[0]?.subject).toBe('出评审意见')
    expect(h.last().rows, 'rowsFromTeamView：成员一行、带在办任务').toEqual([
      expect.objectContaining({ id: 'm-1', displayName: '梦之队 VP-Eng', currentTask: '出评审意见' }),
    ])
    expect(h.last().summary.turns).toBe(3)
    h.unmount()
  })

  it('stream:true 历史帧立即播种动态；实时帧追加且最新在前', async () => {
    const ch = channel([
      { kind: 'history', events: [memberActive('m-1', 1), messageTo('m-1', '第一稿', 2)] },
    ])
    const store: SessionsStoreLike = { projectionsBySession: {} }
    const h = mountHarness({ sessionId: 's-1', store, injected: injectedOf(ch.follow), stream: true })
    await h.rerender({})
    expect(h.last().activity).toHaveLength(2)
    expect(h.last().activity[0]?.text, '最新在前（reverse）').toContain('第一稿')
    await act(async () => { ch.api.push({ kind: 'event', event: messageTo('m-1', '第二稿', 3) }); await new Promise(r => setTimeout(r, 0)) })
    expect(h.last().activity).toHaveLength(3)
    expect(h.last().activity[0]?.text).toContain('第二稿')
    h.unmount()
  })

  it('动态封顶 50 条（MAX_ACTIVITY），旧条目让位', async () => {
    const events = Array.from({ length: 55 }, (_, i) => memberActive(`m-${String(i)}`, i + 1))
    const ch = channel([{ kind: 'history', events }])
    const store: SessionsStoreLike = { projectionsBySession: {} }
    const h = mountHarness({ sessionId: 's-1', store, injected: injectedOf(ch.follow), stream: true })
    await h.rerender({})
    expect(h.last().activity).toHaveLength(50)
    expect(h.last().activity[0]?.text, '最新一条还在').toContain('m-54')
    h.unmount()
  })

  it('流错误 fail-loud 落 streamError，team 读模型不受牵连', async () => {
    const store: SessionsStoreLike = { projectionsBySession: { 's-1': { values: { agentTeam: teamView } } } }
    const h = mountHarness({ sessionId: 's-1', store, injected: injectedOf(failingFollow as CompanyDataInjected['follow']), stream: true })
    await h.rerender({})
    expect(h.last().streamError).toBe('boom')
    expect(h.last().tasks[0]?.subject, '任务板仍由投影维持').toBe('出评审意见')
    h.unmount()
  })

  it('换 Lead 会话重订旧流（旧 signal 中止、活动重置）；卸载也中止', async () => {
    const chA = channel([{ kind: 'history', events: [memberActive('m-1', 1)] }])
    const chB = channel([{ kind: 'history', events: [messageTo('m-2', '新会话历史', 2)] }])
    // 包装器必须**调用**底层 follow 返回生成器（返回函数本身会让 for-await 立刻 TypeError 被吞进 streamError）。
    const followOf = (id: SessionId, signal: AbortSignal) => (id === 's-2' ? chB.follow : chA.follow)(id, signal)
    const store: SessionsStoreLike = { projectionsBySession: {} }
    const h = mountHarness({ sessionId: 's-1', store, injected: injectedOf(followOf as CompanyDataInjected['follow']), stream: true })
    await h.rerender({})
    expect(h.last().activity[0]?.text).toContain('上线')
    await h.rerender({ sessionId: 's-2' })
    expect(chA.api.signal?.aborted, '旧流必须被中止').toBe(true)
    expect(chB.api.signal).toBeDefined()
    expect(h.last().activity[0]?.text, '活动随新会话重置为新历史').toContain('新会话历史')
    h.unmount()
    expect(chB.api.signal?.aborted, '卸载必须中止当前流').toBe(true)
  })

  it('名册迟到：投影到达后动态里裸 id 换成成员名（不重拉流）', async () => {
    const ch = channel([{ kind: 'history', events: [messageTo('m-9', '给谁的话', 1)] }])
    let store: SessionsStoreLike = { projectionsBySession: {} }
    const h = mountHarness({ sessionId: 's-1', store, injected: injectedOf(ch.follow), stream: true })
    await h.rerender({})
    expect(h.last().activity[0]?.text, '名册缺席时裸 id 原样').toContain('m-9')
    store = { projectionsBySession: { 's-1': { values: { agentTeam: { ...teamView, members: [...teamView.members, { id: 'm-9', name: 'vp-sales', role: 'teammate', phase: 'active' }] } } } } }
    await h.rerender({ store })
    expect(h.last().activity[0]?.text, '名册到达后换显示名').toContain('梦之队 VP-Sales')
    h.unmount()
  })
})
