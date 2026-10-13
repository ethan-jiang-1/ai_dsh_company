import { describe, expect, it } from 'vitest'
import { parseAssignments, parseLabelsText, scoreLabels, scanR2, scanR2Closed, scanR3, scanR3Dual, roleHasDraft } from '../../tools/lib/candidate-scan.mjs'

// 实验B打分腿的纯逻辑（判据单一来源 = tools/lib/candidate-scan.mjs；格式约定见标注文件头部）。
// IO（读标注文件/语料/deliverables）在 checks/audit/candidate-scan-eval.mjs——tests/ 不碰驱动脚本的文件面。

/** case 14（r6-baseline 录制收割，2026-10-06）的真实漂移形状：六条结构化派活行全程「待办」未回写、
 * 六任务稿（含互审稿）全部落盘、动议开着（无 final）。金标准（labels.md case 14 行）= 六任务全「待核实」。
 * 两个 describe 共用同一形状（漂移判定 vs 变体规则），故提文件级单一事实家。 */
const CASE14_BRIEF = [
  '派活｜T1｜vp-sales｜出定价与买点分层结论｜依赖：无｜状态：待办',
  '派活｜T2｜vp-eng｜出交付包技术可行性｜依赖：无｜状态：待办',
  '派活｜T3｜coo｜出产能承接结论｜依赖：T2｜状态：待办',
  '派活｜T4｜cfo｜出毛利口径与合规闸门结论｜依赖：T1｜状态：待办',
  '派活｜T5｜cfo｜审定价与毛利并出评审稿｜依赖：T1、T4｜状态：待办',
  '派活｜T6｜coo｜审交付承接并出评审稿｜依赖：T1、T2、T3｜状态：待办',
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

describe('双源核对（2026-09-26 采纳结论的一部分）', () => {
  const BRIEF = '派活｜T1｜vp-sales｜市场门｜依赖：无｜状态：待办\n'
  it('状态行待办 + 稿不在盘 ⇒ stale=false（正常候选）', () => {
    expect(scanR2(BRIEF, [])[0].stale).toBe(false)
    expect(scanR3(BRIEF, [], false).candidates[0].stale).toBe(false)
  })
  it('状态行待办 + 稿已在盘 ⇒ stale=true（待核实，不是干净候选）——R2/R3 同标', () => {
    expect(scanR2(BRIEF, ['vp-sales.md'])[0].stale).toBe(true)
    expect(scanR3(BRIEF, ['vp-sales.md'], false).candidates[0].stale).toBe(true)
  })
  it('互审稿（<角色>-review.md）也算该角色有稿', () => {
    expect(roleHasDraft('cfo', ['cfo-review.md'])).toBe(true)
  })
})

describe('真实状态漂移形状（case 14 = r6-baseline 录制收割，2026-10-06）', () => {
  // 形状与金标准说明见文件级 CASE14_BRIEF/CASE14_DRAFTS 注释。
  const goldRow = (statuses: string[]) => ({
    id: 'drift', kind: 'synthetic', closed: false, approvals: 0, remind: '', zeroNote: '',
    tasks: statuses.map((status, i) => ({ role: ['vp-sales', 'vp-eng', 'coo', 'cfo', 'cfo', 'coo'][i], task: `T${String(i + 1)}`, status })),
  })
  const scans = () => {
    const r2 = scanR2(CASE14_BRIEF, CASE14_DRAFTS)
    const r3 = scanR3(CASE14_BRIEF, CASE14_DRAFTS, false)
    return new Map([['drift', { r1: [], r2, r3, drafts: CASE14_DRAFTS }]])
  }

  it('R2 六候选全 stale；R3 两候选 + 四任务沉入 blocked（依赖完成判定被漂移污染）', () => {
    expect(scanR2(CASE14_BRIEF, CASE14_DRAFTS).map(t => [t.task, t.stale])).toEqual([
      ['T1', true], ['T2', true], ['T3', true], ['T4', true], ['T5', true], ['T6', true],
    ])
    const r3 = scanR3(CASE14_BRIEF, CASE14_DRAFTS, false)
    expect(r3.candidates.map(t => t.task)).toEqual(['T1', 'T2'])
    expect(r3.blocked.map(t => t.task)).toEqual(['T3', 'T4', 'T5', 'T6'])
  })

  it('金标准=六待核实 ⇒ R2 全 surfaced 但类别错（待核实当候选×6）；R3 漏 4（沉入不可见 blocked）', () => {
    const { M } = scoreLabels([goldRow(['待核实', '待核实', '待核实', '待核实', '待核实', '待核实'])], scans())
    expect(M.R2.reported).toBe(6)
    expect(M.R2.tp).toBe(6)
    expect(M.R2.staleAsCandidate).toBe(6)
    expect(M.R2.falseImmediate).toBe(0)
    expect(M.R3.reported).toBe(2)
    expect(M.R3.miss).toBe(4)
    expect(M.R3.missWithDraft).toBe(4)
  })

  it('反证：同一扫描形状下翻一条金标准为「取消」⇒ zeroTol.cancelReported 见红计数（仪器能分辨对错标注）', () => {
    const { M, zeroTol } = scoreLabels([goldRow(['取消', '待核实', '待核实', '待核实', '待核实', '待核实'])], scans())
    expect(zeroTol.cancelReported).toBe(2)      // T1 被 R2 与 R3 各报一次 ⇒ 零容忍按规则双计
    expect(M.R2.tp).toBe(5)                       // 其余五条不受影响
  })
})

describe('规则变体（RFC scan-rule-iteration，2026-10-06：R2′ 关闭检查 + R3′ 双源依赖）', () => {
  const REWORK_BRIEF = [
    '派活｜T1｜vp-eng｜可行性 v2 返工（v1 有结构性缺口须重写）｜依赖：无｜状态：待办',
    '派活｜T2｜coo｜出承接排期与人力窗口｜依赖：T1｜状态：待办',
  ].join('\n')

  it('scanR2Closed：final 在场即静默（quote-z 真盘实证的关闭误报修复）', () => {
    expect(scanR2Closed('派活｜T1｜cfo｜毛利｜依赖：无｜状态：待办', [], true)).toEqual([])
    const open = scanR2Closed('派活｜T1｜cfo｜毛利｜依赖：无｜状态：待办', [], false)
    expect(open).toHaveLength(1)
    expect(open[0].rule).toBe('R2')
  })

  it('scanR3Dual（case 14 漂移形状）：四个沉没任务浮出且带 depByDisk 标记', () => {
    const r = scanR3Dual(CASE14_BRIEF, CASE14_DRAFTS, false)
    expect(r.candidates.map(t => t.task)).toEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6'])
    expect(r.candidates.filter(t => t.depByDisk).map(t => t.task)).toEqual(['T3', 'T4', 'T5', 'T6'])
    expect(r.candidates.every(t => t.needsVerify)).toBe(true)   // 降档显示：全部仍带待核实标记
    expect(r.blocked).toEqual([])
  })

  it('scanR3Dual（case 15 返工形状）：假满足如实发生并带标记——已知局限钉住；基线 R3 同形状正确', () => {
    const r = scanR3Dual(REWORK_BRIEF, ['vp-eng.md'], false)
    expect(r.candidates.map(t => t.task)).toEqual(['T1', 'T2'])
    expect(r.candidates.find(t => t.task === 'T2')?.depByDisk).toBe(true)   // 返工依赖被盘上稿假满足——case 15 钉住的代价
    expect(scanR3(REWORK_BRIEF, ['vp-eng.md'], false).blocked.map(t => t.task)).toEqual(['T2'])   // 基线在此形状正确
  })

  it('scoreLabels 扩展键：变体在场计 R2C/R3D；缺省零填充且原指标不变', () => {
    const row = { id: 'x', kind: 'synthetic', closed: false, approvals: 0, remind: '', zeroNote: '',
      tasks: [{ role: 'cfo', task: 'T1', status: '待办' }] }
    const brief = '派活｜T1｜cfo｜毛利｜依赖：无｜状态：待办\n'
    const r2 = scanR2(brief, [])
    const r3 = scanR3(brief, [], false)
    // 变体在场
    const withVariants = scoreLabels([row], new Map([['x', { r1: [], r2, r3, drafts: [], r2c: scanR2Closed(brief, [], false), r3d: scanR3Dual(brief, [], false) }]]))
    expect(withVariants.M.R2C.reported).toBe(1)
    expect(withVariants.M.R3D.reported).toBe(1)
    expect(withVariants.M.R2.reported).toBe(1)
    // 变体缺省：键在场为零，R2/R3 不受影响
    const without = scoreLabels([row], new Map([['x', { r1: [], r2, r3, drafts: [] }]]))
    expect(without.M.R2C.reported).toBe(0)
    expect(without.M.R3D.reported).toBe(0)
    expect(without.M.R2.reported).toBe(1)
  })
})

describe('事实阻塞闸门状态「待补料」（2026-10-10 HITL，ai-transformation-2026 实证）', () => {
  const BRIEF = [
    '派活｜T1｜vp-sales｜外部事实包（要读外部网页正文）｜依赖：无｜状态：待补料',
    '派活｜T2｜coo｜承接方案｜依赖：T1｜状态：待办',
    '派活｜T3｜cfo｜钱与闸门｜依赖：T1｜状态：待办',
  ].join('\n')

  it('待补料浮出 blocked（不静默丢、不当候选）——闸门的可见性要求', () => {
    const r = scanR3(BRIEF, [], false)
    expect(r.candidates).toEqual([])
    expect(r.blocked.map(t => t.task)).toEqual(['T1', 'T2', 'T3'])
    expect(r.blocked[0]!.why).toContain('待补料')
  })

  it('待补料不算依赖满足（只有 已出稿/完成 算），盘上有稿也不解锁', () => {
    const r = scanR3(BRIEF, ['vp-sales.md'], false)
    expect(r.candidates.map(t => t.task)).toEqual([])
    expect(r.blocked.map(t => t.task)).toEqual(['T1', 'T2', 'T3'])
  })

  it('待补料不进 R2 候选（它不是待办；依赖齐不齐是 R3 的事）', () => {
    expect(scanR2(BRIEF, []).map(t => t.task)).toEqual(['T2', 'T3'])
  })

  it('R3′ 双源：待补料的盘上稿不假满足依赖（事实没回来 ≠ 稿在盘上）', () => {
    const r = scanR3Dual(BRIEF, ['vp-sales.md'], false)
    expect(r.candidates.map(t => t.task)).toEqual([])
    expect(r.blocked.map(t => t.task)).toEqual(['T1', 'T2', 'T3'])
  })
})

// 负例留证 2026-10-11：BUG-011 修前先跑本文件 —— `ASSIGN_LINE` 不捕获假设段、`parseAssignments`
// 不返回该字段 ⇒ 「带『假设』段的派活行」那条 1 failed（其余 25 passed）；补解析后 26 passed。
describe('派活行的「假设」段（BUG-011 的机械兜底，2026-10-11）', () => {
  // 病根：任务书把未经证实的因果猜测当指令发（V4 实证：两条任务书带未证假设、同分钟补正撤回）。
  // 手册已立「指令与假设分离」（company-workspace/AGENTS.md:109），但"标没标假设"过去没有任何
  // 机器可读的落点 ⇒ 统计（本卡反证路径要的比例）也算不出来。本段把派活行扩成可选带 `假设：`，
  // 机械面只证**标了没有**，不判假设真假。
  const WITH = '派活｜T1｜vp-sales｜市场门｜依赖：无｜状态：待办｜假设：待证（客户预算未核）'
  const WITHOUT = '派活｜T1｜vp-sales｜市场门｜依赖：无｜状态：待办'

  it('带「假设」段的派活行：解析出该段，其余字段不受影响', () => {
    const parsed = parseAssignments(WITH)
    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toMatchObject({ id: 'T1', role: 'vp-sales', title: '市场门', deps: [], status: '待办' })
    expect(parsed[0].assumption, '「假设」段必须被解析出来（否则统计无从下手）').toBe('待证（客户预算未核）')
  })

  it('不带「假设」段的旧派活行仍然解析（向后兼容，旧任务书不返工）', () => {
    const parsed = parseAssignments(WITHOUT)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].assumption).toBeUndefined()
  })

  it('手动验证红配方：删掉解析里的假设捕获 ⇒ 第一条断言转红', () => {
    // 红配方写在这里，改解析时照着跑：注释掉 ASSIGN_LINE 的 `(?:｜假设：([^｜]*))?` 与
    // parseAssignments 的 assumption 字段 ⇒ 上面第一条 `assumption` 断言失败。
    expect(true).toBe(true)
  })
})
