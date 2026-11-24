/**
 * 培养背景客户端数据面的 keyless 判据（D1=A / D2=A）：
 * 候选会话的角色标签（根 = agentPreset，成员 = parent 的 agentTeam，不 follow Lead）、
 * 成品目录复用、预览读只取第一帧即 return（不拉第二帧 = 不触发 cold promote）。
 */
import type { WorkspaceTextRead } from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'
import { describe, expect, it } from 'vitest'
import {
  contextSessionLabel,
  makeCultivationContextSources,
  projectContextDeliverables,
  projectContextSessions,
  readSessionPreview,
  type ContextSessionRowLike,
  type FollowLike,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts'

const row = (over: Partial<ContextSessionRowLike>): ContextSessionRowLike => ({
  sessionId: 'session-1',
  displayTitle: '收口检查',
  cwd: '/company',
  running: false,
  blank: false,
  updatedAt: 1,
  projectionValues: { agentPreset: 'ceo' },
  ...over,
})

const teamParent = row({
  sessionId: 'lead-1',
  displayTitle: '团队会议',
  updatedAt: 5,
  projectionValues: {
    agentPreset: 'ceo',
    agentTeam: { members: [{ id: 'child-cfo', name: 'cfo' }] },
    subagentCatalog: [{ id: 'child-cfo', mode: 'continuable' }],
  },
})

describe('会话候选投影', () => {
  const rows = [
    row({ sessionId: 'current', displayTitle: '当前', updatedAt: 10 }),
    row({ sessionId: 'root-cfo', displayTitle: '预算复核', projectionValues: { agentPreset: 'cfo' }, updatedAt: 4 }),
    teamParent,
    row({ sessionId: 'child-cfo', displayTitle: '成员会话', origin: 'subagent', parentId: 'lead-1', updatedAt: 3, projectionValues: { agentPreset: 'ceo' } }),
    row({ sessionId: 'blank', displayTitle: '空白', blank: true, updatedAt: 9 }),
    row({ sessionId: 'other-cwd', displayTitle: '别的公司', cwd: '/other', updatedAt: 8 }),
    row({ sessionId: 'no-preset', displayTitle: '标准', projectionValues: {}, updatedAt: 2 }),
  ]

  it('当前会话第一行；空白/跨 cwd 过滤；根按 preset、成员按 parent 的 agentTeam 标角色', () => {
    const { items: projected } = projectContextSessions(rows, 'current')
    expect(projected[0]?.sessionId).toBe('current')
    expect(projected.map(item => item.sessionId)).not.toContain('blank')
    expect(projected.map(item => item.sessionId)).not.toContain('other-cwd')
    const child = projected.find(item => item.sessionId === 'child-cfo')
    expect(child?.role).toBe('cfo')
    expect(child?.member).toBe(true)
    expect(child?.ref).toMatchObject({ parentSessionId: 'lead-1', mode: 'continuable' })
    expect(contextSessionLabel(child!)).toBe('成员 cfo（CEO 团队）')
    const root = projected.find(item => item.sessionId === 'root-cfo')
    expect(root?.role).toBe('cfo')
    expect(root?.member).toBe(false)
    expect(contextSessionLabel(root!, role => role === 'cfo' ? 'CFO · 首席财务官' : role)).toBe('CFO · 首席财务官')
    expect(projected.find(item => item.sessionId === 'no-preset')?.role).toBeUndefined()
  })

  it('targetRole 匹配的根会话排在其它根之前；最多 8 行并上报 capped', () => {
    const { items: projected } = projectContextSessions(rows, 'current', 'cfo')
    const order = projected.map(item => item.sessionId)
    expect(order.indexOf('root-cfo')).toBeLessThan(order.indexOf('lead-1'))
    const many = Array.from({ length: 20 }, (_, index) => row({ sessionId: `s-${String(index)}`, updatedAt: index }))
    const bounded = projectContextSessions(many, 's-19')
    expect(bounded.items).toHaveLength(8)
    expect(bounded.capped).toBe(12)
  })
})

describe('成品候选投影', () => {
  const catalog = JSON.stringify({
    schema: 1,
    generatedAt: '2026-10-23',
    entries: [
      { slug: 'old', path: 'deliverables/old/final.md', kickoff: '2026-10-01', result: 'accepted', summary: '旧' },
      { slug: 'new', path: 'deliverables/new/final.md', kickoff: '2026-10-22', result: 'completed', summary: '新' },
    ],
  })

  it('按 kickoff 倒序并上报 capped；读不到/形状坏给可读错误', () => {
    const result = projectContextDeliverables(catalog)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.map(item => item.slug)).toEqual(['new', 'old'])
      expect(result.capped).toBe(0)
    }
    const manyEntries = Array.from({ length: 12 }, (_, index) => ({
      slug: `d-${String(index)}`,
      path: `deliverables/d-${String(index)}/final.md`,
      kickoff: `2026-10-${String(index + 10)}`,
    }))
    const bounded = projectContextDeliverables(JSON.stringify({ schema: 1, generatedAt: 'x', entries: manyEntries }))
    expect(bounded.ok).toBe(true)
    if (bounded.ok) {
      expect(bounded.value).toHaveLength(8)
      expect(bounded.capped).toBe(4)
    }
    expect(projectContextDeliverables(null).ok).toBe(false)
    expect(projectContextDeliverables('{bad').ok).toBe(false)
  })
})

