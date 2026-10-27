/**
 * 创作面（培养 GUI 卡 S5，判据 ①/G1；2026-10-23 背景卡 D1=A / D2=A 扩可选背景）。
 *
 * 为什么不挤进记录行：创作属于**另一个时刻**（复盘后沉淀），混进待办行会让人分不清"我在下判"还是"我在提一条"；
 * 入口固定在面板顶部，点开即表单。
 *
 * 分工：命令线构造与校验在 `cultivation-actions.ts`；背景 token 编码在 `lib/cultivation-context.ts`；
 * 候选/预览在 `cultivation-context-data.ts`；本组件只显示状态与提交。
 * 背景是**可选**的：没有 `sources` 注入时整段不渲染，旧表单行为不变。
 *
 * keyless 判据 = `tests/client/cultivation-board-actions.spec.ts` +
 * `tests/client/cultivation-compose-context.spec.ts`。
 */
import { Button, Input, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRef, useState } from 'react'
import { CULTIVATION_ROLES, roleLabel } from '../lib/cultivation.ts'
import { clipExcerpt, encodeContextToken, secretLikeFindings, type CultivationContextRef } from '../lib/cultivation-context.ts'
import {
  CULTIVATION_COPY,
  correctLine,
  suggestLine,
  type ActionOutcome,
  type CultivationActions,
} from './cultivation-actions.ts'
import { CultivationContextPicker, type ContextPickerPick } from './CultivationContextPicker.tsx'
import type { ContextDeliverableRow, ContextSessionRow, CultivationContextSources } from './cultivation-context-data.ts'

/** 已选背景的展示卡（ref 是命令载荷；其余字段只用于显示）。 */
export interface ComposeContextCard {
  readonly ref: CultivationContextRef
  readonly title: string
  readonly subtitle?: string
  readonly role?: string
  readonly turn?: number
  readonly excerpt: string
  readonly truncated?: boolean
}

/** 创作面 props（viewer 角色缺席时面板不渲染本组件——不猜身份）。 */
export interface CultivationComposeProps {
  /** 当前会话角色（纠正的目标 = 它；建议不得指向它）。 */
  readonly viewerRole: string
  /** 人侧动作面（同治理按钮）。 */
  readonly actions: CultivationActions
  /** 提交成功后重读数据。 */
  readonly onRefresh?: (() => void) | undefined
  /** 提交成功后把新记录 id 交给面板高亮（id 从 host 回执里取，取不到不调用）。 */
  readonly onSubmitted?: ((id: string) => void) | undefined
  /** 背景源（缺席 = 不渲染背景区；旧表单行为不变）。 */
  readonly sources?: CultivationContextSources | undefined
  /** 当前会话 id（默认带“本次会话最近一轮”）。 */
  readonly currentSessionId?: string | undefined
  /** 当前会话是 teammate 子会话（D2=A：只做源，按 Lead 身份记账，界面明说）。 */
  readonly teammate?: boolean | undefined
}

/** 两种创作意图。 */
type Mode = 'correct' | 'suggest'
type ContextStatus = 'idle' | 'loading'

/** host 提交回执里取记录 id（`已提交培养记录 <id>（…）`）；取不到就只刷新、不高亮。 */
const SAVED_ID_RE = /已提交培养记录\s+(\S+)/

const cardFromSession = (row: ContextSessionRow, text: string, turn: number | undefined): ComposeContextCard => {
  const clipped = clipExcerpt(text, 1_200)
  return {
    ref: row.ref,
    title: row.title,
    ...(row.role === undefined ? {} : { role: row.role }),
    ...(turn === undefined ? {} : { turn }),
    excerpt: clipped.text,
    ...(clipped.truncated ? { truncated: true } : {}),
  }
}

const cardFromDeliverable = (row: ContextDeliverableRow): ComposeContextCard => ({
  ref: { kind: 'deliverable', ref: row.path, label: row.slug },
  title: row.slug,
  subtitle: row.result,
  excerpt: row.summary,
})

/**
 * 创作入手处（两个入口 → 表单 → 回执）。
 * @param props - 见 {@link CultivationComposeProps}。
 * @returns 入口按钮或展开的表单（含回执与校验提示）。
 */
