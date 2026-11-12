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
import { StateNote } from './company-panels.tsx'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import { LedgerSummary } from './LedgerTab.tsx'
import { useWorkspaceText } from '../data/workspace-text.ts'
import { zh, type CompanyKey, type CompanyT } from '../locales.ts'
import type { FloatRectLike } from '../ui/float-geometry.ts'
import {
  filterCatalog,
  parseCatalog,
  type CatalogFilter,
  type DeliverablesCatalog,
  type DeliverablesCatalogEntry,
} from '../data/deliverables-index.ts'
import { RUN_BUNDLE_PATHS } from '../../lib/run-bundle-paths.ts'

/** 页签体注入面。 */
export interface DeliverablesTabInjected {
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** 读生成索引全文；不可达给 null（面板显示读取失败，不静默）。 */
  readonly readCatalog: (sessionId: SessionId, signal: AbortSignal) => Promise<string | null>
  /** 在右栏打开 final.md（sessionId 用于 file resource 寻址）。 */
  readonly openFinal: (sessionId: SessionId, path: string) => void
}

export type DeliverablesTabProps = PropsRuntime<'sidebar.right.pane.tab'> & DeliverablesTabInjected & { readonly t: CompanyT }

type Filter = CatalogFilter

const FILTERS: readonly Filter[] = ['all', 'active', 'archive', 'unledgered', 'unpresented']

const FILTER_KEYS: Readonly<Record<Filter, CompanyKey>> = {
  all: 'deliverables.filter.all',
  active: 'deliverables.filter.active',
  archive: 'deliverables.filter.archive',
  unledgered: 'deliverables.filter.unledgered',
  unpresented: 'deliverables.filter.unpresented',
}

function filterLabel(key: Filter, t: CompanyT): string {
  return t(FILTER_KEYS[key])
}

function rowAria(entry: DeliverablesCatalogEntry, t: CompanyT): string {
  const type = entry.type === '' ? t('deliverables.untyped') : catalogTypeLabel(entry.type, t)
  const result = entry.result === '' ? t('deliverables.unfilledResult') : catalogResultLabel(entry.result, t)
  const tags: string[] = []
  if (entry.root === RUN_BUNDLE_PATHS.archive) tags.push(t('deliverables.archived'))
  if (!entry.ledgered) tags.push(t('deliverables.unledgeredTag'))
  if (entry.presented === false) tags.push(t('deliverables.notPresentedTag'))
  if (entry.presented === null) tags.push(t('deliverables.presentUnknownTag'))
  return [`${entry.kickoff || t('deliverables.dateMissing')} ${entry.slug}`, type, result, ...tags].join(', ')
}

/** 结果词表（唯一家 = 手册 meta 模板的枚举）→ Tag 色调。新增值必须在这里点名。 */
const RESULT_TONES: Readonly<Record<string, 'success' | 'info' | 'warning' | 'danger'>> = {
  completed: 'success',
  accepted: 'success',
  'in-progress': 'info',
  undecidable: 'warning',
  deferred: 'warning',
  rejected: 'danger',
  obsolete: 'danger',
}

/** 结果 → Tag 色调（未知值给 outline，不猜）。 */
export function resultTone(result: string): 'success' | 'info' | 'warning' | 'danger' | 'outline' {
  return RESULT_TONES[result] ?? 'outline'
}

const TYPE_KEYS: Readonly<Record<string, CompanyKey>> = {
  decision: 'catalog.type.decision',
  production: 'catalog.type.production',
  diagnostic: 'catalog.type.diagnostic',
  qa: 'catalog.type.qa',
}
const RESULT_KEYS: Readonly<Record<string, CompanyKey>> = {
  'in-progress': 'catalog.result.in-progress',
  accepted: 'catalog.result.accepted',
  rejected: 'catalog.result.rejected',
  deferred: 'catalog.result.deferred',
  obsolete: 'catalog.result.obsolete',
  undecidable: 'catalog.result.undecidable',
  completed: 'catalog.result.completed',
}

/** 目录字段的表达层文案；未知值原样显示，不猜。 */
export function catalogTypeLabel(type: string, t: CompanyT): string {
  const key = TYPE_KEYS[type]
  return key === undefined ? type : t(key)
}
export function catalogResultLabel(result: string, t: CompanyT): string {
  const key = RESULT_KEYS[result]
  return key === undefined ? result : t(key)
}

const defaultT = ((key: CompanyKey, params?: Record<string, string | number>) => {
  const template = zh[key]
  return params === undefined ? template : template.replace(/\{(\w+)\}/g, (_m, name: string) => String(params[name] ?? ''))
}) as CompanyT

/** 生成时间 → 稳定、可读的 UTC 文案（不依赖浏览器时区，跨机器一致）。 */
export function formatGeneratedAt(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value)
  return match === null ? value : `${match[1]} ${match[2]} UTC`
}

