/** 培养 /cultivation 命令与 propose 的 host 行为（R5-23 从 640 行 spec 拆族；临时真实盘）。 */
import { existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseRecord, recordText } from '../../../packages/company-pack/src/lib/cultivation.ts'

import { cultivationRegistrations, invokeCultivation, withCultivationWorkspace } from '../../support/cultivation-harness.ts'

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
  it('注册处传入的 roleLabel 进入命令回执（表达层语言跟随）', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const { command } = cultivationRegistrations(
        { cultivationRoot: methods },
        undefined,
        workspace,
        undefined,
        undefined,
        role => role === 'cfo' ? 'CFO · 首席财务官' : role,
      )
      const result = await invokeCultivation(command, 'ceo', workspace, 'suggest cfo 复核数字口径 :: 先对照底稿')
      expect(result).toMatchObject({ kind: 'success' })
      expect(String((result as { text: string }).text)).toContain('CFO · 首席财务官')
    })
  })

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
