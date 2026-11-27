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
  resolveSignoffReason,
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

// 负例留证 2026-11-27：去掉 SignoffComposerCard 的 displayReason 解析优先级或将 parsed.detail 改为默认展开 ⇒ BUG-389 用例红；还原后绿。BUG-389
// 负例留证 2026-11-27：去掉 SignoffComposerCard 键盘 `<summary>`/`button`/修饰键/IME 护栏、waitingRef 锁或 `answerable === false` 禁用 ⇒ BUG-392 用例红；还原后绿。BUG-392
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

  it('优先消费 displayReason（resolveReason 注入 + 无注入时按公司语言回退）并默认折叠补充上下文（BUG-389）', () => {
    const pendingWithDisplay = {
      kind: 'approval' as const,
      key: 'approval:display',
      toolName: 'request_signoff' as const,
      reason: 'stale-raw-reason',
      displayReason: {
        zh: '折扣线双签：特批 75 折审批（备选 A / 备选 B）',
        en: 'Discount sign line: 25% discount override (Option A / Option B)',
      },
      answerable: true,
      answer: vi.fn().mockResolvedValue(undefined),
    }

    // 1. 注入 resolveReason 时优先使用它，不回退陈旧 reason，且 detail 默认折叠
    const { container, rerender } = mountDom(createElement(SignoffComposerCard, {
      matched: pendingWithDisplay,
      sessionId: 's-1' as SessionId,
      t: makeT(en),
      resolveReason: (text: { readonly en: string; readonly zh?: string }) => text.en,
    } as unknown as ComponentProps<typeof SignoffComposerCard>))

    expect(container.textContent).toContain('Discount sign line')
    expect(container.textContent).toContain('25% discount override')
    expect(container.textContent).not.toContain('stale-raw-reason')
    const details = container.querySelector('details[data-signoff-detail-toggle]') as HTMLDetailsElement | null
    expect(details).not.toBeNull()
    expect(details?.open).toBe(false)
    expect(details?.querySelector('summary')?.textContent).toContain(en['signoff.detailToggle'])

    // 2. 未注入 resolveReason 时按 t('meta.language') 消费 displayReason
    rerender(createElement(SignoffComposerCard, {
      matched: pendingWithDisplay,
      sessionId: 's-1' as SessionId,
      t: makeT(zh),
    } as unknown as ComponentProps<typeof SignoffComposerCard>))

    expect(container.textContent).toContain('折扣线双签')
    expect(container.textContent).toContain('特批 75 折审批')
    expect(container.textContent).not.toContain('stale-raw-reason')
    expect(container.querySelector('details[data-signoff-detail-toggle]')?.querySelector('summary')?.textContent).toContain(zh['signoff.detailToggle'])

    // 3. resolveSignoffReason 各兜底分支：空回调穿透 / 字符串字面量 / 缺当前语言 key 回 fallback / 全空
    expect(resolveSignoffReason(pendingWithDisplay, makeT(en), () => '')).toBe('Discount sign line: 25% discount override (Option A / Option B)')
    expect(resolveSignoffReason({ displayReason: 'literal string reason', reason: 'ignored' }, makeT(zh))).toBe('literal string reason')
    expect(resolveSignoffReason({ displayReason: { en: 'Only EN line' } }, makeT(zh))).toBe('Only EN line')
    expect(resolveSignoffReason({}, makeT(zh))).toBe('')
  })

  it('焦点在 <summary> / 拒绝按钮 / 修饰键 / IME 时 Enter 不误批；answerable=false 禁按且防重入（BUG-392）', async () => {
    const answer = vi.fn(() => new Promise<void>(() => {}))
    const pending = {
      kind: 'approval' as const,
      key: 'approval:guards',
      toolName: 'request_signoff' as const,
      displayReason: { zh: '毛利红线：示例报价（补充详情正文）', en: 'Margin line: quote (detail body)' },
      answerable: true,
      answer,
    }
    const baseProps = {
      matched: pending,
      sessionId: 's-1' as SessionId,
      t: makeT(zh),
    } as unknown as ComponentProps<typeof SignoffComposerCard>
    const { container, rerender } = mountDom(createElement(SignoffComposerCard, baseProps))
    const group = container.querySelector('[role="group"]') as HTMLElement
    const summary = container.querySelector('summary') as HTMLElement
    const rejectBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.includes(zh['signoff.reject']))!
    const approveBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.includes(zh['signoff.approve']))!

    // 1. 焦点在 <summary> 按 Enter 不触发 allowed-once
    summary.focus()
    act(() => { summary.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })) })
    expect(answer).not.toHaveBeenCalled()

    // 2. 焦点在 拒绝按钮 按 Enter 不触发 allowed-once
    rejectBtn.focus()
    act(() => { rejectBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })) })
    expect(answer).not.toHaveBeenCalled()

    // 3. Ctrl+Enter / Shift+Enter / Alt+Enter / Meta+Enter / repeat / IME 不触发
    group.focus()
    for (const init of [
      { key: 'Enter', ctrlKey: true },
      { key: 'Enter', shiftKey: true },
      { key: 'Enter', altKey: true },
      { key: 'Enter', metaKey: true },
      { key: 'Enter', repeat: true },
      { key: 'Enter', isComposing: true },
      { key: 'Enter', keyCode: 229 },
    ] as KeyboardEventInit[]) {
      act(() => { group.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })) })
    }
    expect(answer).not.toHaveBeenCalled()

    // 4. answerable === false 时双按钮禁用且快捷键不触发
    rerender(createElement(SignoffComposerCard, {
      ...baseProps,
      matched: { ...pending, answerable: false },
    }))
    expect(rejectBtn.disabled).toBe(true)
    expect(approveBtn.disabled).toBe(true)
    group.focus()
    act(() => { group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })) })
    expect(answer).not.toHaveBeenCalled()

    // 5. 同 tick 双击/连按只发一次 answer
    const pendingSyncLock = { ...pending, key: 'approval:lock', answerable: true, answer }
    rerender(createElement(SignoffComposerCard, { ...baseProps, matched: pendingSyncLock }))
    act(() => {
      approveBtn.click()
      approveBtn.click()
      group.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    })
    expect(answer).toHaveBeenCalledTimes(1)
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

  it('SignoffToolView 对非 JSON/缺字段回执安全退化；SignoffComposerCard 在 answer 拒收时展示重试错误并覆盖组合输入与拒绝按钮', async () => {
    const tZh = makeT(zh)
    const { container, rerender } = mountDom(createElement(SignoffToolView, {
      toolName: SIGNOFF_TOOL_KEY,
      callId: 'c-2',
      block: {
        kind: 'settled',
        call: { callId: 'c-2', toolName: SIGNOFF_TOOL_KEY, argsRaw: JSON.stringify({ line: '线A' }) },
        content: [{ type: 'text', text: 'plain non-json text' }],
        isError: false,
      },
      t: tZh,
    } as unknown as ComponentProps<typeof SignoffToolView>))
    expect(container.textContent).toContain('plain non-json text')

    rerender(createElement(SignoffToolView, {
      toolName: SIGNOFF_TOOL_KEY,
      callId: 'c-2',
      block: {
        kind: 'settled',
        call: { callId: 'c-2', toolName: SIGNOFF_TOOL_KEY, argsRaw: JSON.stringify({ line: '线A' }) },
        content: [{ type: 'text', text: JSON.stringify({ noteOnly: true }) }],
        isError: true,
      },
      t: tZh,
    } as unknown as ComponentProps<typeof SignoffToolView>))
    expect(container.textContent).toContain('noteOnly')

    const failingAnswer = vi.fn().mockRejectedValueOnce(new Error('network fail'))
    const { container: cCard } = mountDom(createElement(SignoffComposerCard, {
      sessionId: 's1' as SessionId,
      matched: {
        kind: 'approval',
        key: 'approval:fail',
        toolName: 'request_signoff',
        answerable: true,
        reason: 'Line: test',
        answer: failingAnswer,
      },
      t: tZh,
    } as unknown as ComponentProps<typeof SignoffComposerCard>))

    const group = cCard.querySelector('[data-company-signoff-composer]') as HTMLElement
    act(() => {
      group.dispatchEvent(new window.CompositionEvent('compositionstart', { bubbles: true }))
      group.dispatchEvent(new window.CompositionEvent('compositionend', { bubbles: true }))
      group.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }))
    })
    const rejectBtn = [...cCard.querySelectorAll('button')].find(b => b.textContent?.includes(zh['signoff.reject']))!
    await act(async () => {
      rejectBtn.click()
      await Promise.resolve()
    })
    expect(cCard.querySelector('[role="alert"]')?.textContent).toContain('network fail')
  })
})