describe('预览读：只取第一帧即 return', () => {
  const events = [
    { type: 'turn/start', data: { turn: 1 }, time: '2026-10-23T14:02:00.000Z' },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '用户：收口前把未决项列一下' }] }, time: '2026-10-23T14:02:00.000Z' },
    { type: 'assistant/message', data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: '分身：已收口' }] } }, time: '2026-10-23T14:02:00.000Z' },
  ]

  it('取到轮次文字；第二帧不被消费（break）', async () => {
    let consumedSecond = false
    const follow: FollowLike = async function* (request) {
      expect(request.maxMessages).toBe(40)
      yield { type: 'snapshot', records: events.map(event => ({ event })) }
      consumedSecond = true
      yield { type: 'event' }
    }
    const result = await readSessionPreview(follow, { ref: 'session-1' }, new AbortController().signal)
    expect(result.ok).toBe(true)
    expect(result.turn?.text).toContain('用户：收口前把未决项列一下')
    expect(consumedSecond).toBe(false)
  })

  it('子会话地址带 parent/mode；无文字给可读原因', async () => {
    let address: unknown
    const follow: FollowLike = async function* (request) {
      address = request.address
      yield { type: 'snapshot', records: [] }
    }
    const result = await readSessionPreview(follow, { ref: 'child-1', parentSessionId: 'parent-1', mode: 'continuable' }, new AbortController().signal)
    expect(address).toEqual({ kind: 'subagent', parentSessionId: 'parent-1', childSessionId: 'child-1', mode: 'continuable' })
    expect(result.ok).toBe(false)
    expect(result.problem).toContain('没有可用的文字背景')
  })

  it('首帧超时 → timeout 标记，不无限等', async () => {
    const follow: FollowLike = async function* (_request, signal) {
      await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => { reject(new Error('aborted')) })
      })
      yield { type: 'snapshot', records: [] }
    }
    const result = await readSessionPreview(follow, { ref: 'session-1' }, new AbortController().signal, 10)
    expect(result.ok).toBe(false)
    expect(result.timeout).toBe(true)
  })
})

