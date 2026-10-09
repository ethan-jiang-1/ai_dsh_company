import { describe, expect, it } from 'vitest'
import { teamBarrierEvidence } from '../../tools/lib/team-barrier-evidence.mjs'
const target = '/fixture/journal/team-concurrency-probe.md'
const call = (callId: string, name: string, args: object) => ({ type: 'tool/call', data: { callId, name, arguments: JSON.stringify(args) } })
const result = (callId: string, code?: string, rows?: string[]) => ({ type: 'tool/result', data: {
  message: { toolCallId: callId, isError: Boolean(code), content: [] },
  ...(code ? { error: { code } } : {}),
  ...(rows ? { meta: { offset: 1, totalLines: rows.length, lines: rows.map((text, i) => ({ number: i + 1, text })) } } : {}),
} })
const start = { type: 'turn/start', data: {} }
const end = { type: 'turn/end', data: { reason: { kind: 'completed' } } }
function good() {
  const w1 = [start, call('r1', 'read', { file_path: target }), result('r1', undefined, []),
    call('w1', 'write', { file_path: target, content: 'w1 was here\n' }), result('w1'), end]
  const w2 = [start, call('r2', 'read', { file_path: target }), result('r2', undefined, []),
    call('w2', 'write', { file_path: target, content: 'w2 was here\n' }), result('w2', 'FS_STALE_VERSION'),
    call('r3', 'read', { file_path: target }), result('r3', undefined, ['w1 was here']),
    call('w3', 'write', { file_path: target, content: 'w1 was here\nw2 was here\n' }), result('w3'), end]
  const arrivals = { w1: { sessionId: 'id1', callId: 'r1', path: target }, w2: { sessionId: 'id2', callId: 'r2', path: target } }
  return { leadEvents: [], memberEvents: { w1, w2 }, memberIds: { w1: 'id1', w2: 'id2' }, target, arrivals,
    released: { w1: arrivals.w1, w2: arrivals.w2 }, file: 'w1 was here\nw2 was here\n' }
}
describe('two-member read-barrier publication evidence', () => {
  it('accepts linked baseline reads, each member publication and stale recovery in one turn', () => {
    expect(Object.values(teamBarrierEvidence(good())).every(Boolean)).toBe(true)
  })
  it('rejects mismatched released identity, failed read and read in a prior turn', () => {
    const input = good()
    expect(teamBarrierEvidence({ ...input, released: { ...input.released, w2: { ...input.released.w2, callId: 'other' } } }).barrierReads).toBe(false)
    const failed = good(); failed.memberEvents.w2[2] = result('r2', 'ABORTED')
    expect(teamBarrierEvidence(failed).barrierReads).toBe(false)
    const prior = good(); prior.memberEvents.w2.splice(3, 0, end, start)
    expect(teamBarrierEvidence(prior).barrierReads).toBe(false)
  })
  it('rejects an intervening reread, recovery in another turn, wrong target and absent winner result', () => {
    const reread = good(); reread.memberEvents.w2.splice(3, 0, call('extra', 'read', { file_path: target }), result('extra', undefined, []))
    expect(teamBarrierEvidence(reread).barrierReads).toBe(false)
    const resumed = good(); resumed.memberEvents.w2.splice(5, 0, end, start)
    expect(teamBarrierEvidence(resumed).recovery).toBe(false)
    const resumedMerge = good(); resumedMerge.memberEvents.w2.splice(7, 0, end, start)
    expect(teamBarrierEvidence(resumedMerge).recovery).toBe(false)
    const wrongPath = good(); wrongPath.memberEvents.w2[1] = call('r2', 'read', { file_path: '/different/journal/team-concurrency-probe.md' })
    expect(teamBarrierEvidence(wrongPath).barrierReads).toBe(false)
    const absent = good(); absent.memberEvents.w1.splice(4, 1)
    expect(teamBarrierEvidence(absent).publications).toBe(false)
  })
  it('rejects no successful loser write, wrong merge, partial read and lead publication despite exact file', () => {
    const noWrite = good(); noWrite.memberEvents.w2[8] = result('w3', 'FS_STALE_VERSION')
    expect(teamBarrierEvidence(noWrite).recovery).toBe(false)
    const wrong = good(); wrong.memberEvents.w2[7] = call('w3', 'write', { file_path: target, content: 'w2 was here\n' })
    expect(teamBarrierEvidence(wrong).recovery).toBe(false)
    const partial = good(); partial.memberEvents.w2[6].data.meta!.totalLines = 2
    expect(teamBarrierEvidence(partial).recovery).toBe(false)
    expect(teamBarrierEvidence({ ...good(), leadEvents: [call('lead', 'write', { file_path: target })] }).noLeadWrites).toBe(false)
  })
})
