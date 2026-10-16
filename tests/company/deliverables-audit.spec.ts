import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { WARNING, classifyDeliverable, deliverableId, isPlaceholderClaim } from '../../tools/lib/deliverables.mjs'
import {
  VIOLATION,
  auditDeliverables,
  isLeadSession,
  metaLedgerFindings,
  parseSessionLog,
  partitionArchiveViolations,
  presentResultRows,
  uncoveredPendingMaterial,
} from '../../tools/lib/deliverables-audit.mjs'

/**
 * 交付物**声明对账**面的回归层（R4「成品流程」轮；2026-10-16 第三轮结构收敛自
 * deliverables.spec.ts 按 describe 域机械拆出——内容逐字搬移，零行为漂移）。
 *
 * 守什么：`deliverables/<slug>/final.md` 必须能**机械回溯**到一次 Lead 会话的
 * `deliverables/presented` 事件——"哪些是成品"不再靠 `-vp-eng` 这类命名约定；
 * 会话声明与盘上对账、违了哪条。判据的合同家 = `company-workspace/AGENTS.md`；
 * 动机 = `notes/proposed/2026-09-22-workspace-hygiene.md`。
 *
 * 形状与身份面（`deliverableId` / `classifyDeliverable` / meta 形状 / 占位首行）住
 * ./deliverables.spec.ts——两侧一一对应 lib 的基座与对账模块。
 *
 * 分层（guides/dev-loop §9.1）：本层 keyless、秒级、不碰模型与浏览器——只读**明文**归档日志。
 * 运行场那份（读 `$DSH_HOME` 的多帧 zstd 日志）是认证档，归 `checks/audit/deliverables-check.mjs`。
 */

const R1 = join(ROOT, 'snapshots/replay/r1-motion')
const R2 = join(ROOT, 'snapshots/replay/r2-motion')

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

/** Lead 会话夹具：present 过 `deliverables/<slug>/final.md`（id / delegationDepth / presented 可覆写）。
 *  原先各 describe 内联手写同形对象 ×9（2026-10-14 重构轮收敛；teammate = 同 preset + depth 1 覆写）。
 *  2026-10-16 拆分：本文件用的那条随对账面同迁，基座 spec 各留一份同名夹具（两侧独立事实源）。 */
