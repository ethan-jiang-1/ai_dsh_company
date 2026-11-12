/**
 * composer 工具栏上的「项目策略」入口（槽 `conversation.input.left`，排在 auto-continue 之后）。
 *
 * 为什么不是齿轮图标：齿轮暗示「系统设置、别乱动」；这里显示的是**当前状态**
 * （「策略：自动」/「策略：业务软件 · 按项目做」），让人随时知道这次按什么跑，跑歪了再点。
 */
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import { overriddenEntries, startupRows } from '../../lib/startup-settings.ts'
import type { CompanyKey, CompanyT } from '../locales.ts'
import type { StartupStore } from './startup-store.ts'

/** 注入面：会话 id + 共享仓 + 读盘闭包。 */
export interface StrategyButtonFace {
  readonly sessionId: SessionId
  readonly store: StartupStore
  readonly load: (sessionId: SessionId, signal: AbortSignal) => Promise<void>
  readonly open: () => void
  readonly t: CompanyT
}

/** 槽注入的 `t` 会与自带的同名 prop 冲突，故本组件不声明 `locale`，`t` 由 inject 给。 */
export type StrategyButtonProps = InjectFace<StrategyButtonFace>

/** 字段 → 文案 key（tooltip 列出生效值时用字段名，不只给裸值）。 */
const FIELD_KEY: Readonly<Record<'productType' | 'deliveryMode' | 'wiki', CompanyKey>> = {
  productType: 'strategy.field.productType',
  deliveryMode: 'strategy.field.deliveryMode',
  wiki: 'strategy.field.wiki',
}

/** 值 → 人话（面板/按钮共用；不翻译内容枚举，只翻译「自动」这一态）。 */
export function strategySummary(values: readonly string[]): string {
  return values.join(' · ')
}

export function StrategyButton(props: StrategyButtonProps): ReactNode {
  const face = useSyncExternalStore(props.store.subscribe, props.store.get, props.store.get)
  const { sessionId, load } = props

  useEffect(() => {
    const controller = new AbortController()
    void load(sessionId, controller.signal)
    return () => { controller.abort() }
  }, [load, sessionId])

  const rows = startupRows(face.settings, face.options)
  const values = rows.filter(row => !row.isAuto).map(row => row.value ?? '')
  const overrides = overriddenEntries(face.settings)
  // 未读盘时显示中性文案，不冒充「自动」。
  const label = !face.loaded
    ? props.t('strategy.button.loading')
    : overrides.length === 0
      ? props.t('strategy.button.auto')
      : props.t('strategy.button.value', { value: strategySummary(values) })
  // tooltip 必须能补全被 ellipsis 截断的 label：有覆盖时逐字段列「字段名: 值」（BUG-086）。
  const valueLines = overrides
    .map(([field, value]) => `${props.t(FIELD_KEY[field])}: ${value}`)
    .join('\n')
  const tooltip = !face.loaded
    ? props.t('strategy.button.tooltip')
    : overrides.length === 0
      ? props.t('strategy.button.tooltip.auto')
      : `${valueLines}\n${props.t('strategy.button.tooltip')}`

  return (
    <button
      type="button"
      className="wk-strategy-button"
      data-overridden={overrides.length > 0 ? 'true' : 'false'}
      title={tooltip}
      onClick={() => { props.open() }}
    >
      <span className="wk-strategy-button-glyph" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="6" cy="4.5" r="1.5" fill="currentColor" />
          <circle cx="10" cy="8" r="1.5" fill="currentColor" />
          <circle cx="5" cy="11.5" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span className="wk-strategy-button-label">{label}</span>
    </button>
  )
}
