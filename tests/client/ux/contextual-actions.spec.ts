// @vitest-environment happy-dom
// 负例留证 2026-11-27：去掉 safeOpenTab 的 layout.selectPanel(null) + mounted 等待守卫 ⇒ HQ 态点页脚待办直接抛 sidebarRight: no session surface is mounted（BUG-393）；还原后绿。BUG-393
/** Wave S1：deliverables final.md 上下文动作与消息级纠偏按钮。 */
import { act, createElement, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { en, zh, type CompanyKey } from '../../../packages/company-pack/src/client/locales.ts'
import {
  AssistantCultivateAction,
  DeliverableFinalDocActions,
  isDeliverableFinalMarkdown,
} from '../../../packages/company-pack/src/client/ux/contextual-actions.tsx'
import { registerWaveS1Ux } from '../../../packages/company-pack/src/client/ux/register-s1-ux.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import { createHubSubViewStore } from '../../../packages/company-pack/src/client/tabs/hub-subview-store.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const makeT = (dict: Record<string, string>) =>
  ((key: CompanyKey) => dict[key] ?? String(key)) as unknown as ComponentProps<typeof DeliverableFinalDocActions>['t']

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

describe('isDeliverableFinalMarkdown · 严禁劫持普通工作区 Markdown', () => {
  it('仅匹配 .dsh-company/deliverables/<slug>/final.md，忽略普通 .md 与 drafts', () => {
    expect(isDeliverableFinalMarkdown('/repo/ws/.dsh-company/deliverables/2026-11-26-demo/final.md')).toBe(true)
    expect(isDeliverableFinalMarkdown('C:\\repo\\ws\\.dsh-company\\deliverables\\demo\\final.md')).toBe(true)
    expect(isDeliverableFinalMarkdown('/repo/ws/README.md')).toBe(false)
    expect(isDeliverableFinalMarkdown('/repo/ws/.dsh-company/deliverables/demo/drafts/prd.md')).toBe(false)
    expect(isDeliverableFinalMarkdown('/repo/ws/docs/final.md')).toBe(false)
    expect(isDeliverableFinalMarkdown(undefined)).toBe(false)
  })
})

describe('DeliverableFinalDocActions & AssistantCultivateAction', () => {
  it('普通 README.md 返回 null，final.md 渲染对比与培养按钮并正常回调', () => {
    const openDeliverables = vi.fn()
    const openCultivation = vi.fn()
    const { container, rerender } = mountDom(createElement(DeliverableFinalDocActions, {
      absolutePath: '/ws/README.md',
      t: makeT(zh),
      openDeliverables,
      openCultivation,
    } as unknown as ComponentProps<typeof DeliverableFinalDocActions>))
    expect(container.firstChild).toBeNull()

    rerender(createElement(DeliverableFinalDocActions, {
      absolutePath: '/ws/.dsh-company/deliverables/demo/final.md',
      t: makeT(en),
      openDeliverables,
      openCultivation,
    } as unknown as ComponentProps<typeof DeliverableFinalDocActions>))
    const buttons = [...container.querySelectorAll('button')]
    act(() => { buttons.find(b => b.textContent === en['docAction.compareDrafts'])!.click() })
    expect(openDeliverables).toHaveBeenCalledOnce()
    act(() => { buttons.find(b => b.textContent === en['docAction.startCultivation'])!.click() })
    expect(openCultivation).toHaveBeenCalledWith({ filePath: '/ws/.dsh-company/deliverables/demo/final.md' })
  })

  it('AssistantCultivateAction 携带 messageId 触发培养入口', () => {
    const openCultivation = vi.fn()
    const { container } = mountDom(createElement(AssistantCultivateAction, {
      messageId: 'msg-42',
      t: makeT(zh),
      openCultivation,
    } as unknown as ComponentProps<typeof AssistantCultivateAction>))
    act(() => { container.querySelector('button')!.click() })
    expect(openCultivation).toHaveBeenCalledWith({ messageId: 'msg-42' })
  })

  it('registerWaveS1Ux falls back to right-sidebar cultivation when openHq is absent and formats context', () => {
    const openTab = vi.fn()
    const hubStore = createHubSubViewStore()
    let registeredCultivate: ((ctx?: { messageId?: string; filePath?: string }) => void) | undefined
    let registeredDraftCmd: ((cmd: string) => void) | undefined
    let composerDef: { select?: (ctx: { pendingInteraction: unknown }) => unknown; inject?: () => Record<string, unknown> } | undefined
    const fakeCtx = {
      locale: { bind: () => makeT(zh) },
      inject: (_deps: readonly string[], fn: (scoped: unknown) => void) => {
        fn({
          slots: {
            inject: (_n: string, reg: () => void) => { reg() },
            register: (def: { name: string; select?: (ctx: { pendingInteraction: unknown }) => unknown; inject?: (sid: string) => Record<string, unknown> }) => {
              if (def.name === 'conversation.chat.assistant-actions') {
                registeredCultivate = def.inject?.('s1').openCultivation as typeof registeredCultivate
              }
              if (def.name === 'conversation.input.dock') {
                registeredDraftCmd = def.inject?.('s1').onDraftCommand as typeof registeredDraftCmd
              }
              if (def.name === 'conversation.composer') {
                composerDef = def as unknown as typeof composerDef
              }
              return () => {}
            },
          },
          sidebarRight: { openTab },
          sessions: { binding: (id: string) => (id === 's1' ? { id } : undefined) },
        })
      },
    }
    registerWaveS1Ux(fakeCtx as never, { attention: createAttentionRegistry(), hubStore })
    expect(composerDef?.select?.({ pendingInteraction: { kind: 'approval', toolName: 'request_signoff', answer: vi.fn() } })).not.toBeNull()
    expect(composerDef?.select?.({ pendingInteraction: { kind: 'approval', toolName: 'bash', answer: vi.fn() } })).toBeNull()
    expect(composerDef?.inject?.().resolveReason).toBeUndefined()

    let composerInjectWithLocale: Record<string, unknown> | undefined
    const resolveText = vi.fn((text: string | { readonly en: string }) => (typeof text === 'string' ? text : text.en))
    registerWaveS1Ux({
      locale: { bind: () => makeT(zh), resolveText },
      inject: (_deps: readonly string[], fn: (scoped: unknown) => void) => {
        fn({
          slots: {
            inject: (_n: string, reg: () => void) => { reg() },
            register: (def: { name: string; inject?: () => Record<string, unknown> }) => {
              if (def.name === 'conversation.composer') composerInjectWithLocale = def.inject?.()
              return () => {}
            },
          },
          sidebarRight: { openTab },
          sessions: { binding: () => undefined },
        })
      },
    } as never, { attention: createAttentionRegistry(), hubStore })
    const resolved = (composerInjectWithLocale?.resolveReason as ((t: unknown) => string))?.({ en: 'Margin', zh: '毛利' })
    expect(resolved).toBe('Margin')
    expect(resolveText).toHaveBeenCalledOnce()

    registeredCultivate?.({ filePath: '/ws/.dsh-company/deliverables/m1/final.md' })
    expect(hubStore.store.getSnapshot().archive).toBe('cultivation')
    expect(openTab).toHaveBeenCalledWith('company-archive')
    registeredDraftCmd?.('/req check ')
  })

  it('BUG-393：HQ 占屏 sidebarRight.mounted 为 undefined 时，safeOpenTab 先 selectPanel(null) 并等 mounted 就绪后开右栏', () => {
    const hubStore = createHubSubViewStore()
    let mountedSession: string | undefined = undefined
    const mountedListeners = new Set<() => void>()
    const openTab = vi.fn(() => {
      if (mountedSession === undefined) throw new Error('sidebarRight: no session surface is mounted')
    })
    const selectPanel = vi.fn((panel: null) => {
      expect(panel).toBeNull()
    })
    let clickFooter!: (tab: 'company-attention' | 'company-board') => void
    registerWaveS1Ux({
      locale: { bind: () => makeT(zh) },
      inject: (deps: readonly string[], fn: (scoped: unknown) => void) => {
        if (deps.includes('layout')) {
          fn({ layout: { selectPanel } })
          return
        }
        fn({
          slots: {
            inject: (_n: string, reg: () => void) => { reg() },
            register: (def: { name: string; inject?: (sid: string) => Record<string, unknown> }) => {
              if (def.name === 'sidebar.footer.action') {
                clickFooter = def.inject?.('s1').openTab as typeof clickFooter
              }
              return () => {}
            },
          },
          sidebarRight: {
            mounted: {
              getSnapshot: () => mountedSession,
              subscribe: (listener: () => void) => {
                mountedListeners.add(listener)
                return () => { mountedListeners.delete(listener) }
              },
            },
            openTab,
          },
          sessions: { binding: () => undefined },
        })
      },
    } as never, { attention: createAttentionRegistry(), hubStore })

    clickFooter('company-attention')
    expect(selectPanel).toHaveBeenCalledWith(null)
    expect(openTab).not.toHaveBeenCalled()

    mountedSession = 's1'
    for (const listener of mountedListeners) listener()
    expect(openTab).toHaveBeenCalledWith('company-team')
  })
})
