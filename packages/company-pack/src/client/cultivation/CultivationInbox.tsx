/**
 * 培养面板 · “需要我处理”块（2026-10-28 R4-E4 自 CultivationBoard 抽出）。
 * 只读 board 状态；控件/文案/错误原话与拆前逐字一致。
 */
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { roleLabel as defaultRoleLabel, type CultivationRecord } from '../../lib/cultivation.ts'
import { CULTIVATION_COPY, adoptLine } from './cultivation-actions.ts'
import { BODY_PREVIEW_LINES, type CultivationBoardState } from './use-cultivation-board.tsx'

function recordKindLabel(record: CultivationRecord, roleLabel: (role: string) => string): string {
  if (record.kind === 'suggestion') return CULTIVATION_COPY.inboxSuggestion(roleLabel(record.proposerRole))
  return record.proposerKind === 'agent' ? CULTIVATION_COPY.inboxCorrectionAgent(roleLabel(record.proposerRole)) : CULTIVATION_COPY.inboxCorrectionHuman
}

function recordProvenance(record: CultivationRecord, roleLabel: (role: string) => string): string {
  const proposer = record.proposerKind === 'agent' ? CULTIVATION_COPY.inboxProposerAgent(roleLabel(record.proposerRole)) : CULTIVATION_COPY.inboxProposerHuman(roleLabel(record.proposerRole))
  return CULTIVATION_COPY.inboxProvenance(proposer, roleLabel(record.targetRole))
}

