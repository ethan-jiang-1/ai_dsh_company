import { repositoryRoot as ROOT } from '../../tools/lib/repository-layout.mjs'
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { classifyDeliverable, deliverableId, isPlaceholderClaim, parseMeta, slugFromDirName, validateMeta } from '../../tools/lib/deliverables.mjs'

/**
 * 交付物判据**形状与身份**面的回归层（R4「成品流程」轮；2026-10-16 第三轮结构收敛按
 * describe 域自原 deliverables.spec.ts 机械拆出——测试体逐字搬移，零行为漂移）。
 *
 * 守什么：一份交付物是什么、住在盘上哪、形状合不合法——`deliverableId` 的身份解析、
 * `classifyDeliverable` 的形状合法性、meta.md 的行形状与词表校验。
 * **声明对账**面（会话声明 ↔ 盘上比对、违了哪条）住 ./deliverables-audit.spec.ts。
 *
 * 判据的合同家 = `company-workspace/AGENTS.md`；动机 = `notes/proposed/2026-09-22-workspace-hygiene.md`。
 * 分层（guides/dev-loop §9.1）：本层 keyless、秒级、不碰模型与浏览器。运行场那份
 * （读 `$DSH_HOME` 的多帧 zstd 日志）是认证档，归 `checks/audit/deliverables-check.mjs`。
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

// ⚠ 以下夹具（TMP_DIRS / r1CopyWith / afterAll）当前只被 ./deliverables-audit.spec.ts 的反证用例
// 使用；2026-10-16 拆分按「逐字搬移」口径留在两侧（清理归后续轮，避免结构轮混入夹具去重）。
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

// 本块原为「交付物三态判据（R4）」主 describe 的形状半边：2026-10-16 第三轮结构收敛把
// **声明对账**半边按 describe 域机械拆去 ./deliverables-audit.spec.ts（测试体逐字搬移），
// 留下的这些只断言形状与身份，不喂会话日志、不碰违规/观察码。

// 本块原为「交付物三态判据（R4）」主 describe 的形状半边：2026-10-16 第三轮结构收敛把
// **声明对账**半边按 describe 域机械拆去 ./deliverables-audit.spec.ts（测试体逐字搬移），
// 留下的这些只断言形状与身份，不喂会话日志、不碰违规/观察码。
describe('交付物形状与身份（R4 判据的基座半边）', () => {
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

// 工作区门投影（doors.ts）的 keyless 守卫已迁 tests/company/doors.spec.ts（2026-10-14 重构轮：
// 本文件主体守 tools/lib/deliverables.mjs，doors 块是唯一跨模块寄居——迁出恢复一一对应）。
