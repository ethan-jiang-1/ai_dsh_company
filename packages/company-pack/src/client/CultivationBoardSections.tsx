/**
 * 培养面板的三个只读/半只读块（2026-10-28 R4-P3 自 CultivationBoard 抽出）：
 * 我提交的 · 已采纳 · journal · 赞踩。状态仍由 `useCultivationBoard` 持有，本文件只渲染。
 */
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { useState } from 'react'
import { roleLabel, timeLabel, VERIFICATION_EVIDENCE_LIMIT, type CultivationRecord, type CultivationRow, type CultivationVerification, type FeedbackItem } from '../lib/cultivation.ts'
import { CULTIVATION_COPY, revokeLine, verifyLine } from './cultivation-actions.ts'
import type { CultivationBoardState } from './use-cultivation-board.tsx'

/** 验证态 → Tag（V8：未验证 ≠ 已掌握）。 */
function verificationTag(record: CultivationRecord): { readonly tone: 'success' | 'warning' | 'outline', readonly text: string } {
  if (record.verification === 'pass') return { tone: 'success', text: '已验证' }
  if (record.verification === 'fail') return { tone: 'warning', text: '验证未通过' }
  return { tone: 'outline', text: '未验证' }
}

const MAX_VISIBLE_VERIFICATIONS = 3

/** 自纠正 = 提出者与目标同一角色；它的决定人就是当前角色语境下的人，不是“对方”。 */
function isSelfRecord(record: CultivationRecord): boolean {
  return record.kind === 'correction' && record.proposerRole === record.targetRole
}

/** 记录类型的人话名词（拒绝回执按 kind 说，不把纠正叫成建议）。 */
function kindNoun(record: CultivationRecord): string {
  return record.kind === 'suggestion' ? '建议' : '纠正'
}

/** 观察时间用人话；原始 ISO 只放在 title 里供核对。 */
function verificationTime(entry: CultivationVerification, now: number): string {
  const at = Date.parse(entry.at)
  return Number.isNaN(at) ? entry.at : timeLabel(at, now)
}