describe('makeCultivationContextSources', () => {
  it('三面接线：列表 / 成品 / 预览', async () => {
    const follow: FollowLike = async function* () { yield { type: 'snapshot', records: [] } }
    const sources = makeCultivationContextSources({
      getSessions: () => [row({ sessionId: 'current' })],
      follow,
      readCatalog: async () => ({ ok: true, eof: true, text: JSON.stringify({ schema: 1, generatedAt: '', entries: [{ slug: 'x', path: 'deliverables/x/final.md', kickoff: '2026-10-01', result: 'completed', summary: 's' }] }) }),
    })
    const sessions = sources.listSessions('current')
    expect(sessions.ok).toBe(true)
    const deliverables = await sources.listDeliverables('current', new AbortController().signal)
    expect(deliverables.ok).toBe(true)
    if (sessions.ok) {
      expect(sessions.capped).toBeUndefined()
      const preview = await sources.readPreview(sessions.value[0]!, new AbortController().signal)
      expect(preview.ok).toBe(false)
    }
    const cappedSources = makeCultivationContextSources({
      getSessions: () => Array.from({ length: 10 }, (_, idx) => row({ sessionId: `s-${String(idx)}`, updatedAt: idx })),
      follow,
      readCatalog: async () => ({ ok: false, reason: 'missing' }),
    })
    const cappedList = cappedSources.listSessions('s-9')
    expect(cappedList.ok && cappedList.capped).toBe(2)
  })
})

// 截断的索引 = 读到了前半段：不能拿半个 JSON 当清单，也不能报「读不到」——
// 明确说「超出读取上限」，与「读失败」分开。
describe('makeCultivationContextSources：索引截断', () => {
  const follow: FollowLike = async function* () { yield { type: 'snapshot', records: [] } }
  const sources = (read: (sessionId: string, signal: AbortSignal) => Promise<WorkspaceTextRead>) => makeCultivationContextSources({
    getSessions: () => [row({ sessionId: 'current' })],
    follow,
    readCatalog: read,
  })

  it('读失败 ⇒ 点名原因', async () => {
    const s = sources(async () => ({ ok: false, reason: 'boom' }))
    const result = await s.listDeliverables('current', new AbortController().signal)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problem).toContain('boom')
  })

  it('读到了但没读完 ⇒ 报「超出读取上限」，不解析半个文件', async () => {
    const s = sources(async () => ({ ok: true, eof: false, text: '{"schema":1,"entries":[' }))
    const result = await s.listDeliverables('current', new AbortController().signal)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problem).toContain('上限')
  })
})

// 负例留证 2026-11-24：把过滤式改回「cwd 未知即放行」⇒ 本组红（跨 workspace/无 cwd 候选混入）。BUG-366
describe('projectContextSessions 作用域 fail-closed（BUG-366）', () => {
  const withoutCwd = (r: ContextSessionRowLike): ContextSessionRowLike => {
    const { cwd: _cwd, ...rest } = r
    return rest
  }

  it('当前会话 cwd 未知 ⇒ 零候选 + 可读原因', () => {
    const result = projectContextSessions([withoutCwd(row({ sessionId: 'current' })), row({ sessionId: 'other', cwd: '/ws-b' })], 'current')
    expect(result.items).toEqual([])
    expect(result.problem).toBeTruthy()
  })

  it('候选行 cwd 缺失 ⇒ 排除；子会话经 parent 继承 cwd 才进候选', () => {
    const parent = row({ sessionId: 'current', cwd: '/company' })
    const orphan = withoutCwd(row({ sessionId: 'orphan' }))
    const child = { ...withoutCwd(row({ sessionId: 'child' })), origin: 'subagent' as const, parentId: 'current' }
    const otherChild = { ...withoutCwd(row({ sessionId: 'other-child' })), origin: 'subagent' as const, parentId: 'missing-parent' }
    const ids = projectContextSessions([parent, orphan, child, otherChild], 'current').items.map(item => item.sessionId)
    expect(ids).toEqual(['current', 'child'])
  })

  it('尾斜杠/分隔符差异不算跨工作区', () => {
    const ids = projectContextSessions([
      row({ sessionId: 'current', cwd: '/company/' }),
      row({ sessionId: 'same', cwd: '/company' }),
    ], 'current').items.map(item => item.sessionId)
    expect(ids).toEqual(['current', 'same'])
  })
})
