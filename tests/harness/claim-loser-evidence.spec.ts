import { describe, expect, it } from 'vitest'
import { claimLoserEvidence } from '../../tools/lib/claim-loser-evidence.mjs'

const OWNER = 'journal/claim-loser-owner.md'
const SHARED = 'journal/claim-loser-shared.md'
const call = (id: string, name: string, args: object) => ({ type: 'tool/call', data: { callId: id, name, arguments: JSON.stringify(args) } })
const ok = (id: string, text?: string) => ({ type: 'tool/result', data: { message: { toolCallId: id, isError: false,
  content: text === undefined ? [] : [{ type: 'text', text }] } } })
const denied = (id: string, code: string) => ({ type: 'tool/result', data: { message: { toolCallId: id, isError: true, content: [] }, error: { code } } })
const end = { type: 'turn/end', data: { reason: { kind: 'completed' } } }
const taskEvent = (id: string, subject: string, ownerId: string) => ({ type: 'team/task', data: { teamId: 'lead-team',
  task: { id, subject, revision: 2, ownerId, writeScopes: [] } } })
const message = (mid: string, senderId: string) => [
  { type: 'team/message/queued', data: { message: { id: mid, senderId, targetId: 'lead-team' } } },
  { type: 'team/message/delivered', data: { messageId: mid, targetId: 'lead-team' } },
]
const claim = (id: string, taskId: string, revision: number) =>
  call(id, 'team_task_update', { action: 'claim', task_id: taskId, expected_revision: revision })
const claimOk = (id: string, taskId: string, name: string) => ok(id, JSON.stringify({ id: taskId, ownerName: name, revision: 2 }))

// One clean race per task; the same member wins both and the loser yields on the
// owner-bound file while still publishing its row on the explicitly shared file.
function fixture(winner: 'w1' | 'w2' = 'w1') {
  const loser = winner === 'w1' ? 'w2' : 'w1'
  const winnerEvents = [
    claim('c1', 'task-1', 1), claimOk('c1', 'task-1', winner),
    claim('c2', 'task-2', 1), claimOk('c2', 'task-2', winner),
    call('r1', 'read', { file_path: OWNER }), ok('r1'),
    call('wo', 'write', { file_path: OWNER, content: `${winner} owns this task\n` }), ok('wo'),
    call('r2', 'read', { file_path: SHARED }), ok('r2'),
    call('ws', 'write', { file_path: SHARED, content: `${winner} was here\n` }), ok('ws'),
    end]
  const loserEvents = [
    claim('c3', 'task-1', 1), denied('c3', 'TEAM_TASK_STALE_REVISION'),
    claim('c4', 'task-2', 1), denied('c4', 'TEAM_TASK_STALE_REVISION'),
    call('r3', 'read', { file_path: SHARED }), ok('r3'),
    call('ls', 'write', { file_path: SHARED, content: `${winner} was here\n${loser} was here\n` }), ok('ls'),
    end]
  const leadEvents = [taskEvent('task-1', 'owner-bound认领观察', `${winner}id`), taskEvent('task-2', 'shared共享对照', `${winner}id`),
    ...message('m1', `${winner}id`), ...message('m2', `${loser}id`), end]
  return { leadEvents,
    memberEvents: { w1: winner === 'w1' ? winnerEvents : loserEvents, w2: winner === 'w1' ? loserEvents : winnerEvents },
    memberIds: { w1: 'w1id', w2: 'w2id' }, ownerPath: OWNER, sharedPath: SHARED,
    ownerContent: `${winner} owns this task\n`, sharedContent: `${winner} was here\n${loser} was here\n` }
}

const verdictKeys = ['claimRaceOwner', 'winnerPublishes', 'loserYields', 'reports', 'claimRaceShared', 'sharedControl', 'noLeadWrites', 'membersEnded'] as const
const allPass = (evidence: Record<string, unknown>) => verdictKeys.every(key => evidence[key] === true)

