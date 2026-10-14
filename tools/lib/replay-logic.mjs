// The date channel injects the current time into durable user/message content, so recordings and replays cannot
// compare until both the sampled ISO timestamp and rhythm-dependent elapsed duration use stable tokens.
// Sandbox/mode, approval/policy, and permission/preset values are machine policy (run/env.sh's Seatbelt result),
// not scenario semantics. Preserve each event's type, position, and `source`, so permission-sequence drift remains red.
const TIME_CONTEXT_SAMPLE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2}:\d{2}\[[^\]"]*\]/g
const TIME_CONTEXT_ELAPSED = /(Elapsed since the preceding model-visible message: )[^"\\\n]*/g
const POSTURE_EVENT_TYPES = new Set(['sandbox/mode', 'approval/policy', 'permission/preset'])

/**
 * Replace time-context samples and posture values while preserving event types, positions, and sources.
 * Non-JSON lines and JSON events whose types are not posture events remain unchanged apart from clock replacement.
 * @param {string} text - JSONL session fixture text.
 * @returns {string} The fixture with volatile time-context and posture values stabilized.
 */
export function normalizeReplayTimeContext(text) {
  return text
    .replace(TIME_CONTEXT_SAMPLE, '<time-context-sample>')
    .replace(TIME_CONTEXT_ELAPSED, '$1<time-context-elapsed>')
    .split(/\r?\n/)
    .map(line => {
      if (!line.includes('"sandbox/mode"') && !line.includes('"approval/policy"') && !line.includes('"permission/preset"')) return line
      try {
        const parsed = JSON.parse(line)
        if (!POSTURE_EVENT_TYPES.has(parsed.type)) return line
        /** @type {Record<string, unknown>} */
        const data = {}
        for (const [key, value] of Object.entries(parsed.data ?? {})) data[key] = key === 'source' ? value : '{{posture}}'
        return JSON.stringify({ ...parsed, data })
      } catch { return line } // Non-JSON rows are symmetric across recording and replay.
    })
    .join('\n')
}

/** @typedef {Record<string, unknown> & { type?: string }} ReplayRecord */
/** @typedef {{ sessionIndex: number, rowIndex: number, expected: ReplayRecord | undefined, actual: ReplayRecord | undefined }} ReplayRecordDifference */
/** @typedef {{ sessionIndex: number, differingIndex: number, expectedRows: string[], actualRows: string[] }} ReplayPresenceDifference */

/**
 * Apply the full ordered-record judge or the presence judge for team member/task rows.
 * Full reports the first unequal record in each actual session; presence compares the sorted JSON rows
 * for only `team/member` and `team/task`, preserving the replay smoke's current missing-session behavior.
 * @param {ReplayRecord[][]} actualSessions - Per-session normalized records from the replay run.
 * @param {ReplayRecord[][]} expectedSessions - Per-session normalized fixture records.
 * @param {'full' | 'presence'} [mode='full'] - Ordered records or member/task rows.
 * @returns {(ReplayRecordDifference | ReplayPresenceDifference)[]} One difference record per mismatching actual session.
 */
export function judgeReplaySessions(actualSessions, expectedSessions, mode = 'full') {
  if (mode === 'presence') {
    const differences = []
    for (const [sessionIndex, actual] of actualSessions.entries()) {
      const expected = expectedSessions[sessionIndex] ?? []
      /** @param {ReplayRecord[]} rows @returns {string[]} */
      const pick = rows => rows
        .filter(row => typeof row.type === 'string' && ['team/member', 'team/task'].includes(row.type))
        .map(row => JSON.stringify(row)).sort()
      const actualRows = pick(actual)
      const expectedRows = pick(expected)
      if (JSON.stringify(actualRows) !== JSON.stringify(expectedRows)) {
        differences.push({
          sessionIndex,
          differingIndex: actualRows.findIndex((row, index) => row !== expectedRows[index]),
          expectedRows,
          actualRows,
        })
      }
    }
    return differences
  }

  const differences = []
  for (const [sessionIndex, actual] of actualSessions.entries()) {
    const expected = expectedSessions[sessionIndex] ?? []
    for (let rowIndex = 0; rowIndex < Math.max(actual.length, expected.length); rowIndex++) {
      if (JSON.stringify(actual[rowIndex]) !== JSON.stringify(expected[rowIndex])) {
        differences.push({ sessionIndex, rowIndex, expected: expected[rowIndex], actual: actual[rowIndex] })
        break
      }
    }
  }
  return differences
}
