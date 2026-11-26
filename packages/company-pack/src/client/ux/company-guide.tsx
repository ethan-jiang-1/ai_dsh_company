/**
 * 右栏聚焦导航页（Wave S2 · `sidebar.right.tab.guide` chain 槽）：
 * 聚焦 3 个梦之队聚合工作区与双分栏快捷入口，同时完整透传上游原生工具（files 等）。
 */
import type { ReactNode } from 'react'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-store'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarRightGuideBox } from '@deepseek-ai/dsh-client-ui-sidebar-right/client'
import type { COMPANY_NS } from '../locales.ts'
import type { SplitPresetId } from './company-triggers-shortcuts.ts'

export interface PartitionedGuideEntries {
  readonly company: readonly SidebarRightGuideBox[]
  readonly upstream: readonly SidebarRightGuideBox[]
}

/** 将 Guide 注册条目切分为「梦之队公司入口」与「上游工具入口（透传）」。 */
export function partitionGuideEntries(entries: readonly SidebarRightGuideBox[]): PartitionedGuideEntries {
  const company: SidebarRightGuideBox[] = []
  const upstream: SidebarRightGuideBox[] = []
  for (const entry of entries) {
    if (entry.providerId.startsWith('dsh-company-pack/')) {
      company.push(entry)
    } else {
      upstream.push(entry)
    }
  }
  return { company, upstream }
}

export interface CompanyGuideHubInjected {
  readonly hooks: {
    readonly guideEntries: ObservableSnapshot<readonly SidebarRightGuideBox[]>
  }
  readonly openSplit: (preset: SplitPresetId) => void
}

export type CompanyGuideHubProps =
  PropsRuntime<'sidebar.right.tab.guide'>
  & PropsLocale<typeof COMPANY_NS>
  & InjectFace<CompanyGuideHubInjected>

/** 右栏 Guide Chain 主体：公司三页签入口 + 双分栏快捷预设 + 上游原生工具透传。 */
export function CompanyGuideHub({
  useTabInfo,
  useGuideEntries,
  openSplit,
  t,
}: CompanyGuideHubProps): ReactNode {
  const { tab } = useTabInfo()
  const entries = useGuideEntries((items: readonly SidebarRightGuideBox[]) => items)
  const { company, upstream } = partitionGuideEntries(entries)

  const openEntry = (kind: string): void => {
    tab.actions.openTab(kind)
  }

  return (
    <div className="wk-guide-hub" data-company-guide="">
      <div className="wk-guide-header">
        <div className="wk-guide-title">{t('guide.title')}</div>
        <div className="wk-guide-subtitle">{t('guide.subtitle')}</div>
      </div>

      <div className="wk-guide-section">
        <div className="wk-guide-section-title">{t('guide.companySection')}</div>
        <div className="wk-guide-grid">
          {company.map((entry) => {
            const Icon = entry.icon
            const description = entry.description?.()
            return (
              <button
                key={`${entry.providerId}:${entry.id}`}
                type="button"
                className="wk-guide-entry"
                data-sidebar-right-guide-entry={entry.kind}
                onClick={() => { openEntry(entry.kind) }}
              >
                {Icon === undefined ? null : (
                  <span className="wk-guide-entry-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                )}
                <span className="wk-guide-entry-text">
                  <span className="wk-guide-entry-label">{entry.title()}</span>
                  {description === undefined ? null : (
                    <span className="wk-guide-entry-desc">{description}</span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="wk-guide-actions">
        <span className="wk-guide-actions-label">{t('guide.splitLayout')}</span>
        <Button size="sm" variant="ghost" onClick={() => { openSplit('ops') }}>
          {t('layout.splitOps')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { openSplit('review') }}>
          {t('layout.splitReview')}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { openSplit('quiet') }}>
          {t('layout.splitQuiet')}
        </Button>
      </div>

      {upstream.length === 0 ? null : (
        <div className="wk-guide-section">
          <div className="wk-guide-section-title">{t('guide.upstreamSection')}</div>
          <div className="wk-guide-tools">
            {upstream.map((entry) => {
              const Icon = entry.icon
              return (
                <button
                  key={`${entry.providerId}:${entry.id}`}
                  type="button"
                  className="wk-guide-tool"
                  data-sidebar-right-guide-entry={entry.kind}
                  onClick={() => { openEntry(entry.kind) }}
                >
                  {Icon === undefined ? null : <Icon size={15} />}
                  <span className="wk-guide-tool-label">{entry.title()}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
