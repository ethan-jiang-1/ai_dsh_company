/**
 * 培养领域视图（2026-10-13 培养卡 V1/V2/V8/V9/V10 的 keyless 静态渲染）。
 *
 * 为什么单独立一条：公司主面第四子页从「用量」换成「培养」后，培养面板成为人人日常入口——
 * 它的空态、边界与操作指引是产品合同的一部分，不能只靠走查。判据面 = `CultivationBoard`
 * 纯渲染（数据喂 fixture）；真浏览器渲染 = client-load-smoke + 视觉夹具。
 * 反证（红→绿）：实现前 `CultivationBoard` 不存在，本 spec import 即红。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { CultivationBoard } from '../../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx'
import type { CultivationRecord, CultivationRow } from '../../../packages/company-pack/src/lib/cultivation/cultivation.ts'
import type { CultivationContext } from '../../../packages/company-pack/src/lib/cultivation/cultivation-context.ts'
import { setCultivationLanguage } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'

/** 最小行/记录 fixture（形状见 lib/cultivation.ts）。 */
const journalRow = (over: Partial<CultivationRow> = {}): CultivationRow => ({
  role: 'ceo', label: 'CEO', count: 2, reach: 'ok', entries: [],
  ...over,
})
const record = (over: Partial<CultivationRecord> = {}): CultivationRecord => ({
  id: '20261013-120000-closing',
  kind: 'correction', targetRole: 'ceo', proposerRole: 'ceo', proposerKind: 'human',
  source: 'deliverables/x/final.md', expectation: '收口前逐项列出未决项', status: 'open',
  title: '做法：收口盘点先列未决清单。',
  body: '',
  ...over,
})

const render = (over: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(CultivationBoard, {
  viewerRole: 'ceo',
  viewerLabel: 'CEO',
  journalRows: [journalRow()],
  records: [],
  feedback: null,
  feedbackReachable: true,
  ...over,
}))

describe('CultivationBoard：本人收件与操作指引（V1/V7）', () => {
  it('待处理记录展示来源与期望，并给出人侧采纳命令（产品命令，非开发命令）', () => {
    const markup = render({ records: [record()] })
    expect(markup).toContain('需要我处理')
    expect(markup).toContain('收口前逐项列出未决项')
    expect(markup).toContain('deliverables/x/final.md')
    expect(markup).toContain('/cultivation adopt 20261013-120000-closing')
  })

  it('跨角色建议标注提出者；被拒记录给回执（V7 回执双向可见）', () => {
    const markup = render({
      records: [
        record({ id: 'r-sug', kind: 'suggestion', targetRole: 'ceo', proposerRole: 'cfo', status: 'rejected', reason: '口径走 KB 单一来源' }),
      ],
    })
    expect(markup).toContain('CFO')
    expect(markup).toContain('口径走 KB 单一来源')
  })

  it('viewer 缺席 → 提示选择负责的角色，不猜身份', () => {
    const markup = render({ viewerRole: null, viewerLabel: null })
    expect(markup).toContain('请选择负责的角色')
  })
})

