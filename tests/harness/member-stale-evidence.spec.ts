import { describe, expect, it } from 'vitest'
import { fullRead, memberStaleEvidence } from '../../tools/lib/member-stale-evidence.mjs'
const target = 'journal/fixture/target.md'
const call = (id: string, name: string, args: object) => ({ type: 'tool/call', data: { callId: id, name, arguments: JSON.stringify(args) } })
const result = (id: string, code?: string, text?: string) => ({ type: 'tool/result', data: {
  message: { toolCallId: id, isError: Boolean(code), content: [] },
  ...(code ? { error: { code } } : {}),
  ...(text ? { meta: { offset: 1, totalLines: text.trimEnd().split('\n').length,
    lines: text.trimEnd().split('\n').map((text, index) => ({ number: index + 1, text })) } } : {}),
} })
const end = { type: 'turn/end', data: { reason: { kind: 'completed' } } }
const events = () => [call('r0', 'read', { file_path: target }), result('r0', undefined, 'BASE\n'),
  call('w0', 'write', { file_path: target, content: 'BASE\nMEMBER\n' }), result('w0', 'FS_STALE_VERSION'),
  call('r1', 'read', { file_path: target }), result('r1', undefined, 'BASE\nEXTERNAL\n'),
  call('w1', 'write', { file_path: target, content: 'BASE\nEXTERNAL\nMEMBER\n' }), result('w1'), end]
const input = (memberEvents = events()) => ({ leadEvents: [end], memberEvents, target, externalAfterEventCount: 2,
  observed: true, untouched: true, externalApplied: true, final: 'BASE\nEXTERNAL\nMEMBER\n' })
describe('same-turn member freshness evidence', () => {
  it('accepts a real stale result followed by full reread and exact merged publication', () => {
    expect(Object.values(memberStaleEvidence(input())).every(Boolean)).toBe(true)
  })
  it('rejects missing observation, watermark, wrong code and read-only evidence', () => {
    expect(memberStaleEvidence({ ...input(), externalAfterEventCount: undefined }).phase1Read).toBe(false)
    expect(memberStaleEvidence({ ...input(), externalAfterEventCount: 4 }).firstWriteStale).toBe(false)
    const wrongCode = events(); wrongCode[3] = result('w0', 'FS_NOT_OBSERVED')
    expect(memberStaleEvidence(input(wrongCode)).firstWriteStale).toBe(false)
    expect(memberStaleEvidence(input(events().slice(0, 2))).firstWriteStale).toBe(false)
  })
  it('rejects incomplete read metadata and publication with a wrong payload even if disk is right', () => {
    const partial = result('r1', undefined, 'BASE\nEXTERNAL\n').data
    partial.meta!.totalLines = 3
    expect(fullRead(partial, 'BASE\nEXTERNAL\n')).toBe(false)
    const wrongPayload = events(); wrongPayload[6] = call('w1', 'write', { file_path: target, content: 'MEMBER\n' })
    expect(memberStaleEvidence(input(wrongPayload)).recovery).toBe(false)
    const missing = events().filter(event => event.type !== 'tool/result' || event.data.message?.toolCallId !== 'w1')
    expect(memberStaleEvidence(input(missing)).recovery).toBe(false)
  })
  it('rejects intervening reread, expired budget, active member and lead target writes', () => {
    const reread = events(); reread.splice(2, 0, call('extra', 'read', { file_path: target }), result('extra', undefined, 'BASE\nEXTERNAL\n'))
    expect(memberStaleEvidence(input(reread)).noReadBeforeWrite).toBe(false)
    expect(memberStaleEvidence({ ...input(), budgetExpired: true }).completed).toBe(false)
    expect(memberStaleEvidence(input([...events(), { type: 'turn/start', data: {} }])).completed).toBe(false)
    expect(memberStaleEvidence({ ...input(), leadEvents: [call('lead-w', 'write', { file_path: target, content: 'anything' }), end] }).noLeadWrites).toBe(false)
    expect(memberStaleEvidence({ ...input(), final: 'BASE\nEXTERNAL\nMEMBER\n\n' }).finalExact).toBe(false)
  })
})
