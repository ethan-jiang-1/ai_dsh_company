import { describe, expect, it } from 'vitest'
import { judgeReplaySessions, normalizeReplayTempPaths, normalizeReplayTimeContext } from '../../tools/lib/replay-logic.mjs'

describe('replay fixture normalization and judgements', () => {
  it('stabilizes volatile time and posture values while retaining posture source', () => {
    const raw = [
      '{"type":"assistant/message","data":{"text":"sampled 2026-10-14T09:08:07.123+08:00[Asia/Shanghai]; Elapsed since the preceding model-visible message: 12s"}}',
      '{"type":"permission/preset","data":{"source":"agent","preset":"ceo","mode":"workspace-write"}}',
      '{"type":"session-log-deepseek/delivery-accepted","seq":39,"data":{"sessionId":"session-abc","sessionFormatVersion":4,"throughSeq":37}}',
      '{"type":"user/message","data":{"content":[{"type":"text","text":"permission/preset is ordinary user text"}]}}',
      // 与真实 fixture 同形：整行是序列化结果，内层引号必须转义（否则不是合法 JSONL）。
      JSON.stringify({ type: 'user/message', data: { content: [{ type: 'text', text: 'Current runtime context. Current DeepSeek Harness implementation checkout: "/Users/someone/vendor/dsh/". Current DeepSeek Harness Web GUI URL: "http://127.0.0.1:52770".' }], source: { sections: [
        { name: 'harness:source', text: 'Current DeepSeek Harness implementation checkout: "/Users/someone/vendor/dsh/".' },
        { name: 'app:web-surface', text: 'Current DeepSeek Harness Web GUI URL: "http://127.0.0.1:52770".' },
      ] } } }),
    ].join('\n')
    const expected = [
      '{"type":"assistant/message","data":{"text":"sampled <time-context-sample>; Elapsed since the preceding model-visible message: <time-context-elapsed>"}}',
      '{"type":"permission/preset","data":{"source":"agent","preset":"{{posture}}","mode":"{{posture}}"}}',
      '{"type":"session-log-deepseek/delivery-accepted","seq":39,"data":{"sessionId":"session-abc","sessionFormatVersion":4,"throughSeq":37}}',
      '{"type":"user/message","data":{"content":[{"type":"text","text":"permission/preset is ordinary user text"}]}}',
      JSON.stringify({ type: 'user/message', data: { content: [{ type: 'text', text: 'Current runtime context. Current DeepSeek Harness implementation checkout: "<harness-source>". Current DeepSeek Harness Web GUI URL: "<web-surface>".' }], source: { sections: [
        { name: 'harness:source', text: '<harness-source>' },
        { name: 'app:web-surface', text: '<web-surface>' },
      ] } } }),
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

// 2026-10-23：r3 第七次重录后 replay 全红——模型把「工作目录已切换到 <临时重放目录>」复述进了回复正文，
// 而重放目录每次运行都是新的（dsh-replay-<场景>-<随机>）。这是环境噪音，不是场景语义，两侧对称 token 化。
describe('replay temp workspace path normalization', () => {
  it('把回复正文里的 dsh-replay-<场景>-<随机> 换成稳定 token', () => {
    const raw = '收到（VP-Eng 已就位，工作目录已切换到 /private/var/folders/x/T/dsh-replay-r3-delegation-avsDnB）。'
    const out = normalizeReplayTempPaths(raw)
    expect(out).toContain('{{replay-root}}')
    expect(out).not.toContain('avsDnB')
  })
})

describe('replay temp path normalization · 不碰 cwd 字段', () => {
  it('JSON 引号结尾的 cwd 留给 vendor 的 {{cwd}} 归一化', () => {
    const header = '{"cwd":"/private/var/folders/x/T/dsh-replay-r3-delegation-avsDn"}'
    expect(normalizeReplayTempPaths(header)).toContain('avsDn')
    expect(normalizeReplayTempPaths(header)).not.toContain('{{replay-root}}')
  })
})
