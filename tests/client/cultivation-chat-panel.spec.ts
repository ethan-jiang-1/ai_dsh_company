// @vitest-environment happy-dom
/**
 * 培养对话面板（2026-10-28 培养主视图）：独立培养会话的创建/复用、
 * prompt 发送、eventSource 历史渲染、不混主 Chat。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CultivationChatPanel } from '../../packages/company-pack/src/client/CultivationChatPanel.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
beforeEach(() => { localStorage.clear() })
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
  localStorage.clear()
})

function fakeSessions() {
  let entries: unknown[] = []
  let eventSnapshot = { entries, hasMore: false, revision: 0, change: { kind: 'replace' as const, entries } }
  const eventListeners = new Set<() => void>()
  const sessionListeners = new Set<() => void>()
  const eventSource = {
    getSnapshot: () => eventSnapshot,
    subscribe: (listener: () => void) => { eventListeners.add(listener); return () => eventListeners.delete(listener) },
  }
  const sessionSnapshot = { running: false, blank: false }
  const session = {
    sessionId: 'session-cultivation',
    getSnapshot: () => sessionSnapshot,
    subscribe: (listener: () => void) => { sessionListeners.add(listener); return () => sessionListeners.delete(listener) },
    prompt: vi.fn(async () => ({ ok: true, value: { accepted: true } })),
  }
  const binding = { sessionId: 'session-cultivation', eventSource, session, ctx: {}, } as never
  const create = vi.fn(async () => 'session-cultivation')
  const release = vi.fn()
  const retain = vi.fn(() => ({ sessionId: 'session-cultivation', binding, ready: Promise.resolve(binding), release }))
  const pushEntry = (event: unknown) => {
    entries = [...entries, { type: 'event', event }]
    eventSnapshot = { entries, hasMore: false, revision: entries.length, change: { kind: 'replace', entries } }
    for (const listener of eventListeners) listener()
  }
  return { sessions: { create, retain } as never, binding, create, retain, release, pushEntry }
}

describe('CultivationChatPanel（独立培养会话）', () => {
  it('建/复用独立会话；发送走 prompt；eventSource 历史出现在面板', async () => {
    const fake = fakeSessions()
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(CultivationChatPanel, {
        sessions: fake.sessions, mainSessionId: 'session-main' as never, cwd: '/tmp/company', agentPreset: 'ceo',
      }))
    })
    expect(fake.create).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('独立培养会话')
    const area = host.querySelector('textarea') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(area, '把这条 rejected 纠正整理成反例方法')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const send = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('发送'))
    await act(async () => { send?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    expect((fake.binding as unknown as { session: { prompt: ReturnType<typeof vi.fn> } }).session.prompt)
      .toHaveBeenCalledWith([{ type: 'text', text: expect.stringContaining('把这条 rejected 纠正整理成反例方法') }], 'queue')

    await act(async () => {
      fake.pushEntry({ type: 'user/message', seq: 1, data: { content: [{ type: 'text', text: '【培养对话】你只在这个线程里讨论培养：纠正、方法、journal、赞踩。不要处理其他项目或公司事务。回答要能落到方法/记录上。\n\n把这条 rejected 纠正整理成反例方法' }] } })
      fake.pushEntry({ type: 'assistant/message', seq: 2, data: { message: { content: [{ type: 'text', text: '建议整理成反例方法。' }] } } })
    })
    expect(host.textContent).toContain('建议整理成反例方法。')
  })

  it('附加左侧记录后，prompt 带记录引用；界面显示用户原话', async () => {
    const fake = fakeSessions()
    const record = {
      id: '20261028-abc123', targetRole: 'ceo', status: 'open', expectation: '收口前列未决',
      source: 'deliverables/demo/final.md', body: '做法与证据', kind: 'correction',
    }
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(CultivationChatPanel, {
        sessions: fake.sessions, mainSessionId: 'session-main' as never, cwd: '/tmp/company', agentPreset: 'ceo',
        attachments: [record] as never,
      }))
    })
    const select = host.querySelector('select') as HTMLSelectElement
    const setSelect = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
    await act(async () => {
      setSelect?.call(select, record.id)
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    const area = host.querySelector('textarea') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(area, '这条怎么落成方法？')
      area.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const send = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('发送'))
    await act(async () => { send?.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    const prompt = (fake.binding as unknown as { session: { prompt: ReturnType<typeof vi.fn> } }).session.prompt
    const text = prompt.mock.calls[0]?.[0]?.[0]?.text as string
    expect(text).toContain('【附加记录】20261028-abc123')
    expect(text).toContain('收口前列未决')
    expect(text).toContain('【用户问题】这条怎么落成方法？')
  })

  it('缺 cwd/角色时等待，不创建会话', async () => {
    const fake = fakeSessions()
    const host = document.createElement('div')
    document.body.append(host)
    mounted = createRoot(host)
    await act(async () => {
      mounted?.render(createElement(CultivationChatPanel, { sessions: fake.sessions, mainSessionId: 'session-main' as never }))
    })
    expect(fake.create).not.toHaveBeenCalled()
    expect(host.textContent).toContain('等待主会话的工作区与角色')
  })
})
