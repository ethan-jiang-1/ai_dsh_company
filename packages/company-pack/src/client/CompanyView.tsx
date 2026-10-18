/**
 * 公司整页视图（条目 ① S1，`conversation.view` id `company`）：把机制"演"出来。
 *
 * 数据面自条目 ② S1a 起抽到 `useCompanyData`（公司视图与五个平台页签体共用同一实现）；
 * 本文件只剩"页内子页签 + 面板"的展示编排。
 *
 * 2026-10-13 培养卡：第四子页由「用量」改为「培养」——同一领域视图（`CultivationBoard`）
 * 也住侧栏/浮窗页签；培养数据**不依赖 team 加载成功**（独立角色根会话可看，V1）；用量
 * 保留在平台页签 `company-budget`（换入口 ≠ 删统计）。
 */
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { BoardPanel, DagPanel, LOADING_NOTE, PresencePanel, StateNote } from './company-panels.tsx'
import { DagGlyph, GridGlyph, PeopleGlyph, SproutGlyph } from './tab-icons.tsx'
import { useCompanyData, type CompanyDataInjected } from './use-company-data.ts'
import { CultivationBoard } from './CultivationBoard.tsx'
import type { CultivationActionsFactory } from './cultivation-actions.ts'
import {
  CULTIVATION_REFRESH_MS,
  useCultivationFeedback,
  useCultivationPanelData,
  type CultivationFiles,
  type CultivationFollowEvents,
} from './cultivation-data.ts'
import { readPresetOf, type RoleBadgeInjected } from './RoleBadge.tsx'
import { roleLabel } from '../lib/cultivation.ts'

/** 本视图的 props（标准 session kit + owner props）。 */
export type CompanyViewProps = PropsRuntime<'conversation.view'>

/** 注册处闭包注入的数据面 + 浮出入口（条目 ② S4）+ 培养数据面（2026-10-13 培养卡）。 */
export interface CompanyViewInjected extends CompanyDataInjected {
  /** 打开 `kind` 对应的平台页签并拽出成浮窗（注册处经 `openTab` + `active()` + `float` 实现）。 */
  readonly floatPanel: (kind: string) => void
  /** 培养数据闭包（journal + 记录；工厂见 `cultivation-data.ts`）。 */
  readonly cultivationFiles: CultivationFiles
  /** 人侧动作面工厂（GUI 版 /cultivation；注册处必给）。 */
  readonly cultivationActions: CultivationActionsFactory
  /** 本会话事件流（赞/踩块；缺席 = 该块降级）。 */
  readonly followEvents?: CultivationFollowEvents
  /** 会话列表快照（viewer 角色经上游 agentPreset 投影订阅）。 */
  readonly roleSource: RoleBadgeInjected['roleSource']
}

type PanelKey = 'board' | 'dag' | 'presence' | 'cultivation'

/**
 * 页内子页签表（导出给 keyless spec：第四子页 = 培养、培养面板不依赖 team——V1）。
 * 用量保留在平台页签 `company-budget`，本表不再占用第四位（培养卡：换入口不删统计）。
 */
export const COMPANY_PANELS: readonly { readonly key: PanelKey; readonly label: string; readonly kind: string; readonly tone: string; readonly Glyph: (props: { readonly size?: number | undefined; readonly className?: string | undefined }) => ReactNode }[] = [
  { key: 'board', label: '看板', kind: 'company-board', tone: 'overview', Glyph: GridGlyph },
  { key: 'dag', label: '依赖图', kind: 'company-dag', tone: 'structure', Glyph: DagGlyph },
  { key: 'presence', label: '在场', kind: 'company-presence', tone: 'people', Glyph: PeopleGlyph },
  { key: 'cultivation', label: '培养', kind: 'company-cultivation', tone: 'growth', Glyph: SproutGlyph },
]

/**
 * 造公司视图组件（闭包捕获数据面 + 浮出入口）。
 * @param injected - team 视图拉取 + 事件流 + 浮出 + 培养数据面（注册处已绑好 Lead 寻址）。
 * @returns 可注册到 `conversation.view` 的组件。
 */
export function createCompanyView(injected: CompanyViewInjected) {
  return function CompanyView(props: CompanyViewProps) {
    const { sessionId, useProjection, useSessions } = props
    const [panel, setPanel] = useState<PanelKey>('board')
    const data = useCompanyData(injected, sessionId, useProjection, useSessions, { stream: true })
    const current = COMPANY_PANELS.find(entry => entry.key === panel)

    // 培养面（2026-10-13）：数据独立于 team（V1——team 断流时培养子页仍可看）；只在子页
    // 激活时读盘。viewer 角色 = 当前会话 preset（上游投影订阅，照 RoleBadge 手法）。
    const subscribe = useMemo(() => injected.roleSource.subscribe.bind(injected.roleSource), [injected.roleSource])
    const getPreset = useCallback(() => readPresetOf(injected.roleSource, sessionId), [injected.roleSource, sessionId])
    const viewerRole = useSyncExternalStore(subscribe, getPreset, getPreset)
    const cultivation = useCultivationPanelData(injected.cultivationFiles, sessionId, { enabled: panel === 'cultivation' })
    const feedback = useCultivationFeedback(injected.followEvents, sessionId, panel === 'cultivation')
    const actions = useMemo(() => injected.cultivationActions(sessionId), [injected.cultivationActions, sessionId])

    return (
      <div className="wk-view">
        <div className="wk-view-tabs" role="tablist" aria-label="公司视图">
          {COMPANY_PANELS.map(entry => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              className="wk-tab"
              aria-selected={panel === entry.key}
              onClick={() => { setPanel(entry.key) }}
            >
              <span className={`wk-tab-title wk-tone-${entry.tone}`}>
                <entry.Glyph size={13} />
              </span>
              {entry.label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="wk-meta wk-tabstrip-meta">
            {panel === 'cultivation' ? `每 ${String(CULTIVATION_REFRESH_MS / 1000)} 秒刷新` : '每 5 秒刷新'}
          </span>
          <Button
            size="sm"
            variant="ghost"
            title={`把「${current?.label ?? ''}」拖出成浮窗（可移动 / 可缩放）`}
            onClick={() => { if (current !== undefined) injected.floatPanel(current.kind) }}
          >
            浮出{current?.label ?? ''}
          </Button>
        </div>
        <div className="wk-view-body">
          {data.error !== null && <div className="wk-error">{data.error}</div>}
          {data.team === null && data.error === null && <StateNote kind="loading" text={LOADING_NOTE} />}
          {data.team !== null && panel === 'board' && <BoardPanel columns={data.columns} />}
          {data.team !== null && panel === 'dag' && <DagPanel layout={data.dag} />}
          {data.team !== null && panel === 'presence' && (
            <>
              {data.streamError !== null && <div className="wk-error">动态流不可用：{data.streamError}</div>}
              <PresencePanel rows={data.rows} activity={data.activity} />
            </>
          )}
          {/* 培养子页不依赖 team（V1：独立角色根会话无需组队也可查看）；用量 = 平台页签 company-budget。 */}
          {panel === 'cultivation' && (
            <div className="wk-cultivation-pane">
              <CultivationBoard
                viewerRole={viewerRole}
                viewerLabel={viewerRole === null ? null : roleLabel(viewerRole)}
                journalRows={cultivation.journalRows}
                records={cultivation.records}
                feedback={feedback}
                feedbackReachable={injected.followEvents !== undefined}
                actions={actions}
                onRefresh={cultivation.refresh}
              />
            </div>
          )}
        </div>
      </div>
    )
  }
}
