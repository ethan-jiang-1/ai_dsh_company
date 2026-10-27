/**
 * 培养领域视图（2026-10-13 培养卡；2026-10-17 GUI 行动面 S2–S5 重写）：公司页第四子页、
 * 侧栏页签与浮窗共用的**单一控制台**——人给分身的外部输入都在这一个面上完成：
 *
 *   创作入口（纠正 / 建议）→ 需要我处理（就地把手）→ 已采纳的方法（有用 / 没用 / 撤回）→
 *   素材（不用你操作）→ 我提交的（等对方处理）→ 人的赞 / 踩 → 熟手命令行（折叠）
 *
 * 纪律（UX 卡判据 ①②③）：
 * - **看到却不知道去哪操作**的条目不许存在：要么就地有把手，要么明写"不用你操作 / 等谁处理"；
 * - 文案一律取 `CULTIVATION_COPY`（迭代改文案不动逻辑）；组件不发命令，只调 `actions.run`（永不抛）；
 * - `actions` 缺席 = 只读降级（照旧给命令原文，不给死按钮）；viewer 角色与目标不符不出按钮
 *   ——客户端隐藏只是 UX，**真闸在 host**；
 * - 撤回 = 唯一破坏性动作：先讲后果（删方法 + 记录不能再被采纳）再确认；
 * - 空态与失败态分开（不可达 ≠ 0 条；未验证 ≠ 已掌握）。
 *
 * 数据折行在 `cultivation-data.ts`；keyless 判据 = `tests/client/cultivation-board.spec.ts`（静态渲染）
 * 与 `tests/client/cultivation-board-actions.spec.ts`（交互：点了发什么线、失败怎么显示）。
 */
import { Tag, Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { useRef, useState, type ReactNode } from 'react'
import {
  CULTIVATION_ROLES,
  recordInbox,
  recordStampOf,
  roleLabel,
  timeLabel,
  type CultivationRecord,
  type CultivationRow,
  type FeedbackItem,
} from '../lib/cultivation.ts'
import {
  CULTIVATION_COPY,
  adoptLine,
  rejectLine,
  renderThrown,
  revokeLine,
  verifyLine,
  type ActionOutcome,
  type CultivationActions,
} from './cultivation-actions.ts'
import { CultivationCompose } from './CultivationCompose.tsx'
import type { CultivationContextSources } from './cultivation-context-data.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'

/** 正文折叠阈值：超过这么多行就先只展前几行（长正文不该把别的待办顶走）。 */
const BODY_PREVIEW_LINES = 4

/** 三个列表的默认可见条数（超过就给「显示全部（共 N 条）」）——300 条一屏滚 = 能用但不好用。 */
const LIST_CAPS = { inbox: 10, mine: 5, adopted: 5 } as const

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
  /** 读不动的记录文件名；空 = 全部可读。 */
  readonly brokenRecords?: readonly string[] | undefined
  /** 只读了摘要、未读全文的旧记录数。 */
  readonly unexpandedRecords?: number | undefined
  /** 本会话赞/踩（null = 事件流不可达——块内降级）。 */
  readonly feedback: readonly FeedbackItem[] | null
  /** 赞/踩块的事件流是否可达（注入缺席 = false）。 */
  readonly feedbackReachable: boolean
  /** 人侧动作面（缺席 = 只读降级：给命令原文，不给死按钮）。 */
  readonly actions?: CultivationActions | undefined
  /** 动作成功后重读数据（容器喂 `refresh`）。 */
  readonly onRefresh?: (() => void) | undefined
  /** 背景源（缺席 = 创作表单不显示背景区；旧行为不变）。 */
  readonly contextSources?: CultivationContextSources | undefined
  /** 当前会话 id（默认带“本次会话最近一轮”）。 */
  readonly currentSessionId?: string | undefined
  /** 当前会话是 teammate 子会话（D2=A：界面明说按 Lead 记账）。 */
  readonly teammate?: boolean | undefined
  /** 打开背景原文：容器做可达性预检与导航；失败给可读原因（不出现死按钮）。 */
  readonly openContext?: ((context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false, readonly problem: string }>) | undefined
}