describe('CultivationBoard：数据诚实与能力呈现（V2/V8/V9）', () => {
  it('只读摘要的记录展开时明确“不完整”，不冒充全文', () => {
    const markup = render({ records: [record({ body: '正文', bodyTruncated: true })] })
    expect(markup).toContain('正文只加载了摘要')
    expect(markup).toContain('cultivation/records/20261013-120000-closing.md')
  })

  it('坏记录不静默消失；只读摘要的旧记录也有明面计数', () => {
    const markup = render({ brokenRecords: ['bad.md', 'worse.md'], unexpandedRecords: 30 })
    expect(markup).toContain('2 条记录读不动')
    expect(markup).toContain('bad.md')
    expect(markup).toContain('worse.md')
    expect(markup).toContain('30 条旧记录只读了摘要')
  })

  it('journal 不可达行显示「目录不可达」，不当 0 待审呈现', () => {
    const markup = render({ journalRows: [journalRow({ role: 'cfo', label: 'CFO', reach: 'unreachable', count: 0 })] })
    expect(markup).toContain('目录不可达')
    expect(markup).not.toContain('0 待审')
  })

  it('主路径说清今后要做得更好，方法行呈现提案来源、提出者、目标与决定状态', () => {
    const markup = render({ viewerRole: 'cfo', viewerLabel: 'CFO', records: [record({
      id: '20261029-100000-evid',
      source: 'deliverables/q4-review.md',
      body: '报告结论用了预测数字，但没有列关键假设。',
      proposerKind: 'agent',
      proposerRole: 'vp-eng',
      targetRole: 'cfo',
      status: 'adopted',
      methodSlug: 'assumption-check',
      decidedAt: '2026-10-29T10:00:00.000Z',
    })] })
    expect(markup).toContain('让角色今后的工作更好')
    expect(markup).toContain('原始工作依据')
    expect(markup).toContain('VP-Eng 分身')
    expect(markup).toContain('目标角色：CFO')
    expect(markup).toContain('目标角色语境下的人已采纳')
  })

  it('roleLabel 可把培养子块的角色名换成表达层文案', () => {
    const markup = render({
      viewerRole: 'cfo',
      viewerLabel: 'CFO · 首席财务官',
      roleLabel: (role: string) => role === 'vp-eng' ? 'VP-Eng · 工程副总裁' : role === 'cfo' ? 'CFO · 首席财务官' : role,
      records: [record({
        id: '20261029-100000-evid',
        source: 'deliverables/q4-review.md',
        body: '报告结论用了预测数字，但没有列关键假设。',
        proposerKind: 'agent',
        proposerRole: 'vp-eng',
        targetRole: 'cfo',
        status: 'adopted',
        methodSlug: 'assumption-check',
        decidedAt: '2026-10-29T10:00:00.000Z',
      })],
    })
    expect(markup).toContain('VP-Eng · 工程副总裁 分身（Agent）')
    expect(markup).toContain('目标角色：CFO · 首席财务官')
  })

  it('拒绝回执展示目标角色的人侧决定及决定时间', () => {
    const markup = render({ viewerRole: 'cfo', viewerLabel: 'CFO', records: [record({
      kind: 'suggestion', proposerRole: 'ceo', targetRole: 'cfo', status: 'rejected',
      reason: '缺少后续案例', decidedAt: '2026-10-29T11:20:00.000Z',
    })] })
    expect(markup).toContain('目标角色语境下的人已拒绝')
    // 时间口径（BUG-300）：正文是人话相对时间，完整 ISO 只在 title 里（审计要看精确值）。
    expect(markup).toContain('拒绝时间：')
    expect(markup).toContain('title="2026-10-29T11:20:00.000Z"')
    expect(markup).not.toContain('拒绝时间：2026-10-29T11:20:00.000Z')
  })

  it('自纠正的 open 状态说「待我决定」，不再说「待对方处理」', () => {
    const markup = render({ records: [record({ targetRole: 'ceo', proposerRole: 'ceo', status: 'open' })] })
    expect(markup).toContain('待我决定')
    expect(markup).toContain('自己的纠正在上面「需要我处理」里待你决定')
    expect(markup, '自纠正不该显示等对方处理').not.toContain('待对方处理')
  })

  it('跨角色建议的 open 状态仍说「待对方处理」', () => {
    const markup = render({ records: [record({ kind: 'suggestion', targetRole: 'cfo', proposerRole: 'ceo', status: 'open' })] })
    expect(markup).toContain('待对方处理')
    expect(markup).not.toContain('待我决定')
  })

  it('拒绝回执按记录类型说纠正/建议，不把纠正叫成建议', () => {
    const markup = render({ records: [record({ kind: 'correction', proposerRole: 'cfo', targetRole: 'ceo', status: 'rejected', reason: '口径不符' })] })
    expect(markup).toContain('已拒绝 CFO 的纠正')
    expect(markup).not.toContain('已拒绝 CFO 的建议')
  })

  it('「怎么养」指向单表单入口，不再把已删除的纠正/建议按钮说成直接可见', () => {
    const markup = render()
    expect(markup).toContain('点上面「开始记录一项工作」')
    expect(markup).toContain('把目标角色改成对方')
    expect(markup).not.toContain('→「给你的角色留一条方法」')
    expect(markup).not.toContain('→「给别的角色提建议」')
  })

  it('旧 pass/fail 状态不伪造证据，并提示历史依据未记录', () => {
    const markup = render({ records: [record({ status: 'adopted', verification: 'fail', verificationHistory: [], methodSlug: 'review-evidence' })] })
    expect(markup).toContain('验证未通过')
    expect(markup).toContain('历史验证结果已保存，但后续工作依据未记录；方法仍已采纳。')
  })

  it('已采纳·未验证 与 已验证分开呈现（V8 能力而非记账）', () => {
    const withUnverified = render({
      records: [record({ status: 'adopted', methodSlug: 'closing-checklist' })],
    })
    expect(withUnverified).toContain('已采纳')
    expect(withUnverified).toContain('未验证')
    const verified = render({
      records: [record({ status: 'adopted', methodSlug: 'closing-checklist', verification: 'pass' })],
    })
    expect(verified).toContain('已验证')
  })

  it('诚实边界：teammate 继承 Lead 组合、命名 child 有自己 preset 的说明在场（V9；B1 改口径）', () => {
    const markup = render()
    // 2026-11-07 B1：旧文案说「委派出去的分身都继承 CEO 组合」——对 teammate 成立，对命名 child 不成立
    // （命名 child 由 agentPreset 选组合，职能方法能加载）。文案改成两通道分开说。
    expect(markup).toContain('teammate 继承 CEO 组合')
    expect(markup).toContain('命名委派 child 有自己的 preset')
  })

  it('不出现开发命令与内部门禁编号（V10；/cultivation 命令是产品操作，不在黑名单）', () => {
    const markup = render({
      records: [record({ status: 'adopted', methodSlug: 'closing-checklist' })],
      journalRows: [journalRow(), journalRow({ role: 'vp-eng', label: 'VP-Eng', reach: 'unreachable' })],
    })
    expect(markup).not.toContain('pnpm')
    expect(markup).not.toContain('preset-smoke')
    expect(markup).not.toContain('D25')
    expect(markup).not.toContain('D17')
  })
})


