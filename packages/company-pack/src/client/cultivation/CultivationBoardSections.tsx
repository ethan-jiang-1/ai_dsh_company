/**
 * 培养面板的三个只读/半只读块（2026-10-28 R4-P3 自 CultivationBoard 抽出）：
 * 我提交的 · 已采纳 · journal · 赞踩。状态仍由 `useCultivationBoard` 持有，本文件只渲染。
 */
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { useState } from 'react'
import { roleLabel as defaultRoleLabel, timeLabel, VERIFICATION_EVIDENCE_LIMIT, type CultivationRecord, type CultivationRow, type CultivationVerification, type FeedbackItem } from '../../lib/cultivation.ts'
import { CULTIVATION_COPY, revokeLine, verifyLine } from './cultivation-actions.ts'
import type { CultivationBoardState } from './use-cultivation-board.tsx'

/** 验证态 → Tag（V8：未验证 ≠ 已掌握）。 */
function verificationTag(record: CultivationRecord): { readonly tone: 'success' | 'warning' | 'outline', readonly text: string } {
  if (record.verification === 'pass') return { tone: 'success', text: CULTIVATION_COPY.adoptedVerified }
  if (record.verification === 'fail') return { tone: 'warning', text: CULTIVATION_COPY.adoptedVerificationFailed }
  return { tone: 'outline', text: CULTIVATION_COPY.adoptedUnverified }
}

const MAX_VISIBLE_VERIFICATIONS = 3

/** 自纠正 = 提出者与目标同一角色；它的决定人就是当前角色语境下的人，不是“对方”。 */
function isSelfRecord(record: CultivationRecord): boolean {
  return record.kind === 'correction' && record.proposerRole === record.targetRole
}

/** 记录类型的人话名词（拒绝回执按 kind 说，不把纠正叫成建议）。 */
function kindNoun(record: CultivationRecord): string {
  return record.kind === 'suggestion' ? CULTIVATION_COPY.mineKindSuggestion : CULTIVATION_COPY.mineKindCorrection
}

/** 观察时间用人话；原始 ISO 只放在 title 里供核对。 */
function verificationTime(entry: CultivationVerification, now: number): string {
  const at = Date.parse(entry.at)
  return Number.isNaN(at) ? entry.at : timeLabel(at, now)
}

