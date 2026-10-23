import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { assess, archiveGitArgs, archiveMovePlan, canonicalParticipation, catalogIndexInvocation, charterHasEntry, convergenceResume, isPlaceholderConclusion, journalPresence, journalSlug, parseFlags, pickArchivedJournal, resolveEvidenceDir, steps } from '../../tools/lib/converge-rules.mjs'
const TMP: string[] = []
afterAll(() => { for (const d of TMP) rmSync(d, { recursive: true, force: true }) })

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

describe('converge-rules · 台账「参与」列规范化（2026-10-16 立；事故 = 收敛写进去的行被自家门禁判红）', () => {
  it('五角色全集 ⇒ 全员五人（无论拼写与顺序）', () => {
    expect(canonicalParticipation('CEO+VP-Eng+VP-Sales+COO+CFO')).toBe('全员五人')
    expect(canonicalParticipation('CEO+VP-Sales+VP-Eng+COO+CFO')).toBe('全员五人')
    expect(canonicalParticipation('CEO+全职能')).toBe('全员五人')
    expect(canonicalParticipation('全员五人')).toBe('全员五人')
  })

  it('子集 ⇒ 按固定序 CEO→VP-Eng→VP-Sales→COO→CFO 连接', () => {
    expect(canonicalParticipation('CEO+CFO+COO')).toBe('CEO+COO+CFO')
    expect(canonicalParticipation('CEO+VP-Sales+CFO')).toBe('CEO+VP-Sales+CFO')
  })

  it('去注解（括号内容）后再判', () => {
    expect(canonicalParticipation('CEO+CFO+COO（VP 缺席如实）')).toBe('CEO+COO+CFO')
  })

  it('非角色名 / 空 ⇒ —（写入点不写垃圾进台账）', () => {
    expect(canonicalParticipation('全员')).toBe('—')
    expect(canonicalParticipation('')).toBe('—')
    expect(canonicalParticipation(undefined)).toBe('—')
  })
})

