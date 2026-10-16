import { describe, expect, it } from 'vitest'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { archiveMovePlan, charterHasEntry, journalPresence, journalSlug, parseFlags, resolveEvidenceDir } from '../../tools/lib/converge-rules.mjs'

// converge.mjs 的纯判定规则（判据单一来源 = tools/lib/converge-rules.mjs；IO 在驱动脚本
// ——沙箱对照实验与真仓复现收据见 _backlog 卡 BUG-014 / BUG-015）。
// ⚠ 2026-10-13：归档搬移那条初版在此**真跑 git**，被 layering 守卫当场拦下（回归层不许起子进程）——
// 真跑那半已搬去 probes/fs-taskboard/archive-move-probe.mjs；本文件只留纯计划断言。
// 负例留证 2026-10-12：BUG-014 —— 修复前判据（整文件 includes）对下方 COO 反例恒真阳性
//   （「旧判据 includes 误报」用例钉住它）；真仓零写入 re-run 五角色全报「已有——跳过」而 COO 条目为 0
//   （收据 = 卡复现节）；本文件实现前实跑 = 模块不存在红。
// 负例留证 2026-10-12：BUG-015 —— 修复前 backfill 证据路径写死运行日：沙箱对照实验写
//   convergence-<运行日> 断链指针且 exit=0（收据 = 卡复现节）；本文件解析/throw 用例实现前不可满足（红）。

describe('converge-rules · journal 归属（2026-10-12 前缀误吞教训）', () => {
  const allSlugs = ['ai-coding-security-2026', 'ai-coding-security-2026-light', 'ai-coding-security-2026-v2']
  it('精确同名归属', () => {
    expect(journalSlug('2026-10-12-ai-coding-security-2026.md', 'ai-coding-security-2026', allSlugs))
      .toBe('2026-10-12-ai-coding-security-2026.md')
  })
  it('后继 slug（-light / -v2）不被前缀误吞', () => {
    expect(journalSlug('2026-10-12-ai-coding-security-2026-light.md', 'ai-coding-security-2026', allSlugs)).toBeNull()
    expect(journalSlug('2026-10-12-ai-coding-security-2026-v2.md', 'ai-coding-security-2026', allSlugs)).toBeNull()
  })
  it('当轮散件（无属主）不清', () => {
    expect(journalSlug('2026-10-12-loose-note.md', 'ai-coding-security-2026', allSlugs)).toBeNull()
  })
})

describe('converge-rules · 收敛前置：journal 有无（2026-10-16 立，事故 = ai-transformation-2026-v4）', () => {
  it('零篇 journal ⇒ 前置未满足（v4 现场：五职零留痕却照样收敛归档）', () => {
    expect(journalPresence({ slug: 'ai-transformation-2026-v4', journals: [] }))
      .toEqual({ count: 0, missing: true })
  })

  it('有一篇即满足（不规定篇数——角色数由动议形状决定，不在判据里拍）', () => {
    expect(journalPresence({ slug: 'x', journals: [{ role: 'ceo', file: '2026-10-13-x.md' }] }))
      .toEqual({ count: 1, missing: false })
  })
})

describe('converge-rules · CHARTER 历史纪要查重锚（BUG-014 假跳过）', () => {
  // BUG-014 的真实反例形状：证据路径里含 slug 字样，历史纪要并无条目
  const cooLike = [
    '## 历史纪要（2026-09-25 首次收敛）',
    '',
    '- 2026-09-22 · 旧条目（占位）——正文',
    '  - **归属**：……（原稿见 snapshots/archive/convergence-2026-10-12/2026-10-10-ai-sprint-2026/journal/coo/——决策内容已并入本行）',
  ].join('\n')
  it('旧判据（整文件子串 includes）对该反例误报——钉住为什么不能用 includes', () => {
    expect(cooLike.includes('ai-sprint-2026')).toBe(true)
  })
  it('条目行锚：路径提及 ≠ 已登记', () => {
    expect(charterHasEntry(cooLike, 'ai-sprint-2026')).toBe(false)
  })
  it('真条目命中（行形 - <日期> · <slug>（', () => {
    const withEntry = cooLike + '\n- 2026-10-10 · ai-sprint-2026（评审）—— 结论一句\n'
    expect(charterHasEntry(withEntry, 'ai-sprint-2026')).toBe(true)
  })
  it('条目行锚不吞别家 slug 的条目（ai-sprint-2026-v4 ≠ ai-sprint-2026）', () => {
    const other = '- 2026-10-10 · ai-sprint-2026-v4（评审）—— 别家\n'
    expect(charterHasEntry(other, 'ai-sprint-2026')).toBe(false)
  })
})

