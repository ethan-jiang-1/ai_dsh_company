/** 培养读模型 + 已注册 host 工具/命令对临时真实文件的行为（keyless 完成定义）。 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { CommandDefinition } from '@deepseek-ai/dsh-commands'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { describe, expect, it } from 'vitest'
import { registerCultivation, type CultivationHostConfig } from '../../packages/company-pack/src/host/cultivation.ts'
import {
  CULTIVATION_ROLES,
  PREVIEW_LIMIT,
  feedbackItems,
  inboxRows,
  journalTitle,
  methodSkillText,
  parseRecord,
  recordInbox,
  recordText,
  type CultivationRecord,
} from '../../packages/company-pack/src/lib/cultivation.ts'

/**
 * 只测纯函数（毫秒级）。真数据渲染（company-workspace 真 journal 进面板）是认证档：
 * 浏览器开真页面走查（guides/dev-loop §9.1 分层）。
 */

describe('journalTitle', () => {
  it('优先取首个标题行；无标题取首段非空行', () => {
    expect(journalTitle('# 对账模块评估\n\n结论：接得住。')).toBe('对账模块评估')
    expect(journalTitle('## 2026-09-22 复盘\n细节…')).toBe('2026-09-22 复盘')
    expect(journalTitle('\n\n结论先行：三件事。\n后续')).toBe('结论先行：三件事。')
  })

  it('长标题截断；空文本给（空）', () => {
    expect(journalTitle(`# ${'长'.repeat(80)}`)).toBe(`${'长'.repeat(60)}…`)
    expect(journalTitle('   \n\n')).toBe('（空）')
  })
})

describe('inboxRows', () => {
  it('每角色一行：计数 + 文件名倒序前 3 条预览；已读条目用标题、未读降级文件名', () => {
    const rows = inboxRows(
      { ceo: ['b.md', 'a.md', 'c.md', 'd.md'], coo: ['only.md'] },
      { 'ceo/d.md': '# 最新复盘', 'ceo/c.md': '结论：预算内。' },
    )
    expect(rows).toHaveLength(CULTIVATION_ROLES.length)
    const ceo = rows.find(row => row.role === 'ceo')!
    expect(ceo.count).toBe(4)
    expect(ceo.entries.map(entry => entry.name)).toEqual(['d.md', 'c.md', 'b.md'])
    expect(ceo.entries[0]!.title).toBe('最新复盘')
    expect(ceo.entries[1]!.title).toBe('结论：预算内。')
    expect(ceo.entries[2]!.title).toBe('b') // 未读 → 文件名去后缀
    const coo = rows.find(row => row.role === 'coo')!
    expect(coo.count).toBe(1)
    expect(coo.entries).toHaveLength(1)
  })

  it('缺角色清单 = 0 条待审（不撒谎：全部存量就是待审）', () => {
    const rows = inboxRows({}, {})
    for (const row of rows) {
      expect(row.count).toBe(0)
      expect(row.entries).toHaveLength(0)
    }
    expect(rows.map(row => row.label)).toEqual(['CEO', 'VP-Eng', 'VP-Sales', 'COO', 'CFO'])
  })

  it('预览上限 = PREVIEW_LIMIT', () => {
    const names = Array.from({ length: 10 }, (_, i) => `j${String(i)}.md`)
    const [ceo] = inboxRows({ ceo: names }, {})
    expect(ceo.entries).toHaveLength(PREVIEW_LIMIT)
    expect(ceo.count).toBe(10)
  })

  // 2026-10-13 培养卡 V2（数据诚实）：清单不可达 ≠ 0——目录缺失/断流必须以「不可达」态
  // 呈现，不许折成「无待审」（负例 = 旧实现把缺失当 0）。
  it('清单不可达 → 该角色行 reach=unreachable（不是 0 待审）', () => {
    const rows = inboxRows({ ceo: ['a.md'], cfo: null }, {})
    const ceo = rows.find(row => row.role === 'ceo')!
    const cfo = rows.find(row => row.role === 'cfo')!
    expect(ceo.reach).toBe('ok')
    expect(ceo.count).toBe(1)
    expect(cfo.reach).toBe('unreachable')
    expect(cfo.count).toBe(0)
    expect(cfo.entries).toHaveLength(0)
  })
})