describe('converge-rules · 归档 journal 检索（2026-10-16 立；事故 = 命名换代后收敛场次全被误报缺席）', () => {
  // 真现场：converge 把 journal 留底到 `<场景>/<dirName>/journal/<role>/`，而 journal-audit 只查
  // 老形状 `<场景>/workspace.actual/kb/<role>/journal/`（memory-convergence-* 时代）⇒ 16 条缺席里
  // 9 场其实有证据。判据 = pickArchivedJournal（文件名命中优先于内容命中）。
  const dir = mkdtempSync(join(tmpdir(), 'archived-journal-'))
  TMP.push(dir)
  mkdirSync(join(dir, 'ceo'), { recursive: true })
  writeFileSync(join(dir, 'ceo', '2026-10-16-target-slug.md'), '# 目标场自己的 journal\n')
  writeFileSync(join(dir, 'ceo', '2026-10-10-other.md'), '# 别的场\n\n正文提到 target-slug（交叉引用）\n')

  it('文件名命中即返回（不被同目录里「正文提到该 slug」的别的文件抢走）', () => {
    const hit = pickArchivedJournal({ dirs: [join(dir, 'ceo')], slug: 'target-slug' })
    expect(hit, '必须命中文件名本身就是目标 slug 的那份').toContain('2026-10-16-target-slug.md')
  })

  it('只有「正文提到该 slug」⇒ **不算在场**（假阳性在场会静默掩盖真缺口）', () => {
    // 这是 2026-10-16 二次标定的产物：首版按「正文包含 slug」判定，于是 emergency-x 的 coo 行
    // 被解析到 `role-boundary-diagnosis-2026/journal/coo/…`（完全无关的一份文件）——假阳性在场。
    // 收紧为只认文件名命中后：目标文件删掉、只剩「别的场正文提到该 slug」时，必须给 null。
    rmSync(join(dir, 'ceo', '2026-10-16-target-slug.md'))
    expect(pickArchivedJournal({ dirs: [join(dir, 'ceo')], slug: 'target-slug' })).toBeNull()
  })

  it('历史命名（`<前缀>-<slug>.md`）按精确尾段命中', () => {
    writeFileSync(join(dir, 'ceo', '日期待核-target-slug.md'), '# 日期待核的历史场次\n')
    expect(pickArchivedJournal({ dirs: [join(dir, 'ceo')], slug: 'target-slug' }))
      .toContain('日期待核-target-slug.md')
    rmSync(join(dir, 'ceo', '日期待核-target-slug.md'))
  })

  it('都没命中 ⇒ null（不误报在场）', () => {
    expect(pickArchivedJournal({ dirs: [join(dir, 'ceo')], slug: 'no-such-slug' })).toBeNull()
  })

  it('目录不存在 ⇒ null（不抛）', () => {
    expect(pickArchivedJournal({ dirs: [join(dir, 'nope')], slug: 'x' })).toBeNull()
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

// 负例留证 2026-10-16：把 `convergenceResume` 的归档家分支去掉 → 本块「已入归档家 ⇒ 可续跑」红
//（`expected 'directions-missing' to be 'ok'`）；还原 → 绿。另一半（`git rm` 撞未跟踪 ⇒ 收敛崩在半途）
// 没有纯函数可断言面，其红证 = 真现场原文（BUG-020 症状节）。
describe('converge-rules · 半态续跑（BUG-020；2026-10-16 真现场：崩溃在半途且工具认不出）', () => {
  it('交付物已入归档家 ⇒ 可续跑，剩余 = 清 journal + 台账行（+ backfill 指引）', () => {
    expect(convergenceResume({ dirName: 'x', journalled: true, hasFinal: false, archived: true }).remaining)
      .toEqual(['journal', 'ledger', 'backfill'])
  })

  it('交付物还在活跃区 ⇒ 不可续跑（那是正常收敛，不是半态）', () => {
    expect(convergenceResume({ dirName: 'x', journalled: false, hasFinal: true, archived: false }).reason)
      .toBe('still-active')
  })

  it('两处都不在 ⇒ 不可续跑（目录名错或从未收敛）', () => {
    expect(convergenceResume({ dirName: 'x', journalled: false, hasFinal: false, archived: false }).reason)
      .toBe('directions-missing')
  })

  it('零 live journal ⇒ 续跑仍可（journal 步已完成是幂等的），剩余不含 journal', () => {
    const r = convergenceResume({ dirName: 'x', journalled: false, hasFinal: false, archived: true })
    expect(r.reason).toBe('ok')
    expect(r.remaining).toEqual(['ledger', 'backfill'])
  })

  it('已挂号（journalled=true）⇒ remaining 含 journal；这是「崩在 journal 前」的现场', () => {
    expect(convergenceResume({ dirName: 'x', journalled: true, hasFinal: false, archived: true }).remaining)
      .toContain('journal')
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
  it('--allow-open-findings 已认（未结审计发现的显式放行面，2026-10-16 立）', () => {
    expect(parseFlags(['--slug', 'x', '--allow-open-findings']).allowOpenFindings).toBe(true)
    expect(parseFlags(['--slug', 'x']).allowOpenFindings).toBe(false)
  })

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
      slug: '2026-10-02-ai-ready', dryRun: true, charterBackfill: undefined, allowNoJournal: false, allowOpenFindings: false,
    })
    expect(parseFlags(['--charter-backfill', '2026-10-10-ai-sprint-2026'])).toEqual({
      slug: undefined, dryRun: false, charterBackfill: '2026-10-10-ai-sprint-2026', allowNoJournal: false, allowOpenFindings: false,
    })
  })
  it('无参 = 计划模式（dryRun false、无 slug）', () => {
    expect(parseFlags([])).toEqual({ slug: undefined, dryRun: false, charterBackfill: undefined, allowNoJournal: false, allowOpenFindings: false })
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

describe('converge-rules · 成品索引重建命令（2026-10-20；收敛后自动重建）', () => {
  it('命令指向生成器，cwd = 仓库根；收敛器不重写扫描逻辑', () => {
    const invocation = catalogIndexInvocation({ root: '/repo', execPath: '/node' })
    expect(invocation.command).toBe('/node')
    expect(invocation.args).toEqual(['/repo/tools/deliverables-index.mjs'])
    expect(invocation.cwd).toBe('/repo')
  })
})


describe('converge-rules · 一句话结论占位判定（2026-10-20；真结论提到「未回填」被误判）', () => {
  it('整值占位才算未回填；正文提到「未回填」是内容', () => {
    expect(isPlaceholderConclusion('本轮 14 格是 7 件归档 meta 的参与/一句话结论未回填')).toBe(false)
    expect(isPlaceholderConclusion('回填')).toBe(true)
    expect(isPlaceholderConclusion('（待回填）')).toBe(true)
    expect(isPlaceholderConclusion('')).toBe(true)
  })
})


describe('converge-rules · 归档后 git add 参数（2026-10-20 新交付物未 tracked 的 fatal）', () => {
  it('旧路径有 tracked 项 ⇒ 原计划；纯未 tracked ⇒ 只 stage 归档家', () => {
    const plan = archiveMovePlan('2026-10-20-demo')
    expect(archiveGitArgs(plan, true)).toEqual(plan.gitArgs)
    expect(archiveGitArgs(plan, false)).toEqual(['add', '-A', '--', plan.to])
  })
})

// 2026-10-23（架构评审候选 1）：「可收敛」判据此前在 converge.mjs 写了三份（计划 / 单 slug / 续跑），
// 且计划模式不认两个放行旗标——计划说「未备」而带旗标执行却能收。判据收进 assess 后由两处共用。
// 红形态（实现前）：`assess is not a function`。
describe('converge-rules · 可收敛判据 assess（判据单源；2026-10-23）', () => {
  const base = () => ({
    closed: '2026-10-23',
    conclusion: '做了事',
    hasFinal: true,
    archived: false,
    journals: [{ role: 'ceo', file: '2026-10-23-slug.md' }],
    findings: { ok: true, detail: '' },
  })
  const codes = (r: { reasons: Array<{ code: string }> }) => r.reasons.map(x => x.code)

  it('六道闸全过 ⇒ ready 且无理由', () => {
    const r = assess(base(), {})
    expect(r.ready).toBe(true)
    expect(r.reasons).toEqual([])
  })

  it.each([
    ['closed-missing', { closed: '' }],
    ['conclusion-missing', { conclusion: '回填' }],
    ['no-final', { hasFinal: false }],
    ['already-archived', { archived: true }],
    ['no-journal', { journals: [] }],
    ['open-findings', { findings: { ok: false, detail: '缺 present' } }],
  ])('%s 单闸失败 ⇒ 不可收敛且原因点名', (code, patch) => {
    const r = assess({ ...base(), ...patch }, {})
    expect(r.ready).toBe(false)
    expect(codes(r)).toContain(code)
  })

  it('--allow-no-journal 只放行 journal 闸，并记录 accepted', () => {
    const r = assess({ ...base(), journals: [] }, { allowNoJournal: true })
    expect(r.ready).toBe(true)
    expect(r.accepted).toContain('no-journal')
  })

  it('放行不掩盖其他闸', () => {
    const r = assess({ ...base(), journals: [], hasFinal: false }, { allowNoJournal: true })
    expect(r.ready).toBe(false)
    expect(codes(r)).toContain('no-final')
  })

  it('--allow-open-findings 同理', () => {
    const r = assess({ ...base(), findings: { ok: false, detail: '缺 present' } }, { allowOpenFindings: true })
    expect(r.ready).toBe(true)
    expect(r.accepted).toContain('open-findings')
  })

  it('计划模式与执行同一判据：同一 state 带旗标前后结论翻转', () => {
    const state = { ...base(), journals: [] }
    expect(assess(state, {}).ready).toBe(false)
    expect(assess(state, { allowNoJournal: true }).ready).toBe(true)
  })

  it('无 final 时不要求审计结果（惰性：findings 可缺席，不触碰审计）', () => {
    const r = assess({ ...base(), hasFinal: false, findings: undefined }, {})
    expect(codes(r)).toEqual(['no-final'])
  })
})

// 2026-10-23（架构评审候选 1 第二刀）：收敛动作此前是「计划打印一套、执行另一套」——
// dry-run 的 actions 数组与执行代码各写一份顺序，改一处必漂。steps() 把它变成数据：
// 同一份序列既渲染 dry-run 清单，也被执行器逐条消费。
// 红形态（实现前）：`steps is not a function`。
describe('converge-rules · 收敛动作序列 steps（计划与执行同源；2026-10-23）', () => {
  const state = () => ({
    dirName: '2026-10-20-demo',
    evName: 'convergence-2026-10-23',
    conclusion: '做完了这件事',
    journal: [{ role: 'ceo', file: '2026-10-20-demo.md' }],
  })
  const kinds = (s: ReturnType<typeof state>) => steps(s).map(step => step.kind)

  it('固定序：证据 → 引用重指（静默）→ 搬移 → 清 journal → 台账 → 索引 → backfill 指引', () => {
    expect(kinds(state())).toEqual([
      'evidence-copy', 'rewrite-refs', 'archive-move', 'clear-journal',
      'ledger-append', 'rebuild-index', 'backfill-hint',
    ])
  })

  it('零 journal ⇒ 无 clear-journal 步；多篇 ⇒ 每篇一步', () => {
    expect(kinds({ ...state(), journal: [] })).not.toContain('clear-journal')
    expect(steps({ ...state(), journal: [
      { role: 'ceo', file: 'a.md' }, { role: 'cfo', file: 'b.md' },
    ] }).filter(step => step.kind === 'clear-journal')).toHaveLength(2)
  })

  it('dry-run 标签就是执行序列：只有 rewrite-refs 无 label（它不在计划清单里）', () => {
    const plan = steps(state())
    expect(plan.find(step => step.kind === 'rewrite-refs')?.label).toBeUndefined()
    expect(plan.filter(step => step.label).map(step => step.label)).toEqual([
      '证据副本 → snapshots/archive/convergence-2026-10-23/2026-10-20-demo/（journal ×1 留底；交付物本体 git mv 进归档家，不双份拷贝）',
      'git mv deliverables/2026-10-20-demo → deliverables-archive/2026-10-20-demo',
      'git rm kb/ceo/journal/2026-10-20-demo.md（副本已入证据目录）',
      '台账追加一行（逐字取 meta：做完了这件事…）',
      '成品索引重建（node tools/deliverables-index.mjs）',
      'CHARTER 历史纪要补登：node tools/converge.mjs --charter-backfill 2026-10-20-demo（结论逐字取 meta）',
    ])
  })

  it('搬移步带执行器要用的 from/to/gitArgs（与 archiveMovePlan 同源）', () => {
    const move = steps(state()).find(step => step.kind === 'archive-move')!
    const plan = archiveMovePlan('2026-10-20-demo')
    expect(move.from).toBe(plan.from)
    expect(move.to).toBe(plan.to)
    expect(move.gitArgs).toEqual(plan.gitArgs)
  })

  it('backfill 指引末尾带可照抄的目录名', () => {
    expect(steps(state()).at(-1)?.label).toContain('--charter-backfill 2026-10-20-demo')
  })
})
