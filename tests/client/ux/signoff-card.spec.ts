// @vitest-environment happy-dom
/** Wave S1：request_signoff 双签卡（toolview + conversation.composer chain 拦截与透传）。 */
import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { SlotCore } from '../../../vendor/dsh/packages/client/ui-slots/src/index.ts'
import { en, zh, type CompanyKey } from '../../../packages/company-pack/src/client/locales.ts'
import {
  isSignoffPendingInteraction,
  SignoffComposerCard,
  SignoffToolView,
  SIGNOFF_TOOL_KEY,
} from '../../../packages/company-pack/src/client/ux/signoff-card.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const makeT = (dict: Record<string, string>) =>
  ((key: CompanyKey, params?: Record<string, unknown>) => {
    const template = dict[key] ?? String(key)
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, k: string) => String(params[k] ?? ''))
  }) as unknown as ComponentProps<typeof SignoffComposerCard>['t']

const mounted: Array<{ root: Root; container: HTMLDivElement }> = []

function mountDom(node: ReactNode) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(node) })
  mounted.push({ root, container })
  return {
    container,
    rerender(next: ReactNode) {
      act(() => { root.render(next) })
    },
  }
}

afterEach(() => {
  while (mounted.length > 0) {
    const item = mounted.pop()!
    act(() => { item.root.unmount() })
    item.container.remove()
  }
})

describe('isSignoffPendingInteraction · 鸭子类型精确识别', () => {
  it('命中 request_signoff 审批对象，放行 bash 与残缺对象', () => {
    const signoff = { kind: 'approval', toolName: 'request_signoff', reason: '签批线：低于基线', answer: vi.fn() }
    const bash = { kind: 'approval', toolName: 'bash', reason: 'ls', answer: vi.fn() }
    expect(isSignoffPendingInteraction(signoff)).toBe(true)
    expect(isSignoffPendingInteraction(bash)).toBe(false)
    expect(isSignoffPendingInteraction(null)).toBe(false)
    expect(isSignoffPendingInteraction({ kind: 'approval', toolName: 'request_signoff' })).toBe(false)
  })
})

describe('SignoffComposerCard · 链式双签决策卡', () => {
  it('解析签字线与备选上下文，点击批准 / 拒绝及 Enter / Esc 正常结算，失败后可恢复重试', async () => {
    const answer = vi.fn().mockRejectedValueOnce(new Error('network blip')).mockResolvedValueOnce(undefined)
    const pending = {
      kind: 'approval' as const,
      key: 'approval:1',
      toolName: 'request_signoff' as const,
      reason: '毛利线双签：示例报价触发复核（备选 A / 备选 B）',
      answerable: true,
      answer,
    }
    const baseProps = {
      matched: pending,
      sessionId: 's-1' as SessionId,
      t: makeT(zh),
    } as unknown as ComponentProps<typeof SignoffComposerCard>

    const { container, rerender } = mountDom(createElement(SignoffComposerCard, baseProps))

    expect(container.textContent).toContain('毛利线双签')
    expect(container.textContent).toContain('示例报价触发复核')
    expect(container.textContent).toContain('备选 A / 备选 B')

    // First click rejects -> recovers and shows error alert
    const approveBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.includes(zh['signoff.approve']))!
    await act(async () => { approveBtn.click(); await Promise.resolve(); await Promise.resolve() })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('network blip')
    expect(approveBtn.disabled).toBe(false)

    // Keyboard Escape -> rejected
    const group = container.querySelector('[role="group"]')!
    await act(async () => {
      group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await Promise.resolve()
    })
    expect(answer).toHaveBeenCalledTimes(2)
    expect(answer).toHaveBeenLastCalledWith('rejected')

    // English locale has no CJK
    const answerEn = vi.fn().mockResolvedValue(undefined)
    const pendingEn = { ...pending, key: 'approval:2', reason: 'Margin line: quote check (opt B)', answer: answerEn }
    rerender(createElement(SignoffComposerCard, {
      matched: pendingEn,
      sessionId: 's-1' as SessionId,
      t: makeT(en),
    } as unknown as ComponentProps<typeof SignoffComposerCard>))
    expect(container.textContent).toContain('Executive Sign-Off Request')
    expect(container.textContent).not.toMatch(/[\u3400-\u9fff]/u)
    await act(async () => {
      container.querySelector('[role="group"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await Promise.resolve()
    })
    expect(answerEn).toHaveBeenCalledWith('allowed-once')
  })
})

describe('SignoffToolView & SlotCore chain 透传整合', () => {
  it('渲染 running 与 settled 两态工具卡，且在 SlotCore chain 中 priority 0 仅拦 request_signoff', () => {
    const tZh = makeT(zh)
    const { container, rerender } = mountDom(createElement(SignoffToolView, {
      toolName: SIGNOFF_TOOL_KEY,
      callId: 'c-1',
      block: {
        callId: 'c-1',
        toolName: SIGNOFF_TOOL_KEY,
        argsRaw: JSON.stringify({ line: '折扣线双签', summary: '特批折扣申请', detail: '含维保' }),
        status: 'running',
      },
      t: tZh,
    } as unknown as ComponentProps<typeof SignoffToolView>))
    expect(container.textContent).toContain('折扣线双签')
    expect(container.textContent).toContain(zh['signoff.pendingTag'])

    rerender(createElement(SignoffToolView, {
      toolName: SIGNOFF_TOOL_KEY,
      callId: 'c-1',
      block: {
        kind: 'settled',
        call: {
          callId: 'c-1',
          toolName: SIGNOFF_TOOL_KEY,
          argsRaw: JSON.stringify({ line: '折扣线双签', summary: '特批折扣申请' }),
        },
        content: [{ type: 'text', text: JSON.stringify({ decision: 'allowed-once', note: '已批准本次' }) }],
        isError: false,
      },
      t: tZh,
    } as unknown as ComponentProps<typeof SignoffToolView>))
    expect(container.textContent).toContain(zh['signoff.decision.allowed'])

    const core = new SlotCore()
    const Upstream = () => null
    core.register({ name: 'root', children: { 'conversation.composer': { kind: 'chain', scope: 'session' } } } as unknown as Parameters<SlotCore['register']>[0], (() => null) as unknown as Parameters<SlotCore['register']>[1])
    core.register({
      name: 'conversation.composer',
      priority: 1,
      select: ({ pendingInteraction }: { pendingInteraction: unknown }) => (pendingInteraction ?? null),
    } as unknown as Parameters<SlotCore['register']>[0], Upstream as unknown as Parameters<SlotCore['register']>[1])
    core.register({
      name: 'conversation.composer',
      priority: 0,
      select: ({ pendingInteraction }: { pendingInteraction: unknown }) => (
        isSignoffPendingInteraction(pendingInteraction) ? pendingInteraction : null
      ),
    } as unknown as Parameters<SlotCore['register']>[0], SignoffComposerCard as unknown as Parameters<SlotCore['register']>[1])

    const pSignoff = { kind: 'approval', toolName: 'request_signoff', answer: vi.fn() }
    const pBash = { kind: 'approval', toolName: 'bash', answer: vi.fn() }
    const pick = (p: unknown) => {
      for (const e of core.entriesOfSlot('conversation.composer')) {
        const matched = (e.select as ((o: { pendingInteraction: unknown }) => unknown))?.({ pendingInteraction: p })
        if (matched !== null && matched !== undefined) return e.component
      }
      return null
    }
    expect(pick(pSignoff)).toBe(SignoffComposerCard)
    expect(pick(pBash)).toBe(Upstream)
  })
})
