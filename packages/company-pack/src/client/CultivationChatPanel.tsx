/**
 * 培养对话面板（2026-10-28 培养主视图）：绑定**独立培养会话**，与主 Chat / Trajectory 分开。
 *
 * 数据：一次 `sessions.create`（按主会话缓存 id）→ `retain` → `binding.eventSource` 读历史/实时；
 * 输入：`binding.session.prompt([{type:'text'}], 'queue')`。
 * 边界：不复制主 Chat 的 transcript；不伪造回复；工具/审批的完整渲染在下一切片。
 * 复用：同一主会话的 localStorage 键复用培养会话；主会话切换则各自一份。
 */
import './session-source.ts'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ISessions } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionBinding, SessionReference } from '@deepseek-ai/dsh-api-session-controller/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'

type EventWindow = ReturnType<SessionBinding['eventSource']['getSnapshot']>

/** 独立培养会话的范围前缀：同一个 agent 只在这个线程里谈培养。 */
const CULTIVATION_SCOPE = '【培养对话】你只在这个线程里讨论培养：纠正、方法、journal、赞踩。不要处理其他项目或公司事务。回答要能落到方法/记录上。\n\n'

/** 渲染时剥掉范围前缀，用户看到的是自己写的那句。 */
function stripScope(text: string): string {
  return text.startsWith(CULTIVATION_SCOPE) ? text.slice(CULTIVATION_SCOPE.length) : text
}
type EventEntries = EventWindow['entries']
type SessionSnapshot = ReturnType<SessionBinding['session']['getSnapshot']>

/** 面板 props。 */
export interface CultivationChatPanelProps {
  /** Client sessions service（创建/保留培养会话）。 */
  readonly sessions: ISessions
  /** 当前主会话 id（缓存键 + cwd/role 来源）。 */
  readonly mainSessionId: SessionId
  /** 主会话 cwd；缺席 = 等主会话就绪。 */
  readonly cwd?: string | undefined
  /** 当前角色 preset；缺席 = 等角色投影。 */
  readonly agentPreset?: string | null | undefined
}

interface ThreadRow {
  readonly id: string
  readonly who: 'you' | 'host'
  readonly text: string
}

type PanelState =
  | { readonly status: 'waiting' }
  | { readonly status: 'creating' }
  | { readonly status: 'error', readonly error: string }
  | { readonly status: 'ready', readonly binding: SessionBinding }

function textOfBlocks(blocks: readonly unknown[]): string {
  const parts: string[] = []
  for (const block of blocks) {
    if (typeof block !== 'object' || block === null) continue
    const record = block as { type?: unknown, text?: unknown }
    if (record.type === 'text' && typeof record.text === 'string' && record.text.trim() !== '') parts.push(record.text)
  }
  return parts.join('\n\n').trim()
}

/** 只取主对话的 user/assistant 文本；工具/系统事件在下一片渲染。 */
function rowsOf(entries: EventEntries): readonly ThreadRow[] {
  const rows: ThreadRow[] = []
  for (const entry of entries) {
    if (entry.type !== 'event') continue
    const event = entry.event
    if (event.type === 'user/message') {
      // 只显示人直接输入；skill/文件变更/goal continuation 等合成 user 消息不进培养对话。
      const source = (event.data as { source?: { kind?: unknown } }).source
      if (source !== undefined && source.kind !== 'user') continue
      const text = stripScope(textOfBlocks(event.data.content as readonly unknown[]))
      if (text !== '') rows.push({ id: `u-${event.seq}`, who: 'you', text })
      continue
    }
    if (event.type === 'assistant/message') {
      const text = textOfBlocks(event.data.message.content as readonly unknown[])
      if (text !== '') rows.push({ id: `a-${event.seq}`, who: 'host', text })
    }
  }
  return rows
}

/**
 * 右栏培养对话：建立/复用独立会话，渲染历史，发 prompt。
 * @param props - sessions + 主会话 cwd/role。
 * @returns 培养对话面板。
 */
