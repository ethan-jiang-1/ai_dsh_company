import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  VIOLATION,
  WARNING,
  auditDeliverables,
  classifyDeliverable,
  deliverableId,
  isLeadSession,
  isPlaceholderClaim,
  parseMeta,
  parseSessionLog,
  presentResultRows,
  slugFromDirName,
  validateMeta,
} from '../../tools/lib/deliverables.mjs'

/**
 * 交付物三态判据的回归层（R4「成品流程」轮）。
 *
 * 守什么：`deliverables/<slug>/final.md` 必须能**机械回溯**到一次 Lead 会话的
 * `deliverables/presented` 事件——"哪些是成品"不再靠 `-vp-eng` 这类命名约定。
 * 判据的合同家 = `company-workspace/AGENTS.md`；动机 = `notes/proposed/2026-09-22-workspace-hygiene.md`。
 *
 * 分层（guides/dev-loop §9.1）：本层 keyless、秒级、不碰模型与浏览器——只读**明文**归档日志。
 * 运行场那份（读 `$DSH_HOME` 的多帧 zstd 日志）是认证档，归 `checks/audit/deliverables-check.mjs`。
 */

const R1 = join(ROOT, 'snapshots/replay/r1-motion')

/** 递归列出目录下全部文件的相对路径（正斜杠）。 */
function listFiles(dir: string, base: string = dir, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) listFiles(path, base, out)
    else out.push(relative(base, path).replaceAll('\\', '/'))
  }
  return out
}

/** 读一批明文会话日志并解析成判据输入。 */
function readSessions(files: readonly string[]) {
  return files.map(file => parseSessionLog(readFileSync(file, 'utf8')))
}

/** r1 归档：一份 Lead 会话日志 + 一份期望工作区（冻结资产，不重写）。 */
function r1WorkspaceFiles(): string[] {
  return listFiles(join(R1, 'workspace.expected'))
}
function r1Sessions() {
  return readSessions([join(R1, 'session.jsonl')])
}

const TMP_DIRS: string[] = []
/** 把 r1 期望工作区拷到临时目录，供反证就地改。 */
function r1CopyWith(mutate: (dir: string) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'deliverables-spec-'))
  TMP_DIRS.push(dir)
  cpSync(join(R1, 'workspace.expected'), dir, { recursive: true })
  mutate(dir)
  return dir
}

afterAll(() => {
  for (const dir of TMP_DIRS) rmSync(dir, { recursive: true, force: true })
})

