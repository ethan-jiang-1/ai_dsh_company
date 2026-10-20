/**
 * 成品目录页签（2026-10-19 成品台账卡）：只读渲染 `kb/deliverables-index.json`。
 *
 * UX 取向：
 * - **按成品列，不按动议列**：一行 = 一份 final.md；slug + meta 的一句话结论 + 类型/结果，
 *   点「打开」在右栏预览 final.md。
 * - **静态索引说真话**：数据来自维护者生成的 JSON，不轮询；页签头显示「静态索引 · 生成于 …」，
 *   提供「重读」按钮（生成器跑完后重读），不假装实时。
 * - **先看结论，再看细节**：一句话结论复用 `LedgerSummary`（2 行钳制 + 全文入口，键盘/触屏可用）；
 *   slug / 日期 / 类型 / 结果 / 活跃或归档或台账外都是可扫的次要信息。
 * - **分组 + 筛选**：按月分组；全部/活跃/归档/台账外四档，44 条也不至于糊成一片。
 * - **空/错/加载**：缺索引不静默给空表，明确提示跑生成器。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { LOADING_NOTE, StateNote } from './company-panels.tsx'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import { LedgerSummary } from './LedgerTab.tsx'
import type { FloatRectLike } from './float-geometry.ts'

/** 一条成品目录项（与 `tools/lib/deliverables-catalog.mjs` 同形）。 */
export interface DeliverablesCatalogEntry {
  readonly slug: string
  readonly kickoff: string
  readonly type: string
  readonly result: string
  readonly summary: string
  readonly root: 'deliverables' | 'deliverables-archive'
  readonly dir: string
  readonly path: string
  readonly ledgered: boolean
  /** Lead `present` 背书：true/false；null = 审计不可得（未核，不冒充）。 */
  readonly presented: boolean | null
}

/** 生成索引的完整形状。 */
export interface DeliverablesCatalog {
  readonly schema: 1
  readonly generatedAt: string
  readonly counts: { readonly total: number; readonly active: number; readonly archive: number; readonly unledgered: number; readonly presented: number; readonly notPresented: number; readonly presentUnknown: number }
  readonly entries: readonly DeliverablesCatalogEntry[]
}

/** 页签体注入面。 */
export interface DeliverablesTabInjected {
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** 读生成索引全文；不可达给 null（面板显示读取失败，不静默）。 */
  readonly readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>
  /** 在右栏打开 final.md（sessionId 用于 file resource 寻址）。 */
  readonly openFinal: (sessionId: SessionId, path: string) => void
}

export type DeliverablesTabProps = PropsRuntime<'sidebar.right.pane.tab'> & DeliverablesTabInjected

type Filter = 'all' | 'active' | 'archive' | 'unledgered' | 'unpresented'

const FILTERS: readonly { readonly key: Filter; readonly label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '活跃' },
  { key: 'archive', label: '归档' },
  { key: 'unledgered', label: '台账外' },
  { key: 'unpresented', label: '未 present' },
]

/** 结果 → Tag 色调（未知值给 outline，不猜）。 */
function resultTone(result: string): 'success' | 'info' | 'warning' | 'danger' | 'outline' {
  if (result === '已完成' || result === '已采纳') return 'success'
  if (result === '进行中') return 'info'
  if (result === '判不了' || result === '已搁置') return 'warning'
  if (result === '已否决' || result === '已废弃') return 'danger'
  return 'outline'
}

/** 生成时间 → 稳定、可读的 UTC 文案（不依赖浏览器时区，跨机器一致）。 */
export function formatGeneratedAt(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  return match === null ? value : `${match[1]} ${match[2]} UTC`
}

/**
 * 解析生成索引（形状校验 + 字段归一）。坏 JSON / 非 schema 1 返回 null，由调用方显示错误。
 * @param text - 索引文件全文。
 * @returns 目录或 null。
 */