export function CultivationMine({ inbox, roleLabel = defaultRoleLabel }: { readonly inbox: CultivationBoardState['inbox']; readonly roleLabel?: (role: string) => string }) {
  return (
    <>
      {(inbox.mine.length > 0 || inbox.processedForViewer.length > 0) && (
        <div className="wk-activity-block" aria-label={CULTIVATION_COPY.mineAria}>
          <strong>{CULTIVATION_COPY.mineTitle}</strong>
          <div className="wk-meta">{CULTIVATION_COPY.mineSub}</div>
          <div role="list" aria-label={CULTIVATION_COPY.mineListAria} className="wk-list wk-cultivation-list">
            {inbox.processedForViewer.map(record => (
              <div key={record.id} role="listitem" className="wk-row" aria-label={CULTIVATION_COPY.mineRejectedAria(record.id)}>
                <span className="wk-row-name">
                  {CULTIVATION_COPY.mineRejectedLine(roleLabel(record.proposerRole), kindNoun(record))}<Tag tone="outline">{record.expectation}</Tag>
                  <Tag tone="warning">{CULTIVATION_COPY.mineRejectedByTarget}</Tag>
                </span>
                <span className="wk-row-task">{CULTIVATION_COPY.mineReason(record.reason ?? CULTIVATION_COPY.inboxNoReason)}</span>
                {record.decidedAt !== undefined && <span className="wk-meta">{CULTIVATION_COPY.mineRejectedAt(record.decidedAt)}</span>}

              </div>
            ))}
            {inbox.mine.map(record => (
              <div key={record.id} role="listitem" className="wk-row" aria-label={CULTIVATION_COPY.mineRowAria(record.id)}>
                <span className="wk-row-name">
                  {record.kind === 'suggestion' ? CULTIVATION_COPY.mineSuggestionFor(roleLabel(record.targetRole)) : CULTIVATION_COPY.mineMyCorrection}
                  {record.status === 'open' && <Tag tone="info">{isSelfRecord(record) ? CULTIVATION_COPY.minePendingMe : CULTIVATION_COPY.minePendingOther}</Tag>}
                  {record.status === 'adopted' && <Tag tone="success">{CULTIVATION_COPY.mineAdoptedByTarget(record.methodSlug)}</Tag>}
                  {record.status === 'rejected' && <Tag tone="warning">{CULTIVATION_COPY.mineRejectedByTarget}</Tag>}
                </span>
                <span className="wk-row-task">
                  {record.status === 'rejected'
                    ? CULTIVATION_COPY.mineReason(record.reason ?? CULTIVATION_COPY.inboxNoReason)
                    : record.body === '' && record.contexts?.[0] !== undefined ? record.contexts[0].title : record.title}
                </span>
                {record.work !== undefined && record.work !== '' && <span className="wk-meta">{CULTIVATION_COPY.mineWork(record.work)}</span>}
                {record.contexts?.[0] !== undefined && (
                  <span className="wk-meta">{CULTIVATION_COPY.mineBackground(record.contexts[0].kind === 'session' ? CULTIVATION_COPY.mineContextSession : CULTIVATION_COPY.mineContextDeliverable, record.contexts[0].title)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export function CultivationAdopted({ board, records, roleLabel = defaultRoleLabel }: { readonly board: CultivationBoardState; readonly records: readonly CultivationRecord[] | null; readonly roleLabel?: (role: string) => string }) {
  const { inbox, actions, pendingIds, revokingSlug, capList, capControl, stampOf, now, run, outcomeOf, setRevokingSlug } = board
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [verificationOutcome, setVerificationOutcome] = useState<'pass' | 'fail'>('pass')
  const [verificationEvidence, setVerificationEvidence] = useState('')
  const [verificationProblem, setVerificationProblem] = useState<string | null>(null)
  const [expandedEvidence, setExpandedEvidence] = useState<Readonly<Record<string, boolean>>>({})
  const startVerification = (recordId: string, outcome: 'pass' | 'fail'): void => {
    setVerifyingId(recordId)
    setVerificationOutcome(outcome)
    setVerificationEvidence('')
    setVerificationProblem(null)
  }
  const confirmVerification = (recordId: string): void => {
    const evidence = verificationEvidence.trim()
    if (evidence === '') {
      setVerificationProblem(CULTIVATION_COPY.verificationEvidenceRequired)
      return
    }
    void run(recordId, verifyLine(recordId, verificationOutcome, evidence), () => {
      setVerifyingId(null)
      setVerificationEvidence('')
      setVerificationProblem(null)
    })
  }
  return (
      <div className="wk-activity-block" aria-label={CULTIVATION_COPY.adoptedAria}>
        <strong>{CULTIVATION_COPY.adoptedTitle}</strong>
        {records !== null && inbox.adoptedForViewer.length === 0
          ? <div className="wk-meta">{CULTIVATION_COPY.adoptedEmpty}</div>
          : records !== null && (
            <div role="list" aria-label={CULTIVATION_COPY.adoptedAria} className="wk-list wk-cultivation-list">
              {capList('adopted', inbox.adoptedForViewer).map(record => {
                const slug = record.methodSlug ?? record.id
                const outcome = outcomeOf(record.id)
                const revoked = record.revokedAt !== undefined
                return (
                  <div key={record.id} role="listitem" className="wk-row" aria-label={CULTIVATION_COPY.adoptedRowAria(slug)}>
                    <span className="wk-row-name">
                      {slug}
                      {revoked ? <Tag tone="warning">{CULTIVATION_COPY.adoptedRevoked}</Tag> : <Tag tone="info">{CULTIVATION_COPY.adoptedBadge}</Tag>}
                      {!revoked && (() => {
                        const v = verificationTag(record)
                        return <Tag tone={v.tone}>{v.text}</Tag>
                      })()}
                    </span>
                    <span className="wk-row-task">
                      {record.expectation}
                      {revoked ? CULTIVATION_COPY.adoptedRevokedSuffix : CULTIVATION_COPY.adoptedActiveSuffix}
                    </span>
                    <span className="wk-meta">
                      {CULTIVATION_COPY.adoptedProvenance(record.proposerKind === 'agent' ? CULTIVATION_COPY.adoptedProposerAgent(roleLabel(record.proposerRole)) : CULTIVATION_COPY.adoptedProposerHuman(roleLabel(record.proposerRole)), roleLabel(record.targetRole))}
                    </span>
                    {record.work !== undefined && record.work !== '' && <span className="wk-row-task">{CULTIVATION_COPY.adoptedWork(record.work)}</span>}
                    {(record.contexts?.length ?? 0) > 0
                      ? <span className="wk-meta">{CULTIVATION_COPY.adoptedBasisContext(record.contexts![0]!.title)}</span>
                      : record.source === '（会话内提交）'
                        ? <span className="wk-meta">{CULTIVATION_COPY.adoptedSourceSession}</span>
                        : record.source !== ''
                          ? <span className="wk-meta">{CULTIVATION_COPY.adoptedSourceRecorded(record.source)}</span>
                          : <span className="wk-meta">{CULTIVATION_COPY.adoptedSourceMissing}</span>}
                    {stampOf(record.id) !== null && <span className="wk-meta">{CULTIVATION_COPY.adoptedRaisedAt(String(stampOf(record.id)))}</span>}
                    {record.decidedAt !== undefined && <span className="wk-meta">{CULTIVATION_COPY.adoptedDecidedAt(record.decidedAt)}</span>}
                    {record.body !== '' && (() => {
                      const expanded = expandedEvidence[record.id] === true
                      return (
                        <div className="wk-cultivation-body">
                          {expanded || record.body.length <= 360 ? record.body : `${record.body.slice(0, 360)}…`}
                          {record.body.length > 360 && <Button size="sm" onClick={() => { setExpandedEvidence(previous => ({ ...previous, [record.id]: !expanded })) }}>{expanded ? CULTIVATION_COPY.adoptedCollapseEvidence : CULTIVATION_COPY.adoptedExpandEvidence}</Button>}
                        </div>
                      )
                    })()}
                    {record.bodyTruncated === true && <span className="wk-meta">{CULTIVATION_COPY.adoptedEvidenceTruncated}</span>}
                    {record.verificationHistoryProblem !== null && record.verificationHistoryProblem !== undefined && <span className="wk-meta wk-cultivation-problem">{record.verificationHistoryProblem}</span>}
                    {record.verification !== undefined && (record.verificationHistory?.length ?? 0) === 0 && record.verificationHistoryProblem == null && <span className="wk-meta">{CULTIVATION_COPY.adoptedHistoryNotRecorded}</span>}
                    {(record.verificationHistory?.length ?? 0) > 0 && (() => {
                      const history = record.verificationHistory ?? []
                      const expanded = expandedEvidence[`history:${record.id}`] === true
                      const visible = expanded ? history : history.slice(-MAX_VISIBLE_VERIFICATIONS)
                      return (
                        <div className="wk-cultivation-verification-history" aria-label={CULTIVATION_COPY.adoptedHistoryAria}>
                          <span className="wk-meta">{CULTIVATION_COPY.adoptedHistoryCount(history.length)}</span>
                          {visible.map((entry, index) => (
                            <div key={`${entry.at}:${index}`} className="wk-cultivation-observation">
                              <div className="wk-cultivation-observation-head">
                                <Tag tone={entry.outcome === 'pass' ? 'success' : 'warning'}>{entry.outcome === 'pass' ? CULTIVATION_COPY.adoptedPass : CULTIVATION_COPY.adoptedFail}</Tag>
                                <span className="wk-meta" title={entry.at}>{verificationTime(entry, now)}</span>
                              </div>
                              <div className="wk-cultivation-observation-evidence">{entry.evidence}</div>
                            </div>
                          ))}
                          {!expanded && history.length > MAX_VISIBLE_VERIFICATIONS && (
                            <div className="wk-cultivation-actions">
                              <Button size="sm" onClick={() => { setExpandedEvidence(previous => ({ ...previous, [`history:${record.id}`]: true })) }}>{CULTIVATION_COPY.adoptedShowAll(history.length)}</Button>
                            </div>
                          )}
                          {expanded && history.length > MAX_VISIBLE_VERIFICATIONS && (
                            <div className="wk-cultivation-actions">
                              <Button size="sm" onClick={() => { setExpandedEvidence(previous => ({ ...previous, [`history:${record.id}`]: false })) }}>{CULTIVATION_COPY.adoptedShowRecent(MAX_VISIBLE_VERIFICATIONS)}</Button>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {!revoked && actions !== undefined && (
                      <div className="wk-cultivation-actions">
                        {verifyingId === record.id
                          ? (
                            <div className="wk-cultivation-verification-form">
                              <label className="wk-cultivation-field">
                                <span className="wk-meta">{CULTIVATION_COPY.verificationEvidenceLabel}</span>
                                <textarea
                                  className="wk-cultivation-body-input"
                                  rows={3}
                                  maxLength={VERIFICATION_EVIDENCE_LIMIT}
                                  value={verificationEvidence}
                                  placeholder={CULTIVATION_COPY.verificationEvidencePlaceholder}
                                  onChange={event => { setVerificationEvidence(event.target.value); setVerificationProblem(null) }}
                                />
                              </label>
                              <span className="wk-meta">{CULTIVATION_COPY.verificationEvidenceHint}</span>
                              {verificationProblem !== null && <span className="wk-meta wk-cultivation-problem">{verificationProblem}</span>}
                              <div className="wk-cultivation-actions">
                                <Button variant="primary" disabled={pendingIds.has(record.id)} onClick={() => { confirmVerification(record.id) }}>
                                  {verificationOutcome === 'pass' ? CULTIVATION_COPY.verifyPassConfirm : CULTIVATION_COPY.verifyFailConfirm}
                                </Button>
                                <Button disabled={pendingIds.has(record.id)} onClick={() => { setVerifyingId(null); setVerificationEvidence(''); setVerificationProblem(null) }}>{CULTIVATION_COPY.cancel}</Button>
                              </div>
                            </div>
                          )
                          : (
                            <>
                              <Button variant="primary" disabled={pendingIds.has(record.id)} onClick={() => { startVerification(record.id, 'pass') }}>{CULTIVATION_COPY.verifyPass}</Button>
                              <Button disabled={pendingIds.has(record.id)} onClick={() => { startVerification(record.id, 'fail') }}>{CULTIVATION_COPY.verifyFail}</Button>
                            </>
                          )}
                        {revokingSlug === slug
                          ? (
                            <div className="wk-cultivation-confirm">
                              {/* 先读后点：后果独占一行、在确认按钮之前（走查抓到的"警告夹在按钮中间"）。 */}
                              <div className="wk-meta wk-cultivation-consequence">{CULTIVATION_COPY.revokeConsequence}</div>
                              <div className="wk-cultivation-actions">
                                <Button
                                  disabled={pendingIds.has(record.id)}
                                  onClick={() => { void run(record.id, revokeLine(slug), () => { setRevokingSlug(null) }) }}
                                >
                                  {CULTIVATION_COPY.revokeConfirm}
                                </Button>
                                <Button onClick={() => { setRevokingSlug(null) }}>{CULTIVATION_COPY.cancel}</Button>
                              </div>
                            </div>
                          )
                          : <Button onClick={() => { setRevokingSlug(slug) }}>{CULTIVATION_COPY.revoke}</Button>}
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
          )}
            {capControl('adopted', inbox.adoptedForViewer.length)}
      </div>
  )
}

export function CultivationJournal({ rows }: { readonly rows: readonly CultivationRow[] | null }) {
  return (
      <div className="wk-activity-block" aria-label={CULTIVATION_COPY.journalAria}>
        <strong>{CULTIVATION_COPY.journalTitle}</strong>
        {rows === null
          ? <div className="wk-meta">{CULTIVATION_COPY.journalLoading}</div>
          : (
            <div role="list" aria-label={CULTIVATION_COPY.journalListAria} className="wk-list">
              {rows.map(row => (
                <div key={row.role} role="listitem" className="wk-row" aria-label={CULTIVATION_COPY.journalRowAria(row.label, row.count)}>
                  <span className="wk-row-name">
                    {row.label}
                    {row.reach === 'unreachable'
                      ? <Tag tone="warning">{CULTIVATION_COPY.journalUnreachable}</Tag>
                      : row.count > 0
                        ? <Tag tone={row.count > 5 ? 'warning' : 'info'}>{CULTIVATION_COPY.journalPending(row.count)}</Tag>
                        : <Tag tone="outline">{CULTIVATION_COPY.journalNone}</Tag>}
                  </span>
                  <span className="wk-row-task">
                    {row.reach === 'unreachable'
                      ? '—'
                      : row.entries.length === 0
                        ? '—'
                        : row.entries.map(entry => entry.title).join('；')}
                    {row.reach === 'ok' && row.count > row.entries.length ? CULTIVATION_COPY.journalMore(row.count) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        <div className="wk-meta">
          {CULTIVATION_COPY.journalNote}
        </div>
      </div>
  )
}

export function CultivationFeedback({ feedback, reachable }: { readonly feedback: readonly FeedbackItem[] | null; readonly reachable: boolean }) {
  return (
      <div className="wk-activity-block" aria-label={CULTIVATION_COPY.feedbackAria}>
        <strong>{CULTIVATION_COPY.feedbackTitle}</strong>
        {!reachable || feedback === null
          ? <div className="wk-meta">{CULTIVATION_COPY.feedbackUnreachable}</div>
          : feedback.length === 0
            ? <div className="wk-meta">{CULTIVATION_COPY.feedbackEmpty}</div>
            : (
              <div role="list" aria-label={CULTIVATION_COPY.feedbackListAria} className="wk-list">
                {feedback.map(item => (
                  <div key={item.messageId} role="listitem" className="wk-row" aria-label={item.rating === 'positive' ? CULTIVATION_COPY.feedbackPositive : CULTIVATION_COPY.feedbackNegative}>
                    <span className="wk-row-name">
                      {item.rating === 'positive' ? CULTIVATION_COPY.feedbackPositive : CULTIVATION_COPY.feedbackNegative}
                      {item.note !== undefined && item.note !== '' ? `：${item.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
      </div>
  )
}
