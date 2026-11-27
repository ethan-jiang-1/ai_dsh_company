// @vitest-environment happy-dom
// 负例留证 2026-11-27：若 registerWaveS1Ux 仍只打包活体 attention.snapshot() 而不接入 createMergedAttentionObservable 跨会话历史重建 ⇒ 刷新页面且 attentionRegistry 为空时待办角标计数=0，本 spec 红；接入后绿。BUG-404
/** `attention-source` 单测：合并活体 + 跨会话历史重建待办源（BUG-404）。 */
import { describe, expect, it, vi } from 'vitest'
import type { SessionPage } from '@deepseek-ai/dsh-api-session-controller/types'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import {
  createMergedAttentionObservable,
  createSwitchableAttentionObservable,
  type SessionsSnapshotLike,
} from '../../../packages/company-pack/src/client/wiring/attention-source.ts'
import type { SessionPageFace } from '../../../packages/company-pack/src/client/presence/attention-history.ts'

function createStubSessionsList(initial: SessionsSnapshotLike) {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    setSnapshot(next: SessionsSnapshotLike) {
      snapshot = next
      for (const fn of Array.from(listeners)) fn()
    },
  }
}

const okPage = (records: Array<{ event: Record<string, unknown> }>): { ok: true; value: SessionPage } => ({
  ok: true,
  value: { records, hasMore: false } as unknown as SessionPage,
})

describe('createMergedAttentionObservable（BUG-404）', () => {
  it('合并同工作区兄弟会话的未决 approval/asked，并过滤 completion 与重复 live 项', async () => {
    const attention = createAttentionRegistry()
    const sessionsList = createStubSessionsList({
      byId: {
        ceo: { id: 'ceo', cwd: '/ws/company', updatedAt: 20, retainedBy: { mainView: 1 } },
        cfo: { id: 'cfo', cwd: '/ws/company', updatedAt: 10 },
        otherWs: { id: 'otherWs', cwd: '/ws/other', updatedAt: 30 },
      },
    })

    const pageHistory: SessionPageFace = vi.fn(async (req) => {
      const sid = (req.address as { sessionId: string }).sessionId
      if (req.throughSeq === Number.MAX_SAFE_INTEGER) {
        return okPage([{ event: { seq: 5, time: 100 } }])
      }
      if (sid === 'cfo') {
        return okPage([
          { event: { seq: 1, type: 'approval/asked', time: 100, data: { id: 'apr-hist-1', toolName: 'request_signoff', reason: '红线测试待办' } } },
        ])
      }
      if (sid === 'ceo') {
        return okPage([
          { event: { seq: 2, type: 'tool/call', time: 90, data: { name: 'present', arguments: { label: 'done' } } } },
        ])
      }
      return okPage([])
    })

    const handle = createMergedAttentionObservable({
      attention,
      sessionsList,
      pageHistory,
      refreshMs: 0,
    })

    const updates: number[] = []
    const off = handle.observable.subscribe(() => {
      updates.push(handle.observable.getSnapshot().length)
    })

    await new Promise(resolve => setTimeout(resolve, 20))
    const initial = handle.observable.getSnapshot()
    expect(initial).toHaveLength(1)
    expect(initial[0]).toMatchObject({ kind: 'approval', id: 'apr-hist-1', jumpTo: 'cfo' })
    expect(handle.boundary()).toMatchObject({
      candidatesCapped: 0,
      candidatesTotal: 1,
      asksCapped: 0,
      failed: 0,
      window: 'none',
    })

    // Live item with same jumpTo+id deduplicates cleanly; second live item increments count
    const releaseDup = attention.begin({
      kind: 'approval',
      sessionId: 'cfo',
      id: 'apr-hist-1',
      what: '红线测试待办',
      since: 101,
    })
    expect(handle.observable.getSnapshot()).toHaveLength(1)

    const releaseLive = attention.begin({
      kind: 'question',
      sessionId: 'ceo',
      id: 'q-live-2',
      what: 'Confirm release?',
      since: 102,
    })
    expect(handle.observable.getSnapshot()).toHaveLength(2)

    releaseLive()
    releaseDup()
    expect(handle.observable.getSnapshot()).toHaveLength(1)

    // refresh & dispose cleanup
    handle.refresh()
    sessionsList.setSnapshot({ byId: {} })
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(handle.observable.getSnapshot()).toHaveLength(0)

    off()
    handle.dispose()
    handle.dispose()
    expect(updates.length).toBeGreaterThan(0)
  })

  it('pageHistory 缺席或抛错时降级保留活体快照且不抛错', async () => {
    const attention = createAttentionRegistry()
    const sessionsList = createStubSessionsList({
      byId: { ceo: { id: 'ceo', cwd: '/ws/company', updatedAt: 10 } },
    })
    const failingPage: SessionPageFace = async () => { throw new Error('network down') }
    const handle = createMergedAttentionObservable({
      attention,
      sessionsList,
      pageHistory: failingPage,
      refreshMs: 0,
    })
    attention.begin({ kind: 'question', sessionId: 'ceo', id: 'q-1', what: 'hi', since: 1 })
    await new Promise(resolve => setTimeout(resolve, 15))
    expect(handle.observable.getSnapshot()).toHaveLength(1)
    handle.dispose()
  })
})

describe('createSwitchableAttentionObservable', () => {
  it('在底层 source 切换与解除绑定时同步转发订阅通知与快照', () => {
    const fallbackReg = createAttentionRegistry()
    const mergedReg = createAttentionRegistry()
    const switchable = createSwitchableAttentionObservable({
      getSnapshot: () => fallbackReg.snapshot(),
      subscribe: fn => fallbackReg.subscribe(fn),
    })

    const observed: number[] = []
    const off = switchable.subscribe(() => { observed.push(switchable.getSnapshot().length) })
    expect(switchable.getSnapshot()).toHaveLength(0)

    fallbackReg.begin({ kind: 'question', sessionId: 's1', id: 'q1', what: 'q1', since: 1 })
    expect(switchable.getSnapshot()).toHaveLength(1)

    mergedReg.begin({ kind: 'approval', sessionId: 's1', id: 'a1', what: 'a1', since: 2 })
    mergedReg.begin({ kind: 'approval', sessionId: 's1', id: 'a2', what: 'a2', since: 3 })
    const detach = switchable.attach({
      getSnapshot: () => mergedReg.snapshot(),
      subscribe: fn => mergedReg.subscribe(fn),
    })
    expect(switchable.getSnapshot()).toHaveLength(2)

    detach()
    expect(switchable.getSnapshot()).toHaveLength(1)
    off()
    expect(observed).toEqual([1, 2, 1])
  })
})
