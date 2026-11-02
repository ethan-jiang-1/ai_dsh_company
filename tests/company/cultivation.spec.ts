/** 培养 host 命令/存储/背景对临时真实文件的行为（keyless 完成定义；R5-23 拆出纯 lib 部分）。 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CommandDefinition } from '@deepseek-ai/dsh-commands'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { describe, expect, it } from 'vitest'
import { registerCultivation, type CultivationHostConfig } from '../../packages/company-pack/src/host/cultivation.ts'
import { nodeCultivationStorage } from '../../packages/company-pack/src/host/cultivation-storage.ts'
import { encodeContextToken } from '../../packages/company-pack/src/lib/cultivation-context.ts'
import { parseRecord, recordText, WORK_TEXT_LIMIT } from '../../packages/company-pack/src/lib/cultivation.ts'

/** 注册真正的培养工具/命令；只替身 Cordis 注册面，回调仍是生产实现。 */
type RegisteredCultivationTool = Parameters<Context['tools']['register']>[0]

function cultivationRegistrations(
  config: CultivationHostConfig,
  sessionQuery?: unknown,
  companyHome?: string,
  fs?: unknown,
  sandboxPolicy?: unknown,
): {
  readonly command: CommandDefinition['handler']
  readonly proposal: RegisteredCultivationTool
} {
  const commands: CommandDefinition[] = []
  const tools: RegisteredCultivationTool[] = []
  const ctx = {
    tools: { register: (definition: RegisteredCultivationTool) => { tools.push(definition); return () => {} } },
    commands: { register: (definition: CommandDefinition) => { commands.push(definition); return () => {} } },
    get: (name: string) => name === 'sessionQuery' ? sessionQuery : name === 'fs' ? fs : name === 'sandboxPolicy' ? sandboxPolicy : undefined,
  }
  registerCultivation(ctx as Parameters<typeof registerCultivation>[0], config, companyHome)
  const command = commands.find(definition => definition.name === 'cultivation')
  const proposal = tools.find(definition => definition.name === 'cultivation_propose')
  if (command === undefined) throw new Error('registerCultivation 没有注册 /cultivation')
  if (proposal === undefined) throw new Error('registerCultivation 没有注册 cultivation_propose')
  return { command: command.handler, proposal }
}

/** 临时培养盘只属于当前用例，vitest fork 并发执行时互不共用路径。 */
async function withCultivationWorkspace<T>(run: (workspace: string, methods: string) => Promise<T>): Promise<T> {
  const root = mkdtempSync(join(tmpdir(), 'cultivation-command-'))
  const workspace = join(root, 'workspace')
  const methods = join(root, 'methods')
  try {
    mkdirSync(join(workspace, '.dsh-company', 'cultivation', 'records'), { recursive: true })
    return await run(workspace, methods)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function invokeCultivation(
  handler: CommandDefinition['handler'],
  role: string,
  cwd: string,
  rawInput: string,
) {
  return handler({
    commandId: 'cultivation-test' as never,
    agent: { session: { header: { agentPreset: role, cwd } } } as never,
    rawInput,
    attachments: [],
    signal: new AbortController().signal,
  })
}

describe('cultivation_propose 的 ctx.fs 通道（2026-10-28 二轮）', () => {
  it('有 ctx.fs 时走 createIfAbsent；不写 node:fs 文件', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const calls: { path: string; expected: unknown; policy: unknown }[] = []
      const policy = { mode: 'workspace-write', workspaceRoot: workspace }
      let resolvedWith: unknown
      const sandboxPolicy = { resolve: (request: unknown) => { resolvedWith = request; return policy } }
      const fs = {
        resolve: async (path: string) => ({ path }),
        writeText: async (target: unknown, _content: string, expected: unknown, _signal: unknown, passed: unknown) => {
          calls.push({ path: (target as { path: string }).path, expected, policy: passed })
          return { operation: 'create', version: 'v1' }
        },
      }
      const { proposal } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace, fs, sandboxPolicy)
      const result = await proposal.execute({
        kind: 'correction',
        targetRole: 'ceo',
        expectation: '走 ctx.fs',
        body: '记录正文',
      } as never, {
        agent: { session: { header: { agentPreset: 'ceo', cwd: workspace } } },
        signal: new AbortController().signal,
      } as never) as { recorded: boolean; id: string }
      expect(result.recorded).toBe(true)
      expect(calls).toHaveLength(1)
      expect(calls[0]?.expected).toEqual({ kind: 'createIfAbsent' })
      expect(calls[0]?.policy).toEqual(policy)
      expect((resolvedWith as { session?: { header?: { cwd?: string } } })?.session?.header?.cwd).toBe(workspace)
      expect(calls[0]?.path.endsWith('.md')).toBe(true)
      expect(readdirSync(join(workspace, '.dsh-company', 'cultivation', 'records'))).toHaveLength(0)
    })
  })
})

