/**
 * 培养领域视图（2026-10-13 培养卡）：公司页第四子页、侧栏页签与浮窗共用的**纯展示**板——
 * 「我的分身 → 需要我处理 → 我提交的/我已处理 → 已采纳的方法 → journal 待审 → 赞踩 → 怎么养」。
 *
 * 展示纪律（卡 §7/V2/V8/V9/V10）：空态与失败态分开（不可达 ≠ 0、未验证 ≠ 已掌握）；
 * 操作指引只给人话产品命令（/cultivation 族），不出现仓库开发命令与内部门禁编号；
 * CEO 委派 child 继承 CEO 组合的边界如实写明。数据折行在 `cultivation-data.ts`。
 * keyless 判据 = `tests/client/cultivation-board.spec.ts`。
 */
import { Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import {
  recordInbox,
  roleLabel,
  type CultivationRecord,
  type CultivationRow,
  type FeedbackItem,
} from '../lib/cultivation.ts'

/** 领域视图 props（三个容器同形喂入；数据加载在各容器）。 */
export interface CultivationBoardProps {
  /** 当前会话的公司角色（viewer；null = 未选角色——提示选择，不猜身份）。 */
  readonly viewerRole: string | null
  /** viewer 的显示名（viewerRole 缺席时 null）。 */
  readonly viewerLabel: string | null
  /** 五角色 journal 待审行（null = 首读未完成；行内 reach 表达单角色不可达）。 */
  readonly journalRows: readonly CultivationRow[] | null
  /** 培养记录（null = 目录不可达或首读未完成——不折成 0 条）。 */
  readonly records: readonly CultivationRecord[] | null
  /** 本会话赞/踩（null = 事件流不可达——块内降级）。 */
  readonly feedback: readonly FeedbackItem[] | null
  /** 赞/踩块的事件流是否可达（注入缺席 = false）。 */
  readonly feedbackReachable: boolean
}

/** 一条记录的操作行文案（待办给命令、已处理给回执）。 */
function recordKindLabel(record: CultivationRecord): string {
  if (record.kind === 'suggestion') return `${roleLabel(record.proposerRole)}的建议`
  return record.proposerKind === 'agent' ? `${roleLabel(record.proposerRole)}分身的纠正` : '我的纠正'
}

/** 验证态 → Tag（V8：未验证 ≠ 已掌握）。 */
function verificationTag(record: CultivationRecord): { readonly tone: 'success' | 'warning' | 'outline', readonly text: string } {
  if (record.verification === 'pass') return { tone: 'success', text: '已验证' }
  if (record.verification === 'fail') return { tone: 'warning', text: '验证未通过' }
  return { tone: 'outline', text: '未验证' }
}

/**
 * 培养领域视图（纯展示）。
 * @param props - 见 {@link CultivationBoardProps}。
 * @returns 面板内容（容器自己套壳：公司页直接放、侧栏套 PanelFrame）。
 */
export function CultivationBoard(props: CultivationBoardProps) {
  const viewer = props.viewerRole
  const inbox = recordInbox(props.records ?? [], viewer ?? '')
  return (
    <>
      <div className="wk-activity-block" aria-label="我的分身">
        <strong>{viewer === null ? '请选择负责的角色' : `我的分身：${props.viewerLabel ?? viewer}`}</strong>
        <div className="wk-meta">
          {viewer === null
            ? '当前会话不是公司角色——用五角色之一开会话，这里就是那个角色的培养台。'
            : `培养对象 = 公司盘 × ${props.viewerLabel ?? viewer}（每个人培养自己的角色分身）。`}
        </div>
      </div>

      <div className="wk-activity-block" aria-label="需要我处理">
        <strong>需要我处理</strong>
        {props.records === null
          ? <div className="wk-meta">培养记录尚未读到（目录缺失或读取失败）——不算 0 条。</div>
          : inbox.needsDecision.length === 0
            ? <div className="wk-meta">没有给我的建议或纠正。</div>
            : (
              <div role="list" aria-label="待我处理的培养记录" className="wk-list">
                {inbox.needsDecision.map(record => (
                  <div key={record.id} role="listitem" className="wk-row" aria-label={`待处理 ${record.id}`}>
                    <span className="wk-row-name">
                      {recordKindLabel(record)}
                      <Tag tone="info">{record.expectation}</Tag>
                    </span>
                    <span className="wk-row-task">
                      {record.title}{record.source !== '（会话内提交）' ? `（出处：${record.source}）` : ''}
                      {`　采纳：/cultivation adopt ${record.id}　拒绝：/cultivation reject ${record.id} :: 理由`}
                    </span>
                  </div>
                ))}
              </div>
            )}
      </div>

      {(inbox.mine.length > 0 || inbox.processedForViewer.length > 0) && (
        <div className="wk-activity-block" aria-label="我提交的与我已处理">
          <strong>我提交的 · 我已处理</strong>
          <div role="list" aria-label="提案与处理回执" className="wk-list">
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
                <span className="wk-row-task">{record.status === 'rejected' ? `理由：${record.reason ?? '（未留）'}` : record.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="wk-activity-block" aria-label="已采纳的方法">
        <strong>已采纳的方法</strong>
        {props.records !== null && inbox.adoptedForViewer.length === 0
          ? <div className="wk-meta">我的分身还没有已采纳的方法。</div>
          : props.records !== null && (
            <div role="list" aria-label="已采纳的方法" className="wk-list">
              {inbox.adoptedForViewer.map(record => (
                <div key={record.id} role="listitem" className="wk-row" aria-label={`方法 ${record.methodSlug ?? record.id}`}>
                  <span className="wk-row-name">
                    {record.methodSlug ?? record.id}
                    {record.revokedAt !== undefined ? <Tag tone="warning">已撤回</Tag> : <Tag tone="info">已采纳</Tag>}
                    {record.revokedAt === undefined && (() => {
                      const v = verificationTag(record)
                      return <Tag tone={v.tone}>{v.text}</Tag>
                    })()}
                  </span>
                  <span className="wk-row-task">
                    {record.expectation}
                    {record.revokedAt === undefined ? '——新开的本角色会话会加载它；运行中的会话不受影响。' : '——方法已删除，新会话不再加载。'}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>

      <div className="wk-activity-block" aria-label="journal 待审">
        <strong>journal 待审素材</strong>
        {props.journalRows === null
          ? <div className="wk-meta">读取中…</div>
          : (
            <div role="list" aria-label="培养待审收件箱" className="wk-list">
              {props.journalRows.map(row => (
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
        <div className="wk-meta">各角色的 journal = 待审素材（人审后按「轮末收敛」压进 CHARTER 历史纪要）。</div>
      </div>

      <div className="wk-activity-block" aria-label="人的赞踩">
        <strong>人的赞/踩（本会话）</strong>
        {!props.feedbackReachable || props.feedback === null
          ? <div className="wk-meta">事件流不可达——赞/踩块降级（其余面板不受影响）。</div>
          : props.feedback.length === 0
            ? <div className="wk-meta">还没有赞/踩——人点 👍/👎 会实时出现在这里。</div>
            : (
              <div role="list" aria-label="赞踩清单" className="wk-list">
                {props.feedback.map(item => (
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

      <div className="wk-activity-block">
        <strong>怎么养</strong>
        <ul className="wk-activity">
          <li>给自己的角色提交纠正：在角色会话输入框敲 /cultivation correct 期望行为一句话 :: 做法与证据。</li>
          <li>给别的角色提建议：/cultivation suggest 角色 期望行为一句话 :: 建议与证据——由对方本人在它的会话里采纳。</li>
          <li>采纳一条：在目标角色的会话里敲 /cultivation adopt 记录编号——方法部署进该角色的方法层，新开的会话就会带着它开工。</li>
          <li>同类任务上见效后回填 /cultivation verify 记录编号 pass；不灵了 /cultivation revoke 方法名 撤回。</li>
          <li>分身自己也能提案（cultivation_propose 工具，署它的角色）；采纳、拒绝、撤回、验证只能由人来。</li>
          <li>CEO 委派出去的分身继承 CEO 组合——职能角色的方法不会进委派 child，要用职能方法就开那个角色的会话。</li>
        </ul>
      </div>
    </>
  )
}
