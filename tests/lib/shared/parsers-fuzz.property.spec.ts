// 负例留证 2026-11-23：在 startup-settings.ts 删掉 `settingsFieldProblem` 或数组元素校验 ⇒ 布尔/复杂对象/数组畸形 fuzz 当场红；在 deliverables-index.ts 移除 `trim()` 或 `optionalStringKeys` 校验 ⇒ `entries.length + skipped === total` 守恒红；在 deliverables-catalog.ts 放行 `kickoff:` 空串 ⇒ TS/JS 与空值诊断 fuzz 红；在 attention.ts 去掉 `isRecord`/`Array.isArray` 校验 ⇒ `questionListOf('{"questions":123}')` 异常或空处理失效；还原即全绿。
/**
 * 六大核心解析器的结构化畸形 Fuzz 与往返性质矩阵（Tier 1-1，零新 npm 依赖）。
 *
 * 覆盖：
 * 1. `parseStartupSettingsState` / `serializeStartupSettings`
 * 2. `parseStartupOptionsState` / `serializeStartupOptions`
 * 3. `parseMotionLedger`
 * 4. `parseCatalog` + `metaProblemsOf`（TS ↔ JS 生成器同口径差分）
 * 5. `parseRecord` / `recordText` / `encodeVerificationHistory`
 * 6. `pendingAsks` / `pendingApprovals` / `pendingQuestions` / `questionListOf` / `questionsFromPayload`
 */
import { describe, expect, it } from 'vitest'
import { parseCatalog } from '../../../packages/company-pack/src/client/data/deliverables-index.ts'
import { parseMotionLedger } from '../../../packages/company-pack/src/lib/accounting/ledger.ts'
import {
  encodeVerificationHistory,
  parseRecord,
  recordText,
} from '../../../packages/company-pack/src/lib/cultivation/cultivation-record.ts'
import {
  META_RESULTS,
  META_TYPES,
  metaProblemsOf as metaProblemsTs,
} from '../../../packages/company-pack/src/lib/deliverables/deliverables-catalog.ts'
import {
  ASK_TOOL_NAME,
  pendingApprovals,
  pendingAsks,
  pendingQuestions,
  questionListOf,
  questionsFromPayload,
  STREAM_ITEM_CAP,
  type AttentionEventLike,
} from '../../../packages/company-pack/src/lib/presence/attention.ts'
import { takeBounded } from '../../../packages/company-pack/src/lib/shared/bounded.ts'
import { RUN_BUNDLE_PATHS } from '../../../packages/company-pack/src/lib/shared/run-bundle-paths.ts'
import {
  parseStartupOptionsState,
  parseStartupSettingsState,
  serializeStartupOptions,
  serializeStartupSettings,
} from '../../../packages/company-pack/src/lib/startup/startup-settings.ts'
import { metaProblemsOf as metaProblemsJs } from '../../../tools/lib/company/deliverables-catalog.mjs'

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T>(rng: () => number, items: readonly T[]): T => items[Math.floor(rng() * items.length)]!
const CASE_COUNT = 120

const NON_STRING_VALUES: readonly unknown[] = [true, false, {}, { nested: 'x' }, [], ['a']]

describe('takeBounded 边界原语守恒性质', () => {
  it('任意长度与上限满足 items.length + capped === source.length', () => {
    const rng = mulberry32(20261123)
    const caps = [0, -5, 1, 3, 8, 50, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]
    for (let i = 0; i < CASE_COUNT; i++) {
      const len = Math.floor(rng() * 40)
      const source = Array.from({ length: len }, (_, k) => `item-${String(k)}`)
      const cap = pick(rng, caps)
      const mode = rng() < 0.5 ? 'head' : 'tail'
      const bounded = takeBounded(source, cap, mode)
      expect(bounded.total).toBe(len)
      expect(bounded.items.length + bounded.capped).toBe(len)
      expect(bounded.truncated).toBe(bounded.capped > 0)
      if (bounded.items.length > 0) {
        expect(bounded.items[0]).toBe(mode === 'head' ? source[0] : source[len - bounded.items.length])
      }
    }
  })
})