describe('/cultivation 注册命令的 host 行为', () => {
  it('公司数据只认盘根：子目录会话被拒绝，盘根会话照常写', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const sub = join(workspace, '.dsh-company/deliverables/sub')
      mkdirSync(sub, { recursive: true })
      const denied = await invokeCultivation(command, 'ceo', sub, 'correct 收口前列未决 :: 先列清单')
      expect(denied).toMatchObject({ kind: 'error' })
      expect(String((denied as { text: string }).text)).toContain('公司盘根')
      expect(existsSync(join(sub, 'cultivation'))).toBe(false)

      const accepted = await invokeCultivation(command, 'ceo', workspace, 'correct 收口前列未决 :: 先列清单')
      expect(accepted).toMatchObject({ kind: 'success' })
      expect(readdirSync(join(workspace, '.dsh-company/cultivation/records')).some(name => name.endsWith('.md'))).toBe(true)
    })
  })

  const suggestion = {
    kind: 'suggestion',
    targetRole: 'cfo',
    proposerRole: 'ceo',
    proposerKind: 'human',
    source: 'test fixture',
    expectation: '复核数字口径',
    body: '先对照底稿，再给出数字结论。',
  } as const

  it('已注册提案工具把分身纠正写入公司盘，并保留来源与角色归属', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { proposal } = cultivationRegistrations({ cultivationRoot: methods })
      // Invoke the registered body without the registry-created Agent execution token;
      // cultivation reads only the agent session header and the caller signal here.
      const outcome = await proposal.execute({
        kind: 'correction',
        targetRole: 'ceo',
        expectation: '收口前列出未决项',
        body: '先列清单，再下结论。',
        source: '.dsh-company/deliverables/brief.md',
      }, {
        agent: { session: { header: { agentPreset: 'ceo', cwd: workspace } } },
        signal: new AbortController().signal,
      } as never)
      if (outcome === null || typeof outcome !== 'object'
        || !('id' in outcome) || typeof outcome.id !== 'string'
        || !('recorded' in outcome) || typeof outcome.recorded !== 'boolean'
        || !('note' in outcome) || typeof outcome.note !== 'string') {
        throw new Error('cultivation_propose returned an invalid result')
      }

      expect(outcome.recorded).toBe(true)
      expect(outcome.note).toContain('纠正')
      const recordPath = join(workspace, '.dsh-company', 'cultivation', 'records', `${outcome.id}.md`)
      const text = readFileSync(recordPath, 'utf8')
      const saved = parseRecord(outcome.id, text)
      expect(saved).toMatchObject({
        kind: 'correction',
        targetRole: 'ceo',
        proposerRole: 'ceo',
        proposerKind: 'agent',
        source: '.dsh-company/deliverables/brief.md',
        expectation: '收口前列出未决项',
        status: 'open',
      })
      expect(text).toContain('先列清单，再下结论。')
      expect(existsSync(join(methods, 'ceo'))).toBe(false)
    })
  })

  it('跨角色采纳被拒绝，记录保持 open 且不部署方法', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordPath = join(workspace, '.dsh-company', 'cultivation', 'records', 'r1.md')
      writeFileSync(recordPath, recordText(suggestion))
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command

      const result = await invokeCultivation(handler, 'ceo', workspace, 'adopt r1')

      expect(result).toEqual({
        kind: 'error',
        text: '仅建议权：r1 的培养对象是 CFO，请在 CFO 的会话里采纳。',
      })
      expect(parseRecord('r1', readFileSync(recordPath, 'utf8'))?.status).toBe('open')
      expect(existsSync(join(methods, 'cfo', 'method-r1', 'SKILL.md'))).toBe(false)
    })
  })

  it('记录 id 不能通过路径穿越读取并改写培养目录外的文件', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const outsideRecord = join(workspace, '..', 'outside.md')
      const original = recordText(suggestion)
      writeFileSync(outsideRecord, original)
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command

      const result = await invokeCultivation(handler, 'cfo', workspace, 'adopt ../../../outside as escaped')

      expect(result.kind).toBe('error')
      expect(readFileSync(outsideRecord, 'utf8')).toBe(original)
      expect(existsSync(join(methods, 'cfo', 'escaped', 'SKILL.md'))).toBe(false)
    })
  })

  it('reject 与 verify 更新记录，同时保留原记录正文并记录后续工作依据', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordsDir = join(workspace, '.dsh-company', 'cultivation', 'records')
      const openPath = join(recordsDir, 'r-reject.md')
      writeFileSync(openPath, recordText(suggestion))
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command

      expect(await invokeCultivation(handler, 'cfo', workspace, 'reject r-reject :: 数字证据不足')).toMatchObject({ kind: 'success' })
      const rejectedText = readFileSync(openPath, 'utf8')
      expect(parseRecord('r-reject', rejectedText)).toMatchObject({ status: 'rejected', reason: '数字证据不足' })
      expect(rejectedText).toContain(suggestion.body)

      const adoptedDraft = recordText(suggestion).replace('status: open', 'status: adopted\nmethodSlug: review-numbers')
      const adoptedPath = join(recordsDir, 'r-verify.md')
      writeFileSync(adoptedPath, adoptedDraft)
      expect(await invokeCultivation(handler, 'cfo', workspace, 'verify r-verify pass')).toMatchObject({ kind: 'error' })
      expect(parseRecord('r-verify', readFileSync(adoptedPath, 'utf8'))?.verification).toBeUndefined()
      expect(await invokeCultivation(handler, 'ceo', workspace,
        'verify r-verify fail :: 新预算回顾仍未说明关键假设。')).toMatchObject({ kind: 'error' })
      expect(await invokeCultivation(handler, 'cfo', workspace,
        'verify r-verify fail :: 新预算回顾仍未说明关键假设。')).toMatchObject({ kind: 'success' })
      expect(await invokeCultivation(handler, 'cfo', workspace,
        'verify r-verify pass :: 后续复盘列出了假设及其影响区间。')).toMatchObject({ kind: 'success' })
      const verifiedText = readFileSync(adoptedPath, 'utf8')
      expect(parseRecord('r-verify', verifiedText)).toMatchObject({
        status: 'adopted',
        verification: 'pass',
        verificationHistory: [
          { outcome: 'fail', evidence: '新预算回顾仍未说明关键假设。' },
          { outcome: 'pass', evidence: '后续复盘列出了假设及其影响区间。' },
        ],
      })
      expect(parseRecord('r-verify', verifiedText)?.revokedAt).toBeUndefined()
      expect(verifiedText).toContain(suggestion.body)
    })
  })

  it('revoke validates the slug, removes only the target method and annotates a matching record', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordsDir = join(workspace, '.dsh-company', 'cultivation', 'records')
      const recordPath = join(recordsDir, 'r-revoke.md')
      const adopted = recordText(suggestion).replace('status: open', 'status: adopted\nmethodSlug: review-numbers')
      writeFileSync(recordPath, adopted)
      const methodDir = join(methods, 'cfo', 'review-numbers')
      mkdirSync(methodDir, { recursive: true })
      writeFileSync(join(methodDir, 'SKILL.md'), 'installed method')
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command

      expect(await invokeCultivation(handler, 'cfo', workspace, 'revoke ../review-numbers')).toMatchObject({ kind: 'error' })
      expect(readFileSync(join(methodDir, 'SKILL.md'), 'utf8')).toBe('installed method')
      expect(await invokeCultivation(handler, 'cfo', workspace, 'revoke review-numbers')).toMatchObject({ kind: 'success' })
      expect(existsSync(methodDir)).toBe(false)
      expect(parseRecord('r-revoke', readFileSync(recordPath, 'utf8'))?.revokedAt).toBeDefined()
      expect(readFileSync(recordPath, 'utf8')).toContain(suggestion.body)
    })
  })

  it('record and method collisions preserve existing files and leave the proposal open', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordsDir = join(workspace, '.dsh-company', 'cultivation', 'records')
      const recordPath = join(recordsDir, 'r-collision.md')
      writeFileSync(recordPath, recordText(suggestion))
      const methodDir = join(methods, 'cfo', 'review-numbers')
      mkdirSync(methodDir, { recursive: true })
      writeFileSync(join(methodDir, 'SKILL.md'), 'user-owned method')
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command

      expect(await invokeCultivation(handler, 'cfo', workspace, 'adopt r-collision as review-numbers')).toMatchObject({ kind: 'error' })
      expect(readFileSync(join(methodDir, 'SKILL.md'), 'utf8')).toBe('user-owned method')
      expect(parseRecord('r-collision', readFileSync(recordPath, 'utf8'))?.status).toBe('open')
    })
  })

  it('record and method symlinks are not followed when reading, listing, or revoking', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordsDir = join(workspace, '.dsh-company', 'cultivation', 'records')
      const externalRecord = join(workspace, '..', 'outside-record.md')
      const externalText = recordText(suggestion).replace('status: open', 'status: adopted\nmethodSlug: follow-test')
      writeFileSync(externalRecord, externalText)
      symlinkSync(externalRecord, join(recordsDir, 'linked.md'))
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command
      const linkedResult = await invokeCultivation(handler, 'cfo', workspace, 'adopt linked')
      expect(linkedResult).toMatchObject({ kind: 'error' })

      const methodParent = join(methods, 'cfo')
      mkdirSync(join(methodParent, 'follow-test'), { recursive: true })
      writeFileSync(join(methodParent, 'follow-test', 'SKILL.md'), 'installed')
      expect(await invokeCultivation(handler, 'cfo', workspace, 'revoke follow-test')).toMatchObject({ kind: 'success' })
      expect(readFileSync(externalRecord, 'utf8')).toBe(externalText)

      const outsideMethod = join(workspace, '..', 'outside-method')
      mkdirSync(outsideMethod)
      writeFileSync(join(outsideMethod, 'SKILL.md'), 'outside')
      symlinkSync(outsideMethod, join(methodParent, 'review-numbers'))
      expect(await invokeCultivation(handler, 'cfo', workspace, 'revoke review-numbers')).toMatchObject({ kind: 'error' })
      expect(readFileSync(join(outsideMethod, 'SKILL.md'), 'utf8')).toBe('outside')
    })
  })

  it('目标角色采纳从记录部署已存正文，并将记录持久化为 adopted', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordPath = join(workspace, '.dsh-company', 'cultivation', 'records', 'r1.md')
      writeFileSync(recordPath, recordText(suggestion))
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command

      const result = await invokeCultivation(handler, 'cfo', workspace, 'adopt r1 as review-numbers')

      expect(result).toEqual({
        kind: 'success',
        text: '已采纳 r1：方法 review-numbers 部署到 CFO 方法层。新开的 CFO 会话会带着它开工；已经在跑的会话也会随技能目录刷新看到它（下一步就可能用上）。见效后在培养面板点「这条有用」回填，不灵了点「撤回…」（命令行：/cultivation verify r1 pass|fail、/cultivation revoke review-numbers）。',
      })
      expect(readFileSync(join(methods, 'cfo', 'review-numbers', 'SKILL.md'), 'utf8')).toBe(
        '---\nname: review-numbers\ndescription: 复核数字口径\n---\n\n# review-numbers\n\n先对照底稿，再给出数字结论。\n',
      )
      const adopted = parseRecord('r1', readFileSync(recordPath, 'utf8'))
      expect(adopted?.status).toBe('adopted')
      expect(adopted?.methodSlug).toBe('review-numbers')
      expect(adopted?.decidedAt).toBeDefined()
    })
  })
})


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


