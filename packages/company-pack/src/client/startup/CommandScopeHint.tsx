/**
 * composer 工具栏上的「命令需要先开始会话」提示（槽 `conversation.input.left`，排在策略按钮之后）。
 *
 * 为什么存在（BUG-290）：会话还没开始时（落地页），斜杠命令的**结果无处可落**——host 侧 handler
 * 实测被调用并返回了文案，但 client 只把它渲染进已打开会话的 transcript，于是「敲了没反应、草稿却被
 * 清空」。丢点在 vendor 的 composer/transcript 面（已记上游提案），我方能在自己这一层做的、也是
 * 用户政策 B 要的：**在会话开始前把「命令要等会话开始」说在明处**，而不是让人以为按坏了。
 *
 * 判据（keyless）：`blank === true` 时渲染该提示；会话已有轮次（`blank === false`）时不渲染；
 * 会话行缺席（未加载）时也不渲染——**不猜**，宁可不出现，也不在正常会话里插一句废话。
 */
import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { CompanyT } from '../locales.ts'

/** 会话列表的快照面（与 RoleBadge 同款：`sessions.list` 的 subscribe/getSnapshot）。 */
export interface SessionListFace {
  readonly subscribe: (listener: () => void) => () => void
  readonly getSnapshot: () => { readonly byId: Record<string, { readonly blank?: boolean } | undefined> }
}

/** 注入面：会话 id + 会话列表快照 + 文案。 */
export interface CommandScopeHintFace {
  readonly sessionId: SessionId
  readonly list: SessionListFace
  readonly t: CompanyT
}

/** 槽注入的 `t` 会与自带同名 prop 冲突，故本组件不声明 `locale`，`t` 由 inject 给。 */
export type CommandScopeHintProps = InjectFace<CommandScopeHintFace>

/**
 * 会话还没开始时提示「斜杠命令要等会话开始才回话」。
 * @param props - 会话 id、会话列表快照面与人话表。
 * @returns 提示元素；会话已开始或状态未知时 null。
 */
export function CommandScopeHint(props: CommandScopeHintProps): ReactNode {
  const { sessionId, list } = props
  const subscribe = useMemo(() => list.subscribe.bind(list), [list])
  const readBlank = useCallback(() => list.getSnapshot().byId[sessionId]?.blank === true, [list, sessionId])
  const blank = useSyncExternalStore(subscribe, readBlank, readBlank)
  if (!blank) return null
  return (
    <span className="wk-command-scope-hint" title={props.t('command.scopeHint.tooltip')}>
      {props.t('command.scopeHint')}
    </span>
  )
}