describe('1. startup-settings 畸形 Fuzz 与往返性质', () => {
  it('损坏 JSON / 非对象 / 错版本 / 非字符串字段绝不静默折成 auto', () => {
    const rng = mulberry32(101)
    const badJson = ['{', '{"v":1', 'null', '[]', '123', '"str"', 'true']
    for (const raw of badJson) {
      expect(parseStartupSettingsState(raw).problem).toBe('corrupt')
    }
    expect(parseStartupSettingsState(JSON.stringify({ v: 2 })).problem).toBe('unsupported')
    expect(parseStartupSettingsState(JSON.stringify({ v: '1' })).problem).toBe('corrupt')

    const fields = ['productType', 'deliveryMode', 'wiki'] as const
    for (let i = 0; i < CASE_COUNT; i++) {
      const target = pick(rng, fields)
      const bad = pick(rng, NON_STRING_VALUES)
      const state = parseStartupSettingsState(JSON.stringify({ v: 1, [target]: bad }))
      expect(state.problem, `field=${target} value=${JSON.stringify(bad)}`).toBe('corrupt')
      expect(state.field).toBe(target)
    }
  })

  it('合法设置经 serializeStartupSettings → parseStartupSettingsState 往返一致且零诊断', () => {
    const rng = mulberry32(102)
    const scalars = [null, 'business-software', '  ', '<未定>', 'managed-service', 'docs/wiki']
    for (let i = 0; i < CASE_COUNT; i++) {
      const raw = {
        v: 1 as const,
        productType: pick(rng, scalars),
        deliveryMode: pick(rng, scalars),
        wiki: pick(rng, scalars),
        updatedAt: rng() < 0.5 ? null : '2026-11-23T06:00:00.000Z',
      }
      const normalized = parseStartupSettingsState(JSON.stringify(raw))
      expect(normalized.problem).toBeNull()
      const text = serializeStartupSettings(normalized.settings)
      const roundTripped = parseStartupSettingsState(text)
      expect(roundTripped.problem).toBeNull()
      expect(roundTripped.settings).toEqual(normalized.settings)
    }
  })
})

describe('2. startup-options 畸形 Fuzz 与往返性质', () => {
  it('损坏 JSON / 坏元素数组 / 非对象 wikiCheck 均报 unreadable', () => {
    const rng = mulberry32(201)
    for (const raw of ['{', 'null', '[]', '42', '"oops"']) {
      expect(parseStartupOptionsState(raw).problem).toBe('unreadable')
    }
    const fields = ['productTypes', 'deliveryModes'] as const
    for (let i = 0; i < CASE_COUNT; i++) {
      const field = pick(rng, fields)
      const badElement = pick(rng, [123, true, {}, [], null])
      const payload = rng() < 0.5
        ? { v: 1, [field]: pick(rng, ['str', 5, {}]) }
        : { v: 1, [field]: ['ok', badElement] }
      const state = parseStartupOptionsState(JSON.stringify(payload))
      expect(state.problem).toBe('unreadable')
      expect(state.field).toBe(field)

      const badWiki = pick(rng, ['bad', 123, true, []])
      expect(parseStartupOptionsState(JSON.stringify({ v: 1, wikiCheck: badWiki })).problem).toBe('unreadable')
    }
  })

  it('合法 options 序列化往返保持幂等且 problem=null', () => {
    const rng = mulberry32(202)
    for (let i = 0; i < CASE_COUNT; i++) {
      const options = {
        productTypes: Array.from({ length: Math.floor(rng() * 5) }, (_, k) => `pt-${String(k)}`),
        deliveryModes: ['productized', 'project-services'],
        wikiCheck: {
          value: rng() < 0.5 ? null : '/tmp/wiki',
          ok: rng() < 0.5,
          problem: pick(rng, [null, 'missing', 'not-directory', 'no-index'] as const),
          location: pick(rng, [null, 'inside', 'outside'] as const),
          checkedAt: rng() < 0.5 ? null : '2026-11-23T00:00:00.000Z',
        },
        wikiTemplate: rng() < 0.5 ? null : '/pack/wiki-template',
      } as const
      const serialized = serializeStartupOptions(options)
      const parsed = parseStartupOptionsState(serialized)
      expect(parsed.problem).toBeNull()
      expect(parseStartupOptionsState(serializeStartupOptions(parsed.options)).options).toEqual(parsed.options)
    }
  })
})

