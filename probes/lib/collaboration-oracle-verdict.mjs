/**
 * 协作反例判据纯逻辑（2026-11-14 W4 从 `probes/fs-taskboard/collaboration-oracle-probe.mjs` 抽离）。
 *
 * 为什么：原先 `tests/evidence/collaboration-probe-verdict.spec.ts` 用 `source.indexOf(...)` + `vm.runInNewContext`
 * 切探针源码来测判分清单完整性，属于脆弱的字符串耦合反模式；抽入 `tools/lib/` 后，探针入口与单测直连同一份纯函数。
 */
import {
  atomicityEvidence,
  concurrencyEvidence,
  judgeWriteGuard,
} from './collaboration-evidence.mjs'
import { recoveryEvidence, taskboardScopeEvidence } from './recovery-scope-evidence.mjs'

export const ORACLE_EXPECTED_LABELS = Object.freeze([
  'C2 accepts claim prose without task claim events',
  'C2 accepts owner assertion without task snapshot',
  'C1b accepts final file without any write attempts',
  'C4a accepts duplicate/extra rows',
  'C4b accepts no member readback calls',
  'C5 accepts warning prose without task-list result',
  'E1 accepts a read-only run',
  'E1 accepts an unpaired write call',
  'E1 accepts a successful blind write',
  'R1/R4 accept pre-restart prose and delivery',
  'B3 accepts prose without paired per-root tool results',
])

const call = (callId, name, args) => ({ type: 'tool/call', data: { callId, name, arguments: JSON.stringify(args) } })
const result = (callId, text, error) => ({
  type: 'tool/result',
  data: {
    message: { toolCallId: callId, isError: Boolean(error), content: [{ type: 'text', text }] },
    ...(error ? { error: { code: error } } : {}),
  },
})

/**
 * 构造并评估全量已证实协作反例集。
 * @returns {{ label: string, accepted: boolean, evidence: unknown }[]}
 */
export function collectCollaborationOracleFindings() {
  const findings = []
  const record = (label, accepted, evidence) => {
    findings.push({ label, accepted: Boolean(accepted), evidence })
  }

  const noClaim = concurrencyEvidence({
    leadEvents: [{ type: 'assistant/message', data: { text: 'w1 claimed task-1; w2 stale' } }],
    memberEvents: {},
    memberIds: {},
    file: 'w1 was here\nw2 was here\n',
  })
  record('C2 accepts claim prose without task claim events', noClaim.claimRace, noClaim.claims)
  record('C2 accepts owner assertion without task snapshot', noClaim.claimRace, noClaim.task)
  record('C1b accepts final file without any write attempts', noClaim.attemptedWriteRejected, noClaim.writes)

  const duplicateRows = atomicityEvidence({
    leadEvents: [],
    memberEvents: {},
    file: 'w1 round 1\nw1 round 2\nw1 round 3\nw2 round 1\nw2 round 2\nw2 round 3\nw1 round 1\nw2 scope-note\n',
  })
  record('C4a accepts duplicate/extra rows', duplicateRows.fileExact, duplicateRows)
  record('C4b accepts no member readback calls', duplicateRows.readbacks.w1 || duplicateRows.readbacks.w2, duplicateRows.readbacks)
  record('C5 accepts warning prose without task-list result', duplicateRows.warningVisible, duplicateRows)

  const readOnly = judgeWriteGuard([call('read', 'read', { file_path: 'target.md' }), result('read', 'file contents')], 'target.md')
  record('E1 accepts a read-only run', readOnly.judge, readOnly)
  const unpairedWrite = judgeWriteGuard([call('write', 'write', { file_path: 'target.md' })], 'target.md')
  record('E1 accepts an unpaired write call', unpairedWrite.judge, unpairedWrite)
  const blindWrite = judgeWriteGuard([call('write', 'write', { file_path: 'target.md' }), result('write', 'Created')], 'target.md')
  record('E1 accepts a successful blind write', blindWrite.judge, blindWrite)
  const failedWrite = judgeWriteGuard([call('write', 'write', { file_path: 'target.md' }), result('write', 'Denied', 'EACCES')], 'target.md')
  // 确保 result(error) 分支同样保持反例拒绝
  if (failedWrite.judge) {
    throw new Error('unexpected acceptance on errored blind write')
  }

  const historicalRecovery = recoveryEvidence({
    events: [
      { type: 'assistant/message', data: { text: 'res 收到恢复标记，已恢复' } },
      { type: 'team/message/queued', data: { teamId: 'lead', message: { id: 'old', senderName: 'res', targetId: 'lead', content: [{ type: 'text', text: 'marker' }] } } },
      { type: 'team/message/delivered', data: { messageId: 'old', targetId: 'lead' } },
    ],
    marker: 'marker',
    markerMessageId: 'old',
    watermarkSeq: 100,
    leadId: 'lead',
    restartPrompt: '恢复检查',
  })
  record('R1/R4 accept pre-restart prose and delivery', historicalRecovery.roster || historicalRecovery.reply, historicalRecovery)

  const crossRoot = taskboardScopeEvidence({
    cfoEvents: [call('cfo-text', 'assistant', { text: 'created renewal-z' })],
    cooEvents: [call('coo-text', 'assistant', { text: 'renewal-z is visible' })],
  })
  record('B3 accepts prose without paired per-root tool results', crossRoot.pass, crossRoot)

  return findings
}

/**
 * 校验反例清单完整性并计算退出码（缺条/顺序变/类型错直接抛异常，防删掉检查项假绿）。
 * @param {{ label: string, accepted: boolean }[]} findings
 * @param {readonly string[]} [expectedLabels]
 * @returns {{ acceptedCount: number, total: number, exitCode: 0 | 1 }}
 */
export function evaluateCollaborationOracle(findings, expectedLabels = ORACLE_EXPECTED_LABELS) {
  if (
    !Array.isArray(findings)
    || findings.length !== expectedLabels.length
    || expectedLabels.some((label, index) => findings[index]?.label !== label)
    || findings.some(item => typeof item?.accepted !== 'boolean')
  ) {
    throw new Error('oracle case inventory changed or missing')
  }
  const acceptedCount = findings.filter(item => item.accepted).length
  return {
    acceptedCount,
    total: findings.length,
    exitCode: acceptedCount === 0 ? 0 : 1,
  }
}
