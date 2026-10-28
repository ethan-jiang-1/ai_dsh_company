/**
 * 培养对话面板（2026-10-28 培养主视图，第一切片）。
 *
 * 位置：第三个主视图右侧，只谈培养；与主 Chat / 轨迹分开。
 * 当前阶段：培养专属会话（独立 session create/follow/prompt）尚未接入，先提供
 * **命令面**——输入 `/cultivation ...`，结果只回在这个面板里；自由对话下一阶段接入。
 * 边界：不伪造模型回复；命令结果就是 host 命令的真实返回。
 */
import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { CultivationActions } from './cultivation-actions.ts'

/** 一行对话/命令记录。 */
interface PanelLine {
  readonly id: number
  readonly who: 'you' | 'host'
  readonly text: string
  readonly ok?: boolean
}

/** 面板 props。 */
export interface CultivationChatPanelProps {
  /** 当前主会话 id（培养命令按它执行；独立培养会话接入后改为培养会话 id）。 */
  readonly sessionId: SessionId
  /** 人侧动作面；缺席 = 不可发送（不出现死按钮）。 */
  readonly actions?: CultivationActions | undefined
}

let nextLineId = 0

/**
 * 培养对话面板。
 * @param props - 当前会话与动作面。
 * @returns 右栏命令面。
 */
export function CultivationChatPanel({ sessionId, actions }: CultivationChatPanelProps) {
  const [lines, setLines] = useState<readonly PanelLine[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (list !== null) list.scrollTop = list.scrollHeight
  }, [lines])

  const append = (who: PanelLine['who'], text: string, ok?: boolean): void => {
    setLines(current => [...current, { id: nextLineId++, who, text, ...(ok === undefined ? {} : { ok }) }])
  }

  const submit = async (): Promise<void> => {
    const line = draft.trim()
    if (line === '' || busy) return
    setDraft('')
    append('you', line)
    if (!line.startsWith('/cultivation')) {
      append('host', '当前阶段只接 /cultivation 命令；自由培养对话会在独立培养会话接入后开放。', false)
      return
    }
    if (actions === undefined) {
      append('host', '培养动作面不可用（连接或权限未就绪）。', false)
      return
    }
    setBusy(true)
    try {
      const outcome = await actions.run(line)
      append('host', outcome.text, outcome.ok)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="wk-cult-chat" aria-label="培养对话">
      <header className="wk-cult-chat-head">
        <div>
          <div className="wk-cult-chat-title">培养对话</div>
          <div className="wk-cult-chat-sub">只谈培养 · 命令面</div>
        </div>
        <span className="wk-cult-chat-badge">独立会话接入中</span>
      </header>

      <div className="wk-cult-chat-hint">
        先支持 <code>/cultivation ...</code>；自由对话只在这里发生，不进主 Chat。
      </div>

      <div className="wk-cult-chat-lines" ref={listRef} data-cultivation-chat-lines>
        {lines.length === 0 && (
          <div className="wk-cult-chat-empty">
            <b>这里只谈培养</b>
            <span>把左侧的纠正、方法、journal 拿进来问；不会混进主对话。</span>
            <code>/cultivation correct 期望行为 :: 做法与证据</code>
          </div>
        )}
        {lines.map(line => (
          <div key={line.id} className={`wk-cult-chat-line ${line.who}`}>
            <div className="wk-cult-chat-who">{line.who === 'you' ? '你' : '培养 host'}</div>
            <div className={`wk-cult-chat-bubble ${line.ok === false ? 'bad' : ''}`}>{line.text}</div>
          </div>
        ))}
      </div>

      <div className="wk-cult-chat-composer">
        <textarea
          value={draft}
          rows={3}
          placeholder="输入 /cultivation …（自由培养对话接入后可直接说话）"
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
          <span className="wk-cult-chat-session">session: {String(sessionId).slice(0, 8)}</span>
          <button type="button" className="wk-cult-chat-send" disabled={busy || draft.trim() === ''} onClick={() => { void submit() }}>
            {busy ? '执行中…' : '发送'}
          </button>
        </div>
      </div>
    </section>
  )
}