describe('3. parseMotionLedger 畸形 Fuzz 矩阵', () => {
  const CANONICAL = ['slug', 'date', 'type', 'participants', 'wallClock', 'deliverable', 'summary']
  const LEGACY = ['slug', '日期', '类型', '参与', '墙钟', '成品', '一句话结论']

  it('任意合法 7 列行 + 坏列数行混排：坏行数与行号精确守恒', () => {
    const rng = mulberry32(301)
    for (let i = 0; i < CASE_COUNT; i++) {
      const header = rng() < 0.7 ? CANONICAL : LEGACY
      const lines = [
        '# ledger',
        `| ${header.join(' | ')} |`,
        `|${header.map(() => '---').join('|')}|`,
      ]
      let expectedValid = 0
      const expectedBad: Array<{ line: number; cells: number; reason: 'cell-count' }> = []
      const rowCount = 1 + Math.floor(rng() * 15)
      for (let r = 0; r < rowCount; r++) {
        if (rng() < 0.15) {
          lines.push(`正文段落 ${String(r)}`)
          continue
        }
        const cellCount = pick(rng, [1, 2, 5, 6, 7, 7, 7, 8, 10])
        const cells = Array.from({ length: cellCount }, (_, c) => `v-${String(r)}-${String(c)}`)
        const trailingPipe = rng() < 0.8 ? ' |' : ''
        lines.push(`| ${cells.join(' | ')}${trailingPipe}`)
        const lineNo = lines.length
        if (cellCount === 7) expectedValid += 1
        else expectedBad.push({ line: lineNo, cells: cellCount, reason: 'cell-count' })
      }
      const parsed = parseMotionLedger(lines.join('\n'))
      expect(parsed.headerOk).toBe(true)
      expect(parsed.rows).toHaveLength(expectedValid)
      expect(parsed.badRows).toEqual(expectedBad)
    }
  })

  it('表头任一列被篡改（含表格行）必报 headerOk=false 且 rows=[]', () => {
    const rng = mulberry32(302)
    for (let i = 0; i < CASE_COUNT; i++) {
      const base = [...(rng() < 0.5 ? CANONICAL : LEGACY)]
      const col = Math.floor(rng() * base.length)
      base[col] = `${base[col]}_typo`
      const text = `| ${base.join(' | ')} |\n|---|---|---|---|\n| a | b | c | d | e | f | g |`
      const parsed = parseMotionLedger(text)
      expect(parsed.headerOk).toBe(false)
      expect(parsed.rows).toEqual([])
    }
  })
})