describe('claim-loser yield evidence', () => {
  it('accepts a clean race where the owner-bound loser yields and the shared loser still publishes', () => {
    expect(allPass(claimLoserEvidence(fixture()) as Record<string, unknown>)).toBe(true)
  })
  it('is assignment-agnostic: the other member winning both races still passes', () => {
    expect(allPass(claimLoserEvidence(fixture('w2')) as Record<string, unknown>)).toBe(true)
  })
  it('rejects a loser that attempts any write on the owner-bound file, even a machine-rejected one', () => {
    const input = fixture()
    input.memberEvents.w2.splice(2, 0, call('sneak', 'write', { file_path: OWNER, content: 'w2 was here\n' }), denied('sneak', 'FS_NOT_OBSERVED'))
    expect(claimLoserEvidence(input).loserYields).toBe(false)
  })
  it('rejects races claimed at different revisions or with a non-stale rejection code', () => {
    const drifted = fixture()
    drifted.memberEvents.w2[0] = claim('c3b', 'task-1', 2)
    drifted.memberEvents.w2[1] = denied('c3b', 'TEAM_TASK_ALREADY_CLAIMED')
    expect(claimLoserEvidence(drifted).claimRaceOwner).toBe(false)
    const wrongCode = fixture()
    wrongCode.memberEvents.w2[1] = denied('c3', 'TEAM_TASK_ALREADY_CLAIMED')
    expect(claimLoserEvidence(wrongCode).claimRaceOwner).toBe(false)
  })
  it('rejects a winner that never publishes its owner line and a file with extra rows', () => {
    const missing = fixture()
    missing.memberEvents.w1 = missing.memberEvents.w1.filter(event => event.data?.callId !== 'wo')
    expect(claimLoserEvidence(missing).winnerPublishes).toBe(false)
    const extra = fixture()
    extra.ownerContent = 'w1 owns this task\nw2 was here\n'
    expect(claimLoserEvidence(extra).winnerPublishes).toBe(false)
  })
  it('rejects missing delivered reports and lead writes on either target', () => {
    const quiet = fixture()
    quiet.leadEvents = quiet.leadEvents.filter(event => event.type !== 'team/message/delivered')
    expect(claimLoserEvidence(quiet).reports).toBe(false)
    const leadWrite = fixture()
    leadWrite.leadEvents.splice(0, 0, call('lead-w', 'write', { file_path: OWNER, content: 'lead was here\n' }))
    expect(claimLoserEvidence(leadWrite).noLeadWrites).toBe(false)
  })
  it('rejects a shared control where the claim loser never writes or a row is missing', () => {
    const silent = fixture()
    silent.memberEvents.w2 = silent.memberEvents.w2.filter(event => event.data?.callId !== 'ls' && event.data?.message?.toolCallId !== 'ls')
    expect(claimLoserEvidence(silent).sharedControl).toBe(false)
    const shortFile = fixture()
    shortFile.sharedContent = 'w1 was here\n'
    expect(claimLoserEvidence(shortFile).sharedControl).toBe(false)
  })
  it('rejects a missing shared-task claim and an unfinished member turn', () => {
    const noClaim = fixture()
    noClaim.memberEvents.w2 = noClaim.memberEvents.w2.filter(event => event.data?.callId !== 'c4' && event.data?.message?.toolCallId !== 'c4')
    expect(claimLoserEvidence(noClaim).claimRaceShared).toBe(false)
    const active = fixture()
    active.memberEvents.w2 = [...active.memberEvents.w2.slice(0, -1), { type: 'turn/start', data: {} }]
    expect(claimLoserEvidence(active).membersEnded).toBe(false)
  })
  it('rejects a durable task owner that does not match the claim winner', () => {
    const hijacked = fixture()
    hijacked.leadEvents[0] = taskEvent('task-1', 'owner-bound认领观察', 'w2id')
    expect(claimLoserEvidence(hijacked).claimRaceOwner).toBe(false)
  })
})
