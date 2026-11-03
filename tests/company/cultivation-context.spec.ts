/** 培养背景引用（contexts）的 host 行为（R5-23 拆族；临时真实盘）。 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { encodeContextToken } from '../../packages/company-pack/src/lib/cultivation-context.ts'
import { parseRecord, recordText, WORK_TEXT_LIMIT } from '../../packages/company-pack/src/lib/cultivation.ts'

import { cultivationRegistrations, invokeCultivation, withCultivationWorkspace } from '../support/cultivation-harness.ts'

describe('可选参考背景（RFC：命令只带引用，host 读后写 contexts）', () => {
  const at = '2026-10-23T14:02:00.000Z'
  const events = [
    { type: 'turn/start', data: { turn: 1 }, time: at },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '用户：收口前把未决项列一下……' }] }, time: at },
    { type: 'assistant/message', data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: '分身：已收口，未决项 0……' }] } }, time: at },
  ]
  const query = (over: Record<string, unknown> = {}) => ({
    observeSession: async (sessionId: string) => ({
      header: { id: sessionId, agentPreset: 'cfo', origin: undefined, parentSession: undefined },
      events,
    }),
    readTitleSnapshots: async () => [{ status: 'fulfilled', value: { title: '收口检查' } }],
    ...over,
  })
  const tokenOf = (ref: Record<string, unknown>, mode: 'correct' | 'suggest' = 'correct'): string => {
    const encoded = encodeContextToken({ v: 1, mode, ...(mode === 'suggest' ? { targetRole: 'cfo' } : {}), items: [ref] })
    if (!encoded.ok) throw new Error(encoded.problem)
    return encoded.token
  }
  const recordsOf = (workspace: string) => {
    const dir = join(workspace, '.dsh-company', 'cultivation', 'records')
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter(name => name.endsWith('.md')).map(name => {
      const record = parseRecord(name.replace(/\.md$/, ''), readFileSync(join(dir, name), 'utf8'))
      if (record === null) throw new Error(`记录形状坏：${name}`)
      return record
    })
  }

  it('correct + 合法 ref：host 读一轮、正文可空、source 人话、contexts 落盘', async () => {
    await withCultivationWorkspace(async workspace => {
      const { command } = cultivationRegistrations({}, query())
      const result = await invokeCultivation(command, 'ceo', workspace,
        `correct --context=${tokenOf({ kind: 'session', ref: 'session-1', label: '收口检查', role: 'ceo' })} 收口前逐项列出未决项 ::`)
      expect(result).toMatchObject({ kind: 'success' })
      const record = recordsOf(workspace)[0]
      expect(record.body).toBe('')
      expect(record.source).toBe('会话「收口检查」')
      expect(record.contexts?.[0]).toMatchObject({
        kind: 'session',
        ref: 'session-1',
        title: '收口检查',
        turn: 1,
        truncated: false,
      })
      expect(record.contexts?.[0]?.excerpt).toContain('用户：收口前把未决项列一下')
      expect(record.contexts?.[0]?.excerpt).toContain('分身：已收口')
      expect(result.text).toContain('背景「收口检查」')
    })
  })

  it('suggest + 合法 ref：targetRole/proposerRole 不变，背景随记录走', async () => {
    await withCultivationWorkspace(async workspace => {
      const { command } = cultivationRegistrations({}, query())
      const result = await invokeCultivation(command, 'ceo', workspace,
        `suggest cfo --context=${tokenOf({ kind: 'session', ref: 'session-1' }, 'suggest')} 结论先列假设 ::`)
      expect(result).toMatchObject({ kind: 'success' })
      const record = recordsOf(workspace)[0]
      expect(record.targetRole).toBe('cfo')
      expect(record.proposerRole).toBe('ceo')
      expect(record.contexts?.[0]?.kind).toBe('session')
    })
  })

  it('无 flag + 空正文仍拒；记录零落盘（旧路径不变）', async () => {
    await withCultivationWorkspace(async workspace => {
      const { command } = cultivationRegistrations({}, query())
      const result = await invokeCultivation(command, 'ceo', workspace, 'correct 收口前逐项列出未决项 ::')
      expect(result).toMatchObject({ kind: 'error' })
      expect(result.text).toBe('正文不能为空（:: 之后写做法与证据；或至少写清这次工作）。')
      expect(recordsOf(workspace)).toHaveLength(0)
    })
  })

  it('--work= 落记录 work 字段；有 work 时空正文放行；空值/坏编码/超限拒', async () => {
    await withCultivationWorkspace(async workspace => {
      const { command } = cultivationRegistrations({}, query())
      const empty = await invokeCultivation(command, 'ceo', workspace, 'correct --work= 期望 ::')
      expect(empty).toMatchObject({ kind: 'error' })

      const bad = await invokeCultivation(command, 'ceo', workspace, 'correct --work=%zz 期望 ::')
      expect(bad).toMatchObject({ kind: 'error' })
      expect(bad.text).toContain('URI')

      const tooLong = await invokeCultivation(command, 'ceo', workspace,
        `correct --work=${encodeURIComponent('很'.repeat(WORK_TEXT_LIMIT + 1))} 期望 :: `)
      expect(tooLong).toMatchObject({ kind: 'error' })
      expect(tooLong.text).toContain('工作事实最多')

      const ok = await invokeCultivation(command, 'ceo', workspace,
        `correct --work=${encodeURIComponent('预算评审的结论没列关键假设')} 期望行为 :: `)
      expect(ok).toMatchObject({ kind: 'success' })
      const [record] = recordsOf(workspace)
      expect(record).toMatchObject({ work: '预算评审的结论没列关键假设', status: 'open' })
    })
  })

  it('坏 token / 读不到 / child parent 不符：error 且零落盘', async () => {
    await withCultivationWorkspace(async workspace => {
      const badToken = await invokeCultivation(cultivationRegistrations({}, query()).command, 'ceo', workspace,
        'correct --context=bad$token 期望 ::')
      expect(badToken).toMatchObject({ kind: 'error' })
      expect(badToken.text).toContain('base64url')

      const failed = await invokeCultivation(cultivationRegistrations({}, query({
        observeSession: async () => { throw new Error('disk gone') },
      })).command, 'ceo', workspace, `correct --context=${tokenOf({ kind: 'session', ref: 'session-1' })} 期望 ::`)
      expect(failed).toMatchObject({ kind: 'error' })
      expect(failed.text).toContain('这段背景读不到')

      const mismatch = await invokeCultivation(cultivationRegistrations({}, query({
        observeSession: async (sessionId: string) => ({
          header: { id: sessionId, agentPreset: 'cfo', origin: 'subagent', parentSession: 'other-parent' },
          events,
        }),
      })).command, 'ceo', workspace,
      `correct --context=${tokenOf({ kind: 'session', ref: 'child-1', parentSessionId: 'parent-1', mode: 'continuable' })} 期望 ::`)
      expect(mismatch).toMatchObject({ kind: 'error' })
      expect(mismatch.text).toContain('不是这个 parent')
      expect(recordsOf(workspace)).toHaveLength(0)
    })
  })

  it('成品 ref 只在成品目录里认；缺失给可读错误', async () => {
    await withCultivationWorkspace(async workspace => {
      mkdirSync(join(workspace, '.dsh-company/kb'), { recursive: true })
      writeFileSync(join(workspace, '.dsh-company/kb', 'deliverables-index.json'), JSON.stringify({
        schema: 1,
        entries: [{
          slug: 'budget-review', result: '已采纳', kickoff: '2026-10-22',
          summary: '结论：先列假设，再给数字。', path: '.dsh-company/deliverables/budget-review/final.md',
        }],
      }))
      const { command } = cultivationRegistrations({}, query())
      const ok = await invokeCultivation(command, 'ceo', workspace,
        `suggest cfo --context=${tokenOf({ kind: 'deliverable', ref: '.dsh-company/deliverables/budget-review/final.md' }, 'suggest')} 结论先列假设 ::`)
      expect(ok).toMatchObject({ kind: 'success' })
      const record = recordsOf(workspace)[0]
      expect(record.contexts?.[0]).toMatchObject({ kind: 'deliverable', title: 'budget-review', subtitle: '已采纳' })
      expect(record.source).toBe('成品「budget-review」（已采纳）')

      const missing = await invokeCultivation(command, 'ceo', workspace,
        `suggest cfo --context=${tokenOf({ kind: 'deliverable', ref: '.dsh-company/deliverables/nope/final.md' }, 'suggest')} 期望 ::`)
      expect(missing).toMatchObject({ kind: 'error' })
      expect(missing.text).toContain('没有这个成品')
      expect(recordsOf(workspace)).toHaveLength(1)
    })
  })

  it('旧语法：--context（无 =）仍按期望句处理，不误判为背景', async () => {
    await withCultivationWorkspace(async workspace => {
      const { command } = cultivationRegistrations({}, query())
      const result = await invokeCultivation(command, 'ceo', workspace, 'correct --context is confusing :: 做法与证据。')
      expect(result).toMatchObject({ kind: 'success' })
      const record = recordsOf(workspace)[0]
      expect(record.expectation).toBe('--context is confusing')
      expect(record.contexts).toEqual([])
    })
  })

  it('contexts 在 adopt / reject / verify 后存活', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const context = {
        kind: 'session' as const, ref: 'session-1', title: '收口检查', excerpt: '用户：……', turn: 1,
      }
      const write = (id: string): void => {
        writeFileSync(join(workspace, '.dsh-company', 'cultivation', 'records', `${id}.md`), recordText({
          kind: 'correction', targetRole: 'cfo', proposerRole: 'cfo', proposerKind: 'human',
          source: '会话「收口检查」', expectation: '收口前逐项列出未决项', body: '', contexts: [context],
        }))
      }
      write('20261023-140200-aaaa')
      write('20261023-140201-bbbb')
      write('20261023-140202-cccc')
      const { command } = cultivationRegistrations({ cultivationRoot: methods }, query())
      expect(await invokeCultivation(command, 'cfo', workspace, 'adopt 20261023-140200-aaaa')).toMatchObject({ kind: 'success' })
      expect(await invokeCultivation(command, 'cfo', workspace, 'reject 20261023-140201-bbbb :: 证据不足')).toMatchObject({ kind: 'success' })
      expect(await invokeCultivation(command, 'cfo', workspace, 'adopt 20261023-140202-cccc')).toMatchObject({ kind: 'success' })
      expect(await invokeCultivation(command, 'cfo', workspace, 'verify 20261023-140202-cccc pass :: 下一次同类检查按期列出了未决事项。')).toMatchObject({ kind: 'success' })
      for (const id of ['20261023-140200-aaaa', '20261023-140201-bbbb', '20261023-140202-cccc']) {
        const record = parseRecord(id, readFileSync(join(workspace, '.dsh-company', 'cultivation', 'records', `${id}.md`), 'utf8'))
        expect(record?.contexts).toEqual([context])
      }
    })
  })
})
