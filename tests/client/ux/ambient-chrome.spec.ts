// @vitest-environment happy-dom
// 负例留证 2026-11-27：MotionCommandDock / HeroMotionOptions 去掉 isEmbeddedWorkshopSession 抑制 ⇒ HQ 内嵌培养工坊渲染顶层动议指挥带与 Hero 胶囊（BUG-393）；还原后绿。BUG-393
// 负例留证 2026-11-27：HeroMotionOptions / MotionCommandDock 无条件 inputActions.setDraft 覆盖已有草稿 ⇒ 未发用户输入被静默抹掉（BUG-398）；先读 useInput draft 保留非空用户输入后绿。BUG-398
/** Wave S1：全局 Toast、页头/侧栏角标、Hero 速启、动议指挥带与脚手栏组件测试。 */
import { act, createElement, Fragment, type ComponentProps, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { en, zh, type CompanyKey } from '../../../packages/company-pack/src/client/locales.ts'
import { createAttentionRegistry } from '../../../packages/company-pack/src/client/wiring/attention-registry.ts'
import { asAttentionObservable } from '../../../packages/company-pack/src/client/ux/register-s1-ux.ts'
import {
  createCompanyToastSource,
  CompanyToastOverlay,
} from '../../../packages/company-pack/src/client/ux/company-toast.tsx'
import { isEmbeddedWorkshopSession, registerEmbeddedWorkshopSession } from '../../../packages/company-pack/src/client/ux/workshop-sessions.ts'
import {
  ComposerStatusPill,
  HeaderAttentionUtility,
  HeroMotionOptions,
  MotionCommandDock,
  SidebarFooterCompanyAction,
} from '../../../packages/company-pack/src/client/ux/ambient-chrome.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const makeT = (dict: Record<string, string>) =>
  ((key: CompanyKey, params?: Record<string, unknown>) => {
    const template = dict[key] ?? String(key)
    return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, k: string) => String(params[k] ?? ''))
  }) as unknown as ComponentProps<typeof HeaderAttentionUtility>['t']

function useHookFrom<T>(obs: { getSnapshot(): T }) {
  return <S,>(sel: (v: T) => S) => sel(obs.getSnapshot())
}

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

describe('CompanyToastOverlay · .set() 状态源与全局通知', () => {
  it('notify 写入快照后通过 Portal 渲染 Toast，dismiss 清空', () => {
    const source = createCompanyToastSource()
    expect(source.store.getSnapshot()).toBeNull()
    source.notify('Plain toast')
    expect(source.store.getSnapshot()).toMatchObject({ text: 'Plain toast' })
    source.notify('Hello Wave S1', 'success')
    expect(source.store.getSnapshot()?.text).toBe('Hello Wave S1')

    const { rerender } = mountDom(createElement(CompanyToastOverlay, {
      useToastState: useHookFrom(source.store),
      dismiss: source.dismiss,
      t: makeT(zh),
    } as unknown as ComponentProps<typeof CompanyToastOverlay>))
    expect(document.body.textContent).toContain('Hello Wave S1')

    act(() => { source.dismiss() })
    rerender(createElement(CompanyToastOverlay, {
      useToastState: useHookFrom(source.store),
      dismiss: source.dismiss,
      t: makeT(zh),
    } as unknown as ComponentProps<typeof CompanyToastOverlay>))
    expect(document.querySelector('[data-company-toast-host]')).toBeNull()
  })
})