// ── 培养记录读模型（2026-10-13 卡：本人教学 / 跨角色建议 / 采纳回执）──
// 记录 = 公司盘 cultivation/records/*.md，frontmatter 扁平字段（手解析，不引 yaml 进浏览器包）。
describe('培养记录：写读往返与坏形状', () => {
  const draft = {
    kind: 'correction',
    targetRole: 'ceo',
    proposerRole: 'ceo',
    proposerKind: 'human',
    source: 'deliverables/x/final.md',
    expectation: '收口前逐项列出未决项',
    body: '做法：收口盘点先列未决清单，再下结论。',
  } as const

  it('recordText → parseRecord 往返保住全部领域字段', () => {
    const text = recordText(draft)
    const record = parseRecord('20261013-120000-closing', text)
    expect(record).not.toBeNull()
    expect(record!.id).toBe('20261013-120000-closing')
    expect(record!.kind).toBe('correction')
    expect(record!.targetRole).toBe('ceo')
    expect(record!.proposerRole).toBe('ceo')
    expect(record!.proposerKind).toBe('human')
    expect(record!.source).toBe('deliverables/x/final.md')
    expect(record!.expectation).toBe('收口前逐项列出未决项')
    expect(record!.status).toBe('open')
    expect(record!.title).toBe('做法：收口盘点先列未决清单，再下结论。')
  })

  it('正文进客户端读模型（S4）：多行原样带出——判断必须先有材料', () => {
    const text = recordText({
      ...draft,
      body: '做法：先列未决清单，按 owner 分行。\n证据：deliverables/x/final.md 第 3 节；口径 A :: 口径 B。',
    })
    const record = parseRecord('r-body', text)!
    expect(record.body).toBe('做法：先列未决清单，按 owner 分行。\n证据：deliverables/x/final.md 第 3 节；口径 A :: 口径 B。')
    expect(record.title).toBe('做法：先列未决清单，按 owner 分行。')
  })

  it('采纳后的记录：status/methodSlug/decidedAt/verification/reason 带出', () => {
    const text = recordText(draft)
      .replace('status: open', 'status: adopted\nmethodSlug: closing-checklist\ndecidedAt: 2026-10-13T12:05:00.000Z')
    const record = parseRecord('r1', text)!
    expect(record.status).toBe('adopted')
    expect(record.methodSlug).toBe('closing-checklist')
    expect(record.decidedAt).toBe('2026-10-13T12:05:00.000Z')
    const rejected = parseRecord('r2', recordText({ ...draft, kind: 'suggestion', targetRole: 'cfo', proposerRole: 'ceo' })
      .replace('status: open', 'status: rejected\nreason: 数字口径已有 KB 单一来源'))!
    expect(rejected.status).toBe('rejected')
    expect(rejected.reason).toBe('数字口径已有 KB 单一来源')
    expect(rejected.kind).toBe('suggestion')
  })

  it('坏形状给 null（面板不撒谎也不崩）：无 frontmatter / 枚举外值 / 缺必填', () => {
    expect(parseRecord('r', '没有 frontmatter 的正文')).toBeNull()
    expect(parseRecord('r', '---\nkind: weird\n---\n正文')).toBeNull()
    expect(parseRecord('r', '---\nkind: correction\n---\n正文')).toBeNull() // 缺 targetRole 等
  })
})

