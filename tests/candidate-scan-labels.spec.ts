import { describe, expect, it } from 'vitest'
import { parseLabelsText, scoreLabels } from '../scripts/lib/candidate-scan.mjs'

// 实验B打分腿的纯逻辑（判据单一来源 = scripts/lib/candidate-scan.mjs；格式约定见标注文件头部）。
// IO（读标注文件/语料/deliverables）在 scripts/candidate-scan-eval.mjs——tests/ 不碰驱动脚本的文件面。

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

describe('标注文件解析（parseLabelsText）', () => {
  it('两张表分开解析，kind 正确；表头/分隔行/正文说明行不进结果', () => {
    const rows = parseLabelsText(LABELS_TEXT)
    expect(rows.map(r => r.id)).toEqual(['case-a', 'case-b', 'case-c', 'real-x'])
    expect(rows[0].kind).toBe('synthetic')
    expect(rows[3].kind).toBe('real')
  })

  it('描述里的 `；` 不拆条目（碎片并回上一条）', () => {
    const rows = parseLabelsText(LABELS_TEXT)
    expect(rows[0].tasks).toEqual([
      { role: 'cfo', task: 'T1', status: '待办' },
      { role: 'coo', task: 'T2', status: '阻塞' },
    ])
  })

  it('关闭条目 ⇒ 整场关闭标记；审批×N 解析为计数', () => {
    const rows = parseLabelsText(LABELS_TEXT)
    expect(rows[1].closed).toBe(true)
    expect(rows[1].tasks[0].role).toBe('——')
    expect(rows[2].approvals).toBe(2)
    expect(rows[0].approvals).toBe(0)
  })

  it('状态枚举外 ⇒ fail-loud', () => {
    const bad = `## 合成语料\n\n| case | 清单 | 谁 | 零容忍 |\n|---|---|---|---|\n| x | cfo·T1·已弃·描述 | cfo | 无 |\n`
    expect(() => parseLabelsText(bad)).toThrow(/状态非法/)
  })

  it('条目缺字段 ⇒ fail-loud（不是静默丢条）', () => {
    const bad = `## 合成语料\n\n| case | 清单 | 谁 | 零容忍 |\n|---|---|---|---|\n| x | cfo·T1 | cfo | 无 |\n`
    expect(() => parseLabelsText(bad)).toThrow(/缺字段/)
  })
})

describe('打分（scoreLabels）：指标与零容忍计数', () => {
  // 最小夹具：一行金标准 + 手工构造的三规则输出形状（与 scanR1/R2/R3 的返回同形）
  const R1 = (roles: string[]) => roles.map(role => ({ rule: 'R1', role, why: '', needsVerify: true }))
  const R2 = (tasks: Array<[string, string]>) => tasks.map(([task, role]) => ({ rule: 'R2', role, task, title: '', deps: [], why: '', needsVerify: true }))
  const R3 = (cands: Array<[string, string]>, blocked: Array<[string, string]>, closed = false) => ({
    candidates: R2(cands), blocked: blocked.map(([task, role]) => ({ rule: 'R3', role, task, title: '', missingDeps: [], why: '', needsVerify: true })), closed,
  })

  it('R1：待办角色报出=对；只报阻塞角色=阻塞当候选；关闭动议报角色=错误需立即处理+零容忍', () => {
    const rows = [
      { id: 'x1', kind: 'synthetic', closed: false, approvals: 0, remind: '', zeroNote: '',
        tasks: [{ role: 'cfo', task: 'T1', status: '待办' }, { role: 'coo', task: 'T2', status: '阻塞' }] },
      { id: 'x2', kind: 'synthetic', closed: true, approvals: 0, remind: '', zeroNote: '',
        tasks: [{ role: '——', task: '——', status: '关闭' }] },
    ]
    const scans = new Map([
      ['x1', { r1: R1(['cfo', 'coo']), r2: [], r3: R3([], []), drafts: [] }],
      ['x2', { r1: R1(['vp-eng']), r2: [], r3: R3([], [], true), drafts: [] }],
    ])
    const { M, zeroTol } = scoreLabels(rows, scans)
    expect(M.R1.tp).toBe(1)               // cfo
    expect(M.R1.blockedAsCandidate).toBe(1) // coo 只有阻塞活
    expect(M.R1.falseImmediate).toBe(1)   // x2 的 vp-eng（关闭动议）
    expect(zeroTol.closedButReported).toBe(1)
  })

  it('R1 漏报 + 稿在场 ⇒ 错误"已完成"计数（纯文件存在规则的病灶）', () => {
    const rows = [{ id: 'x', kind: 'synthetic', closed: false, approvals: 0, remind: '', zeroNote: '',
      tasks: [{ role: 'coo', task: 'T6', status: '待办' }] }]
    const scans = new Map([['x', { r1: [], r2: [], r3: R3([], []), drafts: ['coo.md'] }]])
    const { M } = scoreLabels(rows, scans)
    expect(M.R1.miss).toBe(1)
    expect(M.R1.missWithDraft).toBe(1)
  })

  it('R2/R3：待核实被报成候选 ⇒ staleAsCandidate；取消被报 ⇒ cancelReported；阻塞漏显示逐规则记账', () => {
    const rows = [{ id: 'x', kind: 'synthetic', closed: false, approvals: 1, remind: '', zeroNote: '审批×1',
      tasks: [
        { role: 'vp-sales', task: 'T1', status: '待核实' },
        { role: 'vp-eng', task: 'T2', status: '取消' },
        { role: 'coo', task: 'T3', status: '阻塞' },
      ] }]
    // R1 报了 vp-sales（待核实角色的 TP）但没报 coo ⇒ R1 阻塞漏显示 +1；
    // R2 报 T1（待核实当候选）+ T2（取消被报）但没报 T3 ⇒ R2 阻塞漏显示 +1；
    // R3 把 T1 报成候选、T2 未报（状态行=取消）、T3 两处都无 ⇒ R3 阻塞漏显示 +1
    const scans = new Map([['x', { r1: R1(['vp-sales']), r2: R2([['T1', 'vp-sales'], ['T2', 'vp-eng']]), r3: R3([['T1', 'vp-sales']], []), drafts: [] }]])
    const { M, zeroTol } = scoreLabels(rows, scans)
    expect(M.R2.reported).toBe(2)
    expect(M.R2.staleAsCandidate).toBe(1)     // T1 待核实当候选
    expect(M.R2.falseImmediate).toBe(1)       // T2 取消被报
    expect(zeroTol.cancelReported).toBe(1)
    expect(zeroTol.cancelSilent).toBe(1)      // 取消项在人视角不可见（规则无取消通道）
    expect(zeroTol.approvalMiss).toBe(1)      // 审批结构性看不见
    // 阻塞漏显示：三条规则各记各的账
    expect(zeroTol.blockedMissR1).toBe(1)     // coo 角色不在 R1 候选里
    expect(zeroTol.blockedMissR2).toBe(1)     // T3 不在 R2 报告里
    expect(zeroTol.blockedMissR3).toBe(1)     // T3 候选与依赖未齐两处都无
    // R3 把 T1 报成候选（同样待核实当候选）；T2 未报（状态行=取消 ⇒ 不在待办清单）
    expect(M.R3.staleAsCandidate).toBe(1)
    expect(M.R3.falseImmediate).toBe(0)
  })

  it('标注行没有对应扫描结果 ⇒ fail-loud', () => {
    const rows = [{ id: 'ghost', kind: 'synthetic', closed: false, approvals: 0, remind: '', zeroNote: '', tasks: [] }]
    expect(() => scoreLabels(rows, new Map())).toThrow(/ghost/)
  })
})