/** 目录视图（纯展示 + 本地筛选；数据读取在页签体内，便于 keyless 静态渲染）。 */
export function DeliverablesView({ catalog, sessionId, openFinal, t = defaultT }: {
  readonly catalog: DeliverablesCatalog
  readonly sessionId: SessionId
  readonly openFinal: (sessionId: SessionId, path: string) => void
  readonly t?: CompanyT
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const entries = catalog.entries
  const counts = useMemo(() => ({
    total: entries.length,
    active: entries.filter(entry => entry.root === RUN_BUNDLE_PATHS.deliverables).length,
    archive: entries.filter(entry => entry.root === RUN_BUNDLE_PATHS.archive).length,
    unledgered: entries.filter(entry => !entry.ledgered).length,
    presented: entries.filter(entry => entry.presented === true).length,
    notPresented: entries.filter(entry => entry.presented === false).length,
    presentUnknown: entries.filter(entry => entry.presented === null).length,
  }), [entries])
  const filtered = filterCatalog(entries, filter)
  const groups = useMemo(() => {
    const byMonth = new Map<string, DeliverablesCatalogEntry[]>()
    for (const entry of filtered) {
      const month = entry.kickoff.slice(0, 7) || t('deliverables.dateMissing')
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
      <div className="wk-catalog-summary" aria-label={t('deliverables.statsAria')}>
        <span>{t('deliverables.totalPrefix')} <strong>{counts.total}</strong> {t('deliverables.totalSuffix')}</span>
        <Tag tone="info">{t('deliverables.active', { count: counts.active })}</Tag>
        <Tag tone="outline">{t('deliverables.archive', { count: counts.archive })}</Tag>
        {counts.unledgered > 0 && <Tag tone="warning">{t('deliverables.unledgered', { count: counts.unledgered })}</Tag>}
        {counts.presented > 0 && <Tag tone="success">{t('deliverables.presented', { count: counts.presented })}</Tag>}
        {counts.notPresented > 0 && <Tag tone="warning">{t('deliverables.notPresented', { count: counts.notPresented })}</Tag>}
        {counts.presentUnknown > 0 && <Tag tone="outline">{t('deliverables.presentUnknown', { count: counts.presentUnknown })}</Tag>}
      </div>
      <div className="wk-catalog-filters" role="group" aria-label={t('deliverables.filterAria')}>
        {FILTERS.map(item => (
          (item !== 'unledgered' || counts.unledgered > 0)
          && (item !== 'unpresented' || counts.notPresented > 0) && (
            <Button
              key={item}
              size="sm"
              variant={filter === item ? 'primary' : 'ghost'}
              aria-pressed={filter === item}
              onClick={() => { setFilter(item) }}
            >
              {filterLabel(item, t)} {filterCount(item)}
            </Button>
          )
        ))}
      </div>
      {filtered.length === 0
        ? <StateNote text={filter === 'all' ? t('deliverables.emptyAll') : t('deliverables.emptyFilter')} />
        : (
            <div role="list" aria-label={t('deliverables.listAria')} className="wk-deliverable-list">
              {groups.map(([month, rows]) => (
                <div key={month} role="group" aria-label={t('deliverables.monthAria', { month })}>
                  <div className="wk-section-title">{t('deliverables.monthCount', { month, count: rows.length })}</div>
                  {rows.map(entry => (
                    <div
                      key={entry.path}
                      role="listitem"
                      className="wk-row wk-deliverable-row"
                      aria-label={rowAria(entry, t)}
                    >
                      <span className="wk-row-name">
                        <Tag tone={resultTone(entry.result)}>{entry.result === '' ? t('deliverables.unfilled') : catalogResultLabel(entry.result, t)}</Tag>
                        <span className="wk-deliverable-slug" title={entry.slug}>{entry.slug}</span>
                        {entry.root === RUN_BUNDLE_PATHS.archive && <Tag tone="outline">{t('deliverables.archived')}</Tag>}
                        {!entry.ledgered && <Tag tone="warning">{t('deliverables.unledgeredTag')}</Tag>}
                        {entry.presented === false && <Tag tone="warning">{t('deliverables.notPresentedTag')}</Tag>}
                        {entry.presented === null && <Tag tone="outline">{t('deliverables.presentUnknownTag')}</Tag>}
                        {entry.metaProblem !== null && <span title={entry.metaProblem}><Tag tone="warning">{t('deliverables.metaShape')}</Tag></span>}
                        <span className="wk-deliverable-meta">{entry.kickoff || t('deliverables.dateMissing')} · {entry.type === '' ? t('deliverables.untyped') : catalogTypeLabel(entry.type, t)}</span>
                      </span>
                      <LedgerSummary summary={entry.summary || t('deliverables.summaryMissing')} t={t} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="wk-deliverable-open"
                        title={t('deliverables.openPath', { path: entry.path })}
                        aria-label={t('deliverables.openAria', { slug: entry.slug })}
                        onClick={() => { openFinal(sessionId, entry.path) }}
                      >
                        {t('deliverables.open')}
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
      <div className="wk-meta wk-catalog-foot">
        {t('deliverables.footer')}
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
    ? props.t('deliverables.unreadable')
    : state.status === 'ready' && catalog === null
      ? props.t('deliverables.badShape')
      : null

  return (
    <PanelFrame
      title={props.t('deliverables.title')}
      tone="archive"
      tabProps={props satisfies PanelFrameProps}
      refreshLabel={catalog === null ? props.t('deliverables.staticIndex') : props.t('deliverables.staticIndexGenerated', { time: formatGeneratedAt(catalog.generatedAt) })}
      action={(
        <Button
          size="sm"
          variant="ghost"
          title={props.t('deliverables.rereadTitle')}
          onClick={reload}
        >
          {props.t('deliverables.reread')}
        </Button>
      )}
    >
      {error !== null && <div className="wk-error">{error}</div>}
      {catalog === null && error === null && <StateNote kind="loading" text={props.t('deliverables.loading')} />}
      {catalog !== null && (
        <DeliverablesView catalog={catalog} sessionId={props.sessionId} openFinal={props.openFinal} t={props.t} />
      )}
    </PanelFrame>
  )
}
