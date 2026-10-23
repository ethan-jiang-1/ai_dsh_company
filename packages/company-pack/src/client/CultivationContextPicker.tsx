/**
 * 背景选择面板（RFC notes/proposed/2026-10-23-cultivation-context.md）。
 *
 * 形态 = 内联面板（不是 modal）：本次会话 / 最近会话 / 最近成品三组 + 客户端搜索；
 * 键盘 ↑/↓/Enter/Escape；焦点回到触发点。数据源经 `CultivationContextSources` 注入
 * （会话只读本地快照、成品复用成品页签 parser、预览读只取 follow 第一帧）。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { CULTIVATION_COPY } from './cultivation-actions.ts'
import {
  contextSessionLabel,
  type ContextDeliverableRow,
  type ContextSessionRow,
  type CultivationContextSources,
} from './cultivation-context-data.ts'

export type ContextPickerPick =
  | { readonly kind: 'session'; readonly row: ContextSessionRow }
  | { readonly kind: 'deliverable'; readonly row: ContextDeliverableRow }

export interface CultivationContextPickerProps {
  readonly sources: CultivationContextSources
  readonly currentSessionId: string
  readonly targetRole?: string | undefined
  readonly onPick: (pick: ContextPickerPick) => void
  readonly onCancel: () => void
}

const matches = (query: string, ...values: readonly (string | undefined)[]): boolean => {
  const needle = query.trim().toLocaleLowerCase()
  if (needle === '') return true
  return values.some(value => value !== undefined && value.toLocaleLowerCase().includes(needle))
}

/**
 * 选择参考背景。
 * @param props - 见 {@link CultivationContextPickerProps}。
 * @returns 内联面板（含搜索、三组候选、加载/错误/空态）。
 */
export function CultivationContextPicker(props: CultivationContextPickerProps) {
  const [query, setQuery] = useState('')
  const [deliverables, setDeliverables] = useState<readonly ContextDeliverableRow[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const panel = useRef<HTMLDivElement>(null)
  const sessions = useMemo(() => {
    const result = props.sources.listSessions(props.currentSessionId, props.targetRole)
    return result.ok ? result.value : []
  }, [props.sources, props.currentSessionId, props.targetRole])

  useEffect(() => {
    const controller = new AbortController()
    let live = true
    void props.sources.listDeliverables(props.currentSessionId, controller.signal).then(result => {
      if (!live) return
      setLoading(false)
      if (result.ok) setDeliverables(result.value)
      else setProblem(result.problem)
    })
    return () => { live = false; controller.abort() }
  }, [props.sources, props.currentSessionId])

  const current = sessions.find(row => row.current) ?? null
  const recent = sessions.filter(row => !row.current && matches(query, row.title, row.role, contextSessionLabel(row)))
  const currentMatches = current !== null && matches(query, current.title, current.role, contextSessionLabel(current))
  const filteredDeliverables = deliverables.filter(row => matches(query, row.slug, row.result, row.summary))
  const empty = !currentMatches && recent.length === 0 && filteredDeliverables.length === 0 && !loading

  const move = (direction: 1 | -1): void => {
    const items = [...(panel.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    if (items.length === 0) return
    const active = document.activeElement
    const index = items.findIndex(item => item === active)
    const next = index === -1 ? (direction === 1 ? 0 : items.length - 1) : (index + direction + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <div
      ref={panel}
      className="wk-cultivation-context-picker"
      role="group"
      aria-label={CULTIVATION_COPY.contextPickTitle}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); props.onCancel(); return }
        if (event.key === 'ArrowDown') { event.preventDefault(); move(1); return }
        if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
      }}
    >
      <div className="wk-cultivation-context-picker-head">
        <strong>{CULTIVATION_COPY.contextPickTitle}</strong>
        <Input
          value={query}
          placeholder={CULTIVATION_COPY.contextSearchPlaceholder}
          aria-label={CULTIVATION_COPY.contextSearchPlaceholder}
          onChange={event => { setQuery(event.target.value) }}
        />
      </div>
      <div className="wk-meta wk-cultivation-context-privacy">{CULTIVATION_COPY.contextPrivacy}</div>
      {loading && <div className="wk-meta">{CULTIVATION_COPY.contextLoading}</div>}
      {problem !== null && <div className="wk-meta wk-cultivation-problem">{problem}</div>}
      <div className="wk-cultivation-context-list" role="listbox" aria-label={CULTIVATION_COPY.contextPickTitle}>
        {currentMatches && current !== null && (
          <>
            <div className="wk-meta" role="presentation">{CULTIVATION_COPY.contextUseCurrent}</div>
            <button type="button" role="option" aria-selected="false" className="wk-cultivation-context-option"
              onClick={() => { props.onPick({ kind: 'session', row: current }) }}>
              <span>{contextSessionLabel(current)} · {current.title}</span>
            </button>
          </>
        )}
        {recent.length > 0 && (
          <>
            <div className="wk-meta" role="presentation">{CULTIVATION_COPY.contextSessions}</div>
            {recent.map(row => (
              <button key={row.sessionId} type="button" role="option" aria-selected="false"
                className="wk-cultivation-context-option"
                onClick={() => { props.onPick({ kind: 'session', row }) }}>
                <span>{row.title}</span>
                <span className="wk-meta">{contextSessionLabel(row)}</span>
              </button>
            ))}
          </>
        )}
        {filteredDeliverables.length > 0 && (
          <>
            <div className="wk-meta" role="presentation">{CULTIVATION_COPY.contextDeliverables}</div>
            {filteredDeliverables.map(row => (
              <button key={row.path} type="button" role="option" aria-selected="false"
                className="wk-cultivation-context-option"
                onClick={() => { props.onPick({ kind: 'deliverable', row }) }}>
                <span>{row.slug}</span>
                <span className="wk-meta">{row.result}{row.kickoff === '' ? '' : ` · ${row.kickoff}`}</span>
              </button>
            ))}
          </>
        )}
      </div>
      {empty && <div className="wk-meta">{CULTIVATION_COPY.contextEmpty}</div>}
      <div className="wk-cultivation-actions">
        <Button onClick={props.onCancel}>{CULTIVATION_COPY.cancel}</Button>
      </div>
    </div>
  )
}