describe('交付物三态判据（R4：keyless 行为层）', () => {
  it('R1 归档 oracle：1 份成品 + 0 违规（验收判据 2）', () => {
    const result = auditDeliverables({
      workspaceFiles: r1WorkspaceFiles(),
      sessions: r1Sessions(),
      legacyFlat: true,
    })
    expect(result.finals.map(f => f.path)).toEqual(['deliverables/kb-rag-assessment.md'])
    expect(result.drafts.map(d => d.path)).toEqual(['deliverables/kb-rag-assessment-vp-eng.md'])
    expect(result.violations).toEqual([])
  })

  it('反证：塞一份没有 present 背书的成品即变红', () => {
    const rogue = 'deliverables/rogue/final.md'
    const dir = r1CopyWith(root => {
      mkdirSync(join(root, 'deliverables/rogue'), { recursive: true })
      writeFileSync(join(root, 'deliverables/rogue/final.md'), '# 没被 present 过的成品\n')
    })
    const result = auditDeliverables({
      workspaceFiles: listFiles(dir),
      sessions: r1Sessions(),
      legacyFlat: true,
    })
    expect(result.violations.map(v => `${v.code} ${v.path}`)).toContain(`${VIOLATION.FINAL_NOT_PRESENTED} ${rogue}`)
  })

  it('反证：删掉被 present 的成品文件即变红（presented-final-missing）', () => {
    const dir = r1CopyWith(root => rmSync(join(root, 'deliverables/kb-rag-assessment.md')))
    const result = auditDeliverables({
      workspaceFiles: listFiles(dir),
      sessions: r1Sessions(),
      legacyFlat: true,
    })
    expect(result.violations.map(v => v.code)).toContain(VIOLATION.PRESENTED_FINAL_MISSING)
  })

  it('新形状：final.md 要有 Lead 的 present 背书，drafts/ 不算成品', () => {
    const workspaceFiles = ['deliverables/pilot/final.md', 'deliverables/pilot/drafts/vp-eng.md']
    const sessions = [
      {
        id: 's1',
        agentPreset: 'ceo',
        delegationDepth: 0,
        cwd: '/ws',
        presented: [
          { path: 'deliverables/pilot/final.md' },
          { path: 'deliverables/pilot/drafts/vp-eng.md' },
          { path: 'kb/ceo/journal/pilot.md' },
        ],
      },
    ]
    const result = auditDeliverables({ workspaceFiles, sessions })
    expect(result.finals.map(f => f.path)).toEqual(['deliverables/pilot/final.md'])
    expect(result.drafts.map(d => d.path)).toEqual(['deliverables/pilot/drafts/vp-eng.md'])
    expect(result.violations).toEqual([])
  })

  it('形状违规：deliverables/ 下既非 final.md 也非 drafts/<role>.md 的 .md 报出来', () => {
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/pilot/notes.md'],
      sessions: [],
    })
    expect(result.violations.map(v => v.code)).toContain(VIOLATION.UNSHAPED_FILE)
  })

  // 2026-09-26 立（观察项档）：slug 撞车在本仓已真实发生（renewal-y-2026 两场动议共用 ⇒ 产物
  // 互相覆盖，而三态判据看不出）。判红会让门禁永久带伤，故只警告；但必须每次都提醒。
  it('观察项：同一 slug 的成品被多个 Lead 会话声明过 ⇒ 警告（不判违规）', () => {
    const workspaceFiles = ['deliverables/pilot/final.md']
    const lead = id => ({ id, agentPreset: 'ceo', delegationDepth: 0, presented: [{ path: 'deliverables/pilot/final.md' }] })
    const one = auditDeliverables({ workspaceFiles, sessions: [lead('s1')] })
    expect(one.warnings).toEqual([])                                  // 单来源：不报
    const two = auditDeliverables({ workspaceFiles, sessions: [lead('s1'), lead('s2')] })
    expect(two.warnings.map(w => w.code)).toEqual([WARNING.SLUG_COLLISION])
    expect(two.warnings[0].slug).toBe('pilot')
    expect(two.violations).toEqual([])                                // 警告**不**影响违规面
  })

  it('承诺权：非 Lead 会话 present 成品路径即越权（新形状下才判，legacy 是假阳性）', () => {
    const workspaceFiles = ['deliverables/pilot/final.md']
    const lead = { id: 's1', agentPreset: 'ceo', delegationDepth: 0, presented: [{ path: 'deliverables/pilot/final.md' }] }
    const teammate = { id: 's2', agentPreset: 'ceo', delegationDepth: 1, presented: [{ path: 'deliverables/pilot/final.md' }] }
    expect(auditDeliverables({ workspaceFiles, sessions: [lead, teammate] }).violations.map(v => v.code))
      .toContain(VIOLATION.FINAL_PRESENTED_BY_NON_LEAD)
    expect(auditDeliverables({ workspaceFiles, sessions: [lead, teammate], legacyFlat: true }).violations)
      .toEqual([])
  })

  it('反向检查：present 指向的 deliverables/ 文件不在盘上报出来，kb/** 不在射程内', () => {
    const sessions = [
      {
        id: 's1',
        agentPreset: 'ceo',
        delegationDepth: 0,
        presented: [{ path: 'deliverables/gone/final.md' }, { path: 'kb/ceo/journal/gone.md' }],
      },
    ]
    const violations = auditDeliverables({ workspaceFiles: [], sessions }).violations
    expect(violations.map(v => v.path)).toContain('deliverables/gone/final.md')
    expect(violations.map(v => v.path)).not.toContain('kb/ceo/journal/gone.md')
  })

  it('Lead 判据：teammate 不是 Lead——R2 归档实测它与 Lead 同为 agentPreset ceo，只靠 delegationDepth 区分', () => {
    const lead = parseSessionLog(readFileSync(join(ROOT, 'snapshots/replay/r2-motion/sessions/lead.jsonl'), 'utf8'))
    const teammate = parseSessionLog(
      readFileSync(join(ROOT, 'snapshots/replay/r2-motion/sessions/vp-sales-f753efb5-c4f9-4b04-b4e4-edae4bdaa173.jsonl'), 'utf8'),
    )
    expect(lead.agentPreset).toBe('ceo')
    expect(teammate.agentPreset).toBe('ceo') // teammates 共享 Lead 的组合（docs/delegation.md §3）
    expect(isLeadSession(lead)).toBe(true)
    expect(isLeadSession(teammate)).toBe(false)
  })

  it('平铺旧形状只在 legacyFlat 下算数（快照冻结、运行场走新形状）', () => {
    expect(classifyDeliverable('deliverables/x.md')).toEqual({ state: 'other' })
    expect(classifyDeliverable('deliverables/x.md', { legacyFlat: true })).toEqual({ state: 'final', slug: 'x' })
    expect(classifyDeliverable('deliverables/x-vp-eng.md', { legacyFlat: true }))
      .toEqual({ state: 'draft', slug: 'x', role: 'vp-eng' })
    // 新形状与 legacy 无关，永远算数
    expect(classifyDeliverable('deliverables/x/final.md')).toEqual({ state: 'final', slug: 'x' })
    expect(classifyDeliverable('deliverables/x/drafts/coo.md')).toEqual({ state: 'draft', slug: 'x', role: 'coo' })
    // 非 .md 与 deliverables/ 之外的东西不进判据
    expect(classifyDeliverable('kb/ceo/CHARTER.md')).toEqual({ state: 'other' })
    expect(classifyDeliverable('deliverables/x/data.json')).toEqual({ state: 'other' })
  })

  it('身份解析认平铺旧形状的两条约定：名字中段的角色、尾部 -final', () => {
    expect(deliverableId('deliverables/kb-rag-assessment.md')).toEqual({ slug: 'kb-rag-assessment', kind: 'final' })
    expect(deliverableId('deliverables/kb-rag-assessment-vp-eng.md'))
      .toEqual({ slug: 'kb-rag-assessment', kind: 'draft', role: 'vp-eng' })
    // R2 的互审稿：角色后面还带限定词
    expect(deliverableId('deliverables/reconcile-package-cfo-review.md'))
      .toEqual({ slug: 'reconcile-package', kind: 'draft', role: 'cfo-review' })
    // R2 的定稿标记
    expect(deliverableId('deliverables/reconcile-package-final.md'))
      .toEqual({ slug: 'reconcile-package', kind: 'final' })
    // 角色前缀不许被吃掉（`coo-...` 若当角色，slug 会变空）
    expect(deliverableId('deliverables/coo-parallel-capacity-signoff.md'))
      .toEqual({ slug: 'coo-parallel-capacity-signoff', kind: 'final' })
    expect(deliverableId('kb/ceo/journal/x.md')).toBeUndefined()
  })

  it('反向检查只追 Lead 声明：非 Lead 的过程稿声明丢了不报（否则历史噪音永久污染审计）', () => {
    const missing = { path: 'deliverables/pilot/drafts/coo.md' }
    const lead = { id: 's1', agentPreset: 'ceo', delegationDepth: 0, presented: [missing] }
    const teammate = { id: 's2', agentPreset: 'ceo', delegationDepth: 1, presented: [missing] }
    // Lead 声明的过程稿丢了 → 报
    expect(auditDeliverables({ workspaceFiles: [], sessions: [lead] }).violations.map(v => v.code))
      .toContain(VIOLATION.DANGLING_PRESENT)
    // 只有 teammate 声明过 → 不报（它不是交付物声明，只是可见化）
    expect(auditDeliverables({ workspaceFiles: [], sessions: [teammate] }).violations).toEqual([])
  })

  it('onlySlug 作用域：审归档快照必需——快照是整盘 workspace + 本轮日志，不给作用域会误报历史成品', () => {
    const result = auditDeliverables({
      workspaceFiles: [
        'deliverables/this-round/final.md',
        'deliverables/old-round/final.md',
      ],
      sessions: [
        { id: 's1', agentPreset: 'ceo', delegationDepth: 0, presented: [{ path: 'deliverables/this-round/final.md' }] },
      ],
      onlySlug: 'this-round',
    })
    expect(result.finals.map(f => f.path)).toEqual(['deliverables/this-round/final.md'])
    expect(result.violations).toEqual([])
  })

  it('迁移桥：历史声明按身份生效——旧路径 present 过的成品，搬到新形状后依然算被声明', () => {
    // 这正是 W2 三态迁移的形状：`X.md` → `X/final.md`、`X-<role>.md` → `X/drafts/<role>.md`
    const workspaceFiles = [
      'deliverables/kb-rag-assessment/final.md',
      'deliverables/kb-rag-assessment/drafts/vp-eng.md',
      'deliverables/reconcile-package/final.md',
      'deliverables/reconcile-package/drafts/cfo-review.md',
    ]
    const sessions = [
      {
        id: 's1',
        agentPreset: 'ceo',
        delegationDepth: 0,
        presented: [
          { path: 'deliverables/kb-rag-assessment.md' },
          { path: 'deliverables/kb-rag-assessment-vp-eng.md' },
          { path: 'deliverables/reconcile-package-final.md' },
          { path: 'deliverables/reconcile-package-cfo-review.md' },
        ],
      },
    ]
    const result = auditDeliverables({ workspaceFiles, sessions })
    expect(result.finals.map(f => f.path).sort()).toEqual([
      'deliverables/kb-rag-assessment/final.md',
      'deliverables/reconcile-package/final.md',
    ])
    expect(result.violations).toEqual([])
  })
})