describe('背景卡：有 contexts 的记录（D1=A / D2=A）', () => {
  const background: CultivationContext = {
    kind: 'session',
    ref: 'session-1',
    role: 'ceo',
    title: '收口检查',
    subtitle: 'CEO · 第 3 轮',
    turn: 3,
    excerpt: '用户：收口前把未决项列一下\n分身：已收口',
    truncated: false,
  }

  it('显示背景标题/摘要；正文空给「未写做法；依据背景」；不再显示单独出处', () => {
    const markup = render({ records: [record({ source: '会话「收口检查」', body: '', contexts: [background] })] })
    expect(markup).toContain('收口检查')
    expect(markup).toContain('用户：收口前把未决项列一下')
    expect(markup).toContain('（未写做法；依据背景）')
    expect(markup).not.toContain('出处：会话「收口检查」')
  })

  it('无 contexts 的旧记录仍显示「出处：…」', () => {
    const markup = render({ records: [record({ source: 'deliverables/x/final.md' })] })
    expect(markup).toContain('出处：deliverables/x/final.md')
  })

  it('无 openContext 时不渲染「打开会话」（不出死按钮）', () => {
    const markup = render({ records: [record({ body: '', contexts: [background] })] })
    expect(markup).not.toContain('打开会话')
  })
})

// 作用域与可诊断失败（BUG-291，F2 合同的第一处）：面板说的是真话，但「说的是哪个盘」必须可见——
// 上一轮两次误判都来自「0 条」与「读不到」都不点名 workspace（对照实验：company-workspace 有 2 条，
// rehearsal-workspace 同路径下 0 条，两个盘在 UI 上长得一模一样）。
// 负例留证 2026-11-21：改回改文案前的实现（不传 workspaceLabel / 无 recordsProblem 分支）时 `vitest run tests/client/cultivation/cultivation-board.spec.ts` 4/24 失败（标题不点名、空态不点名、null 说不了原因、不可达与空不可分）；接回后 24/24 绿。BUG-291
describe('CultivationBoard：作用域与可诊断失败（BUG-291）', () => {
  it('标题点名会话所属 workspace（默认 zh）', () => {
    const markup = render({ records: [], workspaceLabel: 'company-workspace' })
    expect(markup).toContain('company-workspace')
  })

  it('空清单点名 workspace，且不冒充「读不到」', () => {
    const markup = render({ records: [], workspaceLabel: 'rehearsal-workspace' })
    expect(markup).toContain('rehearsal-workspace')
    expect(markup).toContain('还没有培养记录')
    expect(markup).not.toContain('读不到')
  })

  it('不可达点名目录与原因，与「0 条」可区分', () => {
    const markup = render({
      records: null,
      workspaceLabel: 'company-workspace',
      recordsProblem: { path: '.dsh-company/cultivation/records', reason: 'not found' },
    })
    expect(markup).toContain('.dsh-company/cultivation/records')
    expect(markup).toContain('not found')
    expect(markup).not.toContain('还没有培养记录')
  })

  it('首读未完成说「读取中」，不预判成读不到', () => {
    const markup = render({ records: null })
    expect(markup).toContain('读取中')
    expect(markup).not.toContain('读不到')
  })
})