describe('4. parseCatalog & metaProblemsOf 畸形 Fuzz 与双端差分', () => {
  it('混合好/坏 entries 永远满足 entries.length + skipped === total', () => {
    const rng = mulberry32(401)
    for (let i = 0; i < CASE_COUNT; i++) {
      const n = Math.floor(rng() * 16)
      const entries: unknown[] = []
      let validExpected = 0
      for (let j = 0; j < n; j++) {
        const mode = pick(rng, [
          'valid', 'valid', 'valid',
          'null', 'primitive', 'empty-slug', 'ws-slug', 'empty-path', 'ws-path',
          'bad-root', 'bad-ledgered', 'bad-presented', 'bad-type-field', 'bad-metaProblem',
        ] as const)
        if (mode === 'valid') {
          validExpected += 1
          entries.push({
            slug: `s-${String(j)}`,
            path: `${RUN_BUNDLE_PATHS.deliverables}/s-${String(j)}/final.md`,
            root: rng() < 0.5 ? RUN_BUNDLE_PATHS.deliverables : RUN_BUNDLE_PATHS.archive,
            ledgered: rng() < 0.5,
            presented: pick(rng, [true, false, null]),
            kickoff: '2026-11-23',
            type: 'decision',
            result: 'accepted',
            summary: 'ok',
            dir: `2026-11-23-s-${String(j)}`,
            metaProblem: rng() < 0.5 ? null : 'bad meta',
          })
        } else if (mode === 'null') entries.push(null)
        else if (mode === 'primitive') entries.push('oops')
        else if (mode === 'empty-slug') entries.push({ slug: '', path: 'a/b' })
        else if (mode === 'ws-slug') entries.push({ slug: '   ', path: 'a/b' })
        else if (mode === 'empty-path') entries.push({ slug: 'x', path: '' })
        else if (mode === 'ws-path') entries.push({ slug: 'x', path: ' \t ' })
        else if (mode === 'bad-root') entries.push({ slug: 'x', path: 'a/b', root: 'invalid' })
        else if (mode === 'bad-ledgered') entries.push({ slug: 'x', path: 'a/b', ledgered: 'false' })
        else if (mode === 'bad-presented') entries.push({ slug: 'x', path: 'a/b', presented: 'true' })
        else if (mode === 'bad-type-field') entries.push({ slug: 'x', path: 'a/b', [pick(rng, ['kickoff', 'type', 'result', 'summary', 'dir'])]: 123 })
        else entries.push({ slug: 'x', path: 'a/b', metaProblem: 42 })
      }
      const parsed = parseCatalog(JSON.stringify({ schema: 1, generatedAt: '2026-11-23T00:00:00Z', entries }))
      expect(parsed).not.toBeNull()
      expect(parsed!.entries).toHaveLength(validExpected)
      expect(parsed!.entries.length + parsed!.skipped).toBe(n)
    }
    for (const badRoot of ['{', 'null', '[]', '{"schema":2,"entries":[]}', '{"schema":1,"entries":"no"}']) {
      expect(parseCatalog(badRoot)).toBeNull()
    }
  })

  it('metaProblemsOf TS/JS 两侧随机输入完全等价（含空白必填字段）', () => {
    const rng = mulberry32(402)
    const kickoffs = [undefined, '', '   ', '2026-11-23', '2026/11/23', 'bad']
    const types = [undefined, '', '  ', ...META_TYPES, 'unknown']
    const results = [undefined, '', '  ', ...META_RESULTS, 'done']
    for (let i = 0; i < CASE_COUNT; i++) {
      const map = new Map<string, string>()
      const k = pick(rng, kickoffs)
      const t = pick(rng, types)
      const r = pick(rng, results)
      if (k !== undefined) map.set('kickoff', k)
      if (t !== undefined) map.set('type', t)
      if (r !== undefined) map.set('result', r)
      const tsProblems = metaProblemsTs(map)
      const jsProblems = metaProblemsJs(map)
      expect(tsProblems).toEqual(jsProblems)
      // BUG-371：result 留空 = 合法（未收口），只有「非空且不在词表」才算问题。
      const hasBlankOrBad = (k ?? '').trim() === '' || !/^\d{4}-\d{2}-\d{2}$/.test((k ?? '').trim())
        || (t ?? '').trim() === '' || !(META_TYPES as readonly string[]).includes((t ?? '').trim())
        || ((r ?? '').trim() !== '' && !(META_RESULTS as readonly string[]).includes((r ?? '').trim()))
      expect(tsProblems.length > 0).toBe(hasBlankOrBad)
      if ((k ?? '').trim() === '') {
        expect(tsProblems.filter(p => p.includes('kickoff'))).toEqual(['缺行「kickoff:」'])
      }
    }
  })
})