// 占位=认领（R0-2，2026-10-03）：开场抢注的机器可查形状——首行一字不差。
describe('占位抢注判定（isPlaceholderClaim）', () => {
  it('首行恰好是占位首行 ⇒ true', () => {
    expect(isPlaceholderClaim('占位=认领，非出稿\n\n正文随后换掉首行')).toBe(true)
  })

  it('首行前有空行也算（首个非空行判定）', () => {
    expect(isPlaceholderClaim('\n占位=认领，非出稿\n')).toBe(true)
  })

  it('占位行不在首位 / 措辞走样 / 有标题在前 ⇒ false（一字不差是机器可查的前提）', () => {
    expect(isPlaceholderClaim('# CFO 稿\n占位=认领，非出稿')).toBe(false)
    expect(isPlaceholderClaim('占位=认领（非出稿）')).toBe(false)
    expect(isPlaceholderClaim('占位 = 认领，非出稿')).toBe(false)
    expect(isPlaceholderClaim('正文')).toBe(false)
    expect(isPlaceholderClaim('')).toBe(false)
  })
})

// ── C1 布局（2026-10-03 拍板）：日期前缀 + 归档根 + meta 户口 ──
// 评审修正 1 的 slug 归一化前置 + T-11 跟随扩根 + T-2/T-7/T-9 的机器面；判据单一来源 = lib。
describe('C1 布局：日期前缀、归档根、meta 形状', () => {
  const lead = { id: 's1', agentPreset: 'ceo', delegationDepth: 0, presented: [{ path: 'deliverables/foo/final.md' }] }

  it('slugFromDirName：剥 A1 日期前缀', () => {
    expect(slugFromDirName('2026-09-22-agentic-coworker')).toBe('agentic-coworker')
    expect(slugFromDirName('agentic-coworker')).toBe('agentic-coworker')
  })

  it('A1 日期前缀目录的身份 = 剥前缀 slug（deliverableId）', () => {
    expect(deliverableId('deliverables/2026-09-22-foo/final.md')).toEqual({ slug: 'foo', kind: 'final' })
    expect(deliverableId('deliverables/2026-09-22-foo/drafts/cfo.md')).toEqual({ slug: 'foo', kind: 'draft', role: 'cfo' })
  })

  it('归档根交付物与活跃根同构（跟随扩根）', () => {
    expect(deliverableId('deliverables-archive/2026-09-22-foo/final.md')).toEqual({ slug: 'foo', kind: 'final' })
    expect(classifyDeliverable('deliverables-archive/2026-09-22-foo/final.md')).toEqual({ state: 'final', slug: 'foo' })
    expect(classifyDeliverable('deliverables-archive/2026-09-22-foo/drafts/cfo.md')).toEqual({ state: 'draft', slug: 'foo', role: 'cfo' })
    expect(classifyDeliverable('deliverables-archive/foo-final.md')).toEqual({ state: 'other' }) // 归档根不认平铺
  })

  it('meta.md 是白名单形状（T-2），且不进 finals/drafts', () => {
    expect(deliverableId('deliverables/foo/meta.md')).toEqual({ slug: 'foo', kind: 'meta' })
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/2026-09-22-foo/final.md', 'deliverables/2026-09-22-foo/meta.md'],
      sessions: [lead],
    })
    expect(result.metas.map(m => m.slug)).toEqual(['foo'])
    expect(result.violations).toEqual([])
  })

  it('改名存活性（D20 桥延伸到改名）：present 记的是老形状路径、盘上已是归档日期前缀路径 ⇒ 身份对上，不判红', () => {
    const result = auditDeliverables({
      workspaceFiles: ['deliverables-archive/2026-09-22-foo/final.md', 'deliverables-archive/2026-09-22-foo/drafts/ceo.md'],
      sessions: [lead],
    })
    expect(result.finals.map(f => f.slug)).toEqual(['foo'])
    expect(result.violations).toEqual([])
  })

  it('onlySlug 按归一 slug 匹配（T-7：字面前缀匹配在日期前缀下会静默零匹配）', () => {
    const files = ['deliverables-archive/2026-09-22-foo/final.md', 'deliverables-archive/2026-09-22-bar/final.md']
    expect(auditDeliverables({ workspaceFiles: files, sessions: [lead], onlySlug: 'foo' }).finals.length).toBe(1)
    expect(auditDeliverables({ workspaceFiles: files, sessions: [lead], onlySlug: '2026-09-22-foo' }).finals.length).toBe(0)
  })

  it('同 slug 双根并存 ⇒ slug-collision 照报（查重扫双根）', () => {
    const duplicate = { id: 's2', agentPreset: 'ceo', delegationDepth: 0, presented: [{ path: 'deliverables/foo/final.md' }] }
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/foo/final.md', 'deliverables-archive/2026-09-22-foo/final.md'],
      sessions: [lead, duplicate],
    })
    expect(result.warnings.some(w => w.code === WARNING.SLUG_COLLISION)).toBe(true)
  })
})

