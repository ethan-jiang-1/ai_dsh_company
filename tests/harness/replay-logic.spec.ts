import { describe, expect, it } from 'vitest'
import { judgeReplaySessions, normalizeReplayTimeContext } from '../../tools/lib/replay-logic.mjs'

describe('replay fixture normalization and judgements', () => {
  it('stabilizes volatile time and posture values while retaining posture source', () => {
    const raw = [
      '{"type":"assistant/message","data":{"text":"sampled 2026-10-14T09:08:07.123+08:00[Asia/Shanghai]; Elapsed since the preceding model-visible message: 12s"}}',
      '{"type":"permission/preset","data":{"source":"agent","preset":"ceo","mode":"workspace-write"}}',
      '{"type":"user/message","data":{"content":[{"type":"text","text":"permission/preset is ordinary user text"}]}}',
    ].join('\n')
    const expected = [
      '{"type":"assistant/message","data":{"text":"sampled <time-context-sample>; Elapsed since the preceding model-visible message: <time-context-elapsed>"}}',
      '{"type":"permission/preset","data":{"source":"agent","preset":"{{posture}}","mode":"{{posture}}"}}',
      '{"type":"user/message","data":{"content":[{"type":"text","text":"permission/preset is ordinary user text"}]}}',
    ].join('\n')

    expect(normalizeReplayTimeContext(raw)).toBe(expected)
  })

  it('reports the first differing record per session in the full replay judge', () => {
    const actual = [
      [
        { type: 'session', data: { id: 'lead-session' } },
        { type: 'team/member', data: { id: 'member-1', role: 'engineer' } },
        { type: 'assistant/message', data: { text: 'Current instructions' } },
      ],
      [{ type: 'user/message', data: { text: 'same task' } }],
    ]
    const expected = [
      [
        { type: 'session', data: { id: 'lead-session' } },
        { type: 'team/member', data: { id: 'member-1', role: 'engineer' } },
        { type: 'assistant/message', data: { text: 'Recorded instructions' } },
      ],
      [{ type: 'user/message', data: { text: 'same task' } }],
    ]

    expect(judgeReplaySessions(actual, expected, 'full')).toEqual([{
      sessionIndex: 0,
      rowIndex: 2,
      expected: { type: 'assistant/message', data: { text: 'Recorded instructions' } },
      actual: { type: 'assistant/message', data: { text: 'Current instructions' } },
    }])
  })

  it('compares sorted member/task rows only in the presence replay judge', () => {
    const actual = [
      [
        { type: 'session', data: { id: 'lead-session' } },
        { type: 'team/task', data: { id: 'task-1', subject: 'Prepare report' } },
        { type: 'team/member', data: { id: 'member-1', role: 'engineer' } },
        { type: 'team/message/queued', data: { id: 'replay-message' } },
        { type: 'assistant/message', data: { text: 'New wording' } },
      ],
      [{ type: 'team/task', data: { id: 'task-1', subject: 'Prepare report' } }],
    ]
    const expected = [
      [
        { type: 'session', data: { id: 'lead-session' } },
        { type: 'team/member', data: { id: 'member-1', role: 'engineer' } },
        { type: 'team/task', data: { id: 'task-1', subject: 'Prepare report' } },
        { type: 'team/message/queued', data: { id: 'recorded-message' } },
        { type: 'assistant/message', data: { text: 'Old wording' } },
      ],
      [
        { type: 'team/member', data: { id: 'member-1', role: 'engineer' } },
        { type: 'team/task', data: { id: 'task-1', subject: 'Prepare report' } },
      ],
    ]

    expect(judgeReplaySessions(actual, expected, 'presence')).toEqual([{
      sessionIndex: 1,
      differingIndex: 0,
      expectedRows: [
        '{"type":"team/member","data":{"id":"member-1","role":"engineer"}}',
        '{"type":"team/task","data":{"id":"task-1","subject":"Prepare report"}}',
      ],
      actualRows: ['{"type":"team/task","data":{"id":"task-1","subject":"Prepare report"}}'],
    }])
  })

  it('treats a missing expected session as an empty fixture in both judges', () => {
    const present = { type: 'user/message', data: { text: 'same task' } }
    const member = { type: 'team/member', data: { id: 'member-2', role: 'analyst' } }
    const actual = [[present], [member]]
    const expected = [[present]]

    expect(judgeReplaySessions(actual, expected, 'full')).toEqual([{
      sessionIndex: 1,
      rowIndex: 0,
      expected: undefined,
      actual: member,
    }])
    expect(judgeReplaySessions(actual, expected, 'presence')).toEqual([{
      sessionIndex: 1,
      differingIndex: 0,
      expectedRows: [],
      actualRows: ['{"type":"team/member","data":{"id":"member-2","role":"analyst"}}'],
    }])
  })
})
