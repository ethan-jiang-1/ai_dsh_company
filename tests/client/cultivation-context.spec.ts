/**
 * 培养背景纯形状的 keyless 判据（RFC 存档 notes/archived/2026-10-23-cultivation-context.md，D1=A）。
 *
 * 为什么单独立一条：命令 token 的编解码与 `contexts` 读模型是 client/host 共用面——
 * 编码错了 = 命令解析失败；解码太松 = 客户端能把摘录从侧门塞进记录（D1 的信任边界）。
 * 浏览器安全是硬约束：`lib/` 会打进 `lib/client.js`，共享模块引 Node `Buffer` 即运行时炸。
 * 红证（先红后绿）：本 spec 在模块存在前 import 即红（见实施 Note 的验证节）。
 */
import { describe, expect, it } from 'vitest'
import {
  CONTEXT_COMMAND_MAX_BYTES,
  CONTEXT_EXCERPT_MAX_CHARS,
  CONTEXT_LABEL_MAX_CHARS,
  CONTEXT_REF_MAX_CHARS,
  CONTEXT_ROLE_MAX_CHARS,
  CONTEXT_TOKEN_MAX_CHARS,
  clipExcerpt,
  secretLikeFindings,
  contextAddressOf,
  contextPayloadText,
  contextSummary,
  decodeContextToken,
  encodeContextToken,
  isSafeContextRef,
  parseContextPayload,
  pickSessionTurn,
  type CultivationContext,
  type CultivationContextRef,
} from '../../packages/company-pack/src/lib/cultivation-context.ts'
import {
  methodSkillText,
  parseRecord,
  recordText,
  type RecordDraft,
} from '../../packages/company-pack/src/lib/cultivation-record.ts'

const sessionRef: CultivationContextRef = {
  kind: 'session',
  ref: 'session-1',
  turn: 3,
  label: '收口检查',
  role: 'ceo',
}

const deliverableRef: CultivationContextRef = {
  kind: 'deliverable',
  ref: 'deliverables/budget-review/final.md',
  label: 'budget-review',
  role: 'cfo',
}

const context: CultivationContext = {
  kind: 'session',
  ref: 'session-1',
  role: 'ceo',
  title: '收口检查',
  subtitle: 'CEO · 第 3 轮',
  at: '2026-10-23T14:02:00.000Z',
  turn: 3,
  excerpt: '用户：收口前把未决项列一下……\n分身：已收口，未决项 0……',
  truncated: false,
}

