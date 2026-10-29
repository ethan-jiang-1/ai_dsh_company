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
import {
  type CultivationRecord,
  type CultivationRow,
  type FeedbackItem,
} from '../lib/cultivation.ts'
import {
  CULTIVATION_COPY,
  type CultivationActions,
} from './cultivation-actions.ts'
import { CultivationCompose } from './CultivationCompose.tsx'
import { useCultivationBoard } from './use-cultivation-board.tsx'
import { CultivationInbox } from './CultivationInbox.tsx'
import { CultivationAdopted, CultivationFeedback, CultivationJournal, CultivationMine } from './CultivationBoardSections.tsx'
import type { CultivationContextSources } from './cultivation-context-data.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'

/** 页签体注入面。 */

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
/**
 * 培养领域视图。
 * @param props - 见 {@link CultivationBoardProps}。
 * @returns 面板内容（容器自己套壳：公司页直接放、侧栏套 PanelFrame）。
 */
export function CultivationBoard(props: CultivationBoardProps) {
  const board = useCultivationBoard(props)
  const {
    viewer,
    actions,
    inbox,
    setHighlightId,
  } = board

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

      <div className="wk-activity-block wk-cultivation-main" aria-label="让角色今后的工作更好">
        <strong>让角色今后的工作更好</strong>
        <div className="wk-meta">从一项真实工作或改进目标开始，写下下次想看到的做法。提交后仍需目标角色语境下的人决定。</div>
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

      <CultivationInbox board={board} />

      <CultivationMine inbox={inbox} />

      <CultivationAdopted board={board} records={board.records} />

      <CultivationJournal rows={props.journalRows} />

      <CultivationFeedback feedback={props.feedback} reachable={props.feedbackReachable} />

      <div className="wk-activity-block">
        <strong>怎么养</strong>
        <ul className="wk-activity">
          <li>要它改做法：点上面「开始记录一项工作」→「{CULTIVATION_COPY.composeCorrect}」，写清期望与证据；它进「需要我处理」，你确认后点「{CULTIVATION_COPY.adopt}」。</li>
          <li>要别的角色改：点「开始记录一项工作」→「{CULTIVATION_COPY.composeSuggest}」，先选目标角色——由对方本人在它的会话里采纳，你这边只留回执。</li>
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