export function CultivationChatPanel({ sessions, mainSessionId, cwd, agentPreset }: CultivationChatPanelProps) {
  const [state, setState] = useState<PanelState>({ status: cwd === undefined || agentPreset == null ? 'waiting' : 'creating' })

  useEffect(() => {
    if (cwd === undefined || agentPreset === null || agentPreset === undefined) {
      setState({ status: 'waiting' })
      return
    }
    let cancelled = false
    let reference: SessionReference | undefined
    const key = `dsh-company-cultivation-session:${String(mainSessionId)}`
    setState({ status: 'creating' })

    const open = async (id: SessionId): Promise<void> => {
      reference = sessions.retain(id, { source: 'companyCultivation' })
      const binding = await reference.ready
      if (cancelled) {
        reference.release()
        return
      }
      setState({ status: 'ready', binding })
    }

    const run = async (): Promise<void> => {
      const stored = typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
      if (stored !== null && stored !== '') {
        try {
          await open(stored as SessionId)
          return
        } catch {
          try { reference?.release() } catch { /* already released */ }
          reference = undefined
          if (typeof localStorage !== 'undefined') localStorage.removeItem(key)
        }
      }
      const created = await sessions.create({ cwd, agentPreset })
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, String(created))
      await open(created)
    }

    run().catch((error: unknown) => {
      if (cancelled) return
      setState({ status: 'error', error: error instanceof Error ? error.message : String(error) })
    })

    return () => {
      cancelled = true
      try { reference?.release() } catch { /* already released */ }
    }
  }, [sessions, mainSessionId, cwd, agentPreset])

  return (
    <section className="wk-cult-chat" aria-label="培养对话">
      <header className="wk-cult-chat-head">
        <div>
          <div className="wk-cult-chat-title">培养对话</div>
          <div className="wk-cult-chat-sub">独立培养会话 · 与主 Chat 分开</div>
        </div>
        <span className="wk-cult-chat-badge">独立会话</span>
      </header>

      <div className="wk-cult-chat-hint">
        只谈培养：纠正、方法、journal、赞踩；回复不会混进主 Chat。
      </div>

      {state.status === 'waiting' && <div className="wk-cult-chat-state">等待主会话的工作区与角色…</div>}
      {state.status === 'creating' && <div className="wk-cult-chat-state">正在建立培养会话…</div>}
      {state.status === 'error' && <div className="wk-cult-chat-state bad">培养会话打不开：{state.error}</div>}
      {state.status === 'ready' && <CultivationThread binding={state.binding} />}
    </section>
  )
}

/** 一个已就绪绑定的 transcript + composer（hooks 只在 ready 后挂载）。 */
function CultivationThread({ binding }: { readonly binding: SessionBinding }) {
  const window = useSyncExternalStore(
    binding.eventSource.subscribe.bind(binding.eventSource),
    binding.eventSource.getSnapshot.bind(binding.eventSource),
    binding.eventSource.getSnapshot.bind(binding.eventSource),
  ) as EventWindow
  const snapshot = useSyncExternalStore(
    binding.session.subscribe.bind(binding.session),
    binding.session.getSnapshot.bind(binding.session),
    binding.session.getSnapshot.bind(binding.session),
  ) as SessionSnapshot
  const rows = useMemo(() => rowsOf(window.entries), [window.entries])
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (list !== null) list.scrollTop = list.scrollHeight
  }, [rows, pending])

  const pendingVisible = pending !== null && !rows.some(row => row.who === 'you' && row.text === pending)

  const submit = async (): Promise<void> => {
    const text = draft.trim()
    if (text === '' || sending) return
    setDraft('')
    setError(null)
    setPending(text)
    setSending(true)
    try {
      const result = await binding.session.prompt([{ type: 'text', text: `${CULTIVATION_SCOPE}${text}` }], 'queue')
      if (!result.ok) {
        setError(`${result.error.code}: ${result.error.message}`)
        setPending(null)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      setPending(null)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="wk-cult-chat-lines" ref={listRef} data-cultivation-chat-lines>
        {rows.length === 0 && pendingVisible === false && (
          <div className="wk-cult-chat-empty">
            <b>这里只谈培养</b>
            <span>把左侧的纠正、方法、journal 拿进来问；不会混进主对话。</span>
            <span>例如：把这条 rejected 纠正整理成反例方法，别写空话。</span>
          </div>
        )}
        {rows.map(row => (
          <div key={row.id} className={`wk-cult-chat-line ${row.who}`}>
            <div className="wk-cult-chat-who">{row.who === 'you' ? '你' : '培养 host'}</div>
            <div className="wk-cult-chat-bubble">{row.text}</div>
          </div>
        ))}
        {pendingVisible && (
          <div className="wk-cult-chat-line you">
            <div className="wk-cult-chat-who">你 · 发送中</div>
            <div className="wk-cult-chat-bubble">{pending}</div>
          </div>
        )}
        {snapshot.running && (
          <div className="wk-cult-chat-status">培养会话正在回复…</div>
        )}
        {error !== null && <div className="wk-cult-chat-error">{error}</div>}
      </div>

      <div className="wk-cult-chat-composer">
        <textarea
          value={draft}
          rows={3}
          placeholder="只谈培养：纠正、方法、journal…"
          aria-label="培养对话输入"
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void submit()
            }
          }}
        />
        <div className="wk-cult-chat-actions">
          <span className="wk-cult-chat-session">session: {String(binding.sessionId).slice(0, 8)}</span>
          <button type="button" className="wk-cult-chat-send" disabled={sending || draft.trim() === ''} onClick={() => { void submit() }}>
            {sending ? '发送中…' : '发送'}
          </button>
        </div>
      </div>
    </>
  )
}
