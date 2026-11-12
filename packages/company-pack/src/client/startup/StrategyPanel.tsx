/**
 * 右栏「项目策略」面板（页签体）。
 *
 * 形态：三个下拉，第一项恒为「自动」= 不约束；其余项由 host 按 `content/` 枚举后写进
 * `.dsh-company/startup-options.json`，所以换公司 / 加产品类型 / 加交付模式时界面不用改。
 *
 * 没有「保存」按钮：每次选完立即发一条 `/company-settings set …`（client → host 的写通道），
 * 成功即重读盘；注入段是活读的，所以最快下一轮生效。
 */
import { useCallback, useEffect, useSyncExternalStore, useState, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import { startupRows, type StartupField, type StartupRow, type WikiCheck } from '../../lib/startup-settings.ts'
import type { CompanyKey, CompanyT } from '../locales.ts'
import type { FloatRectLike } from '../ui/float-geometry.ts'
import { PanelFrame } from '../tabs/company-tabs.tsx'
import type { StartupStore } from './startup-store.ts'

/** 保存结果（host 回执原样带回）。 */
export type SaveResult = { readonly ok: true } | { readonly ok: false; readonly message: string }

/** 页签体注入面。 */
export interface StrategyPanelInjected {
  readonly store: StartupStore
  readonly load: (sessionId: SessionId, signal: AbortSignal) => Promise<void>
  readonly save: (sessionId: SessionId, field: StartupField, value: string | null) => Promise<SaveResult>
  readonly reset: (sessionId: SessionId) => Promise<SaveResult>
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  readonly t: CompanyT
}

/** 页签体 props = 槽运行时 + 注入面。 */
export type StrategyPanelProps = PropsRuntime<'sidebar.right.pane.tab'> & StrategyPanelInjected

/** 字段 → 文案 key。 */
const FIELD_LABEL: Readonly<Record<StartupField, CompanyKey>> = {
  productType: 'strategy.field.productType',
  deliveryMode: 'strategy.field.deliveryMode',
  wiki: 'strategy.field.wiki',
}

/** 字段 → 该字段的可选项（wiki 是本地目录指针，没有枚举；可用性见 `wikiCheck`）。 */
function optionsFor(row: StartupRow): readonly string[] {
  return row.field === 'wiki' ? [] : row.options
}

/**
 * 单行：一个下拉 + 可选的失效提示。
 * @param props - 行数据 + 当前语言 + 改动回调。
 * @returns 行元素。
 */
/** wiki 失效原因 → 文案 key（A3：要说出是哪一种，不能只说「失效」）。 */
const WIKI_PROBLEM_KEY = {
  missing: 'strategy.wiki.missing',
  'not-directory': 'strategy.wiki.notDirectory',
  'no-index': 'strategy.wiki.noIndex',
} as const

function StrategyRow({ row, t, onPick, onWiki, busy, wikiCheck }: {
  readonly row: StartupRow
  readonly t: CompanyT
  readonly onPick: (field: StartupField, value: string | null) => void
  readonly onWiki: (value: string | null) => void
  readonly busy: boolean
  readonly wikiCheck: WikiCheck
}): ReactNode {
  const label = t(FIELD_LABEL[row.field])
  const options = optionsFor(row)
  // wiki 的失效原因来自 host 的盘上检查；另两行的失效是「值不在枚举里」。
  const invalid = row.invalid
    ? (row.field === 'wiki' && wikiCheck.problem !== null ? t(WIKI_PROBLEM_KEY[wikiCheck.problem]) : t('strategy.invalid'))
    : null
  const wikiNote = row.field === 'wiki' && row.value !== null && !row.invalid && wikiCheck.location !== null
    ? t(wikiCheck.location === 'inside' ? 'strategy.wiki.inside' : 'strategy.wiki.outside')
    : null
  return (
    <div className="wk-strategy-row" data-field={row.field}>
      <div className="wk-strategy-row-label">{label}</div>
      {row.field === 'wiki'
        ? (
          <div className="wk-strategy-row-control">
            <input
              className="wk-strategy-input"
              defaultValue={row.value ?? ''}
              placeholder={t('strategy.placeholder.wiki')}
              disabled={busy}
              onBlur={(event) => {
                const next = event.currentTarget.value.trim()
                if ((next === '' ? null : next) === row.value) return
                onWiki(next === '' ? null : next)
              }}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
            />
            {row.value === null ? null : (
              <button type="button" className="wk-strategy-clear" disabled={busy} onClick={() => { onWiki(null) }}>
                {t('strategy.auto')}
              </button>
            )}
            {wikiNote === null ? null : <span className="wk-strategy-auto-tag">{wikiNote}</span>}
          </div>
        )
        : (
          <div className="wk-strategy-row-control">
            <select
              className="wk-strategy-select"
              value={row.value ?? ''}
              disabled={busy}
              onChange={(event) => {
                const next = event.currentTarget.value
                onPick(row.field, next === '' ? null : next)
              }}
            >
              <option value="">{t('strategy.auto')}</option>
              {options.map(option => <option key={option} value={option}>{option}</option>)}
              {row.invalid && row.value !== null ? <option value={row.value}>{row.value}</option> : null}
            </select>
            {row.isAuto ? <span className="wk-strategy-auto-tag">{t('strategy.autoTag')}</span> : null}
          </div>
        )}
      {invalid === null ? null : <div className="wk-strategy-row-warning">{invalid}</div>}
    </div>
  )
}

export function StrategyPanel(props: StrategyPanelProps): ReactNode {
  const face = useSyncExternalStore(props.store.subscribe, props.store.get, props.store.get)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { sessionId, load, save, reset, t } = props

  const reload = useCallback(async (signal: AbortSignal): Promise<void> => {
    await load(sessionId, signal)
  }, [load, sessionId])

  useEffect(() => {
    const controller = new AbortController()
    void reload(controller.signal)
    return () => { controller.abort() }
  }, [reload])

  const commit = useCallback(async (action: () => Promise<SaveResult>): Promise<void> => {
    setBusy(true)
    setError(null)
    try {
      const result = await action()
      if (!result.ok) {
        setError(t('strategy.saveFailed', { message: result.message }))
        return
      }
      await reload(new AbortController().signal)
    } catch (cause) {
      setError(t('strategy.saveFailed', { message: (cause as Error).message }))
    } finally {
      setBusy(false)
    }
  }, [reload, t])

  const rows = startupRows(face.settings, face.options)
  const nothingToPick = face.options.productTypes.length === 0 && face.options.deliveryModes.length === 0

  return (
    <PanelFrame title={t('tabs.strategy.label')} tone="structure" tabProps={props} refreshLabel={t('strategy.refresh')}>
      <div className="wk-strategy-panel">
        <h2 className="wk-strategy-heading">{t('strategy.title')}</h2>
        <p className="wk-strategy-sub">{t('strategy.subtitle')}</p>
        {error === null ? null : <p className="wk-strategy-error" role="status">{error}</p>}
        {nothingToPick ? <p className="wk-strategy-empty">{t('strategy.noOptions')}</p> : null}
        {rows.map(row => (
          <StrategyRow
            key={row.field}
            row={row}
            t={t}
            busy={busy}
            wikiCheck={face.options.wikiCheck}
            onPick={(field, value) => { void commit(() => save(sessionId, field, value)) }}
            onWiki={(value) => { void commit(() => save(sessionId, 'wiki', value)) }}
          />
        ))}
        <p className="wk-strategy-hint">{t('strategy.hint.noSave')}</p>
        <p className="wk-strategy-hint">{t('strategy.hint.close')}</p>
        <button
          type="button"
          className="wk-strategy-reset"
          disabled={busy}
          onClick={() => { void commit(() => reset(sessionId)) }}
        >
          {t('strategy.reset')}
        </button>
      </div>
    </PanelFrame>
  )
}