describe('meta.md 形状校验（validateMeta / parseMeta）', () => {
  const parseAndValidate = body => ({ ...validateMeta(body), events: parseMeta(body).events })
  const GOOD = [
    'slug: agentic-coworker',
    'kickoff: 2026-09-22',
    '类型: 决策',
    '参与: CEO+VP-Eng',
    '结果: 已采纳',
    'closed: 2026-09-22',
    '墙钟: 未记',
    '一句话结论: 方向批做、只批只读窄口径',
    '落地事件: vp-eng 2026-09-25 认领 T1（出处 = journal）',
    '落地事件: 维护者 2026-09-26 收敛归档',
  ].join('\n')

  it('合法 meta ⇒ ok，落地事件多条进 events', () => {
    const { ok, fields, events } = parseAndValidate(GOOD)
    expect(ok).toBe(true)
    expect(fields.get('结果')).toBe('已采纳')
    expect(events.length).toBe(2)
  })

  it('缺必填行 / 类型枚举外 / 结果枚举外 / kickoff 日期格式 ⇒ problems（红）', () => {
    const missing = parseAndValidate('slug: foo\n结果: 已采纳')
    expect(missing.ok).toBe(false)
    expect(missing.problems.length).toBeGreaterThanOrEqual(2) // 缺 kickoff、缺类型
    expect(parseAndValidate(GOOD.replace('类型: 决策', '类型: 战略')).ok).toBe(false)
    expect(parseAndValidate(GOOD.replace('结果: 已采纳', '结果: 大胜')).ok).toBe(false)
    expect(parseAndValidate(GOOD.replace('kickoff: 2026-09-22', 'kickoff: 09-22')).ok).toBe(false)
  })

  it('结果留空 = 合法回填态（观察归脚本侧，不判红）', () => {
    const { ok } = parseAndValidate('slug: foo\nkickoff: 2026-09-22\n类型: 决策\n结果:')
    expect(ok).toBe(true)
  })

  it('slug 字段带日期前缀 ⇒ 拒（日期住 kickoff 字段，不重复住 slug）', () => {
    const { ok, problems } = parseAndValidate('slug: 2026-09-22-foo\nkickoff: 2026-09-22\n类型: 决策\n结果: 已采纳')
    expect(ok).toBe(false)
    expect(problems[0]).toContain('剥前缀')
  })
})

