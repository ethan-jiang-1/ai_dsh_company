import type { SessionRemote } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionFollowFrame } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { describe, expect, it } from 'vitest'
import { createCompanySessionAdapters } from '../../packages/company-pack/src/client/company-session-adapters.ts'

const sessionId = (value: string): SessionId => value as SessionId

const lead = sessionId('lead-session')
const child = sessionId('child-session')
const event = {
  type: 'team/task',
  seq: 7,
  time: 1_800_000_000_000,
  data: {
    teamId: 'team-1',
    task: { id: 'task-1', revision: 1, subject: '核对续费', status: 'in_progress', ownerId: 'member-1' },
  },
} as const

function sessionFrame(frame: SessionFollowFrame): SessionFollowFrame {
  return frame
}

function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  return (async () => {
    const values: T[] = []
    for await (const value of source) values.push(value)
    return values
  })()
}

describe('company session adapters', () => {
  it('routes child streams to the Lead and maps only durable history/events', async () => {
    const lookups: SessionId[] = []
    const requests: Array<{ readonly address: { readonly kind: 'session'; readonly sessionId: SessionId }; readonly signal: AbortSignal }> = []
    const frames = [
      sessionFrame({
        type: 'snapshot',
        header: { version: 1, id: lead, createdAt: 0, isSeeded: false },
        cursor: 7,
        records: [{ type: 'event', event }],
        hasMore: false,
        projections: { asOfSeq: 7, values: {} },
      }),
      sessionFrame({ type: 'event', event: { ...event, seq: 8, time: event.time + 1 } }),
      sessionFrame({
        type: 'assistant-stream',
        frame: { type: 'start', attemptId: 'attempt-1', revision: 1, startedAfterSeq: 8, turn: 1, step: 1 },
      }),
    ]
    const remote: Pick<SessionRemote, 'follow'> = {
      follow(request, signal) {
        requests.push({ address: request.address, signal: signal! })
        return (async function* () { yield* frames })()
      },
    }
    const sessions = {
      subagentAddress(id: SessionId) {
        lookups.push(id)
        return id === child
          ? { parentSessionId: lead, childSessionId: child, mode: 'continuable' as const }
          : undefined
      },
    }
    const adapters = createCompanySessionAdapters(sessions, remote)
    const signal = new AbortController().signal

    expect(adapters.leadOf(child)).toBe(lead)
    expect(adapters.leadOf(lead)).toBe(lead)
    expect(lookups).toEqual([child, lead])
    lookups.length = 0

    const stream = adapters.follow(child, signal)
    expect(lookups, 'lead resolution remains lazy until the stream is consumed').toEqual([])
    expect(requests, 'remote follow opens only when the stream is consumed').toEqual([])
    await expect(collect(stream)).resolves.toEqual([
      { kind: 'history', events: [event] },
      { kind: 'event', event: { ...event, seq: 8, time: event.time + 1 } },
    ])
    expect(lookups).toEqual([child])
    expect(requests).toEqual([{ address: { kind: 'session', sessionId: lead }, signal }])
  })
})
