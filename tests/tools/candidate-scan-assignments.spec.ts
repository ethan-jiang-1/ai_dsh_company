import { describe, expect, it } from 'vitest'
import {
  mentionedRoles,
  parseAssignments,
  parseLabelsText,
  roleHasDraft,
  scanR1,
  scanR2,
  scanR2Closed,
  scanR3,
  scanR3Dual,
  scoreLabels,
} from '../../tools/lib/candidate-scan.mjs'

// 负例留证 2026-10-11：BUG-011 修前先跑本文件 —— `ASSIGN_LINE` 不捕获假设段、`parseAssignments`
// 不返回该字段 ⇒ 「带『假设』段的派活行」的 assumption 断言红；补解析后绿。
// 纯逻辑单测（全内联夹具，不读外部语料盘）：覆盖 `tools/lib/candidate-scan.mjs` 的派活解析、
// 双源依赖（`orient` 活消费者 `scanR3Dual`）与金标准打分纯函数。

const CASE14_BRIEF = [
  'ASSIGN｜T1｜vp-sales｜出定价与买点分层结论｜deps: none｜status: todo',
  'ASSIGN｜T2｜vp-eng｜出交付包技术可行性｜deps: none｜status: todo',
  'ASSIGN｜T3｜coo｜出产能承接结论｜deps: T2｜status: todo',
  'ASSIGN｜T4｜cfo｜出毛利口径与合规闸门结论｜deps: T1｜status: todo',
  'ASSIGN｜T5｜cfo｜审定价与毛利并出评审稿｜deps: T1、T4｜status: todo',
  'ASSIGN｜T6｜coo｜审交付承接并出评审稿｜deps: T1、T2、T3｜status: todo',
].join('\n')
const CASE14_DRAFTS = ['ceo.md', 'cfo-review.md', 'cfo.md', 'coo-review.md', 'coo.md', 'vp-eng.md', 'vp-sales.md']

const LABELS_TEXT = `# 实验 B 金标准

前置说明行（非表格，应被忽略）。

## 合成语料（13 case）

| case | 真实任务清单 | 该提醒谁 | 审批/取消/阻塞项 |
|---|---|---|---|
| case-a | cfo·T1·待办·判毛利；coo·T2·阻塞·条件承接（T1 未出；条件未触发） | cfo；coo | 阻塞：T2 |
| case-b | ——·——·关闭·动议已收口（final 在场；缺稿不是新待办） | 无人 | 无 |
| case-c | cfo·T1·待核实·稿与状态行矛盾 | cfo | **审批×2：双签两半** |

## 真盘动议

| slug | 真实任务清单 | 该提醒谁 | 审批/取消/阻塞项 |
|---|---|---|---|
| real-x | ——·——·关闭·已收口 | 无人 | 无 |
`

describe('派活行的「假设」段（BUG-011 的机械兜底，2026-10-11）', () => {
  const WITH = 'ASSIGN｜T1｜vp-sales｜市场门｜deps: none｜status: todo｜assumption: 待证（客户预算未核）'
  const WITHOUT = 'ASSIGN｜T1｜vp-sales｜市场门｜deps: none｜status: todo'

  it('带「假设」段的派活行：解析出该段，其余字段不受影响', () => {
    const parsed = parseAssignments(WITH)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({ id: 'T1', role: 'vp-sales', title: '市场门', deps: [], status: 'todo' })
    expect(parsed[0]!.assumption, '「假设」段必须被解析出来（否则统计无从下手）').toBe('待证（客户预算未核）')
  })

  it('不带「假设」段的旧派活行仍然解析（向后兼容，旧任务书不返工）', () => {
    const parsed = parseAssignments(WITHOUT)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]!.assumption).toBeUndefined()
  })
})

describe('第六角色 CMO 的派活/点名与 R1 扫描', () => {
  it('cmo 派活行、点名与 scanR1 缺稿扫描都可识别', () => {
    expect(parseAssignments('ASSIGN｜T6｜cmo｜写 MRD｜deps: none｜status: todo')).toEqual([
      expect.objectContaining({ id: 'T6', role: 'cmo', status: 'todo' }),
    ])
    expect(mentionedRoles('### CMO 出 MRD\nT2 · CFO 核毛利')).toEqual(['cmo', 'cfo'])
    expect(scanR1('### CMO 出 MRD\nT2 · CFO 核毛利', ['cmo.md']).map(item => item.role)).toEqual(['cfo'])
  })
})

