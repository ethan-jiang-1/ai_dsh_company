/**
 * 公司整页视图（条目 ① S1，`conversation.view` id `company`）：把机制"演"出来。
 *
 * 数据面自条目 ② S1a 起抽到 `useCompanyData`（公司视图与五个平台页签体共用同一实现）；
 * 本文件只剩"页内子页签 + 四个面板"的展示编排。
 */
import { useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { BoardPanel, BudgetPanel, DagPanel, PresencePanel } from './company-panels.tsx'
import { useCompanyData, type CompanyDataInjected } from './use-company-data.ts'

/** 本视图的 props（标准 session kit + owner props）。 */
export type CompanyViewProps = PropsRuntime<'conversation.view'>

/** 注册处闭包注入的数据面 + 浮出入口（条目 ② S4）。 */
export interface CompanyViewInjected extends CompanyDataInjected {
  /** 打开 `kind` 对应的平台页签并拽出成浮窗（注册处经 `openTab` + `active()` + `float` 实现）。 */
  readonly floatPanel: (kind: string) => void
}

type PanelKey = 'board' | 'dag' | 'presence' | 'budget'

const PANELS: readonly { readonly key: PanelKey; readonly label: string; readonly kind: string }[] = [
  { key: 'board', label: '看板', kind: 'company-board' },
  { key: 'dag', label: '依赖图', kind: 'company-dag' },
  { key: 'presence', label: '在场', kind: 'company-presence' },
  { key: 'budget', label: '用量', kind: 'company-budget' },
]

/**
 * 造公司视图组件（闭包捕获数据面 + 浮出入口）。
 * @param injected - team 视图拉取 + 事件流 + 浮出（注册处已绑好 lead 会话寻址）。
 * @returns 可注册到 `conversation.view` 的组件。
 */
export function createCompanyView(injected: CompanyViewInjected) {
  return function CompanyView(props: CompanyViewProps) {
    const { sessionId, useProjection } = props
    const [panel, setPanel] = useState<PanelKey>('board')
    const data = useCompanyData(injected, sessionId, useProjection, { stream: true })
    const current = PANELS.find(entry => entry.key === panel)

    return (
      <div className="wk-view">
        <div className="wk-view-tabs" role="tablist" aria-label="公司视图">
          {PANELS.map(entry => (
            <button
              key={entry.key}
              type="button"
              role="tab"
              className="wk-tab"
              aria-selected={panel === entry.key}
              onClick={() => { setPanel(entry.key) }}
            >
              {entry.label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <span className="wk-meta" style={{ alignSelf: 'center', paddingRight: '0.25rem' }}>每 5 秒刷新</span>
          <Button
            size="sm"
            variant="ghost"
            title={`把「${current?.label ?? ''}」拖出成浮窗（可移动 / 可缩放）`}
            onClick={() => { if (current !== undefined) injected.floatPanel(current.kind) }}
          >
            浮出
          </Button>
        </div>
        <div className="wk-view-body">
          {data.error !== null && <div className="wk-error">{data.error}</div>}
          {data.team === null && data.error === null && <div className="wk-meta">读取团队状态…</div>}
          {data.team !== null && panel === 'board' && <BoardPanel columns={data.columns} />}
          {data.team !== null && panel === 'dag' && <DagPanel layout={data.dag} />}
          {data.team !== null && panel === 'presence' && (
            <>
              {data.streamError !== null && <div className="wk-error">动态流不可用：{data.streamError}</div>}
              <PresencePanel rows={data.rows} activity={data.activity} />
            </>
          )}
          {panel === 'budget' && <BudgetPanel summary={data.summary} />}
        </div>
      </div>
    )
  }
}