describe('反向门禁（布局卡评审修正 6：present 在而结果≠终态 → 红；2026-10-04 code-review 补落）', () => {
  const leadOf = (slug: string) => ({
    id: 's1', agentPreset: 'ceo', delegationDepth: 0,
    presented: [{ path: `deliverables/${slug}/final.md` }],
  })

  it('auditDeliverables 交回 leadFinalSlugs（Lead present 过的成品 slug 面）', () => {
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/pilot/final.md', 'deliverables/pilot/meta.md'],
      sessions: [leadOf('pilot')],
    })
    expect(result.leadFinalSlugs).toEqual(['pilot'])
  })

  it('present ∧ 结果留空 / 进行中 ⇒ 红；终态词 ⇒ 过；无 meta ⇒ 不在射程（T-9 观察项管）', () => {
    const rows = presentResultRows(['pilot', 'ghost-done', 'no-meta'], new Map<string, string>([
      ['pilot', ''],
      ['ghost-done', '进行中'],
      ['term', '已否决'],
    ]))
    expect(rows).toEqual([{ slug: 'pilot', result: '' }, { slug: 'ghost-done', result: '进行中' }])
  })
})

describe('非 Lead present 过程稿的观察档（BUG-003，2026-10-06 多人 UX 猎捕立——观察项不判违规）', () => {
  const cfoPresentsDraft = {
    id: 's-cfo', agentPreset: 'cfo', delegationDepth: 0,
    presented: [{ path: 'deliverables/pilot/drafts/cfo.md' }],
  }
  const ceoPresentsDraft = {
    id: 's-ceo', agentPreset: 'ceo', delegationDepth: 0,
    presented: [{ path: 'deliverables/pilot/drafts/cfo.md' }],
  }

  it('cfo present 过程稿 ⇒ 观察项 draft-presented-by-non-lead（历史容忍不追溯红，但每次提醒）', () => {
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/pilot/drafts/cfo.md', 'deliverables/pilot/meta.md'],
      sessions: [cfoPresentsDraft],
    })
    expect(result.violations).toEqual([])
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: 'draft-presented-by-non-lead', slug: 'pilot' }),
    ])
  })

  it('CEO present 过程稿 ⇒ 无此观察项（Lead 引用过程稿是收口正常面）', () => {
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/pilot/drafts/cfo.md', 'deliverables/pilot/meta.md'],
      sessions: [ceoPresentsDraft],
    })
    expect(result.warnings.filter(w => w.code === 'draft-presented-by-non-lead')).toEqual([])
  })

  it('cfo present 成品（在盘）⇒ 仍是既有违规 final-presented-by-non-lead（两档并存不互吞）', () => {
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/pilot/final.md', 'deliverables/pilot/meta.md'],
      sessions: [{ id: 's-cfo', agentPreset: 'cfo', delegationDepth: 0, presented: [{ path: 'deliverables/pilot/final.md' }] }],
    })
    expect(result.violations.map(v => v.code)).toContain('final-presented-by-non-lead')
    expect(result.violations.map(v => v.code)).toContain('final-not-presented')
    expect(result.warnings.filter(w => w.code === 'draft-presented-by-non-lead')).toEqual([])
  })
})

