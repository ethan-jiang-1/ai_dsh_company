import { describe, expect, it } from 'vitest'
import { atomicityEvidence, concurrencyEvidence, createRaceEvidence, hasExactRows, judgeWriteGuard, teamRunComplete } from '../../tools/lib/collaboration-evidence.mjs'

const call = (callId: string, name: string, args: object) => ({ type: 'tool/call', data: { callId, name, arguments: JSON.stringify(args) } })
const result = (callId: string, text: string, error?: string, meta?: object) => ({ type: 'tool/result', data: {
  message: { toolCallId: callId, isError: Boolean(error), content: [{ type: 'text', text }] },
  ...(error ? { error: { code: error } } : {}), ...(meta ? { meta } : {}),
} })
const end = { type: 'turn/end', data: { reason: { kind: 'completed' } } }
const target = 'journal/atomicity-probe.md'
const expected = ['w1 round 1', 'w1 round 2', 'w1 round 3', 'w2 round 1', 'w2 round 2', 'w2 round 3']

describe('collaboration evidence verdicts', () => {
  it('accepts exactly the expected multiset, not duplicates, extra rows, blanks or whitespace', () => {
    expect(hasExactRows('b\na\n', ['a', 'b'])).toBe(true)
    for (const text of ['a\nb\na\n', 'a\nb\nextra\n', 'a\n\nb\n', ' a\nb\n']) expect(hasExactRows(text, ['a', 'b'])).toBe(false)
  })

  it('requires same-revision paired claim results and matching durable owner', () => {
    const leadEvents = [{ type: 'team/task', data: { teamId: 'lead', task: { id: 'task-1', subject: '竞写观察', revision: 2, ownerId: 'w1-id' } } }]
    const memberEvents = {
      w1: [call('c1', 'team_task_update', { action: 'claim', task_id: 'task-1', expected_revision: 1 }), result('c1', '{"id":"task-1","ownerName":"w1","revision":2}')],
      w2: [call('c2', 'team_task_update', { action: 'claim', task_id: 'task-1', expected_revision: 1 }), result('c2', 'stale', 'TEAM_TASK_STALE_REVISION')],
    }
    const args = { leadEvents, memberEvents, memberIds: { w1: 'w1-id', w2: 'w2-id' }, file: 'w1 was here\nw2 was here\n' }
    expect(concurrencyEvidence(args).claimRace).toBe(true)
    expect(concurrencyEvidence({ ...args, leadEvents: [] }).claimRace).toBe(false)
    expect(concurrencyEvidence({ ...args, memberIds: { w1: 'wrong', w2: 'w2-id' } }).claimRace).toBe(false)
    expect(concurrencyEvidence({ ...args, memberEvents: { ...memberEvents, w2: [call('c2', 'team_task_update', { action: 'claim', task_id: 'task-2', expected_revision: 1 }), result('c2', 'stale', 'TEAM_TASK_STALE_REVISION')] } }).claimRace).toBe(false)
    expect(concurrencyEvidence({ ...args, memberEvents: {} }).claimRace).toBe(false)
    expect(concurrencyEvidence({ ...args, memberEvents: { w1: memberEvents.w1, w2: memberEvents.w2.slice(0, 1) } }).claimRace).toBe(false)
  })

  it('requires rejection on the target write and distinct members delivered to lead', () => {
    const leadEvents = [
      { type: 'team/task', data: { teamId: 'lead', task: { id: 'task-1', subject: '竞写观察' } } },
      ...['w1', 'w2'].flatMap(name => [
        { type: 'team/message/queued', data: { message: { id: name, senderId: `${name}-id`, targetId: 'lead' } } },
        { type: 'team/message/delivered', data: { messageId: name, targetId: 'lead' } },
      ]),
    ]
    const args = { leadEvents, memberEvents: { w1: [call('w', 'edit', { file_path: 'journal/team-concurrency-probe.md' }), result('w', 'stale', 'FS_STALE_VERSION')] }, memberIds: { w1: 'w1-id', w2: 'w2-id' }, file: '' }
    expect(concurrencyEvidence(args)).toMatchObject({ reports: true, attemptedWriteRejected: true })
    expect(concurrencyEvidence({ ...args, leadEvents: leadEvents.slice(0, 3) }).reports).toBe(false)
    expect(concurrencyEvidence({ ...args, memberEvents: { w1: [call('w', 'edit', { file_path: 'other.md' }), result('w', 'stale', 'FS_STALE_VERSION')] } }).attemptedWriteRejected).toBe(false)
  })

  it('requires three successful appends and full well-formed reads between each append', () => {
    const memberEvents = Object.fromEntries(['w1', 'w2'].map(name => [name, [1, 2, 3].flatMap(round => {
      const rows = Array.from({ length: round }, (_, i) => `${name} round ${i + 1}`)
      return [call(`${name}-w${round}`, 'edit', { file_path: target, new_string: rows.join('\n') }), result(`${name}-w${round}`, 'Updated file'),
        call(`${name}-r${round}`, 'read', { file_path: target }), result(`${name}-r${round}`, rows.join('\n'), undefined, { offset: 1, totalLines: round, lines: rows.map((text, i) => ({ number: i + 1, text })) })]
    })]))
    const evidence = atomicityEvidence({ leadEvents: [], memberEvents, file: expected.join('\n') })
    expect(evidence).toMatchObject({ fileExact: true, readbacks: { w1: true, w2: true } })
    const readsOnly = { w1: memberEvents.w1.filter((event: { type: string; data: { name?: string; message?: { toolCallId: string } } }) => event.type === 'tool/call' ? event.data.name === 'read' : event.data.message?.toolCallId.includes('-r')) }
    expect(atomicityEvidence({ leadEvents: [], memberEvents: readsOnly, file: '' }).readbacks.w1).toBe(false)
    expect(atomicityEvidence({ leadEvents: [], memberEvents: {}, file: expected.concat('w1 round 1').join('\n') }).fileExact).toBe(false)
    const rows = ['w1 round 1', 'w1 round 2', 'w1 round 3']
    const collapsed = [call('one-write', 'write', { file_path: target, content: rows.join('\n') }), result('one-write', 'Created'),
      call('one-read', 'read', { file_path: target }), result('one-read', rows.join('\n'), undefined,
        { offset: 1, totalLines: 3, lines: rows.map((text, i) => ({ number: i + 1, text })) })]
    expect(atomicityEvidence({ leadEvents: [], memberEvents: { w1: collapsed }, file: '' }).readbacks.w1).toBe(false)
  })

  it('uses parsed task-list warnings for two in-progress tasks, not assistant prose', () => {
    const text = JSON.stringify({ tasks: [{ id: 'task-1', subject: 'scope-a', status: 'completed', writeScopes: ['journal'], writeScopeWarnings: ['write scopes overlap with task-2'] }, { id: 'task-2', subject: 'scope-b', status: 'in_progress', writeScopes: ['journal/notes'], writeScopeWarnings: [] }] })
    expect(atomicityEvidence({ leadEvents: [call('l', 'team_task_list', {}), result('l', text)], memberEvents: {}, file: '' }).warningVisible).toBe(true)
    expect(atomicityEvidence({ leadEvents: [{ type: 'assistant/message', data: { text } }], memberEvents: {}, file: '' }).warningVisible).toBe(false)
    expect(atomicityEvidence({ leadEvents: [call('l', 'team_task_list', {})], memberEvents: {}, file: '' }).warningVisible).toBe(false)
  })

  it('requires a target write result, rejects read-only, unpaired and blind-success traces', () => {
    const read = [call('r', 'read', { file_path: 'target.md' }), result('r', 'contents')]
    expect(judgeWriteGuard(read, 'target.md').judge).toBe(false)
    expect(judgeWriteGuard([call('w', 'write', { file_path: 'target.md' })], 'target.md').judge).toBe(false)
    expect(judgeWriteGuard([call('w', 'write', { file_path: 'target.md' }), result('w', 'Created')], 'target.md').judge).toBe(false)
    expect(judgeWriteGuard([call('w', 'write', { file_path: 'target.md' }), result('w', 'denied', 'FS_NOT_OBSERVED')], 'target.md').judge).toBe(true)
    expect(judgeWriteGuard([...read, call('w', 'edit', { file_path: 'target.md' }), result('w', 'Updated')], 'target.md').judge).toBe(true)
    expect(judgeWriteGuard([call('r', 'read', { file_path: 'target.md' }), result('r', 'not found', 'FS_NOT_FOUND'), call('w', 'write', { file_path: 'target.md' }), result('w', 'Created')], 'target.md').judge).toBe(false)
    expect(judgeWriteGuard([call('w', 'write', { file_path: 'other.md' }), result('w', 'denied', 'FS_NOT_OBSERVED')], 'target.md').judge).toBe(false)
    expect(judgeWriteGuard([call('w', 'write', { file_path: 'target.md' }), ...read, result('w', 'Created')], 'target.md').judge).toBe(false)
  })

  it('requires paired target write attempts from both create-race participants', () => {
    const b = [call('b', 'write', { file_path: 'race.md', content: 'RACE-FROM-B\n' }), result('b', 'Created')]
    const c = [call('c', 'write', { file_path: 'race.md', content: 'RACE-FROM-C\n' }), result('c', 'denied', 'FS_NOT_OBSERVED')]
    expect(createRaceEvidence(b, c, 'race.md', 'RACE-FROM-B')).toBe(true)
    expect(createRaceEvidence(b, [], 'race.md', 'RACE-FROM-B')).toBe(false)
    expect(createRaceEvidence(b, c.slice(0, 1), 'race.md', 'RACE-FROM-B')).toBe(false)
    expect(createRaceEvidence(b, c, 'other.md', 'RACE-FROM-B')).toBe(false)
    expect(createRaceEvidence(b, c, 'race.md', 'torn')).toBe(false)
  })

  it('completes with one lead turn only when both members and artifact are done', () => {
    const members = { w1: [end], w2: [end] }
    expect(teamRunComplete([end], members, ['w1', 'w2'], true)).toBe(true)
    expect(teamRunComplete([end], members, ['w1', 'w2'], false)).toBe(false)
    expect(teamRunComplete([end], { w1: [end] }, ['w1', 'w2'], true)).toBe(false)
    expect(teamRunComplete([end, { type: 'turn/start', data: {} }], members, ['w1', 'w2'], true)).toBe(false)
    expect(teamRunComplete([{ type: 'turn/end', data: { reason: { kind: 'error' } } }], members, ['w1', 'w2'], true)).toBe(false)
  })
})