const leadSession = (slug: string, over: {
  id?: string
  delegationDepth?: number
  presented?: { path: string }[]
} = {}) => ({
  id: 's1',
  agentPreset: 'ceo',
  delegationDepth: 0,
  presented: [{ path: `deliverables/${slug}/final.md` }],
  ...over,
})

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
    const lead = (id: string) => leadSession('pilot', { id })
    const one = auditDeliverables({ workspaceFiles, sessions: [lead('s1')] })
    expect(one.warnings).toEqual([])                                  // 单来源：不报
    const two = auditDeliverables({ workspaceFiles, sessions: [lead('s1'), lead('s2')] })
    expect(two.warnings.map(w => w.code)).toEqual([WARNING.SLUG_COLLISION])
    expect(two.warnings[0].slug).toBe('pilot')
    expect(two.violations).toEqual([])                                // 警告**不**影响违规面
  })

  it('承诺权：非 Lead 会话 present 成品路径即越权（新形状下才判，legacy 是假阳性）', () => {
    const workspaceFiles = ['deliverables/pilot/final.md']
    const lead = leadSession('pilot')
    const teammate = leadSession('pilot', { id: 's2', delegationDepth: 1 })
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

  it('drafts/sources/ = 取证落盘点（HITL 闸门③，2026-10-10）：source 态而非 unshaped；slug 剥 A1 日期前缀', () => {
    expect(classifyDeliverable('deliverables/x/drafts/sources/README.md')).toEqual({ state: 'source', slug: 'x' })
    expect(classifyDeliverable('deliverables/2026-10-10-ai-transformation-2026/drafts/sources/khazix-skill-leader.md')).toEqual({ state: 'source', slug: 'ai-transformation-2026' })
  })

  it('drafts/ 主题子目录 = 过程物料（2026-10-10 ai-sprint 实证）：material 态而非 unshaped', () => {
    // 负例留证 2026-10-10：红形态 = ai-sprint-2026/drafts/sprint/samples/*.md ×12 被 unshaped-file
    // 判违规（exit=1）——团队在 drafts/ 下建工作子目录是自然形状，不该被官僚 policing。
    expect(classifyDeliverable('deliverables/x/drafts/sprint/samples/sample-01.md')).toEqual({ state: 'material', slug: 'x', dir: 'sprint' })
    expect(classifyDeliverable('deliverables/x/other/x.md')).toEqual({ state: 'other' }) // drafts 之外的主题目录不豁免
  })

  it('待补料 ↔ schedule 审计（闸门④）：title 含 待补料·<slug>·<T号> 即为已锚；缺锚 = 行动幻觉违规', () => {
    // 负例留证 2026-10-10：BUG 候选红形态 = 卡兹克案"已立 6 小时提醒"而 schedule.json 为空
    // （行动幻觉）；本判据把「待补料派活行 ↔ schedule 任务锚」交叉核对变成机器可查。
    const tasks = [
      { record: { title: '待补料·ai-transformation-2026·T1', prompt: '查 sources/ 复算' } },
      { record: { title: 'probe-wake', prompt: 'x' } },
    ]
    expect(uncoveredPendingMaterial(['T1'], tasks, 'ai-transformation-2026')).toEqual([])
    expect(uncoveredPendingMaterial(['T1', 'T3'], tasks, 'ai-transformation-2026')).toEqual(['T3'])
    expect(uncoveredPendingMaterial([], tasks, 'ai-transformation-2026')).toEqual([])
    expect(uncoveredPendingMaterial(['T1'], tasks, 'another-slug')).toEqual(['T1']) // slug 不匹配不算锚（防串场）
    expect(uncoveredPendingMaterial(['T1'], [], 'ai-transformation-2026')).toEqual(['T1']) // 空库 = 全未锚
  })

  // 负例留证 2026-10-10：BUG-008 红形态 = recon-pack 归档件两条违规（final-not-presented +
  // meta-shape-bad）使 deliverables-check exit=1；实现 partitionArchiveViolations 后归档件转
  // legacy-archive 观察项、exit=0；反咬测试（drafts/sub/x.md）仍报 unshaped-file——门没钝。
  it('归档件违规降观察项（BUG-008 存量豁免口径）：active 照旧判违规，archive 转 legacy-archive 观察项', () => {
    const archived = { code: 'final-not-presented', path: 'deliverables-archive/2026-10-07-recon-pack/final.md', detail: '成品在盘上，但没有任何 Lead 会话的 present 事件' }
    const active = { code: 'unshaped-file', path: 'deliverables/x/drafts/sub/x.md', detail: '形状不合法' }
    const { violations, warnings } = partitionArchiveViolations([archived, active])
    expect(violations).toEqual([active])
    expect(warnings).toHaveLength(1)
    expect(warnings[0].code).toBe('legacy-archive:final-not-presented')
    expect(warnings[0].detail).toContain('deliverables-archive/2026-10-07-recon-pack/final.md')
    expect(warnings[0].detail).toContain('存量豁免')
  })

  it('反向检查只追 Lead 声明：非 Lead 的过程稿声明丢了不报（否则历史噪音永久污染审计）', () => {
    const missing = { path: 'deliverables/pilot/drafts/coo.md' }
    const lead = leadSession('pilot', { presented: [missing] })
    const teammate = leadSession('pilot', { id: 's2', delegationDepth: 1, presented: [missing] })
    // Lead 声明的过程稿丢了 → 报
    expect(auditDeliverables({ workspaceFiles: [], sessions: [lead] }).violations.map(v => v.code))
      .toContain(VIOLATION.DANGLING_PRESENT)
    // 只有 teammate 声明过 → 不报（它不是交付物声明，只是可见化）
    expect(auditDeliverables({ workspaceFiles: [], sessions: [teammate] }).violations).toEqual([])
  })

  it('形状坏也登记户口：不因「meta 形状不合法」再报一条「没有 meta.md」（2026-10-16 真盘二次报）', () => {
    // 真盘现场：all-in-ai-2026 的 meta 用列表符写，旧实现形状坏就 continue、不登记 slug，
    // 于是又报一条 final-without-meta「盘上没有 meta.md」——meta 明明在盘上。判据 = lib 纯函数。
    const badBody = '- slug: `bad`\n- kickoff: 2026-10-13\n- 类型: 决策\n- 结果: 已完成\n'
    const { metas, results } = metaLedgerFindings({
      finalSlugs: ['bad'],
      metas: [{ slug: 'bad', path: 'deliverables/bad/meta.md' }],
      readMeta: () => badBody,
    })
    expect(metas.has('bad'), '形状坏也必须登记「这个 slug 有户口」').toBe(true)
    expect(results.map(r => r.code)).toEqual([VIOLATION.META_SHAPE_BAD])
  })

  it('户口缺失（成品在盘、meta 真不在）仍照报 final-without-meta——两档分开报的守卫', () => {
    const { results } = metaLedgerFindings({
      finalSlugs: ['ghost'],
      metas: [],
      readMeta: () => undefined,
    })
    expect(results.map(r => r.code)).toEqual([WARNING.FINAL_WITHOUT_META])
  })

  it('meta.md 是白名单形状（T-2），且不进 finals/drafts', () => {
    expect(deliverableId('deliverables/foo/meta.md')).toEqual({ slug: 'foo', kind: 'meta' })
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/2026-09-22-foo/final.md', 'deliverables/2026-09-22-foo/meta.md'],
      sessions: [leadSession('foo')],
    })
    expect(result.metas.map(m => m.slug)).toEqual(['foo'])
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
  const lead = leadSession('foo')

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

  it('onlySlug 作用域：审归档快照必需——快照是整盘 workspace + 本轮日志，不给作用域会误报历史成品', () => {
    const result = auditDeliverables({
      workspaceFiles: [
        'deliverables/this-round/final.md',
        'deliverables/old-round/final.md',
      ],
      sessions: [
        leadSession('this-round'),
      ],
      onlySlug: 'this-round',
    })
    expect(result.finals.map(f => f.path)).toEqual(['deliverables/this-round/final.md'])
    expect(result.violations).toEqual([])
  })

  it('同 slug 双根并存 ⇒ slug-collision 照报（查重扫双根）', () => {
    const duplicate = leadSession('foo', { id: 's2' })
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/foo/final.md', 'deliverables-archive/2026-09-22-foo/final.md'],
      sessions: [lead, duplicate],
    })
    expect(result.warnings.some(w => w.code === WARNING.SLUG_COLLISION)).toBe(true)
  })
})

