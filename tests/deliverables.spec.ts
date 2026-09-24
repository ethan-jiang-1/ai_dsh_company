import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'
import {
  VIOLATION,
  auditDeliverables,
  classifyDeliverable,
  deliverableId,
  isLeadSession,
  parseSessionLog,
} from '../scripts/lib/deliverables.mjs'

/**
 * 交付物三态判据的回归层（R4「成品流程」轮）。
 *
 * 守什么：`deliverables/<slug>/final.md` 必须能**机械回溯**到一次 Lead 会话的
 * `deliverables/presented` 事件——"哪些是成品"不再靠 `-vp-eng` 这类命名约定。
 * 判据的合同家 = `company-workspace/AGENTS.md`；动机 = `notes/proposed/2026-09-22-workspace-hygiene.md`。
 *
 * 分层（guides/dev-loop §9.1）：本层 keyless、秒级、不碰模型与浏览器——只读**明文**归档日志。
 * 运行场那份（读 `$DSH_HOME` 的多帧 zstd 日志）是认证档，归 `scripts/deliverables-check.mjs`。
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const R1 = join(ROOT, 'snapshots/r1-motion')

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
    const lead = parseSessionLog(readFileSync(join(ROOT, 'snapshots/r2-motion/sessions/lead.jsonl'), 'utf8'))
    const teammate = parseSessionLog(
      readFileSync(join(ROOT, 'snapshots/r2-motion/sessions/vp-sales-f753efb5-c4f9-4b04-b4e4-edae4bdaa173.jsonl'), 'utf8'),
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
