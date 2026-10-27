/**
 * 成品目录页签（2026-10-19 成品台账卡）：只读渲染 `kb/deliverables-index.json`。
 *
 * UX 取向：
 * - **按成品列，不按动议列**：一行 = 一份 final.md；slug + meta 的一句话结论 + 类型/结果，
 *   点「打开」在右栏预览 final.md。
 * - **静态索引说真话**：数据来自本部署 host 生成的 JSON，不轮询；页签头显示「静态索引 · 生成于 …」，
 *   提供「重读」按钮（host 在 present 后重生成，页面只重读当前文件），不假装实时。
 * - **先看结论，再看细节**：一句话结论复用 `LedgerSummary`（2 行钳制 + 全文入口，键盘/触屏可用）；
 *   slug / 日期 / 类型 / 结果 / 活跃或归档或台账外都是可扫的次要信息。
 * - **分组 + 筛选**：按月分组；全部/活跃/归档/台账外四档，44 条也不至于糊成一片。
 * - **空/错/加载**：缺索引不静默给空表，明确提示检查 host 与 workspace。
 */
import { useMemo, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import { LOADING_NOTE, StateNote } from './company-panels.tsx'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import { LedgerSummary } from './LedgerTab.tsx'
import { useWorkspaceText } from './workspace-text.ts'
import type { FloatRectLike } from './float-geometry.ts'
import {
  filterCatalog,
  parseCatalog,
  type CatalogFilter,
  type DeliverablesCatalog,
  type DeliverablesCatalogEntry,
} from './deliverables-index.ts'

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

type Filter = CatalogFilter

const FILTERS: readonly { readonly key: Filter; readonly label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '活跃' },
  { key: 'archive', label: '归档' },
  { key: 'unledgered', label: '台账外' },
  { key: 'unpresented', label: '未 present' },
]

/** 结果词表（唯一家 = 手册 meta 模板的枚举）→ Tag 色调。新增值必须在这里点名。 */
const RESULT_TONES: Readonly<Record<string, 'success' | 'info' | 'warning' | 'danger'>> = {
  已完成: 'success',
  已采纳: 'success',
  进行中: 'info',
  判不了: 'warning',
  已搁置: 'warning',
  已否决: 'danger',
  已废弃: 'danger',
}

/** 结果 → Tag 色调（未知值给 outline，不猜）。 */
export function resultTone(result: string): 'success' | 'info' | 'warning' | 'danger' | 'outline' {
  return RESULT_TONES[result] ?? 'outline'
}

/** 生成时间 → 稳定、可读的 UTC 文案（不依赖浏览器时区，跨机器一致）。 */
export function formatGeneratedAt(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  return match === null ? value : `${match[1]} ${match[2]} UTC`
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
                        {entry.metaProblem !== null && <span title={entry.metaProblem}><Tag tone="warning">meta 形状错</Tag></span>}
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
        成品 = 目录里有 <code>final.md</code>；<code>present</code> 背书来自本部署 host 记录的 present 事件，
        未记录的条目显示「未核」。索引由 host 生成，面板只读。
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
  const { state, reload } = useWorkspaceText(props.readCatalog, props.sessionId)
  const catalog = state.status === 'ready' ? parseCatalog(state.text) : null
  const error = state.status === 'unreadable'
    ? '成品索引不可读（kb/deliverables-index.json 缺失？本部署 host 会在启动时生成；若仍缺失，请确认 workspace 是公司盘）'
    : state.status === 'ready' && catalog === null
      ? '成品索引形状不符（schema 1 / entries 缺失；本部署 host 会在下次启动时重建）'
      : null

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
          title="重读当前索引（host 会在 present 后重新生成）"
          onClick={reload}
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