describe('反向门禁（布局卡评审修正 6：present 在而结果≠终态 → 红；2026-10-04 code-review 补落）', () => {
  it('auditDeliverables 交回 leadFinalSlugs（Lead present 过的成品 slug 面）', () => {
    const result = auditDeliverables({
      workspaceFiles: ['deliverables/pilot/final.md', 'deliverables/pilot/meta.md'],
      sessions: [leadSession('pilot')],
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

// 负例留证 2026-10-09：把该观察项的 code 从 WARNING.DRAFT_PRESENTED_BY_NON_LEAD 换成别的字面量
//（= 静默吞掉观察项，BUG-003 要防的失效）→ 本条红（1 failed）；还原 → 绿。
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

// 负例留证 2026-10-16：把 `auditDeliverables` 里 `evidenceMissingBefore` 的分支去掉 →
// 本块「声明给不可考」那条红（`expected [ 'final-not-presented' ] to deeply equal []`）；还原 → 绿。
describe('证据可得性：声明给「这段时期拿不到」时，判据不再把「证据不可考」报成「声明缺失」（BUG-019 的可修部分）', () => {
  // ⚠ 射程（如实）：**只有能从路径/slug 认出日期的件**才吃这条声明——
  //   ① 活跃形状的目录名前缀（`deliverables/<日期>-<slug>/…`，本块用的就是它）；
  //   ② 归档形状同款（`deliverables-archive/<日期>-<slug>/…`，但归档件另有 BUG-008 存档豁免）；
  //   ③ 认不出日期的 slug ⇒ 视为**未覆盖**、维持严格判红（宁可判红，不静默放过）。
  const UNCOVERED = ['deliverables/2026-09-22-pilot/final.md']

  it('未声明 ⇒ 照旧判红（默认严格：没证据 ≠ 没问题）', () => {
    const r = auditDeliverables({ workspaceFiles: UNCOVERED, sessions: [] })
    expect(r.violations.map(v => v.code)).toEqual([VIOLATION.FINAL_NOT_PRESENTED])
    expect(r.warnings.map(w => w.code)).toEqual([])
  })

  it('声明给「不可考」⇒ 该件转观察档 present-evidence-missing，违规面不再含它', () => {
    const r = auditDeliverables({ workspaceFiles: UNCOVERED, sessions: [], evidenceMissingBefore: '2026-10-16' })
    expect(r.violations.map(v => v.code)).toEqual([])
    expect(r.warnings.map(w => w.code)).toEqual([WARNING.PRESENT_EVIDENCE_MISSING])
  })

  it('守卫：证据**可得**的件（present 在场）不受该声明影响', () => {
    const r = auditDeliverables({
      workspaceFiles: ['deliverables/2026-09-22-pilot/final.md'],
      sessions: [leadSession('pilot', { presented: [{ path: 'deliverables/2026-09-22-pilot/final.md' }] })],
      evidenceMissingBefore: '2026-10-16',
    })
    expect(r.violations).toEqual([])
    expect(r.warnings.filter(w => w.code === WARNING.PRESENT_EVIDENCE_MISSING)).toEqual([])
  })

  it('守卫：声明期**之后**的件照旧判红（声明不是万能豁免）', () => {
    const r = auditDeliverables({
      workspaceFiles: ['deliverables/2026-10-20-late/final.md'],
      sessions: [],
      evidenceMissingBefore: '2026-10-16',
    })
    expect(r.violations.map(v => v.code)).toEqual([VIOLATION.FINAL_NOT_PRESENTED])
  })
})

// 负例留证 2026-10-09：把 isPlaceholderYield 改成 `body.includes(PLACEHOLDER_YIELD_LINE)`
//（子串匹配 = BUG-004 要防的「措辞走样也认」）→ 本条红（改动前全套 355 项仍全绿，故本条是本轮新加的钉子）；
// 也让 `持认 ∧ 让位` 同时为真。还原 → 绿。
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

  // 关键盲点（2026-10-09 实测发现并补上）：上一条的 fixture 正文**不含让位行原文**，
  // 所以「首行相等」与「正文包含」两种实现都返回 false —— 拿它验不出实现被弱化成子串匹配。
  // 复现：把 isPlaceholderYield 改成 `body.includes(PLACEHOLDER_YIELD_LINE)`（正是 BUG-004
  // 要防的「措辞走样也认」失效），全套 355 项**依然全绿**，且能让 持认 ∧ 让位 同时为真
  // （`'占位=认领，非出稿\n\n讨论：我本可以写 让位=认领撤销，非出稿 来放弃'`）——
  // 那正是 BUG-004 存在要防的互斥失效。⇒ 本条 fixture 必须让让位行**原文出现在正文、
  // 但不在首个非空行**：只有这样，子串实现才会返回 true 而被抓住。
  it('让位行原文出现在正文但不在首个非空行 ⇒ 非让位（钉死「首行相等」，防子串实现）', async () => {
    const { isPlaceholderYield, PLACEHOLDER_YIELD_LINE } = await import('../../tools/lib/deliverables.mjs')
    const bodyBesideYieldLine = `占位=认领，非出稿\n\n讨论：我本可以写 ${PLACEHOLDER_YIELD_LINE} 来放弃`
    expect(bodyBesideYieldLine.includes(PLACEHOLDER_YIELD_LINE), 'fixture 必须真的含让位行原文，否则本条验不出子串实现').toBe(true)
    expect(isPlaceholderYield(bodyBesideYieldLine)).toBe(false)
  })
})

// 工作区门投影（doors.ts）的 keyless 守卫住在 tests/company/doors.spec.ts（2026-10-14 重构轮迁出：
// 那之前它寄居在本模块 spec 尾部，是唯一的跨模块寄居块）。