describe('ASSIGN canonical 行（I1b）', () => {
  it('英文 canonical 可解析；旧中文派活行不再解析', () => {
    expect(parseAssignments('ASSIGN｜T1｜cfo｜毛利｜deps: none｜status: todo')).toEqual([
      { id: 'T1', role: 'cfo', title: '毛利', deps: [], status: 'todo' },
    ])
    expect(parseAssignments('派活｜T1｜cfo｜毛利｜依赖：无｜状态：待办')).toEqual([])
    expect(parseAssignments('ASSIGN｜T2｜coo｜排期｜deps: T1,T3｜status: pending-sources｜assumption: 待证')).toEqual([
      { id: 'T2', role: 'coo', title: '排期', deps: ['T1', 'T3'], status: 'pending-sources', assumption: '待证' },
    ])
  })
})

describe('双源核对、状态漂移与 orient 活规则 scanR3Dual', () => {
  const BRIEF = 'ASSIGN｜T1｜vp-sales｜市场门｜deps: none｜status: todo\n'
  const REWORK_BRIEF = [
    'ASSIGN｜T1｜vp-eng｜可行性 v2 返工｜deps: none｜status: todo',
    'ASSIGN｜T2｜coo｜出承接排期与人力窗口｜deps: T1｜status: todo',
  ].join('\n')

  it('状态行待办 + 稿在/不在盘的 stale 判定与互审稿识别', () => {
    expect(scanR2(BRIEF, [])[0]!.stale).toBe(false)
    expect(scanR3(BRIEF, [], false).candidates[0]!.stale).toBe(false)
    expect(scanR2(BRIEF, ['vp-sales.md'])[0]!.stale).toBe(true)
    expect(scanR3(BRIEF, ['vp-sales.md'], false).candidates[0]!.stale).toBe(true)
    expect(scanR3(BRIEF, [], true)).toEqual({ candidates: [], blocked: [], closed: true })
    expect(scanR3Dual(BRIEF, [], true)).toEqual({ candidates: [], blocked: [], closed: true })
    expect(roleHasDraft('cfo', ['cfo-review.md'])).toBe(true)
  })

  it('scanR2Closed / scanR3 / scanR3Dual 在漂移与返工形状上的双源行为', () => {
    expect(scanR2Closed(BRIEF, [], true)).toEqual([])
    expect(scanR2Closed(BRIEF, [], false)).toHaveLength(1)

    const r3 = scanR3(CASE14_BRIEF, CASE14_DRAFTS, false)
    expect(r3.candidates.map(t => t.task)).toEqual(['T1', 'T2'])
    expect(r3.blocked.map(t => t.task)).toEqual(['T3', 'T4', 'T5', 'T6'])

    const dual = scanR3Dual(CASE14_BRIEF, CASE14_DRAFTS, false)
    expect(dual.candidates.map(t => t.task)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6'])
    expect(dual.candidates.filter(t => t.depByDisk).map(t => t.task)).toEqual(['T3', 'T4', 'T5', 'T6'])

    const rework = scanR3Dual(REWORK_BRIEF, ['vp-eng.md'], false)
    expect(rework.candidates.find(t => t.task === 'T2')?.depByDisk).toBe(true)
  })

  it('事实阻塞闸门 pending-sources：盘上有稿也不假满足依赖', () => {
    const pendingBrief = [
      'ASSIGN｜T1｜vp-sales｜外部事实包｜deps: none｜status: pending-sources',
      'ASSIGN｜T2｜coo｜承接方案｜deps: T1｜status: todo',
    ].join('\n')
    expect(scanR2(pendingBrief, []).map(t => t.task)).toEqual(['T2'])
    expect(scanR3(pendingBrief, ['vp-sales.md'], false).blocked.map(t => t.task)).toEqual(['T1', 'T2'])
    expect(scanR3Dual(pendingBrief, ['vp-sales.md'], false).blocked.map(t => t.task)).toEqual(['T1', 'T2'])
  })
})

describe('标注解析与打分纯逻辑（parseLabelsText + scoreLabels）', () => {
  const R1 = (roles: string[]) => roles.map(role => ({ rule: 'R1', role, why: '', needsVerify: true }))
  const R2 = (tasks: Array<[string, string]>) => tasks.map(([task, role]) => ({ rule: 'R2', role, task, title: '', deps: [], why: '', needsVerify: true }))
  const R3 = (cands: Array<[string, string]>, blocked: Array<[string, string]>, closed = false) => ({
    candidates: R2(cands),
    blocked: blocked.map(([task, role]) => ({ rule: 'R3', role, task, title: '', missingDeps: [], why: '', needsVerify: true })),
    closed,
  })

  it('parseLabelsText 解析合成/真盘两表并对非法状态与缺字段 fail-loud', () => {
    const rows: any = parseLabelsText(LABELS_TEXT)
    expect(rows.map((r: any) => r.id)).toEqual(['case-a', 'case-b', 'case-c', 'real-x'])
    expect(rows[0].tasks).toEqual([
      { role: 'cfo', task: 'T1', status: '待办' },
      { role: 'coo', task: 'T2', status: '阻塞' },
    ])
    expect(rows[1].closed).toBe(true)
    expect(rows[2].approvals).toBe(2)
    expect(() => parseLabelsText('## 合成语料\n\n| case | 清单 | 谁 | 零容忍 |\n|---|---|---|---|\n| x | cfo·T1·已弃·描述 | cfo | 无 |\n')).toThrow(/状态非法/)
    expect(() => parseLabelsText('## 合成语料\n\n| case | 清单 | 谁 | 零容忍 |\n|---|---|---|---|\n| x | cfo·T1 | cfo | 无 |\n')).toThrow(/缺字段/)
  })

  it('scoreLabels 覆盖 TP / 阻塞误报 / 待核实错类 / 取消与关闭零容忍 / 变体扩展键', () => {
    const rows = [
      {
        id: 'x1', kind: 'synthetic', closed: false, approvals: 1, remind: '', zeroNote: '审批×1',
        tasks: [
          { role: 'vp-sales', task: 'T1', status: '待核实' },
          { role: 'vp-eng', task: 'T2', status: '取消' },
          { role: 'coo', task: 'T3', status: '阻塞' },
          { role: 'cfo', task: 'T4', status: '待办' },
        ],
      },
      {
        id: 'x2', kind: 'synthetic', closed: true, approvals: 0, remind: '', zeroNote: '',
        tasks: [{ role: '——', task: '——', status: '关闭' }],
      },
    ]
    const scans = new Map([
      ['x1', {
        r1: R1(['vp-sales', 'coo']),
        r2: R2([['T1', 'vp-sales'], ['T2', 'vp-eng']]),
        r3: R3([['T1', 'vp-sales']], []),
        r2c: R2([['T1', 'vp-sales']]),
        r3d: R3([['T1', 'vp-sales']], []),
        drafts: ['cfo.md'],
      }],
      ['x2', { r1: R1(['vp-eng']), r2: R2([['T9', 'vp-eng']]), r3: R3([], [], true), drafts: [] }],
    ])
    const { M, zeroTol }: any = scoreLabels(rows, scans)
    expect(M.R1.tp).toBe(1)
    expect(M.R1.blockedAsCandidate).toBe(1)
    expect(M.R1.missWithDraft).toBe(1)
    expect(M.R1.falseImmediate).toBe(1)
    expect(M.R2.staleAsCandidate).toBe(1)
    expect(M.R2.missWithDraft).toBe(1)
    expect(zeroTol.cancelReported).toBe(1)
    expect(zeroTol.cancelSilent).toBe(1)
    expect(zeroTol.approvalMiss).toBe(1)
    expect(zeroTol.closedButReported).toBe(2)
    expect(zeroTol.blockedMissR2).toBe(1)
    expect(zeroTol.blockedMissR3).toBe(1)
    expect(zeroTol.blockedMissR2C).toBe(1)
    expect(zeroTol.blockedMissR3D).toBe(1)
    expect(() => scoreLabels([{ id: 'ghost', kind: 'synthetic', closed: false, approvals: 0, remind: '', zeroNote: '', tasks: [] }], new Map())).toThrow(/ghost/)
  })
})
