/**
 * 培养页签体（驾驶舱④切片四 → 2026-10-13 培养卡升级）：领域视图（`CultivationBoard`）的
 * 侧栏/浮窗壳。数据加载与折叠在 `cultivation-data.ts`；展示纪律在 Board 头注。
 * 公司主面第四子页用**同一领域视图**（`CompanyView`）——一处事实，两个壳。
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { roleLabel } from '../lib/cultivation.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import { CultivationBoard } from './CultivationBoard.tsx'
import {
  useCultivationFeedback,
  useCultivationPanelData,
  type CultivationFiles,
  type CultivationFollowEvents,
} from './cultivation-data.ts'
import type { FloatRectLike } from './float-geometry.ts'
import { readPresetOf, type RoleBadgeInjected } from './RoleBadge.tsx'

/** 页签体注入面：文件读取闭包 + 事件流闭包 + viewer 角色源 + 浮出。 */
export interface CultivationTabInjected {
  readonly floatTab: (tabId: TabId, rect?: FloatRectLike) => void
  readonly unfloatTab: (paneId: string) => void
  /** 培养数据闭包（journal + 记录；工厂见 `cultivation-data.ts`）。 */
  readonly cultivationFiles: CultivationFiles
  /** 本会话事件流（快照给历史 + 实时追加）；缺席 = 赞/踩块降级。 */
  readonly followEvents?: CultivationFollowEvents
  /** 会话列表快照（viewer 角色经上游 agentPreset 投影订阅，照 RoleBadge 手法）。 */
  readonly roleSource: RoleBadgeInjected['roleSource']
}

export type CultivationTabProps = PropsRuntime<'sidebar.right.pane.tab'> & CultivationTabInjected

/**
 * 培养页签体（壳）：PanelFrame + 领域视图。
 * @param props - 槽 props + 注入面。
 * @returns 培养面板。
 */
export function CultivationTab(props: CultivationTabProps) {
  // viewer 角色（上游 agentPreset 投影；订阅制，无轮询——照 RoleBadge 的手法）。
  const subscribe = useMemo(() => props.roleSource.subscribe.bind(props.roleSource), [props.roleSource])
  const getPreset = useCallback(() => readPresetOf(props.roleSource, props.sessionId), [props.roleSource, props.sessionId])
  const viewerRole = useSyncExternalStore(subscribe, getPreset, getPreset)
  const { journalRows, records } = useCultivationPanelData(props.cultivationFiles, props.sessionId)
  const feedback = useCultivationFeedback(props.followEvents, props.sessionId)

  return (
    <PanelFrame tone="growth" title="培养" tabProps={props satisfies PanelFrameProps}>
      <CultivationBoard
        viewerRole={viewerRole}
        viewerLabel={viewerRole === null ? null : roleLabel(viewerRole)}
        journalRows={journalRows}
        records={records}
        feedback={feedback}
        feedbackReachable={props.followEvents !== undefined}
      />
    </PanelFrame>
  )
}
