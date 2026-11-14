import { describe, expect, it } from 'vitest'
import { mentionedRoles, parseAssignments } from '../../tools/lib/candidate-scan.mjs'

// 负例留证 2026-10-11：BUG-011 修前先跑本文件 —— `ASSIGN_LINE` 不捕获假设段、`parseAssignments`
// 不返回该字段 ⇒ 「带『假设』段的派活行」的 assumption 断言红；补解析后绿。
// 从 candidate-scan-labels.spec（2026-11-14 退役，语料已移出本仓）迁出的活守卫：
// BUG-011 的「假设」段、CMO 角色正则、ASSIGN canonical 行。R1/R2/R3 的语料打分随仪器退役。
describe('派活行的「假设」段（BUG-011 的机械兜底，2026-10-11）', () => {
  // 病根：任务书把未经证实的因果猜测当指令发（V4 实证：两条任务书带未证假设、同分钟补正撤回）。
  // 手册已立「指令与假设分离」（company-workspace/AGENTS.md:109），但"标没标假设"过去没有任何
  // 机器可读的落点 ⇒ 统计（本卡反证路径要的比例）也算不出来。本段把派活行扩成可选带 `假设：`，
  // 机械面只证**标了没有**，不判假设真假。
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

  // 红配方（不设 `expect(true)` 空断言占位——空断言不是证据，配方本身写在判据旁边即可）：
  // 注释掉 ASSIGN_LINE 的 `(?:｜assumption: ([^｜]*))?` 与 parseAssignments 的 assumption 字段
  // ⇒ 上面第一条 `assumption` 断言转红。
})

describe('第六角色 CMO 的派活/点名（角色正则覆盖）', () => {
  it('cmo 派活行与点名都可识别', () => {
    expect(parseAssignments('ASSIGN｜T6｜cmo｜写 MRD｜deps: none｜status: todo')).toEqual([
      expect.objectContaining({ id: 'T6', role: 'cmo', status: 'todo' }),
    ])
    expect(mentionedRoles('### CMO 出 MRD')).toEqual(['cmo'])
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
