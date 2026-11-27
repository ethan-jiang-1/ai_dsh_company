// @vitest-environment happy-dom
// 负例留证 2026-11-27：CommandScopeHint 去掉 isEmbeddedWorkshopSession 抑制 ⇒ HQ 内嵌培养工坊窄框下显示命令提示条（BUG-393）；还原后绿。BUG-393
/**
 * composer 提示「斜杠命令要等会话开始后才回话」的 keyless 判据（BUG-290）。
 *
 * 为什么单独立一条：这条提示的全部价值就在**触发条件**——会话还没开始时出现、已有轮次时消失。
 * 触发错了要么是噪声（每个会话都挂一句废话），要么等于没做（该出现时不在）。判据面 = 纯渲染；
 * 真页面复核 = 隔离 home 起实例看 composer 行。
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CommandScopeHint, registerCommandScopeHint } from '../../../packages/company-pack/src/client/startup/CommandScopeHint.tsx'
import { registerEmbeddedWorkshopSession } from '../../../packages/company-pack/src/client/ux/workshop-sessions.ts'
import { zh } from '../../../packages/company-pack/src/client/locales.ts'

/** 假会话列表快照面：`blank` 由用例指定。 */
const listFace = (blank: boolean | undefined) => ({
  subscribe: () => () => {},
  getSnapshot: () => ({ byId: { 'session-1': blank === undefined ? undefined : { blank } } }),
})

const t = ((key: keyof typeof zh) => String(zh[key])) as never

const render = (blank: boolean | undefined): string => renderToStaticMarkup(createElement(CommandScopeHint, {
  sessionId: 'session-1' as never,
  list: listFace(blank),
  t,
}))

// 负例留证 2026-11-21：撤掉 CommandScopeHint 与槽注册后 `vitest run tests/client/startup/command-scope-hint.spec.ts` 无法导入（组件不存在），真页面同期无该提示文本；接回后 3/3 绿、两态复核通过。BUG-290
describe('composer 命令作用域提示（BUG-290）', () => {
  it('会话还没开始（blank=true）⇒ 提示出现，并说清「命令是会话级的」', () => {
    const markup = render(true)
    expect(markup).toContain('斜杠命令要等会话开始后才回话')
    expect(markup).toContain('会话级')
  })

  it('会话已有轮次（blank=false）⇒ 不渲染（不在正常会话里挂废话）', () => {
    expect(render(false)).toBe('')
  })

  it('BUG-393：内嵌培养工坊会话（blank=true）⇒ 不渲染命令作用域提示', () => {
    const release = registerEmbeddedWorkshopSession('session-1' as never)
    try {
      expect(render(true)).toBe('')
    } finally {
      release()
    }
  })

  it('会话行还没加载（undefined）⇒ 不渲染，不猜', () => {
    expect(render(undefined)).toBe('')
  })

  it('list.subscribe 通知 blank 状态切换时触发状态同步回调', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    let blank = true
    let listener: (() => void) | undefined
    const reactiveList = {
      subscribe: (fn: () => void) => { listener = fn; return () => { listener = undefined } },
      getSnapshot: () => ({ byId: { 'session-1': { blank } } }),
    }
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(createElement(CommandScopeHint, { sessionId: 'session-1' as never, list: reactiveList, t }))
      })
      expect(host.textContent).toContain('斜杠命令要等会话开始后才回话')
      blank = false
      await act(async () => { listener?.() })
      expect(host.textContent).toBe('')
    } finally {
      act(() => { root.unmount() })
      host.remove()
    }
  })
})

/** 注册体：注入闭包在单测里不执行，所以注册这块必须自己有判据（否则等于没人验过）。 */
describe('registerCommandScopeHint：挂到 composer 槽', () => {
  const mountRegistered = (blank: boolean) => {
    const registered: { name?: string, id?: string, order?: number, inject?: (id: string) => unknown }[] = []
    const injected: string[] = []
    const list = {
      subscribe: () => () => {},
      getSnapshot: () => ({ byId: { 'session-1': { blank } } }),
    }
    registerCommandScopeHint({
      slots: {
        inject: (name, register) => { injected.push(name); register() },
        register: (definition) => { registered.push(definition); return () => {} },
      },
    }, t, list)
    expect(injected).toEqual(['conversation.input.left'])
    expect(registered[0]?.id).toBe('company-command-scope')
    expect(registered[0]?.order).toBe(11)
    return registered[0]?.inject?.('session-1')
  }

  // BUG-293 的教训：注册体用例此前只断言 id/order/sessionId，于是「组件本身能用」与「真实注入的面」
  // 两半各自绿、拼起来崩。判据必须**渲染 inject 的真实产物**。
  // 负例留证 2026-11-22：把 inject 恢复成 list: undefined as never 后 `vitest run tests/client/startup/command-scope-hint.spec.ts` 1 failed / 3 passed；接回真实 list 后 4/4 绿。BUG-293
  it('真实 inject 产物能渲染（BUG-293）：blank=true 出提示，blank=false 不出', () => {
    const blankFace = mountRegistered(true) as { sessionId: string, list: unknown, t: unknown }
    expect(renderToStaticMarkup(createElement(CommandScopeHint, blankFace as never))).toContain('斜杠命令要等会话开始后才回话')
    const startedFace = mountRegistered(false) as { sessionId: string, list: unknown, t: unknown }
    expect(renderToStaticMarkup(createElement(CommandScopeHint, startedFace as never))).toBe('')
  })
})
