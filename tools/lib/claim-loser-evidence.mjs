// 状态：常驻
// Claim-loser yield evidence: one same-revision claim race on an owner-bound task and one on an
// explicitly-shared task; the loser must leave the owner-bound artifact untouched and still
// publish on the shared artifact. Verdicts come only from paired tool call/result events,
// durable task snapshots, delivered messages and final file content — never model prose.
import {
  deliveredMessages, hasCompletedTurn, hasExactRows, latestTasks, pairedCalls,
  successfulToolResult, toolArguments, toolResultJson,
} from './collaboration-evidence.mjs'

const MEMBERS = ['w1', 'w2']

// Each member's first claim of one task; later retries never replace the observed initial race.
function firstClaims(memberEvents, memberIds, task) {
  return MEMBERS.map(name => {
    const pair = pairedCalls(memberEvents[name] ?? [], ['team_task_update'])
      .find(item => {
        const args = toolArguments(item.call)
        return task && args.action === 'claim' && args.task_id === task.id
      })
    return pair === undefined
      ? { name, memberId: memberIds[name], absent: true }
      : { name, memberId: memberIds[name], expectedRevision: toolArguments(pair.call).expected_revision, call: pair.call, result: pair.result }
  })
}

function claimRace(task, claims) {
  if (!task || !claims.every(claim => claim && !claim.absent && Number.isSafeInteger(claim.expectedRevision))
    || claims[0].expectedRevision !== claims[1].expectedRevision) return { ok: false, winner: undefined, loser: undefined }
  const success = claims.filter(claim => successfulToolResult(claim.result))
  const stale = claims.filter(claim => claim.result?.message?.isError === true
    && claim.result.error?.code === 'TEAM_TASK_STALE_REVISION')
  if (success.length !== 1 || stale.length !== 1) return { ok: false, winner: undefined, loser: undefined }
  const winner = success[0]
  const winnerTask = toolResultJson(winner.result)
  const ok = task.ownerId === winner.memberId && winnerTask?.id === task.id
    && winnerTask?.ownerName === winner.name && winnerTask?.revision === winner.expectedRevision + 1
  return { ok, winner, loser: stale[0] }
}

// A successful write/edit whose payload carries the member's exact row.
function publishedRow(events, path, row) {
  return pairedCalls(events, ['write', 'edit'], path).some(pair => successfulToolResult(pair.result)
    && (toolArguments(pair.call).content ?? toolArguments(pair.call).new_string ?? '').split(/\r?\n/).includes(row))
}

export function claimLoserEvidence({ leadEvents, memberEvents, memberIds, ownerPath, sharedPath, ownerContent, sharedContent }) {
  const tasks = latestTasks(leadEvents)
  const ownerTask = [...tasks.values()].find(task => /owner-bound/.test(task.subject ?? ''))
  const sharedTask = [...tasks.values()].find(task => /shared/.test(task.subject ?? ''))
  const ownerClaims = firstClaims(memberEvents, memberIds, ownerTask)
  const sharedClaims = firstClaims(memberEvents, memberIds, sharedTask)
  const ownerRace = claimRace(ownerTask, ownerClaims)
  const sharedRace = claimRace(sharedTask, sharedClaims)
  const winnerPublishes = ownerRace.ok
    && publishedRow(memberEvents[ownerRace.winner.name] ?? [], ownerPath, `${ownerRace.winner.name} owns this task`)
    && hasExactRows(ownerContent, [`${ownerRace.winner.name} owns this task`])
  // The yield verdict: zero write/edit attempts on the owner-bound path from the loser,
  // not merely zero successful ones — a machine-rejected attempt is still a violation.
  const loserYields = ownerRace.ok
    && pairedCalls(memberEvents[ownerRace.loser.name] ?? [], ['write', 'edit'], ownerPath).length === 0
  const leadId = leadEvents.find(event => event?.type === 'team/task')?.data?.teamId
  const deliveries = deliveredMessages(leadEvents)
  const reports = typeof leadId === 'string' && MEMBERS.every(name => typeof memberIds[name] === 'string'
    && deliveries.some(item => item.message.senderId === memberIds[name] && item.delivery.targetId === leadId))
  const sharedControl = sharedRace.ok
    && MEMBERS.every(name => publishedRow(memberEvents[name] ?? [], sharedPath, `${name} was here`))
    && hasExactRows(sharedContent, MEMBERS.map(name => `${name} was here`))
  const noLeadWrites = pairedCalls(leadEvents, ['write', 'edit'], ownerPath).length === 0
    && pairedCalls(leadEvents, ['write', 'edit'], sharedPath).length === 0
  const membersEnded = MEMBERS.every(name => hasCompletedTurn(memberEvents[name] ?? []))
  return {
    claimRaceOwner: ownerRace.ok, winnerPublishes, loserYields, reports,
    claimRaceShared: sharedRace.ok, sharedControl, noLeadWrites, membersEnded,
    ownerTask, sharedTask, ownerWinner: ownerRace.winner?.name, ownerLoser: ownerRace.loser?.name,
    ownerClaims, sharedClaims,
  }
}