export function CultivationInbox({ board, roleLabel = defaultRoleLabel }: { readonly board: CultivationBoardState; readonly roleLabel?: (role: string) => string }) {
  const {
    inbox,
    actions,
    records,
    brokenRecords,
    unexpandedRecords,
    pendingIds,
    rejectingId,
    expandedContexts,
    openingContextId,
    contextOutcomes,
    reason,
    reasonProblem,
    highlightId,
    expandedBodies,
    openContextOf,
    capList,
    capControl,
    stampOf,
    run,
    confirmReject,
    outcomeOf,
    setExpandedContexts,
    setExpandedBodies,
    setRejectingId,
    setReason,
    setReasonProblem,
    openContext,
  } = board
  return (
      <div className="wk-activity-block" aria-label={CULTIVATION_COPY.inboxTitle}>
        <strong>{CULTIVATION_COPY.inboxTitle}</strong>
        {(brokenRecords ?? []).length > 0 && (
          <div className="wk-meta">
            {CULTIVATION_COPY.inboxBroken(brokenRecords!.length, (brokenRecords ?? []).join('、'))}
          </div>
        )}
        {(unexpandedRecords ?? 0) > 0 && (
          <div className="wk-meta">
            {CULTIVATION_COPY.inboxUnexpanded(unexpandedRecords ?? 0)}
          </div>
        )}
        {records === null
          ? <div className="wk-meta">{CULTIVATION_COPY.inboxUnread}</div>
          : inbox.needsDecision.length === 0
            ? <div className="wk-meta">{CULTIVATION_COPY.inboxEmpty}</div>
            : (
              <>
              <div role="list" aria-label={CULTIVATION_COPY.inboxListAria} className="wk-list wk-cultivation-list">
                {capList('inbox', inbox.needsDecision).map(record => {
                  const outcome = outcomeOf(record.id)
                  return (
                    <div key={record.id} role="listitem" className="wk-row" aria-label={CULTIVATION_COPY.inboxRowAria(record.id)}>
                      <span className="wk-row-name">
                        {recordKindLabel(record, roleLabel)}
                        <Tag tone="info">{record.expectation}</Tag>
                        {highlightId === record.id && <Tag tone="success">{CULTIVATION_COPY.justSaved}</Tag>}
                      </span>
                      {/* 首句只在正文**没显示**时当摘要用；正文在下面就地展开时不再重复（走查抓到的重复行）。 */}
                      {record.body === '' && (record.contexts?.length ?? 0) === 0 && <span className="wk-row-task">{record.title}</span>}
                      {record.body === '' && (record.contexts?.length ?? 0) > 0 && (
                        <span className="wk-meta">{CULTIVATION_COPY.bodyEmptyWithContext}</span>
                      )}
                      {record.work !== undefined && record.work !== '' && <span className="wk-row-task">{CULTIVATION_COPY.inboxWork(record.work)}</span>}
                      <span className="wk-meta">{recordProvenance(record, roleLabel)}</span>
                      <span className="wk-meta">
                        {stampOf(record.id) === null ? '' : CULTIVATION_COPY.inboxStamp(String(stampOf(record.id)))}
                        {(record.contexts?.length ?? 0) > 0
                          ? ''
                          : record.source === '（会话内提交）'
                            ? CULTIVATION_COPY.inboxSourceSession
                            : record.source !== '' ? `${stampOf(record.id) === null ? '' : ' · '}${CULTIVATION_COPY.inboxSourceRecorded(record.source).replace(' · ', '')}` : CULTIVATION_COPY.inboxSourceMissing}
                      </span>
                      {(record.contexts?.length ?? 0) > 0 && (() => {
                        const background = record.contexts![0]!
                        const open = expandedContexts[record.id] === true
                        const openLabel = background.kind === 'session'
                          ? CULTIVATION_COPY.contextOpenSession
                          : CULTIVATION_COPY.contextOpenFile
                        return (
                          <div className="wk-cultivation-context-card" aria-label={CULTIVATION_COPY.inboxBackgroundAria(background.title)}>
                            <div className="wk-cultivation-context-card-head">
                              <strong>{background.title}</strong>
                              <span className="wk-meta">
                                {[
                                  background.role === undefined ? '' : background.role,
                                  background.subtitle === undefined ? '' : background.subtitle,
                                  background.turn === undefined ? '' : CULTIVATION_COPY.inboxTurn(background.turn),
                                ].filter(part => part !== '').join(' · ')}
                              </span>
                            </div>
                            <div className="wk-cultivation-context-excerpt" style={{ whiteSpace: 'pre-wrap' }}>
                              {open ? background.excerpt : background.excerpt.split('\n').slice(0, 2).join('\n')}
                            </div>
                            {background.truncated === true && <div className="wk-meta">{CULTIVATION_COPY.contextClipped}</div>}
                            <div className="wk-cultivation-actions">
                              <Button size="sm" variant="ghost" aria-expanded={open}
                                onClick={() => { setExpandedContexts(previous => ({ ...previous, [record.id]: !open })) }}>
                                {open ? CULTIVATION_COPY.contextCollapse : CULTIVATION_COPY.contextExpand}
                              </Button>
                              {openContext !== undefined && (
                                <Button size="sm" variant="ghost" disabled={openingContextId === record.id}
                                  onClick={() => { void openContextOf(record.id, background) }}>
                                  {openingContextId === record.id ? CULTIVATION_COPY.contextLoading : openLabel}
                                </Button>
                              )}
                            </div>
                            {contextOutcomes[record.id] !== undefined && contextOutcomes[record.id] !== '' && (
                              <div className="wk-meta wk-cultivation-problem">{contextOutcomes[record.id]}</div>
                            )}
                          </div>
                        )
                      })()}
                      {record.bodyTruncated === true && (
                        <div className="wk-meta">{CULTIVATION_COPY.inboxBodyTruncated(record.id)}</div>
                      )}
                      {/* 判断要有材料（S4）：正文就地可见；但**长正文默认只展前几行**（场景轮实测 60 行撑出
                          1156px 行高，把后面 12 条待办顶到看不见的地方）⇒ 给明确的「展开全文（共 N 行）」。 */}
                      {record.body !== '' && (() => {
                        const lines = record.body.split('\n')
                        const clipped = lines.length > BODY_PREVIEW_LINES
                        const expanded = expandedBodies[record.id] === true
                        return (
                          <div className="wk-cultivation-body">
                            {expanded || !clipped ? record.body : `${lines.slice(0, BODY_PREVIEW_LINES).join('\n')}\n…`}
                            {clipped && (
                              <div className="wk-cultivation-actions">
                                <Button
                                  size="sm"
                                  onClick={() => { setExpandedBodies(previous => ({ ...previous, [record.id]: !expanded })) }}
                                >
                                  {expanded ? CULTIVATION_COPY.bodyCollapse : CULTIVATION_COPY.bodyExpand(lines.length)}
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {actions === undefined
                        ? (
                          <span className="wk-row-task">
                            {CULTIVATION_COPY.inboxCommand(record.id)}
                          </span>
                        )
                        : (
                          <div className="wk-cultivation-actions">
                            <Button
                              variant="primary"
                              disabled={pendingIds.has(record.id)}
                              onClick={() => { void run(record.id, adoptLine(record.id)) }}
                            >
                              {pendingIds.has(record.id) ? CULTIVATION_COPY.running : CULTIVATION_COPY.adopt}
                            </Button>
                            <Button
                              disabled={pendingIds.has(record.id)}
                              onClick={() => { setRejectingId(record.id); setReason(''); setReasonProblem(null) }}
                            >
                              {CULTIVATION_COPY.reject}
                            </Button>
                          </div>
                        )}
                      {rejectingId === record.id && (
                        <div className="wk-cultivation-reject">
                          <input
                            className="wk-cultivation-reason"
                            value={reason}
                            placeholder={CULTIVATION_COPY.rejectPlaceholder}
                            aria-label={CULTIVATION_COPY.rejectPlaceholder}
                            onChange={event => { setReason(event.target.value) }}
                            // 键盘可用（2026-10-19 场景轮 S24 抓到：此前 Escape 不取消 = 键盘用户被困在表单里）：
                            // Escape 取消（不落盘）、Enter 确认（空理由仍走既有校验）。
                            onKeyDown={event => {
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                setRejectingId(null)
                                setReasonProblem(null)
                                return
                              }
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void confirmReject(record.id)
                              }
                            }}
                          />
                          <Button
                            disabled={pendingIds.has(record.id)}
                            onClick={() => { void confirmReject(record.id) }}
                          >
                            {CULTIVATION_COPY.rejectConfirm}
                          </Button>
                          <Button onClick={() => { setRejectingId(null); setReasonProblem(null) }}>{CULTIVATION_COPY.cancel}</Button>
                          {reasonProblem !== null && <div className="wk-meta wk-cultivation-problem">{reasonProblem}</div>}
                        </div>
                      )}
                      {outcome !== undefined && (
                        <div className={outcome.ok ? 'wk-meta wk-cultivation-outcome' : 'wk-meta wk-cultivation-problem'}>
                          {outcome.text}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {capControl('inbox', inbox.needsDecision.length)}
              </>
            )}
      </div>

  )
}