describe('recordInbox：按 viewer 角色分箱（V7 归属过滤 + 回执）', () => {
  const base = (over: Partial<CultivationRecord>): CultivationRecord => ({
    id: 'r',
    kind: 'correction',
    targetRole: 'ceo',
    proposerRole: 'ceo',
    proposerKind: 'human',
    source: 's',
    expectation: 'e',
    status: 'open',
    title: 't',
    ...over,
  })

  it('需要我处理 = open 且 target=viewer；我的提案含回执；已采纳 = adopted 且 target=viewer', () => {
    const records = [
      base({ id: 'a', targetRole: 'cfo', proposerRole: 'ceo', kind: 'suggestion' }),          // CFO 的待办
      base({ id: 'b', targetRole: 'ceo', proposerRole: 'cfo', kind: 'suggestion' }),          // CEO 的待办（跨角色进我屋）
      base({ id: 'c', targetRole: 'ceo', proposerRole: 'ceo', status: 'adopted', methodSlug: 'closing-checklist' }),
      base({ id: 'd', targetRole: 'cfo', proposerRole: 'ceo', status: 'rejected', reason: '口径走 KB' }), // 我提的，被拒（有回执）
    ]
    const inbox = recordInbox(records, 'ceo')
    expect(inbox.needsDecision.map(r => r.id)).toEqual(['b'])
    expect(inbox.mine.map(r => r.id)).toEqual(['a', 'c', 'd'])
    expect(inbox.adoptedForViewer.map(r => r.id)).toEqual(['c'])
    // CFO 视角：a 是它的待办，c（CEO 已采纳）不进它的已采纳箱
    const cfoInbox = recordInbox(records, 'cfo')
    expect(cfoInbox.needsDecision.map(r => r.id)).toEqual(['a'])
    expect(cfoInbox.adoptedForViewer).toHaveLength(0)
  })

  it('viewer 缺席（未选角色）→ 四个箱全空，不猜身份', () => {
    const records = [base({ id: 'a' })]
    expect(recordInbox(records, '')).toEqual({ needsDecision: [], mine: [], adoptedForViewer: [], processedForViewer: [] })
  })
})

describe('methodSkillText：部署进方法层的 SKILL.md（D17 只写方法论）', () => {
  it('frontmatter 带 name/description（skill-filesystem 发现必需），正文为做法', () => {
    const text = methodSkillText({ slug: 'closing-checklist', expectation: '收口前逐项列出未决项', body: '收口三步：列未决、对稿面、再结论。' })
    expect(text).toContain('---\nname: closing-checklist\n')
    expect(text).toContain('description: 收口前逐项列出未决项')
    expect(text).toContain('收口三步：列未决、对稿面、再结论。')
  })
})

// feedback 读模型半边（D1「两者都要」的读模型侧，2026-10-03）：事件流 → 赞/踩当前态。
// wire 形状 = vendor message-feedback 的会话事件（put 载荷 { item }、delete 载荷 { messageId }）。
describe('feedbackItems', () => {
  const put = (messageId: string, rating: 'positive' | 'negative', updatedAt: number, note?: string) =>
    ({ type: 'feedback/message-put', data: { sessionId: 's1', item: { messageId, rating, note, version: 'v', createdAt: updatedAt - 1, updatedAt } } })

  it('put → 当前态一条；note 与 rating 原样带出', () => {
    const rows = feedbackItems([put('m1', 'positive', 100, '好判断')])
    expect(rows).toEqual([{ messageId: 'm1', rating: 'positive', note: '好判断', updatedAt: 100 }])
  })

  it('同一 messageId 二次 put = upsert（最新覆盖）；delete = 移除', () => {
    expect(feedbackItems([put('m1', 'positive', 100), put('m1', 'negative', 200)])).toEqual([{ messageId: 'm1', rating: 'negative', updatedAt: 200 }])
    expect(feedbackItems([put('m1', 'positive', 100), { type: 'feedback/message-delete', data: { sessionId: 's1', messageId: 'm1' } }])).toEqual([])
  })

  it('多条按 updatedAt 倒序（最新在前）', () => {
    const rows = feedbackItems([put('a', 'positive', 10), put('b', 'negative', 30), put('c', 'positive', 20)])
    expect(rows.map(r => r.messageId)).toEqual(['b', 'c', 'a'])
  })

  it('非 feedback 事件与坏形状一律跳过（wire 边界不信任）', () => {
    expect(feedbackItems([
      { type: 'turn/start', data: {} },
      { type: 'feedback/message-put', data: { item: { messageId: '', rating: 'positive', updatedAt: 1 } } },
      { type: 'feedback/message-put', data: { item: { messageId: 'x', rating: 'weird', updatedAt: 1 } } },
      { type: 'feedback/message-put', data: {} },
      null,
    ])).toEqual([])
  })
})

