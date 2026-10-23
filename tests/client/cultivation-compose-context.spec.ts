// @vitest-environment happy-dom
/**
 * 创作面可选背景的 keyless 交互判据（D1=A / D2=A）：
 * 默认带本次最近一轮、移除后正文必填、手选成品进 token、teammate 明说、预览失败可继续手写。
 * 真浏览器渲染归 client-load-smoke / browser-visual probe；本档只断言 DOM 与发出的命令线。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CultivationCompose } from '../../packages/company-pack/src/client/CultivationCompose.tsx'
import { CULTIVATION_COPY, type ActionOutcome, type CultivationActions } from '../../packages/company-pack/src/client/cultivation-actions.ts'
import { decodeContextToken } from '../../packages/company-pack/src/lib/cultivation-context.ts'
import type {
  ContextSessionRow,
  CultivationContextSources,
} from '../../packages/company-pack/src/client/cultivation-context-data.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: { root: Root, container: HTMLElement }[] = []
afterEach(() => {
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
      value: [{ slug: 'budget-review', result: '已采纳', kickoff: '2026-10-22', path: 'deliverables/budget-review/final.md', summary: '结论：先列假设。' }],
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
  it('correct 默认带本次最近一轮；正文可空；命令线带 --context=', async () => {
    const { actions, lines } = stubActions()
    const container = mount({ actions, sources: stubSources(), currentSessionId: 'session-1' })
    await click(button(container, CULTIVATION_COPY.composeCorrect))
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
    await click(button(container, CULTIVATION_COPY.composeCorrect))
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
    await click(button(container, CULTIVATION_COPY.composeCorrect))
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
    await click(button(container, CULTIVATION_COPY.composeCorrect))
    await flush()
    expect(container.textContent).not.toContain('读不到')
    await type(container.querySelector('input') as HTMLInputElement, '收口前逐项列出未决项')
    await click(button(container, CULTIVATION_COPY.submit))
    await flush()
    expect(lines).toHaveLength(0)
    expect(container.textContent).toContain(CULTIVATION_COPY.problemBodyEmpty)
  })
})