describe('培养记录 CAS（2026-10-27 G6）', () => {
  it('expectedText 不符 ⇒ false 且文件不变；相符才更新', () => {
    const root = mkdtempSync(join(tmpdir(), 'cultivation-cas-'))
    const records = join(root, 'cultivation/records')
    try {
      const id = nodeCultivationStorage.writeRecord(records, {
        kind: 'correction',
        targetRole: 'ceo',
        proposerRole: 'ceo',
        proposerKind: 'human',
        source: 'test',
        expectation: '先列未决项',
        body: '正文',
      })
      const before = nodeCultivationStorage.readRecord(records, id)?.text ?? ''
      expect(before).toContain('status: open')
      expect(nodeCultivationStorage.updateRecord(records, id, { status: 'rejected' }, `${before} `)).toBe(false)
      expect(nodeCultivationStorage.readRecord(records, id)?.text).toBe(before)
      expect(nodeCultivationStorage.updateRecord(records, id, { status: 'rejected' }, before)).toBe(true)
      expect(nodeCultivationStorage.readRecord(records, id)?.text).toContain('status: rejected')
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})


describe('revoke 跨 store 失败回滚（2026-10-27 G6）', () => {
  it('方法删除抛错时，记录状态回滚为 adopted，方法文件仍在', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command, proposal } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const outcome = await proposal.execute({
        kind: 'correction',
        targetRole: 'ceo',
        expectation: '回滚测试',
        body: '方法正文',
      }, {
        agent: { session: { header: { agentPreset: 'ceo', cwd: workspace } } },
        signal: new AbortController().signal,
      } as never) as { id: string }
      expect((await invokeCultivation(command, 'ceo', workspace, `adopt ${outcome.id} as rollback-method`)).kind).toBe('success')
      const recordPath = join(workspace, '.dsh-company/cultivation/records', `${outcome.id}.md`)
      expect(readFileSync(recordPath, 'utf8')).toContain('status: adopted')
      expect(existsSync(join(methods, 'ceo/rollback-method/SKILL.md'))).toBe(true)

      const original = nodeCultivationStorage.removeMethod
      nodeCultivationStorage.removeMethod = () => { throw new Error('injected remove failure') }
      try {
        const denied = await invokeCultivation(command, 'ceo', workspace, 'revoke rollback-method')
        expect(denied.kind).toBe('error')
        expect(String((denied as { text: string }).text)).toContain('记录已回滚')
      } finally {
        nodeCultivationStorage.removeMethod = original
      }
      expect(readFileSync(recordPath, 'utf8')).toContain('status: adopted')
      expect(existsSync(join(methods, 'ceo/rollback-method/SKILL.md'))).toBe(true)
    })
  })
})


