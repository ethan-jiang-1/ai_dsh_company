/**
 * 培养页签体（驾驶舱④切片四 → 2026-10-13 培养卡升级）：领域视图（`CultivationBoard`）的
 * 侧栏/浮窗壳。数据加载与折叠在 `cultivation-data.ts`；展示纪律在 Board 头注。
 * 公司主面第四子页用**同一领域视图**（`CompanyView`）——一处事实，两个壳。
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { roleLabel } from '../lib/cultivation.ts'
import { PanelFrame, type PanelFrameProps } from './company-tabs.tsx'
import { CultivationBoard } from './CultivationBoard.tsx'
import type { CultivationActionsFactory } from './cultivation-actions.ts'
import type { CultivationContextSources } from './cultivation-context-data.ts'
import type { CultivationContext } from '../lib/cultivation-context.ts'
import {
  CULTIVATION_REFRESH_MS,
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
  /** 人侧动作面工厂（GUI 版 /cultivation；缺席不会发生——注册处必给）。 */
  readonly cultivationActions: CultivationActionsFactory
  /** 本会话事件流（快照给历史 + 实时追加）；缺席 = 赞/踩块降级。 */
  readonly followEvents?: CultivationFollowEvents
  /** 会话列表快照（viewer 角色经上游 agentPreset 投影订阅，照 RoleBadge 手法）。 */
  readonly roleSource: RoleBadgeInjected['roleSource']
  /** 背景候选/预览源（注册处按会话构造；缺席 = 不显示背景区）。 */
  readonly contextSources?: ((sessionId: SessionId) => CultivationContextSources) | undefined
  /** 打开背景原文（注册处预检 + 导航；缺席 = 不显示打开按钮）。 */
  readonly openContext?: ((sessionId: SessionId, context: CultivationContext) => Promise<{ readonly ok: true } | { readonly ok: false, readonly problem: string }>) | undefined
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
  const { journalRows, records, brokenRecords, refresh } = useCultivationPanelData(props.cultivationFiles, props.sessionId)
  const feedback = useCultivationFeedback(props.followEvents, props.sessionId)
  const teammate = props.useSessions(state => state.byId[props.sessionId]?.origin === 'subagent')
  const contextSources = useMemo(() => props.contextSources?.(props.sessionId), [props.contextSources, props.sessionId])
  const openContext = props.openContext === undefined
    ? undefined
    : (context: CultivationContext) => props.openContext!(props.sessionId, context)
  // 动作面按会话取（页签槽 scope=session ⇒ sessionId 就是本会话；角色闸在 host）。
  const actions = useMemo(() => props.cultivationActions(props.sessionId), [props.cultivationActions, props.sessionId])

  return (
    <PanelFrame
      tone="growth"
      title="培养"
      tabProps={props satisfies PanelFrameProps}
      refreshLabel={`每 ${String(CULTIVATION_REFRESH_MS / 1000)} 秒自动刷新`}
    >
      <CultivationBoard
        viewerRole={viewerRole}
        viewerLabel={viewerRole === null ? null : roleLabel(viewerRole)}
        journalRows={journalRows}
        records={records}
        brokenRecords={brokenRecords}
        feedback={feedback}
        feedbackReachable={props.followEvents !== undefined}
        actions={actions}
        onRefresh={refresh}
        contextSources={contextSources}
        currentSessionId={props.sessionId}
        teammate={teammate}
        openContext={openContext}
      />
    </PanelFrame>
  )
}