describe('5. parseRecord 畸形 Fuzz 与往返诊断保留', () => {
  it('缺 frontmatter / 必填缺失或无效枚举一律返回 null', () => {
    const rng = mulberry32(501)
    const required = ['kind', 'targetRole', 'proposerRole', 'proposerKind', 'expectation'] as const
    for (let i = 0; i < CASE_COUNT; i++) {
      const base: Record<string, string> = {
        schema: '1',
        kind: pick(rng, ['correction', 'suggestion']),
        targetRole: 'ceo',
        proposerRole: 'vp-eng',
        proposerKind: pick(rng, ['human', 'agent']),
        expectation: 'Check boundaries before signoff',
        status: 'open',
      }
      const mode = pick(rng, ['no-fm', 'drop-req', 'empty-req', 'bad-kind', 'bad-status', 'bad-schema', 'bad-verif'])
      if (mode === 'no-fm') {
        expect(parseRecord('r1', 'plain body without frontmatter')).toBeNull()
        continue
      }
      if (mode === 'drop-req') delete base[pick(rng, required)]
      else if (mode === 'empty-req') base[pick(rng, required)] = ''
      else if (mode === 'bad-kind') base.kind = 'bogus'
      else if (mode === 'bad-status') base.status = 'archived'
      else if (mode === 'bad-schema') base.schema = pick(rng, ['0', '-1', 'NaN', '1.5'])
      else base.verification = 'broken'
      const md = `---\n${Object.entries(base).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\nBody text`
      expect(parseRecord('r1', md)).toBeNull()
    }
  })

  it('损坏 verificationHistory / contexts 必带出非空 Problem 且不丢核心记录；合法记录往返一致', () => {
    const validDraft = {
      kind: 'correction' as const,
      targetRole: 'ceo',
      proposerRole: 'vp-eng',
      proposerKind: 'agent' as const,
      source: 'session-1',
      work: 'Audit round',
      expectation: 'Check caps cleanly',
      body: 'Full body details.',
    }
    const validText = recordText(validDraft)
    const parsed = parseRecord('20261123-100000-abcd', validText)
    expect(parsed).not.toBeNull()
    expect(parsed?.contextProblem).toBeNull()
    expect(parsed?.verificationHistoryProblem).toBeNull()
    expect(parsed?.expectation).toBe(validDraft.expectation)
    expect(parsed?.body).toBe(validDraft.body)

    const validHistory = encodeVerificationHistory([{ outcome: 'pass', evidence: 'verified', at: '2026-11-23T00:00:00Z' }])
    const badPayloads = ['%E0%A4%A', 'not-json', encodeURIComponent(JSON.stringify([{ outcome: 'bad' }])), encodeURIComponent('{}')]
    for (const bad of badPayloads) {
      const injected = validText.replace('status: open', `status: adopted\nverification: pass\nverificationHistory: ${bad}\ncontexts: %ZZ`)
      const out = parseRecord('20261123-100000-abcd', injected)
      expect(out).not.toBeNull()
      expect(out?.verificationHistoryProblem).not.toBeNull()
      expect(out?.contextProblem).not.toBeNull()
    }
    const goodHistText = validText.replace('status: open', `status: adopted\nverification: pass\nverificationHistory: ${validHistory}`)
    expect(parseRecord('r-good', goodHistText)?.verificationHistory).toHaveLength(1)
  })
})