export function CultivationMine({ inbox }: { readonly inbox: CultivationBoardState['inbox'] }) {
  return (
    <>
      {(inbox.mine.length > 0 || inbox.processedForViewer.length > 0) && (
        <div className="wk-activity-block" aria-label="我提交的与我已处理">
          <strong>我提交的 · 我已处理</strong>
          <div className="wk-meta">自己的纠正在上面「需要我处理」里待你决定；给别的角色的建议等对方处理。</div>
          <div role="list" aria-label="提案与处理回执" className="wk-list wk-cultivation-list">
            {inbox.processedForViewer.map(record => (
              <div key={record.id} role="listitem" className="wk-row" aria-label={`已拒绝 ${record.id}`}>
                <span className="wk-row-name">
                  已拒绝 {roleLabel(record.proposerRole)} 的{kindNoun(record)}<Tag tone="outline">{record.expectation}</Tag>
                  <Tag tone="warning">目标角色语境下的人已拒绝</Tag>
                </span>
                <span className="wk-row-task">理由：{record.reason ?? '（未留）'}</span>
                {record.decidedAt !== undefined && <span className="wk-meta">目标角色语境下的人拒绝 · 拒绝时间：{record.decidedAt}</span>}

              </div>
            ))}
            {inbox.mine.map(record => (
              <div key={record.id} role="listitem" className="wk-row" aria-label={`我提交的 ${record.id}`}>
                <span className="wk-row-name">
                  {record.kind === 'suggestion' ? `给 ${roleLabel(record.targetRole)} 的建议` : '我的纠正'}
                  {record.status === 'open' && <Tag tone="info">{isSelfRecord(record) ? '待我决定' : '待对方处理'}</Tag>}
                  {record.status === 'adopted' && <Tag tone="success">目标角色语境下的人已采纳{record.methodSlug !== undefined ? ` → ${record.methodSlug}` : ''}</Tag>}
                  {record.status === 'rejected' && <Tag tone="warning">目标角色语境下的人已拒绝</Tag>}
                </span>
                <span className="wk-row-task">
                  {record.status === 'rejected'
                    ? `理由：${record.reason ?? '（未留）'}`
                    : record.body === '' && record.contexts?.[0] !== undefined ? record.contexts[0].title : record.title}
                </span>
                {record.work !== undefined && record.work !== '' && <span className="wk-meta">这次工作：{record.work}</span>}
                {record.contexts?.[0] !== undefined && (
                  <span className="wk-meta">背景：{record.contexts[0].kind === 'session' ? '会话' : '成品'}「{record.contexts[0].title}」</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export function CultivationAdopted({ board, records }: { readonly board: CultivationBoardState; readonly records: readonly CultivationRecord[] | null }) {
  const { inbox, actions, pendingId, revokingSlug, capList, capControl, stampOf, now, run, outcomeOf, setRevokingSlug } = board
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
      <div className="wk-activity-block" aria-label="已采纳的方法">
        <strong>已采纳的方法</strong>
        {records !== null && inbox.adoptedForViewer.length === 0
          ? <div className="wk-meta">我的分身还没有已采纳的方法。</div>
          : records !== null && (
            <div role="list" aria-label="已采纳的方法" className="wk-list wk-cultivation-list">
              {capList('adopted', inbox.adoptedForViewer).map(record => {
                const slug = record.methodSlug ?? record.id
                const outcome = outcomeOf(record.id)
                const revoked = record.revokedAt !== undefined
                return (
                  <div key={record.id} role="listitem" className="wk-row" aria-label={`方法 ${slug}`}>
                    <span className="wk-row-name">
                      {slug}
                      {revoked ? <Tag tone="warning">已撤回</Tag> : <Tag tone="info">已采纳</Tag>}
                      {!revoked && (() => {
                        const v = verificationTag(record)
                        return <Tag tone={v.tone}>{v.text}</Tag>
                      })()}
                    </span>
                    <span className="wk-row-task">
                      {record.expectation}
                      {revoked ? '——方法已删除，本角色会话不再加载。' : '——新开的本角色会话带着它开工；已经在跑的会话也会随技能目录刷新看到它。'}
                    </span>
                    <span className="wk-meta">
                      提出者：{record.proposerKind === 'agent' ? `${roleLabel(record.proposerRole)} 分身（Agent）` : `${roleLabel(record.proposerRole)} 角色语境下的人`}；目标角色：{roleLabel(record.targetRole)}；目标角色语境下的人已采纳
                    </span>
                    {record.work !== undefined && record.work !== '' && <span className="wk-row-task">这次工作：{record.work}</span>}
                    {(record.contexts?.length ?? 0) > 0
                      ? <span className="wk-meta">原始工作依据：背景「{record.contexts![0]!.title}」</span>
                      : record.source === '（会话内提交）'
                        ? <span className="wk-meta">来源：会话内提交；具体工作出处未单独记录</span>
                        : record.source !== ''
                          ? <span className="wk-meta">原始工作依据：{record.source}</span>
                          : <span className="wk-meta">原始工作依据：来源未记录</span>}
                    {stampOf(record.id) !== null && <span className="wk-meta">提出时间：{String(stampOf(record.id))}</span>}
                    {record.decidedAt !== undefined && <span className="wk-meta">采纳时间：{record.decidedAt}</span>}
                    {record.body !== '' && (() => {
                      const expanded = expandedEvidence[record.id] === true
                      return (
                        <div className="wk-cultivation-body">
                          {expanded || record.body.length <= 360 ? record.body : `${record.body.slice(0, 360)}…`}
                          {record.body.length > 360 && <Button size="sm" onClick={() => { setExpandedEvidence(previous => ({ ...previous, [record.id]: !expanded })) }}>{expanded ? '收起原始依据' : '展开原始依据'}</Button>}
                        </div>
                      )
                    })()}
                    {record.bodyTruncated === true && <span className="wk-meta">原始依据只加载了摘要，可能不完整；完整原文在培养记录文件中。</span>}
                    {record.verificationHistoryProblem !== null && record.verificationHistoryProblem !== undefined && <span className="wk-meta wk-cultivation-problem">{record.verificationHistoryProblem}</span>}
                    {record.verification !== undefined && (record.verificationHistory?.length ?? 0) === 0 && record.verificationHistoryProblem == null && <span className="wk-meta">历史验证结果已保存，但后续工作依据未记录；方法仍已采纳。</span>}
                    {(record.verificationHistory?.length ?? 0) > 0 && (() => {
                      const history = record.verificationHistory ?? []
                      const expanded = expandedEvidence[`history:${record.id}`] === true
                      const visible = expanded ? history : history.slice(-MAX_VISIBLE_VERIFICATIONS)
                      return (
                        <div className="wk-cultivation-verification-history" aria-label="后续工作观察历史">
                          <span className="wk-meta">后续相似工作观察：{String(history.length)} 条</span>
                          {visible.map((entry, index) => (
                            <div key={`${entry.at}:${index}`} className="wk-cultivation-observation">
                              <div className="wk-cultivation-observation-head">
                                <Tag tone={entry.outcome === 'pass' ? 'success' : 'warning'}>{entry.outcome === 'pass' ? '有用' : '没起作用'}</Tag>
                                <span className="wk-meta" title={entry.at}>{verificationTime(entry, now)}</span>
                              </div>
                              <div className="wk-cultivation-observation-evidence">{entry.evidence}</div>
                            </div>
                          ))}
                          {!expanded && history.length > MAX_VISIBLE_VERIFICATIONS && (
                            <div className="wk-cultivation-actions">
                              <Button size="sm" onClick={() => { setExpandedEvidence(previous => ({ ...previous, [`history:${record.id}`]: true })) }}>查看全部 {String(history.length)} 条观察</Button>
                            </div>
                          )}
                          {expanded && history.length > MAX_VISIBLE_VERIFICATIONS && (
                            <div className="wk-cultivation-actions">
                              <Button size="sm" onClick={() => { setExpandedEvidence(previous => ({ ...previous, [`history:${record.id}`]: false })) }}>只看最近 {String(MAX_VISIBLE_VERIFICATIONS)} 条</Button>
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
                                <Button variant="primary" disabled={pendingId === record.id} onClick={() => { confirmVerification(record.id) }}>
                                  {verificationOutcome === 'pass' ? CULTIVATION_COPY.verifyPassConfirm : CULTIVATION_COPY.verifyFailConfirm}
                                </Button>
                                <Button disabled={pendingId === record.id} onClick={() => { setVerifyingId(null); setVerificationEvidence(''); setVerificationProblem(null) }}>{CULTIVATION_COPY.cancel}</Button>
                              </div>
                            </div>
                          )
                          : (
                            <>
                              <Button variant="primary" disabled={pendingId === record.id} onClick={() => { startVerification(record.id, 'pass') }}>{CULTIVATION_COPY.verifyPass}</Button>
                              <Button disabled={pendingId === record.id} onClick={() => { startVerification(record.id, 'fail') }}>{CULTIVATION_COPY.verifyFail}</Button>
                            </>
                          )}
                        {revokingSlug === slug
                          ? (
                            <div className="wk-cultivation-confirm">
                              {/* 先读后点：后果独占一行、在确认按钮之前（走查抓到的"警告夹在按钮中间"）。 */}
                              <div className="wk-meta wk-cultivation-consequence">{CULTIVATION_COPY.revokeConsequence}</div>
                              <div className="wk-cultivation-actions">
                                <Button
                                  disabled={pendingId === record.id}
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
      <div className="wk-activity-block" aria-label="journal 素材">
        <strong>journal 素材（不用你操作）</strong>
        {rows === null
          ? <div className="wk-meta">读取中…</div>
          : (
            <div role="list" aria-label="培养待审收件箱" className="wk-list">
              {rows.map(row => (
                <div key={row.role} role="listitem" className="wk-row" aria-label={`${row.label} 待审 ${String(row.count)} 条`}>
                  <span className="wk-row-name">
                    {row.label}
                    {row.reach === 'unreachable'
                      ? <Tag tone="warning">目录不可达</Tag>
                      : row.count > 0
                        ? <Tag tone={row.count > 5 ? 'warning' : 'info'}>{`${String(row.count)} 待审`}</Tag>
                        : <Tag tone="outline">无待审</Tag>}
                  </span>
                  <span className="wk-row-task">
                    {row.reach === 'unreachable'
                      ? '—'
                      : row.entries.length === 0
                        ? '—'
                        : row.entries.map(entry => entry.title).join('；')}
                    {row.reach === 'ok' && row.count > row.entries.length ? ` …（共 ${String(row.count)} 条）` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        <div className="wk-meta">
          各角色的 journal = 角色自己攒的素材：轮末收敛时由该角色的驾驭者压进 CHARTER 历史纪要，**这里不用你操作**。
        </div>
      </div>
  )
}

export function CultivationFeedback({ feedback, reachable }: { readonly feedback: readonly FeedbackItem[] | null; readonly reachable: boolean }) {
  return (
      <div className="wk-activity-block" aria-label="人的赞踩">
        <strong>人的赞/踩（本会话）</strong>
        {!reachable || feedback === null
          ? <div className="wk-meta">事件流不可达——赞/踩块降级（其余面板不受影响）。</div>
          : feedback.length === 0
            ? <div className="wk-meta">还没有赞/踩——人点 👍/👎 会实时出现在这里。</div>
            : (
              <div role="list" aria-label="赞踩清单" className="wk-list">
                {feedback.map(item => (
                  <div key={item.messageId} role="listitem" className="wk-row" aria-label={item.rating === 'positive' ? '赞' : '踩'}>
                    <span className="wk-row-name">
                      {item.rating === 'positive' ? '👍 赞' : '👎 踩'}
                      {item.note !== undefined && item.note !== '' ? `：${item.note}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
      </div>
  )
}