/** 用浏览器 API 造一个任意 token（decode 的坏输入用）。 */
const tokenOf = (text: string): string => {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

describe('命令 token 编解码（D1=A：只带引用，不带摘录）', () => {
  it('session ref 往返，token 只含 base64url 字符', () => {
    const encoded = encodeContextToken({ v: 1, mode: 'correct', items: [sessionRef] })
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    expect(encoded.token).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(encoded.token.length).toBeLessThanOrEqual(CONTEXT_TOKEN_MAX_CHARS)
    const decoded = decodeContextToken(encoded.token)
    expect(decoded).toEqual({ ok: true, command: { v: 1, mode: 'correct', items: [sessionRef] } })
  })

  it('deliverable ref 往返；CJK/emoji label 不丢', () => {
    const ref: CultivationContextRef = { ...deliverableRef, label: '预算复核 ✅' }
    const encoded = encodeContextToken({ v: 1, mode: 'suggest', targetRole: 'cfo', items: [ref] })
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    expect(decodeContextToken(encoded.token)).toEqual({
      ok: true,
      command: { v: 1, mode: 'suggest', targetRole: 'cfo', items: [ref] },
    })
  })

  it.each([
    ['非 base64url 字符', 'abc$'],
    ['空 token', ''],
    ['长度 %4 == 1', 'A'],
    ['带 = 填充', 'YWJj='],
    ['不是 JSON', tokenOf('not json')],
    ['版本不对', tokenOf(JSON.stringify({ v: 2, mode: 'correct', items: [sessionRef] }))],
    ['未知 kind', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, kind: 'file' }] }))],
    ['items 两段', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [sessionRef, sessionRef] }))],
    ['items 空', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [] }))],
    ['客户端带 excerpt（侧门）', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, excerpt: '伪造' }] }))],
    ['绝对路径', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...deliverableRef, ref: '/etc/passwd' }] }))],
    ['.. 路径', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...deliverableRef, ref: '../x' }] }))],
    ['反斜杠路径', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...deliverableRef, ref: 'a\\b' }] }))],
    ['NUL 路径', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...deliverableRef, ref: 'a\u0000b' }] }))],
    ['空 ref', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, ref: '' }] }))],
    ['turn 负数', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, turn: -1 }] }))],
    ['child 缺 mode', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, parentSessionId: 'parent-1' }] }))],
    ['mode 缺 parent', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, mode: 'continuable' }] }))],
    ['label 超长', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, label: 'x'.repeat(CONTEXT_LABEL_MAX_CHARS + 1) }] }))],
    ['role 超长', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, role: 'x'.repeat(CONTEXT_ROLE_MAX_CHARS + 1) }] }))],
    ['ref 超长', tokenOf(JSON.stringify({ v: 1, mode: 'correct', items: [{ ...sessionRef, ref: 'a'.repeat(CONTEXT_REF_MAX_CHARS + 1) }] }))],
  ])('坏 token：%s', (_label, token) => {
    const decoded = decodeContextToken(token)
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.problem.length).toBeGreaterThan(0)
  })

  it('编码侧超 2,000 字节拒收，不静默截断', () => {
    const huge: CultivationContextRef = {
      kind: 'session',
      ref: 's'.repeat(CONTEXT_REF_MAX_CHARS),
      parentSessionId: 'p'.repeat(CONTEXT_REF_MAX_CHARS),
      mode: 'continuable',
      label: '😀'.repeat(CONTEXT_LABEL_MAX_CHARS),
      role: '😀'.repeat(CONTEXT_ROLE_MAX_CHARS),
      turn: 1,
    }
    const encoded = encodeContextToken({ v: 1, mode: 'correct', items: [huge] })
    expect(encoded.ok).toBe(false)
    if (!encoded.ok) expect(encoded.problem).toContain(String(CONTEXT_COMMAND_MAX_BYTES))
  })

  it('共享模块不依赖 Node Buffer（浏览器半可打包）', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'Buffer')
    try {
      Object.defineProperty(globalThis, 'Buffer', { value: undefined, configurable: true, writable: true })
      const encoded = encodeContextToken({ v: 1, mode: 'correct', items: [{ ...sessionRef, label: '中文 ✅' }] })
      expect(encoded.ok).toBe(true)
      if (encoded.ok) expect(decodeContextToken(encoded.token).ok).toBe(true)
    } finally {
      if (descriptor === undefined) delete (globalThis as { Buffer?: unknown }).Buffer
      else Object.defineProperty(globalThis, 'Buffer', descriptor)
    }
  })
})

describe('ref 安全判据', () => {
  it('session 只认 [A-Za-z0-9._:-]', () => {
    expect(isSafeContextRef('session', 'session-1')).toBe(true)
    expect(isSafeContextRef('session', 'a b')).toBe(false)
    expect(isSafeContextRef('session', 'a/b')).toBe(false)
  })

  it('deliverable 只认工作区相对路径', () => {
    expect(isSafeContextRef('deliverable', 'deliverables/x/final.md')).toBe(true)
    expect(isSafeContextRef('deliverable', '/abs')).toBe(false)
    expect(isSafeContextRef('deliverable', 'a/../b')).toBe(false)
    expect(isSafeContextRef('deliverable', 'a//b')).toBe(false)
    expect(isSafeContextRef('deliverable', './a/b')).toBe(false)
    expect(isSafeContextRef('deliverable', 'a\\b')).toBe(false)
  })
})