describe('让位行的机器可查面（BUG-004，2026-10-06 修复轮立——持认判定 = 占位 ∧ ¬让位）', () => {
  it('首行恰好「让位=认领撤销，非出稿」⇒ isPlaceholderYield 为真', async () => {
    const { isPlaceholderYield, PLACEHOLDER_YIELD_LINE } = await import('../../tools/lib/deliverables.mjs')
    expect(PLACEHOLDER_YIELD_LINE).toBe('让位=认领撤销，非出稿')
    expect(isPlaceholderYield('\n\n让位=认领撤销，非出稿\n\n出稿：cfo｜版本 v2…让位记录')).toBe(true)
  })

  it('让位行不在首行 / 仍是占位首行 ⇒ 非让位（持认与让位靠首行互斥区分）', async () => {
    const { isPlaceholderYield, isPlaceholderClaim } = await import('../../tools/lib/deliverables.mjs')
    expect(isPlaceholderYield('占位=认领，非出稿\n\n（后文提了让位但首行未改写）')).toBe(false)
    expect(isPlaceholderClaim('占位=认领，非出稿\n')).toBe(true)
    expect(isPlaceholderYield('占位=认领，非出稿\n')).toBe(false)
  })
})

describe('工作区门投影——双 CEO 检测面（BUG-002 修复轮，2026-10-06）', () => {
  it('两 CEO 根会话同 cwd ⇒ duplicateWarning 行 + hasDuplicate = true', async () => {
    const { doorsFromSessions } = await import('../../packages/company-pack/src/lib/doors.ts')
    const model = doorsFromSessions([
      { sessionId: 'session-a', cwd: '/ws', agentPreset: 'ceo', running: false },
      { sessionId: 'session-b', cwd: '/ws', agentPreset: 'ceo', running: true },
    ])
    expect(model.hasDuplicate).toBe(true)
    expect(model.rows).toEqual([
      { preset: 'ceo', sessionCount: 2, sessionIds: ['session-a', 'session-b'], running: true, duplicateWarning: true },
    ])
  })

  it('每角色一门 ⇒ 无警告（multi-human 正常态）', async () => {
    const { doorsFromSessions } = await import('../../packages/company-pack/src/lib/doors.ts')
    const model = doorsFromSessions([
      { sessionId: 's1', cwd: '/ws', agentPreset: 'ceo', running: true },
      { sessionId: 's2', cwd: '/ws', agentPreset: 'cfo', running: false },
      { sessionId: 's3', cwd: '/ws', agentPreset: 'coo', running: false },
    ])
    expect(model.hasDuplicate).toBe(false)
    expect(model.rows.map(r => `${r.preset}:${r.sessionCount}:${r.duplicateWarning}`)).toEqual([
      'ceo:1:false', 'cfo:1:false', 'coo:1:false',
    ])
  })

  it('未选 preset（undefined）归入「(未选 preset)」行 ⇒ 双未选也是双门警告', async () => {
    const { doorsFromSessions } = await import('../../packages/company-pack/src/lib/doors.ts')
    const model = doorsFromSessions([
      { sessionId: 's1', cwd: '/ws', running: false },
      { sessionId: 's2', cwd: '/ws', running: false },
    ])
    expect(model.rows).toEqual([
      { preset: '(未选 preset)', sessionCount: 2, sessionIds: ['s1', 's2'], running: false, duplicateWarning: true },
    ])
  })
})