export function parseCatalog(text: string): DeliverablesCatalog | null {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return null }
  if (raw === null || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  if (value.schema !== 1 || !Array.isArray(value.entries)) return null
  const entries: DeliverablesCatalogEntry[] = []
  for (const item of value.entries) {
    if (item === null || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const root = row.root === 'deliverables-archive' ? 'deliverables-archive' : 'deliverables'
    const textOf = (key: string): string => (typeof row[key] === 'string' ? row[key] : '')
    const slug = textOf('slug')
    const path = textOf('path')
    if (slug === '' || path === '') continue
    entries.push({
      slug,
      kickoff: textOf('kickoff'),
      type: textOf('type'),
      result: textOf('result'),
      summary: textOf('summary'),
      root,
      dir: textOf('dir'),
      path,
      ledgered: row.ledgered !== false,
      presented: row.presented === true ? true : row.presented === false ? false : null,
    })
  }
  const counts = value.counts !== null && typeof value.counts === 'object' ? value.counts as Record<string, unknown> : {}
  const number = (key: string): number => (typeof counts[key] === 'number' ? counts[key] as number : 0)
  return {
    schema: 1,
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : '',
    counts: {
      total: number('total'),
      active: number('active'),
      archive: number('archive'),
      unledgered: number('unledgered'),
      presented: number('presented'),
      notPresented: number('notPresented'),
      presentUnknown: number('presentUnknown'),
    },
    entries,
  }
}

/** 过滤目录项。 */
export function filterCatalog(entries: readonly DeliverablesCatalogEntry[], filter: Filter): readonly DeliverablesCatalogEntry[] {
  if (filter === 'active') return entries.filter(entry => entry.root === 'deliverables')
  if (filter === 'archive') return entries.filter(entry => entry.root === 'deliverables-archive')
  if (filter === 'unledgered') return entries.filter(entry => !entry.ledgered)
  if (filter === 'unpresented') return entries.filter(entry => entry.presented === false)
  return entries
}

/** 目录视图（纯展示 + 本地筛选；数据读取在页签体内，便于 keyless 静态渲染）。 */
export function DeliverablesView({ catalog, sessionId, openFinal }: {
  readonly catalog: DeliverablesCatalog
  readonly sessionId: SessionId
  readonly openFinal: (sessionId: SessionId, path: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const entries = catalog.entries
  const counts = useMemo(() => ({
    total: entries.length,
    active: entries.filter(entry => entry.root === 'deliverables').length,
    archive: entries.filter(entry => entry.root === 'deliverables-archive').length,
    unledgered: entries.filter(entry => !entry.ledgered).length,
    presented: entries.filter(entry => entry.presented === true).length,
    notPresented: entries.filter(entry => entry.presented === false).length,
    presentUnknown: entries.filter(entry => entry.presented === null).length,
  }), [entries])
  const filtered = filterCatalog(entries, filter)
  const groups = useMemo(() => {
    const byMonth = new Map<string, DeliverablesCatalogEntry[]>()
    for (const entry of filtered) {
      const month = entry.kickoff.slice(0, 7) || '日期未记'
      byMonth.set(month, [...(byMonth.get(month) ?? []), entry])
    }
    return [...byMonth.entries()]
  }, [filtered])
  const filterCount = (key: Filter): number => key === 'all' ? counts.total
    : key === 'active' ? counts.active
      : key === 'archive' ? counts.archive
        : key === 'unledgered' ? counts.unledgered
          : counts.notPresented

  return (
    <>
      <div className="wk-catalog-summary" aria-label="成品统计">
        <span>共 <strong>{counts.total}</strong> 份成品</span>
        <Tag tone="info">活跃 {counts.active}</Tag>
        <Tag tone="outline">归档 {counts.archive}</Tag>
        {counts.unledgered > 0 && <Tag tone="warning">台账外 {counts.unledgered}</Tag>}
        {counts.presented > 0 && <Tag tone="success">present {counts.presented}</Tag>}
        {counts.notPresented > 0 && <Tag tone="warning">未 present {counts.notPresented}</Tag>}
        {counts.presentUnknown > 0 && <Tag tone="outline">present 未核 {counts.presentUnknown}</Tag>}
      </div>
      <div className="wk-catalog-filters" role="group" aria-label="成品筛选">
        {FILTERS.map(item => (
          (item.key !== 'unledgered' || counts.unledgered > 0)
          && (item.key !== 'unpresented' || counts.notPresented > 0) && (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? 'primary' : 'ghost'}
              aria-pressed={filter === item.key}
              onClick={() => { setFilter(item.key) }}
            >
              {item.label} {filterCount(item.key)}
            </Button>
          )
        ))}
      </div>
      {filtered.length === 0
        ? <StateNote text={filter === 'all' ? '还没有带 final.md 的成品。' : '没有符合筛选的成品。'} />
        : (
            <div role="list" aria-label="成品目录" className="wk-deliverable-list">
              {groups.map(([month, rows]) => (
                <div key={month} role="group" aria-label={`${month} 成品`}>
                  <div className="wk-section-title">{month} · {rows.length} 份</div>
                  {rows.map(entry => (
                    <div
                      key={entry.path}
                      role="listitem"
                      className="wk-row wk-deliverable-row"
                      aria-label={`${entry.kickoff} ${entry.slug}，${entry.type || '未分型'}，${entry.result || '未填结果'}${entry.root === 'deliverables-archive' ? '，归档' : ''}${entry.ledgered ? '' : '，台账外'}${entry.presented === true ? '，已 present' : entry.presented === false ? '，未 present' : '，present 未核'}`}
                    >
                      <span className="wk-row-name">
                        <Tag tone={resultTone(entry.result)}>{entry.result || '未填'}</Tag>
                        <span className="wk-deliverable-slug" title={entry.slug}>{entry.slug}</span>
                        {entry.root === 'deliverables-archive' && <Tag tone="outline">归档</Tag>}
                        {!entry.ledgered && <Tag tone="warning">台账外</Tag>}
                        {entry.presented === false && <Tag tone="warning">未 present</Tag>}
                        {entry.presented === null && <Tag tone="outline">present 未核</Tag>}
                        <span className="wk-deliverable-meta">{entry.kickoff || '日期未记'} · {entry.type || '未分型'}</span>
                      </span>
                      <LedgerSummary summary={entry.summary || '（meta 无一句话结论）'} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="wk-deliverable-open"
                        title={`在右栏打开 ${entry.path}`}
                        aria-label={`打开 ${entry.slug} 的 final.md`}
                        onClick={() => { openFinal(sessionId, entry.path) }}
                      >
                        打开
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
      <div className="wk-meta wk-catalog-foot">
        成品 = 目录里有 <code>final.md</code>；<code>present</code> 背书与审计仍归 <code>deliverables-check</code>。
        索引由 <code>tools/deliverables-index.mjs</code> 生成，面板只读。
      </div>
    </>
  )
}

/**
 * 成品目录页签体。
 * @param props - 槽 props + 注入面。
 * @returns 成品目录。
 */
export function DeliverablesTab(props: DeliverablesTabProps) {
  const [catalog, setCatalog] = useState<DeliverablesCatalog | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const load = useCallback(async (signal: AbortSignal): Promise<void> => {
    try {
      const text = await props.readCatalog(props.sessionId, signal)
      if (signal.aborted) return
      if (text === null) {
        setCatalog(null)
        setError('成品索引不可读（kb/deliverables-index.json 缺失？维护者运行 node tools/deliverables-index.mjs）')
        return
      }
      const parsed = parseCatalog(text)
      if (parsed === null) {
        setCatalog(null)
        setError('成品索引形状不符（schema 1 / entries 缺失；重跑 node tools/deliverables-index.mjs）')
        return
      }
      setCatalog(parsed)
      setError(null)
    } catch (cause) {
      if (!signal.aborted) {
        setCatalog(null)
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    }
  }, [props.readCatalog, props.sessionId])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => { controller.abort() }
  }, [load, tick])

  return (
    <PanelFrame
      title="成品"
      tone="archive"
      tabProps={props satisfies PanelFrameProps}
      refreshLabel={catalog === null ? '静态索引' : `静态索引 · 生成于 ${formatGeneratedAt(catalog.generatedAt)}`}
      action={(
        <Button
          size="sm"
          variant="ghost"
          title="重读生成索引（维护者跑完 tools/deliverables-index.mjs 后）"
          onClick={() => { setTick(value => value + 1) }}
        >
          重读
        </Button>
      )}
    >
      {error !== null && <div className="wk-error">{error}</div>}
      {catalog === null && error === null && <StateNote kind="loading" text={LOADING_NOTE} />}
      {catalog !== null && (
        <DeliverablesView catalog={catalog} sessionId={props.sessionId} openFinal={props.openFinal} />
      )}
    </PanelFrame>
  )
}