describe('记录 contexts 读模型', () => {
  it('缺失 = 空数组且无 problem（旧记录）', () => {
    expect(parseContextPayload(undefined)).toEqual({ contexts: [], problem: null })
    expect(parseContextPayload('')).toEqual({ contexts: [], problem: null })
  })

  it('合法 JSON → 同一数组；单行文本可解析', () => {
    const text = contextPayloadText([context])
    expect(text.includes('\n')).toBe(false)
    expect(parseContextPayload(text)).toEqual({ contexts: [context], problem: null })
  })

  it('坏 JSON → 记录仍可读，problem 非空', () => {
    const parsed = parseContextPayload('{not json')
    expect(parsed.contexts).toEqual([])
    expect(parsed.problem).not.toBeNull()
    expect(parsed.problem).toContain('JSON')
  })

  it('坏形状（未知 kind / 缺 excerpt / 超长 excerpt）→ problem，不抛', () => {
    const bad = JSON.stringify({ v: 1, items: [{ ...context, kind: 'file' }] })
    expect(parseContextPayload(bad).problem).not.toBeNull()
    const noExcerpt = JSON.stringify({ v: 1, items: [{ ...context, excerpt: undefined }] })
    expect(parseContextPayload(noExcerpt).problem).not.toBeNull()
    const tooLong = JSON.stringify({ v: 1, items: [{ ...context, excerpt: '汉'.repeat(CONTEXT_EXCERPT_MAX_CHARS + 1) }] })
    expect(parseContextPayload(tooLong).problem).not.toBeNull()
  })
})

describe('截取 / 摘要 / 地址', () => {
  it('短文本不截断；长文本 head+tail 且标 truncated', () => {
    expect(clipExcerpt('短', 10)).toEqual({ text: '短', truncated: false })
    const clipped = clipExcerpt('a'.repeat(100), 20)
    expect(clipped.truncated).toBe(true)
    expect(clipped.text.startsWith('a'.repeat(14))).toBe(true)
    expect(clipped.text.endsWith('a'.repeat(6))).toBe(true)
    expect(clipped.text).toContain('…')
  })

  it('人话摘要', () => {
    expect(contextSummary(context)).toBe('会话「收口检查」')
    expect(contextSummary({ ...context, kind: 'deliverable', title: 'budget-review', subtitle: '已采纳' }))
      .toBe('成品「budget-review」（已采纳）')
  })

  it('根会话 / 子会话 address', () => {
    expect(contextAddressOf({ kind: 'session', ref: 'session-1' }))
      .toEqual({ kind: 'session', sessionId: 'session-1' })
    expect(contextAddressOf({ kind: 'session', ref: 'child-1', parentSessionId: 'parent-1', mode: 'continuable' }))
      .toEqual({ kind: 'subagent', parentSessionId: 'parent-1', childSessionId: 'child-1', mode: 'continuable' })
    expect(contextAddressOf({ kind: 'deliverable', ref: 'deliverables/x/final.md' })).toBeNull()
  })
})


describe('记录往返：contexts / 空正文 / 方法回落', () => {
  const draft: RecordDraft = {
    kind: 'suggestion',
    targetRole: 'cfo',
    proposerRole: 'ceo',
    proposerKind: 'human',
    source: '会话「收口检查」',
    expectation: '结论先列假设，再给数字',
    body: '',
    contexts: [context],
  }

  it('recordText → parseRecord 读回同一 contexts 数组；坏 JSON 不丢记录', () => {
    const text = recordText(draft)
    expect(text).toContain('contexts: ')
    const parsed = parseRecord('20261023-140200-abcd', text)
    expect(parsed).not.toBeNull()
    expect(parsed?.contexts).toEqual([context])
    expect(parsed?.contextProblem).toBeNull()
    expect(parsed?.body).toBe('')
  })

  it('旧记录（无 contexts）→ []，其余字段不变', () => {
    const text = recordText({ ...draft, contexts: undefined })
    expect(text).not.toContain('contexts:')
    const parsed = parseRecord('20261023-140200-abcd', text)
    expect(parsed?.contexts).toEqual([])
    expect(parsed?.contextProblem).toBeNull()
    expect(parsed?.expectation).toBe(draft.expectation)
  })

  it('坏 contexts JSON → 记录仍在，contextProblem 非空，source 照常', () => {
    const text = recordText({ ...draft, contexts: undefined }).replace('status: open', 'status: open\ncontexts: {bad json')
    const parsed = parseRecord('20261023-140200-abcd', text)
    expect(parsed).not.toBeNull()
    expect(parsed?.contexts).toEqual([])
    expect(parsed?.contextProblem).not.toBeNull()
    expect(parsed?.source).toBe('会话「收口检查」')
  })

  it('methodSkillText：空正文回落到期望句；有正文仍只用正文', () => {
    const empty = methodSkillText({ slug: 'x', expectation: '收口前逐项列出未决项', body: '' })
    expect(empty).toContain('收口前逐项列出未决项')
    expect(empty.trim().endsWith('收口前逐项列出未决项')).toBe(true)
    const full = methodSkillText({ slug: 'x', expectation: '收口前逐项列出未决项', body: '具体做法：先列清单，再逐项确认。' })
    expect(full).toContain('具体做法：先列清单，再逐项确认。')
    expect(full.trim().endsWith('收口前逐项列出未决项')).toBe(false)
  })
})