/** 一条记录的操作行文案（待办给命令、已处理给回执）——**只在没有动作面时**当降级文案用。 */
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
 * 培养领域视图。
 * @param props - 见 {@link CultivationBoardProps}。
 * @returns 面板内容（容器自己套壳：公司页直接放、侧栏套 PanelFrame）。
 */
export function CultivationBoard(props: CultivationBoardProps) {
  // 会话 preset 不在五角色名册（Standard / PTC / 自建 mode）⇒ 与"未选角色"同处理：
  // 否则面板会把它**当成一个角色**（实测显示"我的分身：ptc"、还开创作入口——提了也会被 host 拒）。
  const viewer = props.viewerRole !== null && (CULTIVATION_ROLES as readonly string[]).includes(props.viewerRole)
    ? props.viewerRole
    : null
  const actions = props.actions
  const inbox = recordInbox(props.records ?? [], viewer ?? '')
  /** 正在执行的记录 id（飞行中禁按钮，防重复点击）。 */
  const [pendingId, setPendingId] = useState<string | null>(null)
  /** 每条记录的回执/失败原话（key = 记录 id；不吞失败原因）。 */
  const [outcomes, setOutcomes] = useState<Readonly<Record<string, ActionOutcome>>>({})
  /** 正在写理由的记录 id。 */
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  /** 每条记录背景卡的展开状态（每个记录独立）。 */
  const [expandedContexts, setExpandedContexts] = useState<Readonly<Record<string, boolean>>>({})
  /** 背景原文打开中的记录 id / 失败原话。 */
  const [openingContextId, setOpeningContextId] = useState<string | null>(null)
  const [contextOutcomes, setContextOutcomes] = useState<Readonly<Record<string, string>>>({})

  const openContextOf = async (recordId: string, context: CultivationContext): Promise<void> => {
    if (props.openContext === undefined) return
    setOpeningContextId(recordId)
    setContextOutcomes(previous => ({ ...previous, [recordId]: '' }))
    const result = await props.openContext(context)
    setOpeningContextId(null)
    if (!result.ok) setContextOutcomes(previous => ({ ...previous, [recordId]: result.problem }))
  }
  const [reason, setReason] = useState('')
  const [reasonProblem, setReasonProblem] = useState<string | null>(null)
  /** 正在确认撤回的方法 slug（两步：先讲后果再确认）。 */
  const [revokingSlug, setRevokingSlug] = useState<string | null>(null)
  /** 刚创作提交、待高亮的记录 id。 */
  const [highlightId, setHighlightId] = useState<string | null>(null)
  /** 哪些列表被展开（默认按 {@link LIST_CAPS} 截断）。 */
  const [expandedLists, setExpandedLists] = useState<Readonly<Record<string, boolean>>>({})
  /** 哪些记录的长正文被展开（默认折叠前 {@link BODY_PREVIEW_LINES} 行）。 */
  const [expandedBodies, setExpandedBodies] = useState<Readonly<Record<string, boolean>>>({})
  /** 同一行**在飞的**动作 key（双击护栏：`disabled` 要等重渲染，同一 tick 的第二次点击挡不住）。 */
  const inFlight = useRef<string | null>(null)
  /** 时间标签的锚点：挂载时取一次（轮询重渲染不跳动；跨小时误差可接受，30s 轮询会带新 now）。 */
  const now = Date.now()
  /**
   * 列表折叠：默认只给最近的 `LIST_CAPS[key]` 条，超出部分用「显示全部（共 N 条）」打开。
   * 全展开的开关是**每块独立**的（用户可能只想展开已采纳那份）。
   */
  const capList = <T,>(key: keyof typeof LIST_CAPS, list: readonly T[]): readonly T[] =>
    expandedLists[key] === true ? list : list.slice(0, LIST_CAPS[key])
  /** 折叠控件的渲染（未超阈值就不给）。 */
  const capControl = (key: keyof typeof LIST_CAPS, total: number): ReactNode =>
    total <= LIST_CAPS[key]
      ? null
      : (
        <div className="wk-cultivation-actions">
          <Button size="sm" onClick={() => { setExpandedLists(previous => ({ ...previous, [key]: previous[key] !== true })) }}>
            {expandedLists[key] === true ? CULTIVATION_COPY.listShowLess : CULTIVATION_COPY.listShowAll(total)}
          </Button>
        </div>
      )
  /** 记录的时间标签（id 形状不符给 null——不猜）。 */
  const stampOf = (id: string): string | null => {
    const at = recordStampOf(id)
    return at === null ? null : timeLabel(at, now)
  }

  const run = async (key: string, line: string, after?: () => void): Promise<void> => {
    if (actions === undefined) return
    // 双击护栏（探索方向③）：同一行已在飞时忽略后续点击——否则同一 tick 的两次点击会发两条命令。
    if (inFlight.current === key) return
    inFlight.current = key
    setPendingId(key)
    setReasonProblem(null)
    let result: ActionOutcome
    try {
      result = await actions.run(line)
    } catch (error) {
      // 契约上 `run` 永不抛；真抛了**也必须**把 pending 收回来——否则按钮永久停在「处理中…」，
      // 人连重试入口都没有（BUG-024：间歇复现的正是这条路径）。
      result = { ok: false, text: CULTIVATION_COPY.unexpected(renderThrown(error)) }
    } finally {
      inFlight.current = null
      setPendingId(null)
    }
    setOutcomes(previous => ({ ...previous, [key]: result }))
    if (result.ok) {
      after?.()
      props.onRefresh?.()
    }
  }

  const confirmReject = async (id: string): Promise<void> => {
    const draft = rejectLine(id, reason)
    if (!draft.ok) {
      setReasonProblem(draft.problem.message)
      return
    }
    await run(id, draft.line, () => { setRejectingId(null); setReason('') })
  }

  const outcomeOf = (id: string): ActionOutcome | undefined => outcomes[id]

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

      {viewer !== null && actions !== undefined && (
        <CultivationCompose
          viewerRole={viewer}
          actions={actions}
          onRefresh={props.onRefresh}
          onSubmitted={setHighlightId}
          sources={props.contextSources}
          currentSessionId={props.currentSessionId}
          teammate={props.teammate}
        />
      )}

      <div className="wk-activity-block" aria-label="需要我处理">
        <strong>需要我处理</strong>
        {(props.brokenRecords ?? []).length > 0 && (
          <div className="wk-meta">
            {String(props.brokenRecords!.length)} 条记录读不动（文件仍在，未被当成 0 条）：{(props.brokenRecords ?? []).join('、')}
          </div>
        )}
        {(props.unexpandedRecords ?? 0) > 0 && (
          <div className="wk-meta">
            还有 {String(props.unexpandedRecords)} 条旧记录只读了摘要（未展开全文）；用 /cultivation archive &lt;天数&gt; 归档后重新加载。
          </div>
        )}
        {props.records === null
          ? <div className="wk-meta">培养记录尚未读到（目录缺失或读取失败）——不算 0 条。</div>
          : inbox.needsDecision.length === 0
            ? <div className="wk-meta">没有给我的建议或纠正。</div>
            : (
              <>
              <div role="list" aria-label="待我处理的培养记录" className="wk-list wk-cultivation-list">
                {capList('inbox', inbox.needsDecision).map(record => {
                  const outcome = outcomeOf(record.id)
                  return (
                    <div key={record.id} role="listitem" className="wk-row" aria-label={`待处理 ${record.id}`}>
                      <span className="wk-row-name">
                        {recordKindLabel(record)}
                        <Tag tone="info">{record.expectation}</Tag>
                        {highlightId === record.id && <Tag tone="success">{CULTIVATION_COPY.justSaved}</Tag>}
                      </span>
                      {/* 首句只在正文**没显示**时当摘要用；正文在下面就地展开时不再重复（走查抓到的重复行）。 */}
                      {record.body === '' && (record.contexts?.length ?? 0) === 0 && <span className="wk-row-task">{record.title}</span>}
                      {record.body === '' && (record.contexts?.length ?? 0) > 0 && (
                        <span className="wk-meta">{CULTIVATION_COPY.bodyEmptyWithContext}</span>
                      )}
                      <span className="wk-meta">
                        {stampOf(record.id) === null ? '' : `${String(stampOf(record.id))} 提出`}
                        {(record.contexts?.length ?? 0) === 0 && record.source !== '（会话内提交）'
                          ? `${stampOf(record.id) === null ? '' : ' · '}出处：${record.source}`
                          : ''}
                      </span>
                      {(record.contexts?.length ?? 0) > 0 && (() => {
                        const background = record.contexts![0]!
                        const open = expandedContexts[record.id] === true
                        const openLabel = background.kind === 'session'
                          ? CULTIVATION_COPY.contextOpenSession
                          : CULTIVATION_COPY.contextOpenFile
                        return (
                          <div className="wk-cultivation-context-card" aria-label={`背景：${background.title}`}>
                            <div className="wk-cultivation-context-card-head">
                              <strong>{background.title}</strong>
                              <span className="wk-meta">
                                {[
                                  background.role === undefined ? '' : background.role,
                                  background.subtitle === undefined ? '' : background.subtitle,
                                  background.turn === undefined ? '' : `第 ${String(background.turn)} 轮`,
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
                              {props.openContext !== undefined && (
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
                        <div className="wk-meta">正文只加载了摘要，可能不完整；完整原文在 `cultivation/records/{record.id}.md`。</div>
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
                            {`　采纳：/cultivation adopt ${record.id}　拒绝：/cultivation reject ${record.id} :: 理由`}
                          </span>
                        )
                        : (
                          <div className="wk-cultivation-actions">
                            <Button
                              variant="primary"
                              disabled={pendingId === record.id}
                              onClick={() => { void run(record.id, adoptLine(record.id)) }}
                            >
                              {pendingId === record.id ? CULTIVATION_COPY.running : CULTIVATION_COPY.adopt}
                            </Button>
                            <Button
                              disabled={pendingId === record.id}
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
                            disabled={pendingId === record.id}
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

      <div className="wk-activity-block" aria-label="已采纳的方法">
        <strong>已采纳的方法</strong>
        {props.records !== null && inbox.adoptedForViewer.length === 0
          ? <div className="wk-meta">我的分身还没有已采纳的方法。</div>
          : props.records !== null && (
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

      <div className="wk-activity-block" aria-label="journal 素材">
        <strong>journal 素材（不用你操作）</strong>
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
        <div className="wk-meta">
          各角色的 journal = 角色自己攒的素材：轮末收敛时由该角色的驾驭者压进 CHARTER 历史纪要，**这里不用你操作**。
        </div>
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
          <li>要它改做法：点上面「{CULTIVATION_COPY.composeCorrect}」，写清期望与证据；它进「需要我处理」，你确认后点「{CULTIVATION_COPY.adopt}」。</li>
          <li>要别的角色改：点「{CULTIVATION_COPY.composeSuggest}」选角色——由对方本人在它的会话里采纳，你这边只留回执。</li>
          <li>采纳 = 把做法写进那个角色的方法层：新开的该角色会话带着它开工；已经在跑的会话也会随技能目录刷新看到它。当前这段对话不受影响。</li>
          <li>同类任务上见效后回填「{CULTIVATION_COPY.verifyPass}」；不灵了「{CULTIVATION_COPY.revoke}」撤回（会删掉方法，记录也不能再被采纳）。</li>
          <li>分身自己也能提案（工具里叫 cultivation_propose）；采纳、拒绝、撤回、验证只能由人在这里点。</li>
          <li>CEO 委派出去的分身继承 CEO 组合——职能角色的方法不会进委派 child，要用职能方法就开那个角色的会话。</li>
        </ul>
        <details className="wk-cultivation-commands">
          <summary>熟手命令行</summary>
          <ul className="wk-activity">
            <li>纠正：/cultivation correct 期望行为一句话 :: 做法与证据</li>
            <li>建议：/cultivation suggest 角色 期望行为一句话 :: 建议与证据</li>
            <li>采纳：/cultivation adopt 记录编号　拒绝：/cultivation reject 记录编号 :: 理由</li>
            <li>验证：/cultivation verify 记录编号 pass｜fail　撤回：/cultivation revoke 方法名</li>
            <li>归档：/cultivation archive 天数（只动已处理记录，open 不动）　清理归档：/cultivation purge 天数</li>
            <li>体检：/cultivation check（报告记录缺方法/方法无记录，不自动改）</li>
          </ul>
        </details>
      </div>
    </>
  )
}