// en 面同判（coverage ratchet 只升不降 + 产品要求 zh/en 同批）：作用域与失败原因在 en 下也要说出来。
describe('CultivationBoard：作用域与失败原因的 en 面（BUG-291）', () => {
  it('en 下标题点名 workspace、空态点名 workspace、不可达点名目录与原因', () => {
    setCultivationLanguage('en')
    try {
      const empty = render({ records: [], workspaceLabel: 'company-workspace' })
      expect(empty).toContain('company-workspace')
      expect(empty).toContain('No cultivation records')
      const broken = render({ records: null, recordsProblem: { path: '.dsh-company/cultivation/records', reason: 'boom' }, workspaceLabel: 'company-workspace' })
      expect(broken).toContain('.dsh-company/cultivation/records')
      expect(broken).toContain('boom')
      // 无 workspaceLabel 时的 en 兜底（不点名，也不留空括号）
      const noLabel = render({ records: [] })
      expect(noLabel).toContain('No cultivation records in this workspace.')
      expect(noLabel).toContain('the company disk')
      // 第四格的 en 文案与单复数（1 条 / 多条各跑一次，分支都要有判据）
      expect(render({ records: [record({ status: 'adopted', methodSlug: 'm-1' })] })).toContain('1 record total')
      expect(render({
        records: [record({ id: 'r-a', status: 'adopted', methodSlug: 'm-1' }), record({ id: 'r-b', status: 'rejected', reason: '口径不同' })],
      })).toContain('2 records total')
    } finally {
      setCultivationLanguage('zh')
    }
  })
})

// 四态矩阵（BUG-294）：空态必须在「加载 / 不可达 / 目录空 / 有记录无待办」四格里各自说对话。
// 这条钉的是第四格——盘上有一条已采纳记录、没有任何待办时，不能说「这个工作区还没有培养记录」。
// 负例留证 2026-11-22：把「有记录但零待办」的文案改回 inboxEmpty（工作区还没有记录）后 `vitest run tests/client/cultivation/cultivation-board.spec.ts` 1 failed（第四格断言）；改回后 27/27 绿。BUG-294
describe('CultivationBoard：四态矩阵的第四格（BUG-294）', () => {
  it('有记录但零待办 ⇒ 说「没有需要你处理的记录」，不否认工作区里有记录', () => {
    const markup = render({
      records: [record({ status: 'adopted', methodSlug: 'm-1' })],
      workspaceLabel: 'company-workspace',
    })
    expect(markup).toContain('没有需要你处理的记录')
    expect(markup).not.toContain('还没有培养记录')
  })

  it('记录目录真的空 ⇒ 仍是 BUG-291 的工作区点名空态（两态不混）', () => {
    const markup = render({ records: [], workspaceLabel: 'company-workspace' })
    expect(markup).toContain('还没有培养记录')
    expect(markup).not.toContain('没有需要你处理的记录')
  })
})

// 英文界面不许混中文：时间是「刚刚/7 小时前」、读失败原因是「列目录被拒（…）」，
// 模板是英文、参数是中文——这是两个只写中文的共享 helper 造成的。判据 = en 渲染里不出现 CJK。
// 负例留证 2026-11-22：把时间渲染改回 timeLabel（中文）后 `vitest run tests/client/cultivation/cultivation-board.spec.ts` 2 failed（en 里命中 CJK）；还原后 29/29 绿。BUG-302
describe('CultivationBoard · en 渲染无 CJK（BUG-302）', () => {
  const cjk = /[\u4e00-\u9fff]/

  afterEach(() => { setCultivationLanguage('zh') })

  it('采纳/拒绝时间与提出时间都是英文（不出现「刚刚 / 分钟前 / 昨天」）', () => {
    setCultivationLanguage('en')
    const markup = render({
      viewerRole: 'cfo',
      viewerLabel: 'CFO',
      records: [
        // 5 分钟前 ⇒ 相对时间分支（英文应为 "5 minutes ago"，中文会是「5 分钟前」）。
        // 夹具数据一律 ASCII：这条判据只钉**文案**不带中文，不把用户数据算进来。
        record({ kind: 'suggestion', proposerRole: 'ceo', targetRole: 'cfo', status: 'rejected', reason: 'x', expectation: 'ascii expectation', title: 'ascii title', decidedAt: new Date(Date.now() - 5 * 60_000).toISOString() }),
        record({ id: 'r-2', status: 'adopted', methodSlug: 'm-1', expectation: 'ascii expectation', title: 'ascii title', decidedAt: new Date(Date.now() - 5 * 60_000).toISOString() }),
      ],
    })
    const times = markup.match(/\d+ minutes ago|\d+ hours ago|just now|yesterday \d\d:\d\d/g) ?? []
    expect(times.length).toBeGreaterThan(0)
    expect(markup).not.toMatch(cjk)
  })

  it('读不到的原因也走字典（不是硬编码中文）', () => {
    setCultivationLanguage('en')
    const markup = render({ records: null, recordsProblem: { path: '.dsh-company/cultivation/records', reason: 'dir-denied' } })
    expect(markup).toContain('the directory listing was denied')
    expect(markup).not.toMatch(cjk)
  })
})

