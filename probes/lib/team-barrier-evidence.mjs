import { resolve } from 'node:path'
import { pairedCalls, successfulToolResult, toolArguments, hasExactRows } from './collaboration-evidence.mjs'
const names = ['w1', 'w2']
const rows = names.map(name => `${name} was here`)
function eventIndexBefore(events, index, type) {
  return index === undefined ? -1 : events.map(event => event.type).lastIndexOf(type, index)
}
function eventIndexAfter(events, index, type) {
  return index === undefined ? -1 : events.findIndex((event, position) => position > index && event.type === type)
}
function fullRows(result) {
  const meta = result?.meta
  if (!successfulToolResult(result) || meta?.offset !== 1 || !Array.isArray(meta.lines) || meta.totalLines !== meta.lines.length
    || meta.lines.some((line, index) => line.number !== index + 1)) return undefined
  return meta.lines.map(line => line.text)
}
export function teamBarrierEvidence({ leadEvents, memberEvents, memberIds, target, arrivals, released, file }) {
  const cwd = resolve(target, '..', '..')
  const pairs = (events, tools) => pairedCalls(events, tools).filter(pair => {
    const path = toolArguments(pair.call).file_path
    return typeof path === 'string' && resolve(cwd, path) === target
  })
  let barrierReads = true, publications = true, staleCount = 0, recovery = true
  for (const name of names) {
    const events = memberEvents[name] ?? []
    const writes = pairs(events, ['write', 'edit'])
    const reads = pairs(events, ['read'])
    const marker = arrivals?.[name], release = released?.[name]
    const first = writes[0]
    const read = reads.find(pair => pair.id === marker?.callId)
    const turnStart = eventIndexBefore(events, read?.call.index, 'turn/start')
    const turnEnd = eventIndexAfter(events, first?.result?.index ?? first?.call.index, 'turn/end')
    const initialRows = fullRows(read?.result)
    const sameTurn = read && first && !events.slice(read.call.index + 1, first.call.index).some(event => ['turn/start', 'turn/end'].includes(event.type))
    barrierReads &&= Boolean(marker && release && marker.sessionId === memberIds[name] && release.sessionId === memberIds[name]
      && marker.callId === release.callId && marker.path === target && release.path === target
      && initialRows && (initialRows.length === 0 || (initialRows.length === 1 && initialRows[0] === ''))
      && sameTurn && turnStart >= 0 && turnEnd >= 0 && turnStart < read.call.index && first.call.index < turnEnd
      && read.result.index < first.call.index
      && !reads.some(pair => pair.call.index > read.call.index && pair.call.index < first.call.index))
    const intended = `${name} was here\n`
    const stale = first?.result?.message?.isError === true && first.result.error?.code === 'FS_STALE_VERSION'
    const initialSuccess = successfulToolResult(first?.result) && toolArguments(first.call).content === intended
    publications &&= Boolean(initialSuccess || stale)
    if (stale) {
      staleCount++
      const latest = reads.find(pair => pair.call.index > first.result.index && fullRows(pair.result)?.length === 1
        && fullRows(pair.result)[0] === `${name === 'w1' ? 'w2' : 'w1'} was here`)
      const merged = writes.find(pair => latest && pair.call.index > latest.result.index && successfulToolResult(pair.result))
      const args = toolArguments(merged?.call)
      const payload = merged?.call.name === 'write' ? args.content
        : typeof args.old_string === 'string' && args.old_string.length > 0 && typeof args.new_string === 'string'
          ? args.replace_all === true
            ? `${fullRows(latest?.result)?.[0]}\n`.replaceAll(args.old_string, args.new_string)
            : `${fullRows(latest?.result)?.[0]}\n`.replace(args.old_string, args.new_string) : undefined
      const mergedTurnEnd = eventIndexAfter(events, merged?.result?.index, 'turn/end')
      recovery &&= Boolean(toolArguments(first.call).content === intended && latest && merged
        && merged.result.index < turnEnd
        && latest.result.index < merged.call.index && merged.call.index < merged.result.index
        && mergedTurnEnd >= 0 && merged.result.index < mergedTurnEnd
        && !events.slice(first.result.index + 1, merged.result.index).some(event => ['turn/start', 'turn/end'].includes(event.type))
        && typeof payload === 'string' && hasExactRows(payload, rows))
    }
  }
  return { barrierReads, publications, recovery: staleCount === 1 && recovery,
    noLeadWrites: pairs(leadEvents, ['write', 'edit']).length === 0, finalExact: hasExactRows(file, rows) }
}
