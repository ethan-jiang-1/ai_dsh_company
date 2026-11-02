// @vitest-environment happy-dom
/**
 * 「培养」页签体的 keyless 渲染判据（R5-06，2026-11-03 第五轮七维审计）。
 *
 * 为什么补：`CultivationTab.tsx` 的行覆盖长期是 **0.0%**——它只在页签注册数组里被点名，
 * 从未真正渲染过。一个整页空白、roleSource 抛错、记录读不出来的培养页签，1048 例可以全绿。
 * 本档用 happy-dom + createRoot 真挂 `CultivationTab`：外壳标题、viewer 角色、真实记录行与空态。
 * **不主张**真浏览器渲染（归 client-load-smoke / ui-scene-smoke）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { CultivationTab } from '../../packages/company-pack/src/client/CultivationTab.tsx'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mounted: Root | null = null
afterEach(() => {
  act(() => { mounted?.unmount() })
  mounted = null
  document.body.innerHTML = ''
})

const flush = async (): Promise<void> => {
  await act(async () => { await new Promise(resolve => { setTimeout(resolve, 0) }) })
}

function props(over: Record<string, unknown> = {}) {
  return {
    sessionId: 'session-lead',
    useSessions: (selector: (state: { byId: Record<string, unknown> }) => unknown) => selector({ byId: {} }),
    useTabInfo: () => ({ tab: { id: 'tab-1', contentId: 'dsh-company-pack/cultivation' } }),
    floatTab: () => {},
    unfloatTab: () => {},
    cultivationFiles: {
      listJournal: async () => [],
      readHead: async () => null,
      listRecords: async () => [],
      readRecordHead: async () => null,
      readRecord: async () => null,
    },
    cultivationActions: () => ({ run: async () => ({ kind: 'ok' as const }) }),
    followEvents: undefined,
    roleSource: {
      getSnapshot: () => ({ projectionsBySession: { 'session-lead': { values: { agentPreset: 'ceo' } } } }),
      subscribe: () => () => {},
    },
    contextSources: undefined,
    openContext: undefined,
    ...over,
  } as never
}

async function mount(element: ReturnType<typeof createElement>): Promise<HTMLElement> {
  const host = document.createElement('div')
  document.body.append(host)
  mounted = createRoot(host)
  await act(async () => { mounted?.render(element) })
  await flush()
  return host
}

describe('培养页签：外壳、viewer 角色与真实记录（R5-06）', () => {
  it('渲染面板外壳与 viewer 角色，而不是一张空白面板', async () => {
    const host = await mount(createElement(CultivationTab, props()))
    expect(host.querySelector('[data-company-tab-title="培养"]')).not.toBeNull()
    expect(host.textContent).toContain('我的分身：CEO')
    expect(host.textContent).toContain('需要我处理')
    expect(host.textContent).toContain('我的分身还没有已采纳的方法')
  })

  it('记录目录返回一条 open 记录时，期望文案真的出现在面板里', async () => {
    const record = [
      '---',
      'kind: correction',
      'targetRole: ceo',
      'proposerRole: ceo',
      'proposerKind: human',
      'source: （会话内提交）',
      'expectation: 下次先列关键假设再给结论',
      'status: open',
      '---',
      '',
      '背景正文。',
      '',
    ].join('\n')
    const host = await mount(createElement(CultivationTab, props({
      cultivationFiles: {
        listJournal: async () => [],
        readHead: async () => null,
        listRecords: async () => ['r1.md'],
        readRecordHead: async () => record,
        readRecord: async () => record,
      },
    })))
    expect(host.textContent).toContain('下次先列关键假设再给结论')
  })

  it('记录目录不可达时给「不可达」而不是折成 0 条的空态', async () => {
    const host = await mount(createElement(CultivationTab, props({
      cultivationFiles: {
        listJournal: async () => [],
        readHead: async () => null,
        listRecords: async () => null,
        readRecordHead: async () => null,
        readRecord: async () => null,
      },
    })))
    expect(host.textContent).toContain('不可达')
  })
})
