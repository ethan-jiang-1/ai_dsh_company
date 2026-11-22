/**
 * 跨会话挂起审批重建的 keyless 判据（BUG-292 的 A 路线）。
 *
 * 为什么单独一条：这条路径的全部难点在「游标」——`session/page` 的 `throughSeq` 必须是有效游标，
 * 先用一个越过头部的请求探出来（成功取末条 seq / 失败读 `past cursor N`），再取一页。判据钉三件事：
 * 探游标两种形态都对、`asked`/`decided` 配对只留「问了没答」、单会话读失败只少那一份不整体失败。
 */
import { describe, expect, it } from 'vitest'
import type { SessionPageRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import {
  HISTORY_PAGE_MESSAGES,
  historyCandidates,
  readPendingAcrossSessions,
  readSessionEvents,
  type SessionPageFace,
} from '../../../packages/company-pack/src/client/presence/attention-history.ts'

const asked = (id: string) => ({ type: 'approval/asked', time: 100, data: { id, toolName: 'request_signoff', reason: '双签' } })
const decided = (id: string) => ({ type: 'approval/decided', time: 200, data: { id, outcome: 'rejected' } })

/** 造一个 page 面：probe 形态可控，正式页返回给定事件。 */
function face(options: {
  readonly probe?: { ok: true, cursor: number } | { ok: false, message: string }
  readonly events?: readonly unknown[]
  readonly failFull?: boolean
}): SessionPageFace {
  return (async (request: SessionPageRequest) => {
    if (request.maxMessages === 1) {
      if (options.probe?.ok === false) return { ok: false, error: { message: options.probe.message } }
      const cursor = options.probe?.ok === true ? options.probe.cursor : 0
      return { ok: true, value: { records: [{ type: 'event', event: { type: 'turn/start', seq: cursor, time: 1, data: {} } }], hasMore: false } }
    }
    if (options.failFull === true) return { ok: false, error: { message: 'boom' } }
    const events = options.events ?? []
    return { ok: true, value: { records: events.map((event, index) => ({ type: 'event', event: { ...(event as object), seq: index + 1 } })), hasMore: false } }
  }) as unknown as SessionPageFace
}

// 负例留证 2026-11-21：把探游标那一步改成固定失败后 `vitest run tests/client/presence/attention-history.spec.ts` 4 failed / 1 passed（重建不出任何挂起项）；还原后 5/5 绿。BUG-292
describe('跨会话挂起审批重建（BUG-292）', () => {
  it('探游标：成功时取末条 seq，据此取一页', async () => {
    const calls: number[] = []
    const base = face({ probe: { ok: true, cursor: 7 }, events: [asked('a1')] })
    const events = await readSessionEvents(async (request, signal) => { calls.push(request.throughSeq); return base(request, signal) }, 'session-b')
    expect(calls).toEqual([Number.MAX_SAFE_INTEGER, 7])
    expect(events?.events.map(event => event.type)).toContain('approval/asked')
  })

  it('探游标：vendor 报 past cursor N 时用 N', async () => {
    const calls: number[] = []
    const base = face({ probe: { ok: false, message: 'session page through seq 9007199254740991 is past cursor 42' }, events: [] })
    await readSessionEvents(async (request, signal) => { calls.push(request.throughSeq); return base(request, signal) }, 'session-b')
    expect(calls).toEqual([Number.MAX_SAFE_INTEGER, 42])
  })

  it('别的会话里 asked 未 decided ⇒ 重建出一条挂起项，jumpTo 指那条会话', async () => {
    const rebuilt = await readPendingAcrossSessions(face({ events: [asked('a1')] }), ['session-b'])
    expect(rebuilt.items).toHaveLength(1)
    expect(rebuilt.items[0]?.jumpTo).toBe('session-b')
    expect(rebuilt.items[0]?.kind).toBe('approval')
    expect(rebuilt.failed).toBe(0)
  })

  it('asked + decided 同一 id ⇒ 不出现（只留问了没答）', async () => {
    const rebuilt = await readPendingAcrossSessions(face({ events: [asked('a1'), decided('a1')] }), ['session-b'])
    expect(rebuilt.items).toHaveLength(0)
  })

  it('单条会话读失败只少那一份，不影响其它会话', async () => {
    const ok = face({ events: [asked('a1')] })
    const bad = face({ failFull: true })
    const rebuilt = await readPendingAcrossSessions(async (request, signal) => ((request.address as { sessionId?: string }).sessionId === 'session-ok' ? ok(request, signal) : bad(request, signal)), ['session-bad', 'session-ok'])
    expect(rebuilt.items).toHaveLength(1)
    expect(rebuilt.failed).toBe(1)
    expect(rebuilt.items[0]?.jumpTo).toBe('session-ok')
  })
})

// 边界必须可见：`[]` 分不清「没有挂起」与「读不到 / 窗口外」。
// 结果态把三件事一起带回来：扫到几个、失败几个、有没有会话被窗口截断。
// 负例留证 2026-11-22：把 window 强制为 'none' 后 `vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` 2 failed（窗口提示与全失败错误行）；还原后 18/18 绿。BUG-304/305
describe('跨会话重建的边界（BUG-304）', () => {
  it('窗口拿满一页 ⇒ window=some（更早的事件没看）', async () => {
    const events = Array.from({ length: HISTORY_PAGE_MESSAGES }, (_, i) => ({ type: 'turn/start', time: i, data: { i } }))
    const rebuilt = await readPendingAcrossSessions(face({ events }), ['session-b'])
    expect(rebuilt.window).toBe('some')
  })

  it('没拿满 ⇒ window=none（读完了）', async () => {
    const rebuilt = await readPendingAcrossSessions(face({ events: [asked('a1')] }), ['session-b'])
    expect(rebuilt.window).toBe('none')
  })

  it('全部读失败 ⇒ failed=N、items 空（面板据此说「读不到」而不是「没有」）', async () => {
    const bad = face({ failFull: true })
    const rebuilt = await readPendingAcrossSessions(bad, ['s1', 's2'])
    expect(rebuilt.items).toHaveLength(0)
    expect(rebuilt.failed).toBe(2)
    expect(rebuilt.scanned).toBe(0)
  })
})

// fail-closed（BUG-323）：当前会话 cwd 未解析时**一个都不扫**——过去把「未知」当「都匹配」，
// 别的 workspace 的挂起审批会出现在本工作区的待办里（越界）。同时带回候选边界（BUG-318）。
// 负例留证 2026-11-22：把过滤改回 fail-open（cwd 未知 ⇒ 都匹配）后 `vitest run tests/client/presence/attention-history.spec.ts tests/client/tabs/attention-tab.spec.ts` 3 failed（越界）。BUG-323
describe('historyCandidates：fail-closed 与候选边界（BUG-323/318）', () => {
  const sessions = {
    current: { id: 'current', cwd: '/ws/a', updatedAt: 9 },
    same1: { id: 'same1', cwd: '/ws/a', updatedAt: 5 },
    same2: { id: 'same2', cwd: '/ws/a', updatedAt: 4 },
    other: { id: 'other', cwd: '/ws/b', updatedAt: 8 },
    child: { id: 'child', cwd: '/ws/a', origin: 'subagent', updatedAt: 7 },
  }

  it('cwd 已解析 ⇒ 只取同工作区、排除自己与 subagent', () => {
    const picked = historyCandidates(sessions, 'current', 20)
    expect(picked.ok).toBe(true)
    if (picked.ok) expect(picked.ids.sort()).toEqual(['same1', 'same2'])
  })

  it('当前会话 cwd 缺失 ⇒ 不扫（不是「都匹配」）', () => {
    const unknown = historyCandidates({ current: { id: 'current' }, same1: sessions.same1, other: sessions.other }, 'current', 20)
    expect(unknown).toEqual({ ok: false, reason: 'workspace-unknown' })
  })

  it('当前会话根本不在清单里 ⇒ 同样不扫', () => {
    expect(historyCandidates({ same1: sessions.same1 }, 'current', 20).ok).toBe(false)
  })

  it('候选超上限 ⇒ 带 total/capped（面板说「还有 N 个会话没扫」）', () => {
    const many = { current: sessions.current, ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`s${String(i)}`, { id: `s${String(i)}`, cwd: '/ws/a', updatedAt: i }])) }
    const picked = historyCandidates(many, 'current', 2)
    expect(picked.ok).toBe(true)
    if (picked.ok) {
      expect(picked.ids).toHaveLength(2)
      expect(picked.total).toBe(5)
      expect(picked.capped).toBe(3)
    }
  })
})

