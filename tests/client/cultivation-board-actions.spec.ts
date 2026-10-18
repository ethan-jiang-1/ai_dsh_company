// @vitest-environment happy-dom
/**
 * 培养面板**动作面**的 keyless 交互判据（S2/S3/S5）：点了按钮到底发出哪条命令、回执行内怎么显示、
 * 拒绝理由与撤回确认的两步怎么走、创作表单校验怎么拦、动作面缺席怎么退回只读。
 *
 * 为什么单独立一条（不进 `cultivation-board.spec.ts` 的静态渲染档）：静态渲染证明不了"点下去发什么"，
 * 而按钮最容易出的错正是**接错记录 / 发错子命令**。本档用 happy-dom + createRoot 真派发事件，
 * 断言到动作面的入参；**不主张**真浏览器渲染（那层归 `client-load-smoke` 与 browser-visual 探针）。
 * 红证（先红后绿）：本 spec 在按钮与动作面 prop 存在前实跑红（见毕业 Note 验证节）。
 */
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CultivationBoard } from '../../packages/company-pack/src/client/CultivationBoard.tsx'
import {
  CULTIVATION_COPY,
  adoptLine,
  correctLine,
  rejectLine,
  revokeLine,
  suggestLine,
  verifyLine,
  type ActionOutcome,
  type CultivationActions,
} from '../../packages/company-pack/src/client/cultivation-actions.ts'
import type { CultivationRecord } from '../../packages/company-pack/src/lib/cultivation.ts'

// React 18 的 act 语义开关（不设它 act 会告警、更新时机也不受控）。
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** 一条 open 记录（点名给我的纠正）。 */
function record(over: Partial<CultivationRecord> = {}): CultivationRecord {
  return {
    id: 'r-1',
    kind: 'correction',
    targetRole: 'ceo',
    proposerRole: 'ceo',
    proposerKind: 'agent',
    source: '（会话内提交）',
    expectation: '收口前逐项列出未决项',
    status: 'open',
    title: '做法：收口盘点先列未决清单。',
    body: '',
    ...over,
  } as CultivationRecord
}

/** 记录调用的桩动作面。 */
function stubActions(answer: ActionOutcome = { ok: true, text: '已采纳 r-1：方法 method-r-1 部署到 CEO 方法层。' }): {
  readonly actions: CultivationActions
  readonly lines: string[]
} {
  const lines: string[] = []
  return {
    lines,
    actions: {
      run: async (line) => {
        lines.push(line)
        return answer
      },
    },
  }
}

const mounted: Array<{ root: Root, container: HTMLElement }> = []

/** 挂一棵面板（props 覆盖式）。 */
function mount(props: Record<string, unknown>): { readonly container: HTMLElement, readonly rerender: (next: Record<string, unknown>) => void } {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const base = {
    viewerRole: 'ceo',
    viewerLabel: 'CEO',
    journalRows: [],
    records: [],
    feedback: null,
    feedbackReachable: true,
  }
  act(() => { root.render(createElement(CultivationBoard, { ...base, ...props })) })
  mounted.push({ root, container })
  return {
    container,
    rerender: (next) => { act(() => { root.render(createElement(CultivationBoard, { ...base, ...props, ...next })) }) },
  }
}

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => { root.unmount() })
    container.remove()
  }
})

/** 按可见文字找按钮（找不到给 null，断言自己报错）。 */
function button(container: HTMLElement, label: string): HTMLButtonElement | null {
  const found = [...container.querySelectorAll('button')].find(node => (node.textContent ?? '').trim() === label)
  return (found as HTMLButtonElement | undefined) ?? null
}

