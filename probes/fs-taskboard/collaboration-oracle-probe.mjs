#!/usr/bin/env node
// 状态：常驻
// 何时跑：BUG-007 修复前后或协作探针判据改变时；输入已证实反例，零模型、秒级。
// 退出码：0 = 完整坏样本集均被判拒；1 = 判据误接受；2 = 执行失败或反例缺失。
// 正例与实际退出码连接由tests/harness的证据/判分回归覆盖，本脚本不冒充正例认证。
// 仅检查探针实际复用的纯事件判据，不启动 DSH，也不证明生产协作行为。
import {
  atomicityEvidence,
  concurrencyEvidence,
  judgeWriteGuard,
} from '../../tools/lib/collaboration-evidence.mjs'
import { recoveryEvidence, taskboardScopeEvidence } from '../../tools/lib/recovery-scope-evidence.mjs'

const expectedLabels = [
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
]
const findings = []
const record = (label, accepted, evidence) => {
  findings.push({ label, accepted })
  console.log(`${accepted ? 'FAIL' : 'PASS'} ${label}: ${JSON.stringify(evidence)}`)
}
const call = (callId, name, args) => ({ type: 'tool/call', data: { callId, name, arguments: JSON.stringify(args) } })
const result = (callId, text, error) => ({ type: 'tool/result', data: {
  message: { toolCallId: callId, isError: Boolean(error), content: [{ type: 'text', text }] },
  ...(error ? { error: { code: error } } : {}),
} })

try {
  const noClaim = concurrencyEvidence({ leadEvents: [{ type: 'assistant/message', data: { text: 'w1 claimed task-1; w2 stale' } }],
    memberEvents: {}, memberIds: {}, file: 'w1 was here\nw2 was here\n' })
  record('C2 accepts claim prose without task claim events', noClaim.claimRace, noClaim.claims)
  record('C2 accepts owner assertion without task snapshot', noClaim.claimRace, noClaim.task)
  record('C1b accepts final file without any write attempts', noClaim.attemptedWriteRejected, noClaim.writes)

  const duplicateRows = atomicityEvidence({ leadEvents: [], memberEvents: {},
    file: 'w1 round 1\nw1 round 2\nw1 round 3\nw2 round 1\nw2 round 2\nw2 round 3\nw1 round 1\nw2 scope-note\n' })
  record('C4a accepts duplicate/extra rows', duplicateRows.fileExact, duplicateRows)
  record('C4b accepts no member readback calls', duplicateRows.readbacks.w1 || duplicateRows.readbacks.w2, duplicateRows.readbacks)
  record('C5 accepts warning prose without task-list result', duplicateRows.warningVisible, duplicateRows)

  const readOnly = judgeWriteGuard([call('read', 'read', { file_path: 'target.md' }), result('read', 'file contents')], 'target.md')
  record('E1 accepts a read-only run', readOnly.judge, readOnly)
  const unpairedWrite = judgeWriteGuard([call('write', 'write', { file_path: 'target.md' })], 'target.md')
  record('E1 accepts an unpaired write call', unpairedWrite.judge, unpairedWrite)
  const blindWrite = judgeWriteGuard([call('write', 'write', { file_path: 'target.md' }), result('write', 'Created')], 'target.md')
  record('E1 accepts a successful blind write', blindWrite.judge, blindWrite)

  const historicalRecovery = recoveryEvidence({ events: [
    { type: 'assistant/message', data: { text: 'res 收到恢复标记，已恢复' } },
    { type: 'team/message/queued', data: { teamId: 'lead', message: { id: 'old', senderName: 'res', targetId: 'lead', content: [{ type: 'text', text: 'marker' }] } } },
    { type: 'team/message/delivered', data: { messageId: 'old', targetId: 'lead' } },
  ], marker: 'marker', markerMessageId: 'old', watermarkSeq: 100, leadId: 'lead', restartPrompt: '恢复检查' })
  record('R1/R4 accept pre-restart prose and delivery', historicalRecovery.roster || historicalRecovery.reply, historicalRecovery)

  const crossRoot = taskboardScopeEvidence({
    cfoEvents: [call('cfo-text', 'assistant', { text: 'created renewal-z' })],
    cooEvents: [call('coo-text', 'assistant', { text: 'renewal-z is visible' })],
  })
  record('B3 accepts prose without paired per-root tool results', crossRoot.pass, crossRoot)

  if (findings.length !== expectedLabels.length || expectedLabels.some((label, index) => findings[index]?.label !== label)
    || findings.some(item => typeof item.accepted !== 'boolean')) throw new Error('oracle case inventory changed or missing')
  const count = findings.filter(item => item.accepted).length
  console.log(`collaboration-oracle-probe: ${count === 0 ? 'PASS' : 'FAIL'}; ${count}/${findings.length} invalid cases accepted`)
  process.exitCode = count === 0 ? 0 : 1
} catch (error) {
  console.error(`collaboration-oracle-probe: ERROR ${error.message}`)
  process.exitCode = 2
}
