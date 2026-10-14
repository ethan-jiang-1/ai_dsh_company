/** Client adapters for the shared Company Session identity and follow stream. */
import type { ISessions, SessionRemote } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionFollowFrame } from '@deepseek-ai/dsh-api-session-controller/types'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TeamStreamFrame } from '../lib/presence.ts'

/** Minimum session lookup consumed by the company session adapters. */
type CompanySessions = Pick<ISessions, 'subagentAddress'>

/** Minimum follow namespace consumed by the company session adapters. */
type CompanySessionRemote = Pick<SessionRemote, 'follow'>

/** Map a durable session follow frame to the history/event frames Company views consume. */
async function* companyFrames(frames: AsyncIterable<SessionFollowFrame>): AsyncIterable<TeamStreamFrame> {
  for await (const frame of frames) {
    if (frame.type === 'snapshot') {
      yield { kind: 'history', events: frame.records.map(record => record.event) }
    } else if (frame.type === 'event') {
      yield { kind: 'event', event: frame.event }
    }
  }
}

/**
 * Create the Lead lookup and shared follow adapter used by both Client registration groups.
 * @param sessions - Client session catalog used to resolve direct child addresses.
 * @returns a lookup that maps direct child sessions to their parent and leaves other sessions unchanged.
 */
export function createLeadLookup(sessions: CompanySessions): (sessionId: SessionId) => SessionId {
  return (sessionId) => {
    const address = sessions.subagentAddress(sessionId)
    return address?.parentSessionId ?? sessionId
  }
}

/**
 * Create the shared follow adapter used by Company tab renderers.
 * @param sessions - Client session catalog used to resolve direct child addresses.
 * @param remote - Session Remote used to follow the Lead's durable event stream.
 * @returns stable Lead resolution and one projected follow implementation.
 */
export function createCompanySessionAdapters(sessions: CompanySessions, remote: CompanySessionRemote): {
  readonly leadOf: (sessionId: SessionId) => SessionId
  readonly follow: (sessionId: SessionId, signal: AbortSignal) => AsyncIterable<TeamStreamFrame>
} {
  const leadOf = createLeadLookup(sessions)
  const follow = async function* (sessionId: SessionId, signal: AbortSignal): AsyncIterable<TeamStreamFrame> {
    const address = { kind: 'session' as const, sessionId: leadOf(sessionId) }
    yield* companyFrames(remote.follow({ address }, signal))
  }
  return { leadOf, follow }
}
