/**
 * 创作面（培养 GUI 卡 S5，判据 ①/G1）：把「给分身留一条方法 / 给别的角色提建议」从命令行搬进面板。
 *
 * 为什么不挤进记录行：创作属于**另一个时刻**（复盘后沉淀），混进待办行会让人分不清"我在下判"还是"我在提一条"；
 * 入口固定在面板顶部，点开即表单。
 *
 * 分工：命令线构造与校验在 `cultivation-actions.ts`（`correctLine` / `suggestLine`），本组件只显示问题；
 * 文案一律取自 `CULTIVATION_COPY`（迭代改文案不动逻辑）；提交走与治理按钮**同一条人侧通道**（`actions.run`）。
 * 成功后刷新数据 + 回执行内留痕，并把新记录 id（从 host 回执里取，取不到就只刷新）交给面板高亮——
 * 让人看见"我记下的那条去哪了"（G4）。
 *
 * keyless 判据 = `tests/client/cultivation-board-actions.spec.ts`。
 */
import { Button, Input, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import { useState } from 'react'
import { CULTIVATION_ROLES, roleLabel } from '../lib/cultivation.ts'
import {
  CULTIVATION_COPY,
  correctLine,
  suggestLine,
  type ActionOutcome,
  type CultivationActions,
} from './cultivation-actions.ts'

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
}

/** 两种创作意图。 */
type Mode = 'correct' | 'suggest'

/** host 提交回执里取记录 id（`已提交培养记录 <id>（…）`）；取不到就只刷新、不高亮。 */
const SAVED_ID_RE = /已提交培养记录\s+(\S+)/

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
  // 建议对象 = 名册里除我以外的角色（给自己的用「留一条方法」）。
  const others = CULTIVATION_ROLES.filter(role => role !== props.viewerRole)

  const openForm = (next: Mode): void => {
    setMode(next)
    setProblem(null)
    setOutcome(null)
    setExpectation('')
    setBody('')
    setTargetRole(next === 'suggest' ? (others[0] ?? '') : props.viewerRole)
  }

  const submit = async (): Promise<void> => {
    const draft = mode === 'suggest'
      ? suggestLine(targetRole, expectation, body, props.viewerRole)
      : correctLine(expectation, body)
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
    props.onRefresh?.()
    if (savedId !== undefined) props.onSubmitted?.(savedId)
  }

  return (
    <div className="wk-activity-block wk-cultivation-compose" aria-label="给分身留一条方法">
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
            <Input
              value={expectation}
              placeholder={CULTIVATION_COPY.expectationLabel}
              aria-label={CULTIVATION_COPY.expectationLabel}
              onChange={event => { setExpectation(event.target.value) }}
            />
            <textarea
              className="wk-cultivation-body-input"
              value={body}
              placeholder={CULTIVATION_COPY.bodyLabel}
              aria-label={CULTIVATION_COPY.bodyLabel}
              rows={4}
              onChange={event => { setBody(event.target.value) }}
            />
            <div className="wk-cultivation-actions">
              <Button variant="primary" disabled={pending} onClick={() => { void submit() }}>
                {pending ? CULTIVATION_COPY.running : CULTIVATION_COPY.submit}
              </Button>
              <Button disabled={pending} onClick={() => { setMode(null); setProblem(null) }}>{CULTIVATION_COPY.cancel}</Button>
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