describe('converge-rules · 旗标解析（BUG-016 幽灵旗标）', () => {
  // 负例留证 2026-10-12：BUG-016 —— 修复前未知旗标被静默收下（--plan / --no-such-flag 都「碰巧能跑」，
  //   exit 0；收据 = 卡复现节）；本文件实现前实跑 = parseFlags 导出不存在红。
  it('--allow-no-journal 已认（零 journal 缺口的显式放行面）', () => {
    expect(parseFlags(['--slug', 'x', '--allow-no-journal']).allowNoJournal).toBe(true)
    expect(parseFlags(['--slug', 'x']).allowNoJournal).toBe(false)
  })

  it('未知旗标 throw（--plan 不是旗标，无参即计划模式）', () => {
    expect(() => parseFlags(['--plan'])).toThrow(/未知旗标/)
    expect(() => parseFlags(['--no-such-flag'])).toThrow(/未知旗标/)
  })
  it('已知旗标全部接受并解析取值', () => {
    expect(parseFlags(['--slug', '2026-10-02-ai-ready', '--dry-run'])).toEqual({
      slug: '2026-10-02-ai-ready', dryRun: true, charterBackfill: undefined, allowNoJournal: false,
    })
    expect(parseFlags(['--charter-backfill', '2026-10-10-ai-sprint-2026'])).toEqual({
      slug: undefined, dryRun: false, charterBackfill: '2026-10-10-ai-sprint-2026', allowNoJournal: false,
    })
  })
  it('无参 = 计划模式（dryRun false、无 slug）', () => {
    expect(parseFlags([])).toEqual({ slug: undefined, dryRun: false, charterBackfill: undefined, allowNoJournal: false })
  })
})

describe('converge-rules · 收敛证据目录解析（BUG-015 日期耦合）', () => {
  const makeArchive = () => {
    const root = join(tmpdir(), 'converge-rules-spec-' + Math.random().toString(36).slice(2, 10))
    mkdirSync(join(root, 'convergence-2026-10-01', '2026-10-01-ai-demo'), { recursive: true })
    return root
  }
  it('按 slug 解析真实收敛日期目录（≠ 运行日）', () => {
    const root = makeArchive()
    try {
      expect(resolveEvidenceDir(root, '2026-10-01-ai-demo')).toBe('convergence-2026-10-01')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('无证据目录 → throw（fail-loud，不再静默写断链）', () => {
    const root = makeArchive()
    try {
      expect(() => resolveEvidenceDir(root, '2026-10-02-no-such-slug')).toThrow(/无收敛证据目录/)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
  it('多日并存时取最新（ISO 日期字典序 = 时间序）', () => {
    const root = makeArchive()
    try {
      mkdirSync(join(root, 'convergence-2026-10-11', '2026-10-01-ai-demo'), { recursive: true })
      expect(resolveEvidenceDir(root, '2026-10-01-ai-demo')).toBe('convergence-2026-10-11')
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
})

describe('converge-rules · 归档搬移计划（2026-10-13：drafts 不进 git 后 git mv 不再可用）', () => {
  /**
   * 现场：`git mv <交付物目录>` 遇到未跟踪文件会 fatal（`not under version control`）——
   * 而 drafts/sources 自瘦身轮起正是未跟踪的 ⇒ 计划改成"fs rename + `git add -A`"。
   * 本 spec 只钉**计划形状**（纯逻辑，无子进程——回归层不许起进程，layering 守卫）；
   * "真 git 里跑得通"那半住探针：probes/fs-taskboard/archive-move-probe.mjs（真 .gitignore / 真未跟踪件 / 真 add）。
   * 反证：把计划换成 `['mv', from, to]` ⇒ 探针 A2/A3 红。
   */
  it('计划 = deliverables → deliverables-archive，git 参数 = add -A -- <旧> <新>', () => {
    const plan = archiveMovePlan('2026-10-13-demo-slug')
    expect(plan.from).toBe('company-workspace/deliverables/2026-10-13-demo-slug')
    expect(plan.to).toBe('company-workspace/deliverables-archive/2026-10-13-demo-slug')
    expect(plan.gitArgs).toEqual(['add', '-A', '--', plan.from, plan.to])
  })
})
