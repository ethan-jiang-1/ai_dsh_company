// @vitest-environment happy-dom
/**
 * 「待办」页签体的 keyless 渲染判据（R3-10，2026-10-27 第三轮六维度审计）。
 *
 * 为什么补：`AttentionTab.tsx` 的行覆盖长期停在 ~5%、分支 0——它是用户处理审批/问询的唯一入口，
 * 但此前没有任何测试渲染过它。一个永远空的待办收件箱（审批等着却没人看见）可以让 900+ 用例全绿。
 * 本档用 happy-dom + createRoot 真挂载：挂起项从登记处读、断流显式落错误行、空态说真话、
 * 「去处理」真的跳到发起会话。**不主张**真浏览器渲染（那层归 client-load-smoke / cdp-probe）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AttentionTab } from '../../packages/company-pack/src/client/AttentionTab.tsx'
import { createAttentionRegistry } from '../../packages/company-pack/src/client/attention-registry.ts'
import type { LivePending } from '../../packages/company-pack/src/lib/attention.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

/** 按组件真实注入面造 props；`useTabInfo`/`useSessions` 是平台 hook，测试用桩。 */
function props(over: Record<string, unknown> = {}) {
  return {
    sessionId: 'session-lead',
    useSessions: (selector: (state: { byId: Record<string, unknown> }) => unknown) => selector({ byId: {} }),
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/attention' } }),
    floatTab: () => {},
    unfloatTab: () => {},
    openSession: vi.fn(),
    leadOf: (id: string) => id,
    follow: async function* () { /* 空流 */ },
    getPending: () => [] as readonly LivePending[],
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  return host
}

describe('待办页签：挂起项、空态与断流（R3-10）', () => {
  it('没有挂起项时给诚实的空态，而不是一张空白面板', async () => {
    const host = await mount(createElement(AttentionTab, props()))
    expect(host.textContent).toContain('等你处理')
    expect(host.textContent).toContain('没有等你的事')
    expect(host.textContent).toContain('暂无交付通知')
    expect(host.textContent).toContain('每 2 秒自动刷新')
  })

  it('登记处的挂起项出现在「等你处理」：标签、会话名与正文都在', async () => {
    const registry = createAttentionRegistry()
    registry.begin({ kind: 'approval', sessionId: 'session-vp-eng', what: '签发技术方案', since: Date.now() })
    registry.begin({ kind: 'question', sessionId: 'session-cfo', what: '定价要不要让一步', since: Date.now() })
    const host = await mount(createElement(AttentionTab, props({ getPending: () => registry.list() })))
    expect(host.textContent).toContain('待批审批')
    expect(host.textContent).toContain('签发技术方案')
    expect(host.textContent).toContain('待答问询')
    expect(host.textContent).toContain('定价要不要让一步')
    // 会话名解析不到 durable title 时用短 id 降级链（不是空白）
    expect(host.textContent).toContain('会话 session-')
  })

  it('「去处理」把跳转落在发起这件事的会话上', async () => {
    const openSession = vi.fn()
    const registry = createAttentionRegistry()
    registry.begin({ kind: 'approval', sessionId: 'session-vp-eng', what: '签发技术方案', since: Date.now() })
    const host = await mount(createElement(AttentionTab, props({ getPending: () => registry.list(), openSession })))
    const button = [...host.querySelectorAll('button')].find(node => node.textContent?.includes('去处理'))
    expect(button).toBeDefined()
    await act(async () => { button?.click() })
    expect(openSession).toHaveBeenCalledWith('session-vp-eng')
  })

  it('动态流断掉时显式落错误行（fail-loud，不静默）', async () => {
    const follow = async function* (): AsyncGenerator<never> {
      throw new Error('transport closed')
    }
    const host = await mount(createElement(AttentionTab, props({ follow })))
    expect(host.textContent).toContain('动态流不可用')
    expect(host.textContent).toContain('transport closed')
  })

  it('挂起项被销账后下一轮轮询回到空态（登记处是活的，不是一次性快照）', async () => {
    const registry = createAttentionRegistry()
    const release = registry.begin({ kind: 'question', sessionId: 'session-coo', what: '要不要并行', since: Date.now() })
    const host = await mount(createElement(AttentionTab, props({ getPending: () => registry.list() })))
    expect(host.textContent).toContain('要不要并行')
    await act(async () => { release() })
    // 组件 2s 轮询；直接触发一次 React 更新不等真实定时器：remount 以新快照渲染
    mounted?.unmount()
    mounted = createRoot(host)
    await act(async () => { mounted?.render(createElement(AttentionTab, props({ getPending: () => registry.list() }))) })
    expect(host.textContent).not.toContain('要不要并行')
  })
})