describe('/cultivation archive（2026-10-27 G8）', () => {
  it('只归档已处理且早于天数的记录；open 与坏记录不动', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const records = join(workspace, '.dsh-company/cultivation/records')
      const front = (status: string): string => `---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: test\nexpectation: old\nstatus: ${status}\n---\n\nbody\n`
      writeFileSync(join(records, '20200101-000000-old1.md'), front('rejected'))
      writeFileSync(join(records, '20200101-000000-old2.md'), front('open'))
      writeFileSync(join(records, 'broken.md'), 'not a record')
      const outcome = await invokeCultivation(command, 'ceo', workspace, 'archive 30')
      expect(outcome.kind).toBe('success')
      expect(existsSync(join(records, '20200101-000000-old1.md'))).toBe(false)
      expect(existsSync(join(workspace, '.dsh-company/cultivation/records-archive/20200101-000000-old1.md'))).toBe(true)
      expect(existsSync(join(records, '20200101-000000-old2.md'))).toBe(true)
      expect(existsSync(join(records, 'broken.md'))).toBe(true)
      expect(String((outcome as { text: string }).text)).toContain('1 条坏记录未动')
    })
  })

  it('purge 只删归档里早于天数的记录，live records 不动', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const records = join(workspace, '.dsh-company/cultivation/records')
      const archive = join(workspace, '.dsh-company/cultivation/records-archive')
      mkdirSync(archive, { recursive: true })
      const front = '---\nkind: correction\ntargetRole: ceo\nproposerRole: ceo\nproposerKind: human\nsource: test\nexpectation: old\nstatus: rejected\n---\n\nbody\n'
      writeFileSync(join(archive, '20200101-000000-old.md'), front)
      writeFileSync(join(archive, '20990101-000000-new.md'), front)
      writeFileSync(join(records, '20200101-000000-live.md'), front)
      const outcome = await invokeCultivation(command, 'ceo', workspace, 'purge 30')
      expect(outcome.kind).toBe('success')
      expect(existsSync(join(archive, '20200101-000000-old.md'))).toBe(false)
      expect(existsSync(join(archive, '20990101-000000-new.md'))).toBe(true)
      expect(existsSync(join(records, '20200101-000000-live.md'))).toBe(true)
    })
  })
})