/** 真派发一次点击（含 React 状态更新与微任务落地）。 */
async function click(target: HTMLElement): Promise<void> {
  await act(async () => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 往受控输入里打字（绕过 React 的 value 追踪，照 React 18 测试惯例）。 */
async function type(input: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('治理动作：点一下就发出对那条记录的命令（S2）', () => {
  it('待办行给「采纳」「拒绝」两个把手，采纳发出 adopt <id> 并把 host 回执显示在行内', async () => {
    const { actions, lines } = stubActions()
    const refreshes: number[] = []
    const { container } = mount({ records: [record()], actions, onRefresh: () => { refreshes.push(1) } })

    const adopt = button(container, CULTIVATION_COPY.adopt)
    expect(adopt, '待办行应有采纳按钮').not.toBeNull()
    expect(button(container, CULTIVATION_COPY.reject), '待办行应有拒绝按钮').not.toBeNull()

    await click(adopt!)
    expect(lines).toEqual(['/cultivation adopt r-1'])
    expect(container.textContent).toContain('已采纳 r-1')
    expect(refreshes, '成功后要重读记录').toHaveLength(1)
  })

  it('拒绝：先出理由输入，确认后发出 reject <id> :: <理由>', async () => {
    const { actions, lines } = stubActions({ ok: true, text: '已拒绝 r-1（理由已留档）。' })
    const { container } = mount({ records: [record()], actions })

    await click(button(container, CULTIVATION_COPY.reject)!)
    const input = container.querySelector('input')
    expect(input, '点拒绝应先出现理由输入').not.toBeNull()
    await type(input as HTMLInputElement, '口径不符：KB 已有单一来源')
    await click(button(container, CULTIVATION_COPY.rejectConfirm)!)
    expect(lines).toEqual(['/cultivation reject r-1 :: 口径不符：KB 已有单一来源'])
    expect(container.textContent).toContain('已拒绝 r-1')
  })

  it('拒绝理由空着不发命令，行内给校验提示', async () => {
    const { actions, lines } = stubActions()
    const { container } = mount({ records: [record()], actions })
    await click(button(container, CULTIVATION_COPY.reject)!)
    await click(button(container, CULTIVATION_COPY.rejectConfirm)!)
    expect(lines).toEqual([])
    expect(container.textContent).toContain(CULTIVATION_COPY.problemReason)
  })

  it('失败：host 原话（如仅建议权）显示在行内，不吞成"没反应"', async () => {
    const { actions } = stubActions({ ok: false, text: '仅建议权：r-1 的培养对象是 CFO，请在 CFO 的会话里采纳。' })
    const { container } = mount({ records: [record()], actions })
    await click(button(container, CULTIVATION_COPY.adopt)!)
    expect(container.textContent).toContain('仅建议权')
  })

  it('已采纳行：验证两个动作各发 pass/fail；撤回要先讲后果再确认', async () => {
    const { actions, lines } = stubActions({ ok: true, text: '已回填验证：r-9 → pass。' })
    const { container } = mount({
      records: [record({ id: 'r-9', status: 'adopted', methodSlug: 'method-r-9' })],
      actions,
    })

    await click(button(container, CULTIVATION_COPY.verifyPass)!)
    expect(lines).toEqual(['/cultivation verify r-9 pass'])
    await click(button(container, CULTIVATION_COPY.verifyFail)!)
    expect(lines[1]).toBe('/cultivation verify r-9 fail')

    const revoke = button(container, CULTIVATION_COPY.revoke)
    expect(revoke, '已采纳行应有撤回入口').not.toBeNull()
    await click(revoke!)
    expect(lines, '第一下不执行，先讲后果').toHaveLength(2)
    expect(container.textContent).toContain('不能再被采纳')
    await click(button(container, CULTIVATION_COPY.revokeConfirm)!)
    expect(lines[2]).toBe('/cultivation revoke method-r-9')
  })

  it('角色不符的行不给把手（按钮只是 UX；真闸在 host）', () => {
    const { actions } = stubActions()
    const { container } = mount({ viewerRole: 'cfo', viewerLabel: 'CFO', records: [record()], actions })
    expect(button(container, CULTIVATION_COPY.adopt)).toBeNull()
  })

  it('会话 preset 不在名册（如 PTC/Standard）⇒ 当未选角色：不猜身份、不给把手、不开创作入口', () => {
    const { actions } = stubActions()
    const { container } = mount({ viewerRole: 'ptc', viewerLabel: 'ptc', records: [record()], actions })
    expect(container.textContent).toContain('请选择负责的角色')
    expect(container.textContent, '不该把非名册 preset 当成角色显示').not.toContain('我的分身：ptc')
    expect(button(container, CULTIVATION_COPY.adopt)).toBeNull()
    expect(button(container, CULTIVATION_COPY.composeCorrect)).toBeNull()
  })

  it('没注入动作面（命令面缺席）⇒ 退回只读：给命令原文，不给死按钮', () => {
    const { container } = mount({ records: [record()] })
    expect(button(container, CULTIVATION_COPY.adopt)).toBeNull()
    expect(container.textContent).toContain('/cultivation adopt r-1')
  })
})

describe('创作面：不看说明也能提交一条（S5，判据 ①/G1）', () => {
  it('顶部有「给你的角色留一条方法」，展开后提交发出 correct 线', async () => {
    const { actions, lines } = stubActions({ ok: true, text: '已提交培养记录 20261017-120000-abcd（纠正，待你采纳）。' })
    const { container } = mount({ actions, viewerRole: 'ceo', viewerLabel: 'CEO' })

    const open = button(container, CULTIVATION_COPY.composeCorrect)
    expect(open, '面板顶部应有创作入口').not.toBeNull()
    await click(open!)

    const inputs = container.querySelectorAll('input')
    const textarea = container.querySelector('textarea')
    expect(inputs.length, '期望行为是单行输入').toBeGreaterThan(0)
    expect(textarea, '正文要能写多段（本包自写 textarea）').not.toBeNull()
    await type(inputs[0] as HTMLInputElement, '收口前逐项列出未决项')
    await type(textarea as HTMLTextAreaElement, '做法：先列未决清单。\n证据：deliverables/x/final.md')
    await click(button(container, CULTIVATION_COPY.submit)!)

    expect(lines).toEqual([
      '/cultivation correct 收口前逐项列出未决项 :: 做法：先列未决清单。\n证据：deliverables/x/final.md',
    ])
    expect(container.textContent).toContain('已提交培养记录')
  })

  it('期望句含 `::` 时不发命令，行内说明为什么', async () => {
    const { actions, lines } = stubActions()
    const { container } = mount({ actions })
    await click(button(container, CULTIVATION_COPY.composeCorrect)!)
    await type(container.querySelector('input') as HTMLInputElement, '含 :: 的期望')
    await type(container.querySelector('textarea') as HTMLTextAreaElement, '正文')
    await click(button(container, CULTIVATION_COPY.submit)!)
    expect(lines).toEqual([])
    expect(container.textContent).toContain(CULTIVATION_COPY.problemExpectationSeparator)
  })

  it('「给别的角色提建议」要先选角色，且不给自己', async () => {
    const { actions, lines } = stubActions()
    const { container } = mount({ actions, viewerRole: 'ceo', viewerLabel: 'CEO' })
    await click(button(container, CULTIVATION_COPY.composeSuggest)!)
    expect(button(container, 'CFO'), '应能选目标角色').not.toBeNull()
    expect(button(container, 'CEO'), '不把自己列成建议对象').toBeNull()
    await click(button(container, 'CFO')!)
    await type(container.querySelector('input') as HTMLInputElement, '测算先列假设口径')
    await type(container.querySelector('textarea') as HTMLTextAreaElement, '做法：单列固定成本与边际成本。')
    await click(button(container, CULTIVATION_COPY.submit)!)
    expect(lines).toEqual(['/cultivation suggest cfo 测算先列假设口径 :: 做法：单列固定成本与边际成本。'])
  })
})

describe('走查抓到的四处 UX 缺陷（2026-10-18，图为证）', () => {
  it('正文在下面就地展开时，不再重复首句（同一句话出现两次 = 噪音）', () => {
    const { container } = mount({ records: [record({ body: '做法：先列未决清单，按 owner 分行。' } as Partial<CultivationRecord>)] })
    const text = container.textContent ?? ''
    expect(text.split('做法：先列未决清单，按 owner 分行。').length - 1, '首句只应出现一次').toBe(1)
  })

  it('撤回：后果说明独占一行且在「确认撤回」**之前**（先读后点）', async () => {
    const { actions } = stubActions()
    const { container } = mount({ records: [record({ id: 'r-9', status: 'adopted', methodSlug: 'method-r-9' })], actions })
    await click(button(container, CULTIVATION_COPY.revoke)!)
    const warning = container.querySelector('.wk-cultivation-consequence')
    const confirm = button(container, CULTIVATION_COPY.revokeConfirm)
    expect(warning, '后果说明要在场').not.toBeNull()
    expect(confirm).not.toBeNull()
    // DOM 顺序：警告在前（compareDocumentPosition 的 FOLLOWING 位）
    expect(warning!.compareDocumentPosition(confirm!) & Node.DOCUMENT_POSITION_FOLLOWING, '确认按钮必须在警告之后').toBeTruthy()
    expect(warning!.textContent).toContain('不能再被采纳')
  })

  it('创作面：标签常驻（不是只在 placeholder 里），正文栏带做法提示', async () => {
    const { actions } = stubActions()
    const { container } = mount({ actions })
    await click(button(container, CULTIVATION_COPY.composeCorrect)!)
    await type(container.querySelector('input') as HTMLInputElement, '写了字标签也在')
    const text = container.textContent ?? ''
    expect(text, '期望行为标签常驻').toContain(CULTIVATION_COPY.expectationLabel)
    expect(text, '正文标签常驻').toContain(CULTIVATION_COPY.bodyLabel)
    expect(text, '正文栏带做法/出处提示').toContain(CULTIVATION_COPY.bodyHint)
  })
})

describe('首启两态（探索轴 ③：读不到 ≠ 0 条）', () => {
  it('记录不可达（null）⇒ 说"尚未读到/不算 0 条"，不假装空', () => {
    const { container } = mount({ records: null, journalRows: null })
    const text = container.textContent ?? ''
    expect(text).toMatch(/尚未读到|目录缺失|读取失败/)
    expect(text).toContain('不算 0 条')
  })

  it('空盘（可达但 0 条）⇒ 说"没有给我的建议或纠正"', () => {
    const { container } = mount({ records: [] })
    expect(container.textContent).toContain('没有给我的建议或纠正')
    expect(container.textContent, '空盘不该说"读不到"').not.toContain('不算 0 条')
  })
})

describe('命令折叠区与按钮一一对应（探索轴 ④：文案与控件不许再漂）', () => {
  it('折叠区列出的子命令 = 面板按钮/表单实际能发的子命令（六条全覆盖）', () => {
    const { container } = mount({ records: [record({ status: 'adopted', methodSlug: 'm-1' })], actions: stubActions().actions })
    const fold = container.querySelector('details')
    expect(fold, '熟手命令行应折叠在场').not.toBeNull()
    const text = fold!.textContent ?? ''
    for (const sub of ['correct', 'suggest', 'adopt', 'reject', 'verify', 'revoke']) {
      expect(text, `折叠区缺子命令 ${sub}`).toContain(`/cultivation ${sub}`)
    }
    // 反向：面板发得出来的子命令，折叠区都得有对应的"熟手写法"（防只在按钮里有、折叠区漏写）
    const emittable = [
      adoptLine('r-1'), rejectLine('r-1', '理由').ok ? '/cultivation reject' : '', verifyLine('r-1', 'pass'),
      revokeLine('m-1'), correctLine('期望', '正文').ok ? '/cultivation correct' : '', suggestLine('cfo', '期望', '正文', 'ceo').ok ? '/cultivation suggest' : '',
    ].filter(line => line !== '')
    for (const line of emittable) {
      const sub = /^\/cultivation ([a-z]+)/.exec(line)?.[1]
      expect(text, `折叠区缺 ${String(sub)} 的熟手写法（按钮能发、文档没写 = 漂）`).toContain(`/cultivation ${String(sub)}`)
    }
  })
})

describe('时间感（场景轮 S9：此前行内没有任何时间信息）', () => {
  it('真实时间戳 id 的记录显示"提出时间"（人话标签）', () => {
    const { container } = mount({ records: [record({ id: '20261018-141107-ux9a' })] })
    expect(container.textContent, '待办行要说得清什么时候提的').toMatch(/提出/)
  })

  it('非时间戳 id（测试/手写）不猜时间、也不崩', () => {
    const { container } = mount({ records: [record({ id: 'r-1' })] })
    expect(container.textContent).not.toContain('提出')
  })
})

describe('长正文折叠（2026-10-18 场景轮：60 行正文撑满面板）', () => {
  const longBody = Array.from({ length: 60 }, (_, i) => `第 ${String(i + 1)} 行`).join('\n')

  it('长正文默认只展前 4 行 + 给「展开全文（共 60 行）」', () => {
    const { container } = mount({ records: [record({ body: longBody } as Partial<CultivationRecord>)] })
    const text = container.textContent ?? ''
    expect(text).toContain('第 1 行')
    expect(text).toContain('展开全文（共 60 行）')
    expect(text, '默认不该把 60 行全渲染出来').not.toContain('第 60 行')
  })

  it('点「展开全文」后能看到最后一行；再点「收起」回到摘要', async () => {
    const { container } = mount({ records: [record({ body: longBody } as Partial<CultivationRecord>)] })
    await click(button(container, CULTIVATION_COPY.bodyExpand(60))!)
    expect(container.textContent).toContain('第 60 行')
    await click(button(container, CULTIVATION_COPY.bodyCollapse)!)
    expect(container.textContent).not.toContain('第 60 行')
  })

  it('短正文（≤4 行）不显示折叠开关', () => {
    const { container } = mount({ records: [record({ body: '第 1 行\n第 2 行' } as Partial<CultivationRecord>)] })
    expect(container.textContent).toContain('第 2 行')
    expect(container.textContent).not.toContain('展开全文')
  })
})

describe('无困惑重排与判断材料（S3/S4）', () => {
  it('journal 块明确写着不用我操作（素材 ≠ 待办）', () => {
    const { container } = mount({ journalRows: [] })
    expect(container.textContent).toContain('不用你操作')
  })

  it('提案正文就地可见（判断要有材料，不能逼人盲采纳）', () => {
    const { container } = mount({
      records: [record({ body: '做法：先列未决清单，按 owner 分行。\n证据：deliverables/x/final.md 第 3 节。' } as Partial<CultivationRecord>)],
    })
    expect(container.textContent).toContain('按 owner 分行')
  })

  it('熟手命令行收进折叠区，不再当主指引', () => {
    const { container } = mount({})
    const details = container.querySelector('details')
    expect(details, '命令语法应住折叠块').not.toBeNull()
    expect(details?.textContent).toContain('/cultivation adopt')
  })
})

describe('渲染入口自检', () => {
  it('空场也能渲染（records 不可达 ≠ 0 条的口径不变）', () => {
    const { container } = mount({ records: null, journalRows: null })
    const tree: ReactElement = createElement('div')
    expect(tree).toBeDefined()
    expect(container.textContent).toContain('不算 0 条')
  })
})
