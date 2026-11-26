// @vitest-environment happy-dom
/** Wave S4 `companyTurnSummaryDefinition` 与 `CompanyTurnTailCard`（`conversation.chat.turnTail`）单测。 */
import { act, createElement, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { en, zh, type CompanyKey, type CompanyT } from '../../../packages/company-pack/src/client/locales.ts'
import {
  COMPANY_TURN_SUMMARY_KIND,
  CompanyTurnTailCard,
  companyTurnSummaryDefinition,
  isCompanyTurnTool,
  selectCompanyTurnSummary,
} from '../../../packages/company-pack/src/client/ux/company-turn-tail.tsx'

type StartInput = Parameters<typeof companyTurnSummaryDefinition.start>[1]
type UpdateInput = Parameters<typeof companyTurnSummaryDefinition.update>[1]
type TurnProp = ComponentProps<typeof CompanyTurnTailCard>['turn']

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const makeT = (dict: Record<CompanyKey, string>) =>
  ((key: CompanyKey, params?: Record<string, string | number>) => {
    const raw = dict[key]
    return params === undefined
      ? raw
      : raw.replace(/\{(\w+)\}/g, (_m, k: string) => String(params[k] ?? ''))
  }) as unknown as CompanyT

describe('Wave S4 companyTurnSummaryDefinition & CompanyTurnTailCard', () => {
  it('recognizes company tools and accumulates turn summary without touching uiConversation.groups', () => {
    expect(isCompanyTurnTool('request_signoff')).toBe(true)
    expect(isCompanyTurnTool('present')).toBe(true)
    expect(isCompanyTurnTool('company_report')).toBe(true)
    expect(isCompanyTurnTool('vp_eng')).toBe(true)
    expect(isCompanyTurnTool('spawn_teammate')).toBe(true)
    expect(isCompanyTurnTool('bash')).toBe(false)

    const startEvt = { type: 'turn/start', seq: 1, time: 100, data: { turn: 3 } }
    const callEvt = { type: 'tool/call', seq: 2, time: 101, data: { turn: 3, callId: 'c1', name: 'request_signoff', arguments: '{}' } }
    const delegEvt = { type: 'tool/call', seq: 3, time: 102, data: { turn: 3, callId: 'c2', name: 'vp_eng', arguments: '{}' } }
    const teamEvt = { type: 'tool/call', seq: 31, time: 102, data: { turn: 3, callId: 'c2b', name: 'spawn_teammate', arguments: '{}' } }
    const bashEvt = { type: 'tool/call', seq: 4, time: 103, data: { turn: 3, callId: 'c3', name: 'bash', arguments: '{}' } }

    expect(companyTurnSummaryDefinition.match(startEvt as never)).toEqual({ id: '3', role: 'start' })
    expect(companyTurnSummaryDefinition.match(callEvt as never)).toEqual({ id: '3', role: 'update' })
    expect(companyTurnSummaryDefinition.match(bashEvt as never)).toBeNull()
    expect(companyTurnSummaryDefinition.match({ type: 'tool/result', surface: 'replace', seq: 9, time: 109, data: { turn: 3 } } as never)).toBeNull()
    expect(companyTurnSummaryDefinition.match({ type: 'assistant/text', seq: 10, time: 110, data: {} } as never)).toBeNull()
    expect(() => companyTurnSummaryDefinition.start({} as never, { event: callEvt } as unknown as StartInput, {} as never)).toThrow()

    let state = companyTurnSummaryDefinition.start({} as never, { event: startEvt } as unknown as StartInput, {} as never)
    expect(companyTurnSummaryDefinition.buildLocationData?.({ state } as never, 'turn', null)).toBeNull()
    expect(companyTurnSummaryDefinition.buildLocationData?.({ state } as never, 'message' as never, null)).toBeNull()
    state = companyTurnSummaryDefinition.update({ state } as never, { event: bashEvt } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, { event: callEvt } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, { event: delegEvt } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, { event: teamEvt } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, { event: { type: 'assistant/text', seq: 4, time: 103, data: {} } } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, {
      event: { type: 'tool/result', seq: 5, time: 104, data: { turn: 3, message: { source: { callId: 'c1' } } } },
    } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, {
      event: { type: 'tool/result', seq: 51, time: 104, data: { turn: 3, message: { source: { callId: 'c1' } } } },
    } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, {
      event: { type: 'tool/result', seq: 52, time: 104, data: { turn: 3, message: { source: { callId: 'unknown-call' } } } },
    } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, {
      event: { type: 'tool/result', seq: 6, time: 105, data: { turn: 3, message: { source: { callId: 'c2' } } } },
    } as unknown as UpdateInput)
    state = companyTurnSummaryDefinition.update({ state } as never, {
      event: { type: 'tool/result', seq: 7, time: 106, data: { turn: 3, message: { source: { callId: 'c2b' } } } },
    } as unknown as UpdateInput)

    const loc = companyTurnSummaryDefinition.buildLocationData?.({ state } as never, 'turn', null)
    expect(loc).toEqual({
      kind: 'turn',
      turn: 3,
      key: COMPANY_TURN_SUMMARY_KIND,
      value: {
        turn: 3,
        completedTools: ['request_signoff', 'vp_eng', 'spawn_teammate'],
        hasSignoff: true,
        hasDelegation: true,
      },
    })
    expect(companyTurnSummaryDefinition.buildLocationData?.({ state } as never, 'turn', loc ?? null)).toBe(loc)
  })

  it('renders null for plain non-company turns and renders tags + navigation for company turns (zh/en clean)', async () => {
    const emptyTurn = { data: new Map() } as unknown as TurnProp
    expect(selectCompanyTurnSummary(emptyTurn)).toBeNull()

    const companyTurn = {
      data: new Map([
        [COMPANY_TURN_SUMMARY_KIND, {
          turn: 2,
          completedTools: ['request_signoff', 'vp_eng'],
          hasSignoff: true,
          hasDelegation: true,
        }],
      ]),
    } as unknown as TurnProp

    const openOps = vi.fn()
    const openArchive = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(createElement(CompanyTurnTailCard, {
        turn: emptyTurn,
        openOps,
        openArchive,
        t: makeT(zh),
      } as unknown as ComponentProps<typeof CompanyTurnTailCard>))
    })
    expect(host.querySelector('[data-company-turn-tail]')).toBeNull()

    await act(async () => {
      root.render(createElement(CompanyTurnTailCard, {
        turn: companyTurn,
        openOps,
        openArchive,
        t: makeT(zh),
      } as unknown as ComponentProps<typeof CompanyTurnTailCard>))
    })
    expect(host.querySelector('[data-company-turn-tail]')).not.toBeNull()
    expect(host.textContent).toContain('2')
    expect(host.textContent).toContain(zh['turnTail.signoff'])
    expect(host.textContent).toContain(zh['turnTail.delegation'])

    const opsBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === zh['turnTail.openOps'])!
    const archBtn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === zh['turnTail.openArchive'])!
    await act(async () => { opsBtn.click(); archBtn.click() })
    expect(openOps).toHaveBeenCalledOnce()
    expect(openArchive).toHaveBeenCalledOnce()

    // English copy clean of CJK
    await act(async () => {
      root.render(createElement(CompanyTurnTailCard, {
        turn: companyTurn,
        openOps,
        openArchive,
        t: makeT(en),
      } as unknown as ComponentProps<typeof CompanyTurnTailCard>))
    })
    expect(host.textContent).toContain('Turn summary: 2')
    expect(host.textContent).not.toMatch(/[\u3400-\u9fff]/u)

    act(() => { root.unmount() })
    host.remove()
  })
})