// 补齐候选函数的分支（coverage ratchet 只升不降）：updatedAt 缺失、origin 显式 undefined。
describe('historyCandidates：形状边角', () => {
  it('updatedAt 缺失按 0 排；非 subagent 的 origin 都算 root', () => {
    const picked = historyCandidates({
      current: { id: 'current', cwd: '/ws' },
      a: { id: 'a', cwd: '/ws' },
      b: { id: 'b', cwd: '/ws', updatedAt: 5, origin: 'root' },
      child: { id: 'child', cwd: '/ws', origin: 'subagent' },
    }, 'current', 10)
    expect(picked.ok).toBe(true)
    if (picked.ok) expect(picked.ids).toEqual(['b', 'a'])
  })
})

describe('historyCandidates：cwd 为空串也当「未解析」', () => {
  it('cwd: "" ⇒ 不扫（与 undefined 同待遇）', () => {
    expect(historyCandidates({ current: { id: 'current', cwd: '' }, other: { id: 'other', cwd: '/ws' } }, 'current', 20).ok).toBe(false)
  })
})

describe('historyCandidates：排序两侧都可能缺 updatedAt', () => {
  it('a 与 b 都缺 updatedAt ⇒ 按 0 比较，不抛', () => {
    const picked = historyCandidates({
      current: { id: 'current', cwd: '/ws' },
      x: { id: 'x', cwd: '/ws' },
      y: { id: 'y', cwd: '/ws' },
    }, 'current', 10)
    expect(picked.ok && picked.ids.length).toBe(2)
  })
})

describe('cursorFromError：错误对象没有 message 时按「探不到游标」处理', () => {
  it('page 失败且无 message ⇒ undefined（读不到这条会话，不猜游标）', async () => {
    const events = await readSessionEvents(async () => ({ ok: false as const, error: {} }), 'session-x')
    expect(events).toBeUndefined()
  })
})