describe('6. attention 解析与有界重建畸形 Fuzz', () => {
  it('任意畸形 event / payload 永不抛错且 items.length + capped === openCount', () => {
    const rng = mulberry32(601)
    for (let i = 0; i < CASE_COUNT; i++) {
      const events: AttentionEventLike[] = []
      const expectedOpenApprovals = new Set<string>()
      const expectedOpenQuestions = new Set<string>()
      const n = Math.floor(rng() * 25)
      for (let step = 0; step < n; step++) {
        const kind = pick(rng, ['bad-null', 'bad-prim', 'asked', 'decided', 'q-call', 'q-bad-args', 'q-result', 'unknown'])
        if (kind === 'bad-null') {
          events.push({ type: 'approval/asked', time: step, data: null })
          events.push({ type: 'tool/call', time: step, data: null })
        } else if (kind === 'bad-prim') {
          events.push({ type: 'tool/call', time: step, data: 123 })
          expect(questionListOf(pick(rng, [undefined, '', '{', 'null', '123', '{"questions":123}', '{"questions":[null]}']))).toEqual([])
          expect(questionsFromPayload(pick(rng, [null, 123, 'str', { questions: 'bad' }, { questions: [123, { question: '  ' }] }]))).toEqual([])
        } else if (kind === 'asked') {
          const id = `a-${String(step % 9)}`
          events.push({ type: 'approval/asked', time: step + 100, data: { id, toolName: rng() < 0.8 ? 'bash' : '', reason: 'why' } })
          expectedOpenApprovals.add(id)
        } else if (kind === 'decided') {
          const id = `a-${String(step % 9)}`
          events.push({ type: 'approval/decided', time: step + 100, data: { id } })
          expectedOpenApprovals.delete(id)
        } else if (kind === 'q-call') {
          const callId = `q-${String(step % 9)}`
          const args = JSON.stringify({ questions: [{ question: 'Pick one?' }] })
          events.push({ type: 'tool/call', time: step + 100, data: { callId, name: ASK_TOOL_NAME, arguments: args } })
          expectedOpenQuestions.add(callId)
        } else if (kind === 'q-bad-args') {
          const callId = `q-${String(step % 9)}`
          events.push({ type: 'tool/call', time: step + 100, data: { callId, name: ASK_TOOL_NAME, arguments: '{"questions":123}' } })
          expectedOpenQuestions.add(callId)
        } else if (kind === 'q-result') {
          const callId = `q-${String(step % 9)}`
          events.push({ type: 'tool/result', time: step + 100, data: { callId } })
          expectedOpenQuestions.delete(callId)
        } else {
          events.push({ type: 'turn/start', time: step, data: {} })
        }
      }
      const ap = pendingApprovals(events, 's1')
      expect(ap.items.length).toBeLessThanOrEqual(STREAM_ITEM_CAP)
      expect(ap.items.length + ap.capped).toBe(expectedOpenApprovals.size)

      const qs = pendingQuestions(events, 's1')
      expect(qs).toHaveLength(expectedOpenQuestions.size)

      const all = pendingAsks(events, 's1')
      expect(all.items.length).toBeLessThanOrEqual(STREAM_ITEM_CAP)
      expect(all.items.length + all.capped).toBe(expectedOpenApprovals.size + expectedOpenQuestions.size)
    }
  })
})

// 负例留证 2026-11-24：放宽任一收紧 ⇒ 本组对应用例红（`v:999`/`wikiTemplate:123` 折成 auto、空行被当分隔行、空白 metaProblem 原样、空 callId 进面板）。BUG-339
describe('7. 解析器边缘坏形状（BUG-339）', () => {
  it('startup-options：非 1 版本 / 非串 wikiTemplate / 坏 wikiCheck 子字段都报 unreadable', () => {
    for (const payload of [
      { v: 999, productTypes: ['a'] },
      { v: 1, wikiTemplate: 123 },
      { v: 1, wikiCheck: { ok: 'yes', problem: 'bogus', value: {} } },
      { v: 1, wikiCheck: { ok: true, problem: 7 } },
    ]) {
      expect(parseStartupOptionsState(JSON.stringify(payload)).problem).toBe('unreadable')
    }
  })

  it('ledger：全空 7 列行不再被当分隔行吞掉，计入 badRows', () => {
    const text = '| slug | date | type | participants | wallClock | deliverable | summary |\n|---|---|---|---|---|---|---|\n| | | | | | | |'
    const parsed = parseMotionLedger(text)
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.badRows).toEqual([{ line: 3, cells: 7, reason: 'empty-row' }])
  })

  it('catalog：空白 metaProblem 归一为 null；非串 generatedAt 整份拒绝', () => {
    const catalog = {
      schema: 1,
      generatedAt: '2026-11-24T00:00:00.000Z',
      entries: [{ slug: 'a', path: '.dsh-company/deliverables/a/final.md', metaProblem: '   ' }],
    }
    expect(parseCatalog(JSON.stringify(catalog))?.entries[0]?.metaProblem).toBeNull()
    expect(parseCatalog(JSON.stringify({ ...catalog, generatedAt: 123 }))).toBeNull()
  })

  it('attention：空串 callId 与 approval 同口径，不进挂起问询', () => {
    const items = pendingQuestions([{
      type: 'tool/call',
      time: 1,
      data: { callId: '', name: ASK_TOOL_NAME, arguments: '{"questions":[{"question":"hi"}]}' },
    }], 's1')
    expect(items).toHaveLength(0)
  })
})
