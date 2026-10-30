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
import { describe, expect, it } from 'vitest'
import { CultivationBoard } from '../../packages/company-pack/src/client/CultivationBoard.tsx'
import type { CultivationRecord, CultivationRow } from '../../packages/company-pack/src/lib/cultivation.ts'
import type { CultivationContext } from '../../packages/company-pack/src/lib/cultivation-context.ts'

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

  it('拒绝回执展示目标角色的人侧决定及决定时间', () => {
    const markup = render({ viewerRole: 'cfo', viewerLabel: 'CFO', records: [record({
      kind: 'suggestion', proposerRole: 'ceo', targetRole: 'cfo', status: 'rejected',
      reason: '缺少后续案例', decidedAt: '2026-10-29T11:20:00.000Z',
    })] })
    expect(markup).toContain('目标角色语境下的人已拒绝')
    expect(markup).toContain('拒绝时间：2026-10-29T11:20:00.000Z')
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

  it('诚实边界：委派 child 继承 CEO 组合的说明在场（V9）', () => {
    const markup = render()
    expect(markup).toContain('继承 CEO 组合')
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