describe('会话轮次投影（host 读与客户端预览共用）', () => {
  const ev = (type: string, data: unknown, time = '2026-10-23T14:02:00.000Z') => ({ type, data, time })
  const events = [
    ev('turn/start', { turn: 1 }),
    ev('user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: '第一轮用户' }] }),
    ev('assistant/message', { turn: 1, step: 1, message: { content: [{ type: 'text', text: '第一轮分身' }] } }),
    ev('tool/call', { turn: 1, name: 'read', arguments: '{}' }),
    ev('turn/start', { turn: 2 }),
    ev('user/message', { source: { kind: 'compact-checkpoint' }, content: [{ type: 'text', text: '压缩摘要' }] }),
    ev('user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: '第二轮用户' }] }),
    ev('reasoning', { turn: 2, text: '思考' }),
    ev('assistant/message', { turn: 2, step: 1, message: { content: [{ type: 'text', text: '第二轮分身' }, { type: 'tool-call', name: 'read', arguments: '{}' }] } }),
  ]

  it('缺省取最近一轮，只含用户/助手文字', () => {
    const picked = pickSessionTurn(events)
    expect(picked?.turn).toBe(2)
    expect(picked?.text).toContain('第二轮用户')
    expect(picked?.text).toContain('第二轮分身')
    expect(picked?.text).not.toContain('压缩摘要')
    expect(picked?.text).not.toContain('思考')
    expect(picked?.text).not.toContain('tool-call')
  })

  it('指定轮次可取；不存在的轮次给 null', () => {
    expect(pickSessionTurn(events, 1)?.text).toContain('第一轮用户')
    expect(pickSessionTurn(events, 99)).toBeNull()
  })

  it('空会话/只有工具调用 → null', () => {
    expect(pickSessionTurn([])).toBeNull()
    expect(pickSessionTurn([ev('turn/start', { turn: 1 }), ev('tool/call', { turn: 1, name: 'read', arguments: '{}' })])).toBeNull()
  })

  it('at 取该轮末条文字事件的时间', () => {
    const picked = pickSessionTurn([ev('user/message', { source: { kind: 'user' }, content: [{ type: 'text', text: 'x' }] }, '2026-10-23T14:00:00.000Z')])
    expect(picked?.at).toBe('2026-10-23T14:00:00.000Z')
  })
})


describe('背景密钥样式扫描（2026-10-27 F9）', () => {
  it('只报类别不回显值；干净文本空', () => {
    expect(secretLikeFindings('普通讨论：先列假设')).toEqual([])
    const findings = secretLikeFindings('api_key = sk-abcdefghijklmnop1234\nAuthorization: Bearer abcdefghijklmnopqrstuvwxyz')
    expect(findings).toContain('sk- token')
    expect(findings).toContain('Bearer token')
    expect(findings).toContain('password/secret 赋值')
    expect(findings.join(' ')).not.toContain('abcdefghijklmnop')
  })
})
