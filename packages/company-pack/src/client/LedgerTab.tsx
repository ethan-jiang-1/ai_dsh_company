/**
 * 台账页签体（呈现叙事切片一）：动议台账面板——读 `kb/motion-ledger.md` 渲染每场动议的
 * 日期/类型/参与/墙钟/成品/结论。数据面 = `remote.workspaceFiles`（与培养页签同款）。
 * 素材与场景分镜（demo.md 场景 D/E + 快照）已由新动议条目交付；本页签是"公司累计干了什么、
 * 值不值"的常驻答案。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { ledgerStats, parseMotionLedger, type MotionRow } from '../lib/ledger.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import type { FloatRectLike } from './float-geometry.ts'

/** 页签体注入面：台账文件读取闭包 + 浮出。 */
export interface LedgerTabInjected {
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** 读 `kb/motion-ledger.md` 全文；不可达给 null（面板显示读取失败，不静默）。 */
  readonly readLedger: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>
}

export type LedgerTabProps = PropsRuntime<'sidebar.right.pane.tab'> & LedgerTabInjected

/** 刷新间隔（台账随当轮收敛更新，低频）。 */
const REFRESH_MS = 30_000
/** 首屏即给全文入口的字符数（**只是提示**：真裁没裁由布局量出来，见 `LedgerSummary`）。 */
const FULL_TEXT_HINT = 120


/**
 * 台账摘要的内联加粗：历史行里带 `**…**` 这类记号，直接吐出来在面板上是噪声（呈现层的事，
 * 不动数据）。只认**成对**的 `**…**` → `<strong>`；落单的记号原样保留（宁可难看，不许吞字）。
 * @param text - 摘要原文。
 * @returns 文本与粗体片段交替的节点数组。
 */
function ledgerInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  const pattern = /\*\*([^*]+)\*\*/g
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0
    if (at > cursor) parts.push(text.slice(cursor, at))
    parts.push(<strong key={`b${String(at)}`}>{match[1]}</strong>)
    cursor = at + match[0].length
  }
  if (cursor < text.length) parts.push(text.slice(cursor))
  return parts
}

/**
 * 台账摘要行：**所有**行都保持两行边界，被裁掉的行给可聚焦的全文/收起入口。
 *
 * 为什么边界按布局量、不按字符数（2026-10-11 真浏览器实测）：同一条 103 字摘要在 390px 栏里
 * 会折成 4 行，而 60 字也可能折 3 行——按字数决定裁不裁时，这些行既不裁也没有入口，行高在
 * 6–9 行间跳（实测 22/29 行如此）。改成「一律两行 + 量出溢出才加入口」后，行高稳定，且
 * **被裁必有入口**（RFC 批 3：clamp 后无全文入口 = 失败）。
 * 量溢出用 `useLayoutEffect`（在浏览器绘制前跑）：首帧就不会闪出「有裁切、没入口」的样子——
 * 60–120 字在窄栏里会被裁，它们不满足字符提示，只靠这一层兜住（`useEffect` 会晚一帧，实测可见闪）。
 * 导出供 keyless 层做静态渲染断言（同 `DelegationCard` 的测试面）。
 * @param props - 摘要文本。
 * @returns 摘要行元素。
 */
export function LedgerSummary({ summary }: { readonly summary: string }) {
  const [expanded, setExpanded] = useState(false)
  const [clipped, setClipped] = useState(false)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const hinted = summary.length > FULL_TEXT_HINT
  useLayoutEffect(() => {
    const node = textRef.current
    if (node === null || expanded) return
    const measure = (): void => { setClipped(node.scrollHeight > node.clientHeight + 1) }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => { observer.disconnect() }
  }, [summary, expanded])
  return (
    <span className={`wk-row-summary${expanded ? ' is-expanded' : ''}`}>
      <span className="wk-row-task" ref={textRef}>{ledgerInline(summary)}</span>
      {(hinted || clipped || expanded) && (
        <Button
          size="sm"
          variant="ghost"
          title={expanded ? '收起完整结论' : '查看完整结论'}
          // WCAG 2.5.3（Label in Name）：可访问名要包含可见标签（「全文」/「收起」）。
          aria-label={expanded ? '收起（收起完整结论）' : '全文（查看完整结论）'}
          aria-expanded={expanded}
          onClick={() => { setExpanded(value => !value) }}
        >
          {expanded ? '收起' : '全文'}
        </Button>
      )}
    </span>
  )
}

/**
 * 台账页签体。
 * @param props - 槽 props + 注入面。
 * @returns 动议台账面板。
 */
export function LedgerTab(props: LedgerTabProps) {
  const [rows, setRows] = useState<readonly MotionRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      const text = await props.readLedger(props.sessionId, controller.signal)
      if (controller.signal.aborted) return
      if (text === null) {
        setRows(null)
        setError('台账不可读（kb/motion-ledger.md 缺失？）')
        return
      }
      setRows([...parseMotionLedger(text)])
      setError(null)
    }
    void load()
    const timer = setInterval(() => { void load() }, REFRESH_MS)
    return () => { controller.abort(); clearInterval(timer) }
  }, [props.sessionId, props.readLedger])

  const stats = rows === null ? null : ledgerStats(rows)

  return (
    <PanelFrame tone="archive" title="台账" tabProps={props satisfies PanelFrameProps}>
      {error !== null && <div className="wk-error">{error}</div>}
      {stats !== null && (
        <div className="wk-meta" aria-label="台账统计">
          共 {String(stats.total)} 场动议 · 成品 {String(stats.finals)} · 墙钟未记 {String(stats.untimed)}
        </div>
      )}
      {rows === null
        ? (error === null && <div className="wk-meta">读取中…</div>)
        : (
          <div role="list" aria-label="动议台账" className="wk-list wk-ledger-list">
            {rows.map(row => (
              <div key={row.slug} role="listitem" className="wk-row" aria-label={`${row.slug}，${row.kind}，${row.date}`}>
                <span className="wk-row-name">
                  {row.final.includes('✅') ? <Tag tone="info">成品</Tag> : <Tag tone="outline">无成品</Tag>}
                  {row.slug}
                </span>
                <span className="wk-row-status">{row.date} · {row.kind} · {row.roles}</span>
                <LedgerSummary summary={row.summary} />
              </div>
            ))}
          </div>
        )}
      <div className="wk-meta">维护：当轮收敛时随 CHARTER 历史纪要追加一行（kb/motion-ledger.md）。</div>
    </PanelFrame>
  )
}
