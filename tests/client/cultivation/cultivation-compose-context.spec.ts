// 负例留证 2026-11-27：去掉 CultivationCompose 触发 ref 恢复焦点 ⇒ 背景选择器按 Escape 取消后焦点跌回 document.body（BUG-396）；还原后绿。BUG-396
// 负例留证 2026-11-27：CultivationCompose / CultivationInbox 直接存翻译字符串与裸 role ⇒ 热切 en 滞留中文且背景卡露裸 vp_eng（BUG-397）；还原后绿。BUG-397
// @vitest-environment happy-dom
/**
 * 创作面可选背景的 keyless 交互判据（D1=A / D2=A）：
 * 默认带本次最近一轮、移除后正文必填、手选成品进 token、teammate 明说、预览失败可继续手写。
 * 真浏览器渲染归 client-load-smoke / browser-visual probe；本档只断言 DOM 与发出的命令线。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CultivationCompose } from '../../../packages/company-pack/src/client/cultivation/CultivationCompose.tsx'
import { CultivationBoard } from '../../../packages/company-pack/src/client/cultivation/CultivationBoard.tsx'
import { CULTIVATION_COPY, setCultivationLanguage, type ActionOutcome, type CultivationActions } from '../../../packages/company-pack/src/client/cultivation/cultivation-actions.ts'
import { decodeContextToken } from '../../../packages/company-pack/src/lib/cultivation/cultivation-context.ts'
import type {
  ContextSessionRow,
  CultivationContextSources,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-context-data.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: { root: Root, container: HTMLElement }[] = []
afterEach(() => {
  setCultivationLanguage('zh')
  for (const entry of mounted.splice(0)) {
    act(() => { entry.root.unmount() })
    entry.container.remove()
  }
})

const currentRow: ContextSessionRow = {
  sessionId: 'session-1',
  title: '收口检查',
  role: 'ceo',
  member: false,
  at: 1,
  current: true,
  ref: { kind: 'session', ref: 'session-1', label: '收口检查', role: 'ceo' },
}

function stubSources(over: Partial<CultivationContextSources> = {}): CultivationContextSources {
  return {
    listSessions: () => ({ ok: true, value: [currentRow] }),
    listDeliverables: async () => ({
      ok: true,
      value: [{ slug: 'budget-review', result: 'accepted', kickoff: '2026-10-22', path: 'deliverables/budget-review/final.md', summary: '结论：先列假设。' }],
    }),
    readPreview: async () => ({ ok: true, turn: { turn: 1, text: '用户：收口前把未决项列一下\n分身：已收口' } }),
    ...over,
  }
}

function stubActions(answer: ActionOutcome = { ok: true, text: '已提交培养记录 20261023-140200-abcd（纠正，待你采纳）。培养页可查收件箱。' }): { actions: CultivationActions, lines: string[] } {
  const lines: string[] = []
  return {
    lines,
    actions: { run: async (line) => { lines.push(line); return answer } },
  }
}

function mount(props: Record<string, unknown>): HTMLElement {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  act(() => {
    root.render(createElement(CultivationCompose, {
      viewerRole: 'ceo',
      actions: stubActions().actions,
      ...props,
    }))
  })
  mounted.push({ root, container })
  return container
}

const button = (container: HTMLElement, label: string): HTMLButtonElement => {
  const found = [...container.querySelectorAll('button')].find(node => (node.textContent ?? '').trim() === label)
  if (found === undefined) throw new Error(`找不到按钮：${label}（现有：${[...container.querySelectorAll('button')].map(node => node.textContent).join(' | ')}）`)
  return found
}

const buttonContaining = (container: HTMLElement, label: string): HTMLButtonElement => {
  const found = [...container.querySelectorAll('button')].find(node => (node.textContent ?? '').includes(label))
  if (found === undefined) throw new Error(`找不到含「${label}」的按钮`)
  return found
}

const click = async (target: HTMLElement): Promise<void> => {
  await act(async () => { target.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
}

const openCorrection = async (container: HTMLElement): Promise<void> => {
  // 2026-10-30 工作优先切片：单表单，没有纠正/建议二选一了。
  await click(button(container, CULTIVATION_COPY.composeOpen))
}

const flush = async (): Promise<void> => {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
}

const type = async (input: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> => {
  const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  await act(async () => {
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('可选背景：默认值 / 移除 / 手选 / 明说', () => {
  it('背景含密钥样式 ⇒ 在写入前明示警告', async () => {
    const { actions } = stubActions()
    const sources = stubSources({ readPreview: async () => ({ ok: true, turn: { turn: 1, text: 'api_key = sk-abcdefghijklmnop1234' } }) })
    const container = mount({ actions, sources, currentSessionId: 'session-1' })
    await openCorrection(container)
    await flush()
    expect(container.textContent).toContain(CULTIVATION_COPY.contextSecretWarning)
  })

  it('correct 默认带本次最近一轮；正文可空；命令线带 --context=', async () => {
    const { actions, lines } = stubActions()
    const container = mount({ actions, sources: stubSources(), currentSessionId: 'session-1' })
    await openCorrection(container)
    await flush()
    expect(container.textContent).toContain('收口检查')
    expect(container.textContent).toContain('用户：收口前把未决项列一下')
    expect(container.textContent).toContain(CULTIVATION_COPY.bodyOptionalHint)
    await type(container.querySelector('input') as HTMLInputElement, '收口前逐项列出未决项')
    await click(button(container, CULTIVATION_COPY.submit))
    await flush()
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^\/cultivation correct --context=\S+ 收口前逐项列出未决项 :: $/)
    const token = /--context=(\S+)/.exec(lines[0] ?? '')?.[1]
    expect(token).toBeDefined()
    expect(decodeContextToken(token!)).toMatchObject({ ok: true, command: { mode: 'correct', items: [{ kind: 'session', ref: 'session-1' }] } })
  })

  it('移除背景 → 正文必填；提交被拦且不发命令', async () => {
    const { actions, lines } = stubActions()
    const container = mount({ actions, sources: stubSources(), currentSessionId: 'session-1' })
    await openCorrection(container)
    await flush()
    await click(button(container, CULTIVATION_COPY.contextRemove))
    await type(container.querySelector('input') as HTMLInputElement, '收口前逐项列出未决项')
    await click(button(container, CULTIVATION_COPY.submit))
    await flush()
    expect(lines).toHaveLength(0)
    expect(container.textContent).toContain(CULTIVATION_COPY.problemBodyEmpty)
  })

  it('手选成品 → 卡片显示结果，命令 token 带 deliverable ref', async () => {
    const { actions, lines } = stubActions()
    const container = mount({ actions, sources: stubSources(), currentSessionId: 'session-1' })
    await openCorrection(container)
    await flush()
    await click(button(container, CULTIVATION_COPY.contextChange))
    await flush()
    await click(buttonContaining(container, 'budget-review'))
    await type(container.querySelector('input') as HTMLInputElement, '结论先列假设')
    await click(button(container, CULTIVATION_COPY.submit))
    await flush()
    expect(lines[0]).toContain('--context=')
    const token = /--context=(\S+)/.exec(lines[0] ?? '')?.[1]
    expect(decodeContextToken(token!)).toMatchObject({ ok: true, command: { items: [{ kind: 'deliverable', ref: 'deliverables/budget-review/final.md' }] } })
  })

  it('teammate 会话显示明说（按 CEO 记账）', () => {
    const container = mount({ sources: stubSources(), currentSessionId: 'session-1', teammate: true })
    expect(container.textContent).toContain(CULTIVATION_COPY.teammateBanner)
  })

  it('默认预览失败 = 静默不附带；仍可手写（正文必填）', async () => {
    const { actions, lines } = stubActions()
    const container = mount({
      actions,
      sources: stubSources({ readPreview: async () => ({ ok: false, problem: '读不到' }) }),
      currentSessionId: 'session-1',
    })
    await openCorrection(container)
    await flush()
    expect(container.textContent).not.toContain('读不到')
    await type(container.querySelector('input') as HTMLInputElement, '收口前逐项列出未决项')
    await click(button(container, CULTIVATION_COPY.submit))
    await flush()
    expect(lines).toHaveLength(0)
    expect(container.textContent).toContain(CULTIVATION_COPY.problemBodyEmpty)
  })

  it('手动选择会话预览失败时显式报原因（不静默吞错）', async () => {
    let calls = 0
    const container = mount({
      sources: stubSources({
        readPreview: async () => {
          calls += 1
          return calls === 1 ? { ok: true, turn: { turn: 1, text: '首轮摘要' } } : { ok: false, problem: '手动预览不可用' }
        },
      }),
      currentSessionId: 'session-1',
    })
    await openCorrection(container)
    await flush()
    await click(button(container, CULTIVATION_COPY.contextChange))
    await flush()
    await click(buttonContaining(container, '收口检查'))
    await flush()
    expect(container.textContent).toContain('手动预览不可用')
  })
})

// 负例留证 2026-11-23：去掉 CultivationBoard 上 CultivationCompose 的 key ⇒ 本用例红（切换视角后仍显示「这是给 CEO 的建议」）。BUG-350
describe('跨会话/视角切换的表单隔离（BUG-350）', () => {
  it('同一挂载切换 viewerRole ⇒ 表单重建，不把自我纠正翻成跨角色建议', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const base = {
      viewerRole: 'ceo',
      viewerLabel: 'CEO',
      journalRows: [],
      records: [],
      feedback: null,
      feedbackReachable: false,
      actions: stubActions().actions,
      currentSessionId: 'session-1',
    }
    act(() => { root.render(createElement(CultivationBoard, base)) })
    mounted.push({ root, container })

    await openCorrection(container)
    expect(container.textContent).toContain(CULTIVATION_COPY.selfNote('CEO'))

    act(() => { root.render(createElement(CultivationBoard, { ...base, viewerRole: 'vp-eng', viewerLabel: 'VP-Eng' })) })
    expect(container.textContent).not.toContain('这是给 CEO 的建议')
    expect(container.textContent).toContain(CULTIVATION_COPY.composeOpen)
  })

  it('BUG-396：背景选择器按 Escape 取消后将焦点归还触发按钮', async () => {
    const container = mount({ sources: stubSources(), currentSessionId: 'session-1' })
    await openCorrection(container)
    await flush()
    const changeBtn = button(container, CULTIVATION_COPY.contextChange) as HTMLButtonElement
    changeBtn.focus()
    await click(changeBtn)
    await flush()

    const pickerHost = container.querySelector('#cultivation-context-picker') as HTMLElement
    expect(pickerHost).not.toBeNull()
    const pickerInput = pickerHost.querySelector('input') as HTMLInputElement
    expect(pickerInput).not.toBeNull()
    pickerInput.focus()
    expect(document.activeElement).toBe(pickerInput)
    await act(async () => {
      pickerInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await flush()
    const restoredBtn = button(container, CULTIVATION_COPY.contextChange)
    expect(document.activeElement).toBe(restoredBtn)
  })

  it('BUG-397：创作校验报错在热切 en 后即时重译且背景角色经过 roleLabel 映射', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const sourcesWithEng = stubSources({
      listSessions: () => ({
        ok: true,
        value: [{
          ...currentRow,
          ref: { kind: 'session', ref: 'session-1', label: '工程复盘', role: 'vp_eng' },
          title: '工程复盘',
          role: 'vp_eng',
        }],
      }),
    })
    const base = {
      language: 'zh' as const,
      viewerRole: 'ceo',
      viewerLabel: 'CEO',
      roleLabel: (r: string) => (r === 'vp_eng' ? 'VP-Eng' : r.toUpperCase()),
      journalRows: [],
      records: [{
        id: 'r-eng',
        kind: 'suggestion' as const,
        targetRole: 'ceo',
        proposerRole: 'vp_eng',
        proposerKind: 'agent' as const,
        source: 'session-1',
        expectation: 'Check interfaces',
        status: 'open' as const,
        title: 'Title',
        body: 'Body',
        contexts: [{
          kind: 'session' as const,
          ref: 'session-1',
          title: '工程复盘',
          role: 'vp_eng',
          excerpt: 'excerpt text',
        }],
      }],
      feedback: null,
      feedbackReachable: false,
      actions: stubActions().actions,
      contextSources: sourcesWithEng,
      currentSessionId: 'session-1',
    }
    act(() => { root.render(createElement(CultivationBoard, base)) })
    mounted.push({ root, container })

    const contextCard = container.querySelector('.wk-cultivation-context-card')
    expect(contextCard?.textContent).toContain('VP-Eng')
    expect(contextCard?.textContent).not.toContain('vp_eng')

    await openCorrection(container)
    await flush()
    await click(button(container, CULTIVATION_COPY.submit))
    expect(container.textContent).toContain('先写一句「期望它怎么做」。')

    act(() => { root.render(createElement(CultivationBoard, { ...base, language: 'en' as const })) })
    expect(container.textContent).toContain('Write one sentence: what should it do.')
    expect(container.textContent).not.toContain('先写一句「期望它怎么做」。')
  })

  it('覆盖背景展开/收起切换、预览失败后重试打开选择器及超大 token 提交拦截', async () => {
    const oversizedRow = {
      slug: '超大交付物',
      result: 'accepted',
      kickoff: '2026-10-22',
      path: `deliverables/${'x'.repeat(2100)}/final.md`,
      summary: '超大摘要',
    }
    const sources = stubSources({
      readPreview: async () => ({ ok: false, problem: '首轮失败' }),
      listDeliverables: async () => ({ ok: true as const, value: [oversizedRow] }),
    })
    // First trigger problem card via failing pick
    let callIdx = 0
    const flakeySources = {
      ...sources,
      readPreview: async () => {
        callIdx += 1
        return callIdx === 1
          ? { ok: true as const, turn: { turn: 1, text: 'a\nb\nc\nd' } }
          : { ok: false as const, problem: '重试预览失败' }
      },
    }
    const container = mount({ sources: flakeySources, currentSessionId: 'session-1' })
    await openCorrection(container)
    await flush()

    // Expand & collapse long excerpt (line 384)
    const expandBtn = button(container, CULTIVATION_COPY.contextExpand) as HTMLButtonElement
    await click(expandBtn)
    expect(expandBtn.getAttribute('aria-expanded')).toBe('true')
    await click(expandBtn)
    expect(expandBtn.getAttribute('aria-expanded')).toBe('false')

    // Trigger manual session pick error -> renders contextProblem retry button (lines 351-360)
    await click(button(container, CULTIVATION_COPY.contextChange))
    await flush()
    await click(buttonContaining(container, '收口检查'))
    await flush()
    expect(container.textContent).toContain('重试预览失败')
    await click(button(container, CULTIVATION_COPY.contextAdd))
    await flush()

    // Pick oversized deliverable -> encodeContextToken fails on submit (lines 253-254)
    await click(buttonContaining(container, '超大交付物'))
    await type(container.querySelector('input') as HTMLInputElement, '测试提交期望')
    await click(button(container, CULTIVATION_COPY.submit))
    await flush()
    expect(container.textContent).toContain('安全的工作区相对路径')
  })
})