describe('/cultivation check 对账（2026-10-27 R5）', () => {
  it('报告记录缺方法与方法无记录，不自动改盘', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command, proposal } = cultivationRegistrations({ cultivationRoot: methods }, undefined, workspace)
      const outcome = await proposal.execute({
        kind: 'correction', targetRole: 'ceo', expectation: '对账', body: '正文',
      }, {
        agent: { session: { header: { agentPreset: 'ceo', cwd: workspace } } },
        signal: new AbortController().signal,
      } as never) as { id: string }
      expect((await invokeCultivation(command, 'ceo', workspace, `adopt ${outcome.id} as check-method`)).kind).toBe('success')
      nodeCultivationStorage.removeMethod(methods, 'ceo', 'check-method')
      const missing = await invokeCultivation(command, 'ceo', workspace, 'check')
      expect(missing.kind).toBe('success')
      expect(String((missing as { text: string }).text)).toContain('记录缺方法')
      expect(existsSync(join(methods, 'ceo/check-method/SKILL.md'))).toBe(false)

      nodeCultivationStorage.installMethod(methods, 'ceo', 'orphan-method', 'orphan body')
      const orphan = await invokeCultivation(command, 'ceo', workspace, 'check')
      expect(String((orphan as { text: string }).text)).toContain('方法无记录')
      expect(existsSync(join(methods, 'ceo/orphan-method/SKILL.md'))).toBe(true)
    })
  })
})