export function CultivationCompose(props: CultivationComposeProps) {
  const [mode, setMode] = useState<Mode | null>(null)
  const [targetRole, setTargetRole] = useState('')
  const [expectation, setExpectation] = useState('')
  const [body, setBody] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null)
  const [pending, setPending] = useState(false)
  const [context, setContext] = useState<ComposeContextCard | null>(null)
  const [contextStatus, setContextStatus] = useState<ContextStatus>('idle')
  const [contextProblem, setContextProblem] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const seq = useRef(0)
  const inflight = useRef<AbortController | null>(null)
  // 建议对象 = 名册里除我以外的角色（给自己的用「留一条方法」）。
  const others = CULTIVATION_ROLES.filter(role => role !== props.viewerRole)
  const sources = props.sources
  const currentSessionId = props.currentSessionId
  const canContext = sources !== undefined && currentSessionId !== undefined && currentSessionId !== ''

  const resetContext = (): void => {
    seq.current += 1
    inflight.current?.abort()
    inflight.current = null
    setContext(null)
    setContextStatus('idle')
    setContextProblem(null)
    setPickerOpen(false)
    setExpanded(false)
  }

  const pickSession = async (row: ContextSessionRow, auto: boolean): Promise<void> => {
    if (sources === undefined) return
    const id = ++seq.current
    inflight.current?.abort()
    const controller = new AbortController()
    inflight.current = controller
    setContextStatus('loading')
    setContextProblem(null)
    setPickerOpen(false)
    const result = await sources.readPreview(row, controller.signal)
    if (id !== seq.current) return
    setContextStatus('idle')
    inflight.current = null
    if (!result.ok || result.turn === undefined) {
      // 默认带背景失败 = 静默不附带（入口仍可用）；手动选择失败 = 明说原因。
      if (!auto) setContextProblem(result.problem ?? CULTIVATION_COPY.contextNoText)
      return
    }
    setContext(cardFromSession(row, result.turn.text, result.turn.turn))
    setExpanded(false)
  }

  const openForm = (next: Mode): void => {
    resetContext()
    setMode(next)
    setProblem(null)
    setOutcome(null)
    setExpectation('')
    setBody('')
    setTargetRole(next === 'suggest' ? (others[0] ?? '') : props.viewerRole)
    if (next === 'correct' && canContext) {
      const result = sources.listSessions(currentSessionId, props.viewerRole)
      if (result.ok) {
        const current = result.value.find(row => row.current)
        if (current !== undefined) void pickSession(current, true)
      }
    }
  }

  const onPick = (pick: ContextPickerPick): void => {
    setPickerOpen(false)
    if (pick.kind === 'deliverable') {
      seq.current += 1
      inflight.current?.abort()
      setContextStatus('idle')
      setContextProblem(null)
      setContext(cardFromDeliverable(pick.row))
      setExpanded(false)
      return
    }
    void pickSession(pick.row, false)
  }

  const removeContext = (): void => {
    resetContext()
    setProblem(null)
  }

  const submit = async (): Promise<void> => {
    let token: string | undefined
    if (context !== null) {
      const encoded = encodeContextToken({
        v: 1,
        mode: mode === 'suggest' ? 'suggest' : 'correct',
        ...(mode === 'suggest' ? { targetRole } : {}),
        items: [context.ref],
      })
      if (!encoded.ok) {
        setProblem(encoded.problem)
        return
      }
      token = encoded.token
    }
    const draft = mode === 'suggest'
      ? suggestLine(targetRole, expectation, body, props.viewerRole, token)
      : correctLine(expectation, body, token)
    if (!draft.ok) {
      setProblem(draft.problem.message)
      return
    }
    setPending(true)
    setProblem(null)
    const result = await props.actions.run(draft.line)
    setPending(false)
    setOutcome(result)
    if (!result.ok) return
    const savedId = SAVED_ID_RE.exec(result.text)?.[1]
    setMode(null)
    setExpectation('')
    setBody('')
    resetContext()
    props.onRefresh?.()
    if (savedId !== undefined) props.onSubmitted?.(savedId)
  }

  return (
    <div className="wk-activity-block wk-cultivation-compose" aria-label="给分身留一条方法">
      {props.teammate === true && <div className="wk-meta wk-cultivation-teammate">{CULTIVATION_COPY.teammateBanner}</div>}
      {mode === null
        ? (
          <div className="wk-cultivation-compose-entry">
            <Button variant="primary" onClick={() => { openForm('correct') }}>{CULTIVATION_COPY.composeCorrect}</Button>
            <Button onClick={() => { openForm('suggest') }}>{CULTIVATION_COPY.composeSuggest}</Button>
          </div>
        )
        : (
          <div className="wk-cultivation-compose-form">
            <strong>{mode === 'correct' ? CULTIVATION_COPY.composeCorrect : CULTIVATION_COPY.composeSuggest}</strong>
            {mode === 'suggest' && (
              <div className="wk-cultivation-roles" role="group" aria-label={CULTIVATION_COPY.targetRoleLabel}>
                {others.map(role => (
                  <Pill
                    key={role}
                    active={role === targetRole}
                    onClick={() => { setTargetRole(role) }}
                  >
                    {roleLabel(role)}
                  </Pill>
                ))}
              </div>
            )}
            {canContext && (
              <div className="wk-cultivation-context">
                <div className="wk-cultivation-context-head">
                  <span className="wk-meta">{CULTIVATION_COPY.contextLabel}</span>
                  {context === null && contextStatus === 'idle' && (
                    <Button size="sm" aria-expanded={pickerOpen} aria-controls="cultivation-context-picker"
                      onClick={() => { setPickerOpen(open => !open) }}>
                      {CULTIVATION_COPY.contextAdd}
                    </Button>
                  )}
                </div>
                {contextStatus === 'loading' && <div className="wk-meta">{CULTIVATION_COPY.contextLoading}</div>}
                {contextProblem !== null && (
                  <div className="wk-meta wk-cultivation-problem">
                    {contextProblem}
                    <Button size="sm" variant="ghost" onClick={() => { setPickerOpen(true) }}>{CULTIVATION_COPY.contextAdd}</Button>
                  </div>
                )}
                {context !== null && (
                  <div className="wk-cultivation-context-card" aria-label={`背景：${context.title}`}>
                    <div className="wk-cultivation-context-card-head">
                      <strong>{context.title}</strong>
                      <span className="wk-meta">
                        {[
                          context.role === undefined ? '' : context.role,
                          context.subtitle === undefined ? '' : context.subtitle,
                          context.turn === undefined ? '' : `第 ${String(context.turn)} 轮`,
                        ].filter(part => part !== '').join(' · ')}
                      </span>
                    </div>
                    <div className="wk-cultivation-context-excerpt" style={{ whiteSpace: 'pre-wrap' }}>
                      {expanded ? context.excerpt : context.excerpt.split('\n').slice(0, 3).join('\n')}
                    </div>
                    {context.truncated === true && <div className="wk-meta">{CULTIVATION_COPY.contextClipped}</div>}
                    {secretLikeFindings(context.excerpt).length > 0 && (
                      <div className="wk-meta wk-cultivation-problem">{CULTIVATION_COPY.contextSecretWarning}</div>
                    )}
                    <div className="wk-cultivation-actions">
                      <Button size="sm" variant="ghost" aria-expanded={expanded}
                        onClick={() => { setExpanded(value => !value) }}>
                        {expanded ? CULTIVATION_COPY.contextCollapse : CULTIVATION_COPY.contextExpand}
                      </Button>
                      <Button size="sm" variant="ghost" aria-expanded={pickerOpen} onClick={() => { setPickerOpen(open => !open) }}>
                        {CULTIVATION_COPY.contextChange}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={removeContext}>{CULTIVATION_COPY.contextRemove}</Button>
                    </div>
                  </div>
                )}
                {pickerOpen && (
                  <div id="cultivation-context-picker">
                    <CultivationContextPicker
                      sources={sources}
                      currentSessionId={currentSessionId}
                      targetRole={mode === 'suggest' ? targetRole : undefined}
                      onPick={onPick}
                      onCancel={() => { setPickerOpen(false) }}
                    />
                  </div>
                )}
              </div>
            )}
            {/* 标签常驻（placeholder 一打字就消失，走查里"打完就不记得这栏是什么"）。 */}
            <label className="wk-cultivation-field">
              <span className="wk-meta">{CULTIVATION_COPY.expectationLabel}</span>
              <Input
                value={expectation}
                placeholder={CULTIVATION_COPY.expectationPlaceholder}
                onChange={event => { setExpectation(event.target.value) }}
              />
            </label>
            <label className="wk-cultivation-field">
              <span className="wk-meta">{context === null ? CULTIVATION_COPY.bodyLabel : CULTIVATION_COPY.bodyOptionalLabel}</span>
              <textarea
                className="wk-cultivation-body-input"
                value={body}
                rows={4}
                onChange={event => { setBody(event.target.value) }}
              />
              <span className="wk-meta wk-cultivation-hint">
                {context === null ? CULTIVATION_COPY.bodyHint : CULTIVATION_COPY.bodyOptionalHint}
              </span>
            </label>
            <div className="wk-cultivation-actions">
              <Button variant="primary" disabled={pending || contextStatus === 'loading'} onClick={() => { void submit() }}>
                {pending ? CULTIVATION_COPY.running : CULTIVATION_COPY.submit}
              </Button>
              <Button disabled={pending} onClick={() => { resetContext(); setMode(null); setProblem(null) }}>{CULTIVATION_COPY.cancel}</Button>
            </div>
          </div>
        )}
      {problem !== null && <div className="wk-meta wk-cultivation-problem">{problem}</div>}
      {outcome !== null && (
        <div className={outcome.ok ? 'wk-meta wk-cultivation-outcome' : 'wk-meta wk-cultivation-problem'}>
          {outcome.text}
        </div>
      )}
    </div>
  )
}
