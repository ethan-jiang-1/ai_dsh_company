/**
 * 培养背景客户端数据面的 keyless 判据（D1=A / D2=A）：
 * 候选会话的角色标签（根 = agentPreset，成员 = parent 的 agentTeam，不 follow Lead）、
 * 成品目录复用、预览读只取第一帧即 return（不拉第二帧 = 不触发 cold promote）。
 */
import { describe, expect, it } from 'vitest'
import {
  contextSessionLabel,
  makeCultivationContextSources,
  projectContextDeliverables,
  projectContextSessions,
  readSessionPreview,
  type ContextSessionRowLike,
  type FollowLike,
} from '../../packages/company-pack/src/client/cultivation-context-data.ts'

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
    const projected = projectContextSessions(rows, 'current')
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
    expect(projected.find(item => item.sessionId === 'no-preset')?.role).toBeUndefined()
  })

  it('targetRole 匹配的根会话排在其它根之前；最多 8 行', () => {
    const projected = projectContextSessions(rows, 'current', 'cfo')
    const order = projected.map(item => item.sessionId)
    expect(order.indexOf('root-cfo')).toBeLessThan(order.indexOf('lead-1'))
    const many = Array.from({ length: 20 }, (_, index) => row({ sessionId: `s-${String(index)}`, updatedAt: index }))
    expect(projectContextSessions(many, 's-19')).toHaveLength(8)
  })
})

describe('成品候选投影', () => {
  const catalog = JSON.stringify({
    schema: 1,
    generatedAt: '2026-10-23',
    entries: [
      { slug: 'old', path: 'deliverables/old/final.md', kickoff: '2026-10-01', result: '已采纳', summary: '旧' },
      { slug: 'new', path: 'deliverables/new/final.md', kickoff: '2026-10-22', result: '已完成', summary: '新' },
    ],
  })

  it('按 kickoff 倒序；读不到/形状坏给可读错误', () => {
    const result = projectContextDeliverables(catalog)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.map(item => item.slug)).toEqual(['new', 'old'])
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
      readCatalog: async () => JSON.stringify({ schema: 1, generatedAt: '', entries: [{ slug: 'x', path: 'deliverables/x/final.md', kickoff: '2026-10-01', result: '已完成', summary: 's' }] }),
    })
    const sessions = sources.listSessions('current')
    expect(sessions.ok).toBe(true)
    const deliverables = await sources.listDeliverables('current', new AbortController().signal)
    expect(deliverables.ok).toBe(true)
    if (sessions.ok) {
      const preview = await sources.readPreview(sessions.value[0]!, new AbortController().signal)
      expect(preview.ok).toBe(false)
    }
  })
})