// 声明必须有人用（BUG-306）：`LIST_CAPS.mine = 5` 早就写着，渲染面从不调用——
// 20 条记录会把「我提交的」整段铺开，把下面的「已采纳/journal」顶没。
// 负例留证 2026-11-22：不接 capList（恢复全量渲染）后 `vitest run tests/client/cultivation/cultivation-board.spec.ts` 1 failed（6 条全铺开、无控件）；接上后 31/31 绿。BUG-306
describe('CultivationBoard · 我提交的折叠上限（BUG-306）', () => {
  it('6 条 ⇒ 只显示 5 条 + 「显示全部（共 6 条）」控件', () => {
    const records = Array.from({ length: 6 }, (_, i) => record({ id: `2026112${String(i)}-000000-r${String(i)}`, status: 'open', expectation: `e-${String(i)}` }))
    const markup = render({ records })
    expect(markup).toContain('显示全部（共 6 条）')
    // 只数「我提交的」那块（inbox 里同样的 6 条不该被算进来）。
    expect(markup.match(/aria-label="我提交的 /g)?.length ?? 0).toBeLessThanOrEqual(5)
  })

  it('5 条以内 ⇒ 不给控件（不制造噪声）', () => {
    const records = Array.from({ length: 5 }, (_, i) => record({ id: `2026112${String(i)}-000000-r${String(i)}`, status: 'open' }))
    expect(render({ records })).not.toContain('显示全部')
  })
})

// 声明约束必须被执行（BUG-307 / BUG-309）：
// ① 控件只在**真的隐藏了行**时出现（两个子列表各折 5 条，不能按和判断）；
// ② 自己提、自己拒的记录只出现一次（mine 带回执，不进 processedForViewer）。
describe('CultivationBoard · 我提交的：控件与去重', () => {
  // 别人提、我拒 ⇒ 进 processedForViewer；自己提 ⇒ 进 mine（309 的去重只针对「自己提自己拒」）。
  const rejected = (id: string) => record({ id, status: 'rejected', reason: 'r', proposerRole: 'cfo', targetRole: 'ceo', expectation: `e-${id}` })
  const open = (id: string) => record({ id, status: 'open', expectation: `e-${id}` })
  // 两块子列表的 aria 前缀不同：mine = 「我提交的」，processed = 「已拒绝」。
  const count = (markup: string) => (markup.match(/aria-label="(我提交的 |已拒绝 )/g)?.length ?? 0)

  it('4 + 4 ⇒ 一行都没隐藏，不给控件', () => {
    const markup = render({ records: [...[0, 1, 2, 3].map(i => rejected(`r-${String(i)}`)), ...[0, 1, 2, 3].map(i => open(`m-${String(i)}`))] })
    expect(count(markup)).toBe(8)
    expect(markup).not.toContain('显示全部')
  })

  it('6 + 1 ⇒ 只隐藏 1 条，控件出现且文案是总数 7', () => {
    const markup = render({ records: [...[0, 1, 2, 3, 4, 5].map(i => rejected(`r-${String(i)}`)), open('m-1')] })
    expect(count(markup)).toBe(6)
    expect(markup).toContain('显示全部（共 7 条）')
  })

  it('自己提、自己拒 ⇒ 只出现一次', () => {
    const markup = render({ records: [record({ id: 'self-1', status: 'rejected', reason: 'r', expectation: 'e-self' })] })
    // 同一行只出现一次（mine 带回执；processedForViewer 不再收自己提的）。
    expect(markup.match(/aria-label="我提交的 self-1"/g)?.length ?? 0).toBe(1)
    expect(markup).not.toContain('已拒绝 CEO · 首席执行官的纠正')
  })
})