/** 注册真正的培养工具/命令；只替身 Cordis 注册面，回调仍是生产实现。 */
type RegisteredCultivationTool = Parameters<Context['tools']['register']>[0]

function cultivationRegistrations(config: CultivationHostConfig): {
  readonly command: CommandDefinition['handler']
  readonly proposal: RegisteredCultivationTool
} {
  const commands: CommandDefinition[] = []
  const tools: RegisteredCultivationTool[] = []
  const ctx = {
    tools: { register: (definition: RegisteredCultivationTool) => { tools.push(definition); return () => {} } },
    commands: { register: (definition: CommandDefinition) => { commands.push(definition); return () => {} } },
  }
  registerCultivation(ctx as Parameters<typeof registerCultivation>[0], config)
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
    mkdirSync(join(workspace, 'cultivation', 'records'), { recursive: true })
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

describe('/cultivation 注册命令的 host 行为', () => {
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
        source: 'deliverables/brief.md',
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
      const recordPath = join(workspace, 'cultivation', 'records', `${outcome.id}.md`)
      const text = readFileSync(recordPath, 'utf8')
      const saved = parseRecord(outcome.id, text)
      expect(saved).toMatchObject({
        kind: 'correction',
        targetRole: 'ceo',
        proposerRole: 'ceo',
        proposerKind: 'agent',
        source: 'deliverables/brief.md',
        expectation: '收口前列出未决项',
        status: 'open',
      })
      expect(text).toContain('先列清单，再下结论。')
      expect(existsSync(join(methods, 'ceo'))).toBe(false)
    })
  })

  it('跨角色采纳被拒绝，记录保持 open 且不部署方法', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordPath = join(workspace, 'cultivation', 'records', 'r1.md')
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

  it('reject 与 verify 更新 frontmatter，同时保留原记录正文', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordsDir = join(workspace, 'cultivation', 'records')
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
      expect(await invokeCultivation(handler, 'cfo', workspace, 'verify r-verify pass')).toMatchObject({ kind: 'success' })
      const verifiedText = readFileSync(adoptedPath, 'utf8')
      expect(parseRecord('r-verify', verifiedText)).toMatchObject({ status: 'adopted', verification: 'pass' })
      expect(verifiedText).toContain(suggestion.body)
    })
  })

  it('revoke validates the slug, removes only the target method and annotates a matching record', async () => {
    await withCultivationWorkspace(async (workspace, methods) => {
      const recordsDir = join(workspace, 'cultivation', 'records')
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
      const recordsDir = join(workspace, 'cultivation', 'records')
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
      const recordsDir = join(workspace, 'cultivation', 'records')
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
      const recordPath = join(workspace, 'cultivation', 'records', 'r1.md')
      writeFileSync(recordPath, recordText(suggestion))
      const handler = cultivationRegistrations({ cultivationRoot: methods }).command

      const result = await invokeCultivation(handler, 'cfo', workspace, 'adopt r1 as review-numbers')

      expect(result).toEqual({
        kind: 'success',
        text: '已采纳 r1：方法 review-numbers 部署到 CFO 方法层。新开的 CFO 会话会加载它；运行中的会话不受影响。见效后在培养面板点「这条有用」回填，不灵了点「撤回…」（命令行：/cultivation verify r1 pass|fail、/cultivation revoke review-numbers）。',
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
