// 状态：常驻
// Same-turn member stale/write recovery evidence; runtime driver supplies the actual external-write watermark.
import { pairedCalls, successfulToolResult, toolArguments, hasCompletedTurn } from './collaboration-evidence.mjs'
export function fullRead(result, text) {
  const meta = result?.meta
  return successfulToolResult(result) && meta?.offset === 1 && Array.isArray(meta.lines)
    && meta.totalLines === meta.lines.length && meta.lines.every((line, index) => line.number === index + 1)
    && meta.lines.map(line => line.text).join('\n') === text.trimEnd()
}
export function memberStaleEvidence({ leadEvents, memberEvents, target, externalAfterEventCount,
  observed, untouched, externalApplied, final, budgetExpired = false }) {
  const writes = pairedCalls(memberEvents, ['write', 'edit'], target)
  const stale = writes.find(pair => pair.result?.message?.isError === true && pair.result.error?.code === 'FS_STALE_VERSION')
  const reads = pairedCalls(memberEvents, ['read'], target)
  const recoveryRead = reads.find(pair => fullRead(pair.result, 'BASE\nEXTERNAL\n') && stale && pair.call.index > stale.result.index)
  const recoveryWrite = writes.find(pair => successfulToolResult(pair.result) && recoveryRead && pair.call.index > recoveryRead.result.index)
  const expected = 'BASE\nEXTERNAL\nMEMBER\n'
  const args = toolArguments(recoveryWrite?.call)
  const mergedPayload = recoveryWrite?.call.name === 'write' ? args.content === expected
    : typeof args.old_string === 'string' && typeof args.new_string === 'string'
      && args.old_string.length > 0 && 'BASE\nEXTERNAL\n'.replace(args.old_string, args.new_string) === expected
  return {
    phase1Read: observed && untouched && externalApplied && Number.isSafeInteger(externalAfterEventCount) && externalAfterEventCount > 0,
    completed: !budgetExpired && hasCompletedTurn(leadEvents) && hasCompletedTurn(memberEvents),
    firstWriteStale: Boolean(stale) && writes[0] === stale && stale.call.index >= externalAfterEventCount
      && toolArguments(stale.call).content === 'BASE\nMEMBER\n',
    noReadBeforeWrite: Boolean(stale) && !reads.some(pair => pair.call.index >= externalAfterEventCount && pair.call.index < stale.call.index),
    recovery: Boolean(recoveryRead && recoveryWrite && mergedPayload), finalExact: final === expected,
    noLeadWrites: pairedCalls(leadEvents, ['write', 'edit'], target).length === 0,
  }
}
