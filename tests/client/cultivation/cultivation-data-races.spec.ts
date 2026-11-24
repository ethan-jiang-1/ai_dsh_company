// @vitest-environment happy-dom
// 负例留证 2026-11-24：去掉 setFeedback(null)/中止守卫/loadSeq 任一处 ⇒ 对应用例红。BUG-355
/** 培养数据 hook 的切换与并发竞态（BUG-355）：旧会话赞踩、中止误写、旧 load 覆写。 */
import { createElement, act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import {
  useCultivationFeedback,
  useCultivationPanelData,
  type CultivationPanelData,
} from '../../../packages/company-pack/src/client/cultivation/cultivation-data.ts'
import { recordText } from '../../../packages/company-pack/src/lib/cultivation/cultivation.ts'
import type { FeedbackItem } from '../../../packages/company-pack/src/lib/cultivation/cultivation.ts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mounted: { root: Root; host: HTMLElement }[] = []
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    act(() => { entry.root.unmount() })
    entry.host.remove()
  }
})

const flush = async (): Promise<void> => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) }) }

const feedbackEvent = (rating: 'positive' | 'negative'): unknown => ({
  type: 'feedback/message-put',
  data: { sessionId: 's1', item: { messageId: 'm1', rating, version: 'v', createdAt: 1, updatedAt: 1 } },
})

describe('useCultivationFeedback 切换复位（BUG-355）', () => {
  const follow = async function* (_id: string) {
    if (_id === 'sess-2') throw new Error('connect failed')
    yield { kind: 'history', events: [feedbackEvent('positive')] }
    await new Promise(resolve => setTimeout(resolve, 5))
  }

  it('切到首连失败的新会话后不再展示旧会话赞踩', async () => {
    let current: readonly FeedbackItem[] | null = null
    let setSession: (id: string) => void = () => {}
    function Probe(): null {
      const [session, set] = useState('sess-1')
      setSession = set
      current = useCultivationFeedback(follow as never, session as never, true)
      return null
    }
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    mounted.push({ root, host })
    act(() => { root.render(createElement(Probe)) })
    await flush()
    expect(current).toHaveLength(1)
    act(() => { setSession('sess-2') })
    await flush()
    expect(current).toBeNull()
  })
})

describe('useCultivationPanelData 竞态（BUG-355）', () => {
  const record = recordText({ kind: 'correction', targetRole: 'ceo', proposerRole: 'ceo', proposerKind: 'agent', source: '', expectation: 'x', body: '' })

  it('listRecords 被中止后不把 dir-denied 写进 recordsProblem', async () => {
    const view: { data: CultivationPanelData | null } = { data: null }
    let setSession: (id: string) => void = () => {}
    let release: (() => void) | null = null
    let calls = 0
    const files = {
      listJournal: async () => [],
      listRecords: async () => {
        calls += 1
        if (calls === 1) {
          await new Promise<void>(resolve => { release = resolve })
          return { ok: false as const, reason: 'dir-denied' }
        }
        return { ok: true as const, names: [] }
      },
      readRecordHead: async () => null,
      readRecord: async () => ({ ok: false as const, reason: 'unavailable' }),
    }
    function Probe(): null {
      const [session, set] = useState('sess-1')
      setSession = set
      view.data = useCultivationPanelData(files as never, session as never)
      return null
    }
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    mounted.push({ root, host })
    act(() => { root.render(createElement(Probe)) })
    await flush()
    act(() => { setSession('sess-2') })
    await flush()
    act(() => { release?.() })
    await flush()
    expect(view.data?.recordsProblem).toBeNull()
  })

  it('旧 load 晚于新 load 完成时不回滚 records', async () => {
    const view: { data: CultivationPanelData | null } = { data: null }
    let calls = 0
    let releaseFirst: (() => void) | null = null
    const files = {
      listJournal: async () => [],
      listRecords: async () => {
        calls += 1
        if (calls === 1) {
          await new Promise<void>(resolve => { releaseFirst = resolve })
          return { ok: true as const, names: [] }
        }
        return { ok: true as const, names: ['r1.md'] }
      },
      readRecordHead: async () => record,
      readRecord: async () => ({ ok: true as const, eof: true, text: record }),
    }
    function Probe(): null {
      view.data = useCultivationPanelData(files as never, 'sess-1' as never)
      return null
    }
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    mounted.push({ root, host })
    act(() => { root.render(createElement(Probe)) })
    await flush()
    // 同一 effect 内的第二次 load（focus 触发；共享 controller，不走 abort）。
    act(() => { window.dispatchEvent(new Event('focus')) })
    await flush()
    expect(view.data?.records).toHaveLength(1)
    act(() => { releaseFirst?.() })
    await flush()
    expect(view.data?.records).toHaveLength(1)
  })
})
