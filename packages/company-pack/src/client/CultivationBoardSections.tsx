/**
 * 培养面板的三个只读/半只读块（2026-10-28 R4-P3 自 CultivationBoard 抽出）：
 * 我提交的 · 已采纳 · journal · 赞踩。状态仍由 `useCultivationBoard` 持有，本文件只渲染。
 */
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { roleLabel, type CultivationRecord, type CultivationRow, type FeedbackItem } from '../lib/cultivation.ts'
import { CULTIVATION_COPY, revokeLine, verifyLine } from './cultivation-actions.ts'
import type { CultivationBoardState } from './use-cultivation-board.tsx'

/** 验证态 → Tag（V8：未验证 ≠ 已掌握）。 */
function verificationTag(record: CultivationRecord): { readonly tone: 'success' | 'warning' | 'outline', readonly text: string } {
  if (record.verification === 'pass') return { tone: 'success', text: '已验证' }
  if (record.verification === 'fail') return { tone: 'warning', text: '验证未通过' }
  return { tone: 'outline', text: '未验证' }
}

export function CultivationMine({ inbox }: { readonly inbox: CultivationBoardState['inbox'] }) {
  return (
    <>
      {(inbox.mine.length > 0 || inbox.processedForViewer.length > 0) && (
        <div className="wk-activity-block" aria-label="我提交的与我已处理">
          <strong>我提交的 · 我已处理</strong>
          <div className="wk-meta">等对方处理；你无需操作。</div>
          <div role="list" aria-label="提案与处理回执" className="wk-list wk-cultivation-list">
            {inbox.processedForViewer.map(record => (
              <div key={record.id} role="listitem" className="wk-row" aria-label={`已拒绝 ${record.id}`}>
                <span className="wk-row-name">
                  已拒绝 {roleLabel(record.proposerRole)} 的建议<Tag tone="outline">{record.expectation}</Tag>
                </span>
                <span className="wk-row-task">理由：{record.reason ?? '（未留）'}</span>
              </div>
            ))}
            {inbox.mine.map(record => (
              <div key={record.id} role="listitem" className="wk-row" aria-label={`我提交的 ${record.id}`}>
                <span className="wk-row-name">
                  {record.kind === 'suggestion' ? `给 ${roleLabel(record.targetRole)} 的建议` : '我的纠正'}
                  {record.status === 'open' && <Tag tone="info">待对方处理</Tag>}
                  {record.status === 'adopted' && <Tag tone="success">已采纳{record.methodSlug !== undefined ? ` → ${record.methodSlug}` : ''}</Tag>}
                  {record.status === 'rejected' && <Tag tone="warning">被拒绝</Tag>}
                </span>
                <span className="wk-row-task">
                  {record.status === 'rejected'
                    ? `理由：${record.reason ?? '（未留）'}`
                    : record.body === '' && record.contexts?.[0] !== undefined ? record.contexts[0].title : record.title}
                </span>
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
  const { inbox, actions, pendingId, revokingSlug, capList, capControl, stampOf, run, outcomeOf, setRevokingSlug } = board
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
                    {stampOf(record.id) !== null && <span className="wk-meta">{`${String(stampOf(record.id))} 提出`}</span>}
                    {!revoked && actions !== undefined && (
                      <div className="wk-cultivation-actions">
                        <Button
                          variant="primary"
                          disabled={pendingId === record.id}
                          onClick={() => { void run(record.id, verifyLine(record.id, 'pass')) }}
                        >
                          {CULTIVATION_COPY.verifyPass}
                        </Button>
                        <Button
                          disabled={pendingId === record.id}
                          onClick={() => { void run(record.id, verifyLine(record.id, 'fail')) }}
                        >
                          {CULTIVATION_COPY.verifyFail}
                        </Button>
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