describe('Header / Footer / Hero / MotionDock / ComposerDock', () => {
  it('在公司角色与挂起待办变化时渲染双语状态并响应点击动作', () => {
    const reg = createAttentionRegistry()
    const obs = asAttentionObservable(reg)
    const done = reg.begin({ kind: 'approval', sessionId: 's1', id: 'a1', what: 'Signoff', since: 1 })
    const openTab = vi.fn()
    const onDraftCommand = vi.fn()
    const notifyDraft = vi.fn()
    const setDraft = vi.fn()
    const tZh = makeT(zh)
    const tEn = makeT(en)

    const useSessionsCompany = <S,>(sel: (v: {
      projectionsBySession: Record<string, { values: Record<string, unknown> }>
    }) => S) => sel({ projectionsBySession: { s1: { values: { agentPreset: 'ceo' } } } })

    const { container, rerender } = mountDom(createElement(
      Fragment,
      null,
      createElement(HeaderAttentionUtility, {
        sessionId: 's1',
        useAttentionItems: useHookFrom(obs),
        openTab,
        t: tZh,
      } as unknown as ComponentProps<typeof HeaderAttentionUtility>),
      createElement(SidebarFooterCompanyAction, {
        wide: true,
        useAttentionItems: useHookFrom(obs),
        openTab,
        t: tZh,
      } as unknown as ComponentProps<typeof SidebarFooterCompanyAction>),
      createElement(SidebarFooterCompanyAction, {
        wide: false,
        useAttentionItems: useHookFrom(obs),
        openTab,
        t: tEn,
      } as unknown as ComponentProps<typeof SidebarFooterCompanyAction>),
      createElement(HeroMotionOptions, {
        sessionId: 's1',
        inputActions: { setDraft },
        notifyDraft,
        t: tEn,
      } as unknown as ComponentProps<typeof HeroMotionOptions>),
      createElement(MotionCommandDock, {
        sessionId: 's1',
        session: { id: 's1' },
        input: {},
        inputActions: { setDraft },
        useSessions: useSessionsCompany,
        useAttentionItems: useHookFrom(obs),
        openTab,
        onDraftCommand,
        t: tZh,
      } as unknown as ComponentProps<typeof MotionCommandDock>),
      createElement(ComposerStatusPill, {
        sessionId: 's1',
        useSessions: useSessionsCompany,
        useAttentionItems: useHookFrom(obs),
        openTab,
        t: tEn,
      } as unknown as ComponentProps<typeof ComposerStatusPill>),
    ))

    expect(container.textContent).toContain('待办 1')
    const buttons = [...container.querySelectorAll('button')]
    act(() => { buttons.find(b => b.textContent === zh['dock.action.req'])!.click() })
    expect(setDraft).toHaveBeenCalledWith('/req check ')
    expect(onDraftCommand).toHaveBeenCalledWith('/req check ')
    act(() => { buttons.find(b => b.textContent === zh['dock.action.prd'])!.click() })
    expect(setDraft).toHaveBeenCalledWith('/prd check ')
    expect(onDraftCommand).toHaveBeenCalledWith('/prd check ')
    act(() => { buttons.find(b => b.textContent === zh['dock.action.delivery'])!.click() })
    expect(setDraft).toHaveBeenCalledWith('/delivery check ')
    expect(onDraftCommand).toHaveBeenCalledWith('/delivery check ')
    act(() => { buttons.find(b => b.textContent === zh['dock.action.board'])!.click() })
    act(() => { (container.querySelector('[data-company-header-attention] button') as HTMLButtonElement).click() })
    act(() => {
      for (const footerBtn of container.querySelectorAll('[data-company-footer-action] button')) {
        (footerBtn as HTMLButtonElement).click()
      }
    })
    act(() => { buttons.find(b => b.textContent?.includes(zh['dock.action.attention'].replace('{count}', '1')))!.click() })
    const composerBtn = container.querySelector('[data-company-composer-dock] button, [data-company-composer-dock] [role="button"]') as HTMLElement | null
    act(() => { composerBtn?.click() })
    expect(openTab).toHaveBeenCalledWith('company-attention')
    expect(openTab).toHaveBeenCalledWith('company-board')

    act(() => { buttons.find(b => b.textContent === en['hero.template.prd'])!.click() })
    expect(setDraft).toHaveBeenCalledWith(en['hero.template.prdPrompt'])
    expect(notifyDraft).toHaveBeenCalledWith(en['hero.template.prd'])

    // Ordinary non-company session hides MotionCommandDock & ComposerStatusPill, and empty attention shows idle pill
    done()
    const useSessionsOther = <S,>(sel: (v: { projectionsBySession: Record<string, undefined> }) => S) =>
      sel({ projectionsBySession: {} })
    rerender(createElement(
      Fragment,
      null,
      createElement(HeaderAttentionUtility, { sessionId: 's2', useAttentionItems: useHookFrom(obs), openTab, t: tEn } as unknown as ComponentProps<typeof HeaderAttentionUtility>),
      createElement(SidebarFooterCompanyAction, { wide: true, useAttentionItems: useHookFrom(obs), openTab, t: tEn } as unknown as ComponentProps<typeof SidebarFooterCompanyAction>),
      createElement(SidebarFooterCompanyAction, { wide: false, useAttentionItems: useHookFrom(obs), openTab, t: tEn } as unknown as ComponentProps<typeof SidebarFooterCompanyAction>),
      createElement(MotionCommandDock, { sessionId: 's2', session: { id: 's2' }, input: {}, inputActions: { setDraft }, useSessions: useSessionsOther, useAttentionItems: useHookFrom(obs), openTab, onDraftCommand, t: tEn } as unknown as ComponentProps<typeof MotionCommandDock>),
      createElement(ComposerStatusPill, { sessionId: 's2', useSessions: useSessionsOther, useAttentionItems: useHookFrom(obs), openTab, t: tEn } as unknown as ComponentProps<typeof ComposerStatusPill>),
      createElement(ComposerStatusPill, { sessionId: 's1', useSessions: useSessionsCompany, useAttentionItems: useHookFrom(obs), openTab, t: tEn } as unknown as ComponentProps<typeof ComposerStatusPill>),
    ))
    expect(container.querySelector('[data-company-motion-dock]')).toBeNull()
    expect(container.textContent).toContain(en['composerDock.idle'])

    // BUG-393：内嵌培养工坊会话隐藏顶层 HeroMotionOptions 与 MotionCommandDock
    const releaseWorkshop = registerEmbeddedWorkshopSession('s-workshop' as never)
    try {
      const { container: wsBox } = mountDom(createElement(
        Fragment,
        null,
        createElement(HeroMotionOptions, {
          sessionId: 's-workshop',
          inputActions: { setDraft },
          notifyDraft,
          t: tEn,
        } as unknown as ComponentProps<typeof HeroMotionOptions>),
        createElement(MotionCommandDock, {
          sessionId: 's-workshop',
          session: { id: 's-workshop' },
          input: {},
          inputActions: { setDraft },
          useSessions: (sel: (v: { projectionsBySession: Record<string, { values: Record<string, unknown> }> }) => unknown) =>
            sel({ projectionsBySession: { 's-workshop': { values: { agentPreset: 'ceo' } } } }),
          useAttentionItems: useHookFrom(obs),
          openTab,
          onDraftCommand,
          t: tZh,
        } as unknown as ComponentProps<typeof MotionCommandDock>),
      ))
      expect(wsBox.querySelector('[data-company-hero-options]')).toBeNull()
      expect(wsBox.querySelector('[data-company-motion-dock]')).toBeNull()
    } finally {
      releaseWorkshop()
    }
  })

  it('BUG-398：输入框已有未发送草稿时，点 Hero 模板或动议指挥带指令保留原草稿不静默覆盖', () => {
    const setDraft = vi.fn()
    const notifyDraft = vi.fn()
    const onDraftCommand = vi.fn()
    const openTab = vi.fn()
    const obs = asAttentionObservable(createAttentionRegistry())
    const useInputStub = <S,>(sel: (s: { draft: string }) => S): S => sel({ draft: 'MY UNSENT USER DRAFT' })
    const useSessionsCompany = <S,>(sel: (v: { projectionsBySession: Record<string, { values: Record<string, unknown> }> }) => S) =>
      sel({ projectionsBySession: { s1: { values: { agentPreset: 'ceo' } } } })

    const { container } = mountDom(createElement(
      Fragment,
      null,
      createElement(HeroMotionOptions, {
        sessionId: 's1',
        useInput: useInputStub,
        inputActions: { setDraft },
        notifyDraft,
        t: makeT(en),
      } as unknown as ComponentProps<typeof HeroMotionOptions>),
      createElement(MotionCommandDock, {
        sessionId: 's1',
        session: { id: 's1' },
        input: {},
        useInput: useInputStub,
        inputActions: { setDraft },
        useSessions: useSessionsCompany,
        useAttentionItems: useHookFrom(obs),
        openTab,
        onDraftCommand,
        t: makeT(zh),
      } as unknown as ComponentProps<typeof MotionCommandDock>),
    ))

    const buttons = [...container.querySelectorAll('button')]
    act(() => { buttons.find(b => b.textContent === en['hero.template.prd'])!.click() })
    expect(setDraft).toHaveBeenLastCalledWith(`MY UNSENT USER DRAFT\n\n${en['hero.template.prdPrompt']}`)

    act(() => { buttons.find(b => b.textContent === zh['dock.action.prd'])!.click() })
    expect(setDraft).toHaveBeenLastCalledWith('/prd check MY UNSENT USER DRAFT')
  })

  it('BUG-393：workshop-sessions 对 undefined 安全返回 false 并支持登记注销', () => {
    expect(isEmbeddedWorkshopSession(undefined)).toBe(false)
    const release = registerEmbeddedWorkshopSession('s-ws-toggle' as never)
    expect(isEmbeddedWorkshopSession('s-ws-toggle' as never)).toBe(true)
    release()
    expect(isEmbeddedWorkshopSession('s-ws-toggle' as never)).toBe(false)
  })
})
